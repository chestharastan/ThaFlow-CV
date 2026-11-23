"""ThaFlow CV AI server: a stateless inference endpoint.

Privacy properties enforced here, not just promised:
- No database, cache or file writes. Request content lives only in memory for the duration of the call.
- Request and response bodies are never logged. The only log line per request is task name, status and duration.
- Requests are schema-validated with unknown fields rejected, and size-limited before parsing.
- No cookies or credentials are accepted (CORS allow_credentials is off).
"""

import logging
import time
from collections import defaultdict, deque

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter, ValidationError

from .config import Settings
from .providers.base import InferenceProvider, ProviderError
from .schemas import ExtractRequest, RewriteRequest, TaskRequest, TaskResponse, TranslateRequest

logger = logging.getLogger("thaflow.ai")
_task_adapter: TypeAdapter = TypeAdapter(TaskRequest)


def build_provider(settings: Settings) -> InferenceProvider:
    if settings.provider == "mock":
        from .providers.mock import MockProvider

        return MockProvider()
    if settings.provider == "anthropic":
        from .providers.anthropic_provider import AnthropicProvider

        return AnthropicProvider(model=settings.model, effort=settings.effort)
    raise ValueError(f"Unknown THAFLOW_AI_PROVIDER: {settings.provider}")


class RateLimiter:
    """Sliding one-minute window per client address, held in memory only."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        hits = self._hits[key]
        while hits and now - hits[0] > 60:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        if len(self._hits) > 10_000:  # bound memory under address churn
            for stale in [k for k, v in self._hits.items() if not v or now - v[-1] > 60]:
                del self._hits[stale]
        return True


def fail(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content=TaskResponse(success=False, error=message).model_dump(exclude_none=True))


def create_app(settings: Settings | None = None, provider: InferenceProvider | None = None) -> FastAPI:
    settings = settings or Settings()
    provider = provider or build_provider(settings)
    limiter = RateLimiter(settings.rate_limit_per_minute)
    app = FastAPI(title="ThaFlow CV AI", docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["POST"],
        allow_headers=["content-type"],
        allow_credentials=False,
        max_age=600,
    )

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, __: RequestValidationError) -> JSONResponse:
        return fail(422, "Invalid request.")

    @app.get("/healthz")
    async def healthz() -> dict:
        return {"ok": True, "provider": provider.name}

    @app.post("/v1/tasks")
    async def run_task(request: Request) -> JSONResponse:
        started = time.monotonic()
        task_name = "unknown"
        status = 200
        try:
            if not limiter.allow(request.client.host if request.client else "unknown"):
                status = 429
                return fail(status, "Too many requests. Try again in a minute.")
            declared = request.headers.get("content-length")
            if declared and declared.isdigit() and int(declared) > settings.max_body_bytes:
                status = 413
                return fail(status, "Request is too large.")
            body = await request.body()
            if len(body) > settings.max_body_bytes:
                status = 413
                return fail(status, "Request is too large.")
            try:
                task = _task_adapter.validate_json(body)
            except ValidationError:
                # The validation detail can quote the submitted text, so it is neither logged nor returned.
                status = 422
                return fail(status, "Invalid request.")
            task_name = task.task
            try:
                if isinstance(task, RewriteRequest):
                    result = await provider.rewrite(task)
                elif isinstance(task, TranslateRequest):
                    result = await provider.translate(task)
                elif isinstance(task, ExtractRequest):
                    result = await provider.extract(task)
                else:  # pragma: no cover - the discriminated union is exhaustive
                    status = 422
                    return fail(status, "Invalid request.")
            except ProviderError as error:
                status = 502
                return fail(status, str(error))
            except Exception:
                status = 500
                logger.error("task=%s failed with an unexpected error", task_name)  # no traceback: it may hold request text
                return fail(status, "Internal error.")
            return JSONResponse(
                content=TaskResponse(success=True, result=result.model_dump()).model_dump(exclude_none=True),
                headers={"Cache-Control": "no-store"},
            )
        finally:
            logger.info("task=%s status=%s ms=%d", task_name, status, (time.monotonic() - started) * 1000)

    return app


def app() -> FastAPI:
    """Factory for `uvicorn app.main:app --factory`."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    return create_app()
