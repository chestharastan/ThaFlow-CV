import logging

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import RateLimiter, create_app
from app.providers.base import ProviderError
from app.providers.mock import MockProvider

SECRET = "i build websites using React at SecretCorp"


def client(provider=None, **overrides) -> TestClient:
    settings = Settings(provider="mock", allowed_origins=["http://localhost:3000"], **overrides)
    return TestClient(create_app(settings, provider or MockProvider()))


def rewrite(text=SECRET):
    return {"task": "rewrite_text", "language": "en", "content": {"text": text, "kind": "experience"}}


def test_rewrite_matches_the_documented_response_shape():
    response = client().post("/v1/tasks", json=rewrite())
    assert response.status_code == 200
    assert response.json() == {"success": True, "result": {"text": "I build websites using React at SecretCorp."}}
    assert response.headers["cache-control"] == "no-store"


def test_translate_and_extract():
    c = client()
    translated = c.post("/v1/tasks", json={"task": "translate_text", "language": "en", "content": {"text": "Hello", "targetLanguage": "km"}})
    assert translated.json()["result"]["text"] == "[km] Hello"
    extracted = c.post("/v1/tasks", json={"task": "extract_section", "language": "en", "content": {"text": "Studied at RUPP", "hint": "education"}})
    result = extracted.json()["result"]
    assert result["section"] == "education"
    assert result["requiresConfirmation"] is True


def test_rejects_unknown_fields_tasks_and_oversized_text_without_echoing_content():
    c = client()
    extra = rewrite()
    extra["userId"] = "u_123"
    for payload in (extra, {"task": "delete_everything", "language": "en", "content": {"text": SECRET}}, rewrite("x" * 4001), rewrite("")):
        response = c.post("/v1/tasks", json=payload)
        assert response.status_code == 422
        assert response.json() == {"success": False, "error": "Invalid request."}
    assert c.post("/v1/tasks", content=b"not json", headers={"content-type": "application/json"}).status_code == 422


def test_rejects_large_bodies():
    response = client().post("/v1/tasks", content=b"{" + b" " * 40_000 + b"}", headers={"content-type": "application/json"})
    assert response.status_code == 413


def test_never_logs_request_or_response_content(caplog):
    class Boom(MockProvider):
        async def translate(self, request):
            raise RuntimeError(f"upstream exploded while handling: {request.content.text}")

    c = client(Boom())
    with caplog.at_level(logging.DEBUG):
        assert c.post("/v1/tasks", json=rewrite()).status_code == 200
        crashed = c.post("/v1/tasks", json={"task": "translate_text", "language": "en", "content": {"text": SECRET, "targetLanguage": "km"}})
        assert crashed.status_code == 500
        assert crashed.json() == {"success": False, "error": "Internal error."}
        c.post("/v1/tasks", json=rewrite("x" * 4001))
    assert caplog.records, "expected metadata log lines"
    assert "SecretCorp" not in caplog.text
    assert "task=rewrite_text status=200" in caplog.text


def test_provider_errors_are_reported_safely():
    class Busy(MockProvider):
        async def rewrite(self, request):
            raise ProviderError("The AI service is busy. Try again in a moment.")

    response = client(Busy()).post("/v1/tasks", json=rewrite())
    assert response.status_code == 502
    assert response.json() == {"success": False, "error": "The AI service is busy. Try again in a moment."}


def test_rate_limit():
    c = client(rate_limit_per_minute=2)
    assert [c.post("/v1/tasks", json=rewrite()).status_code for _ in range(3)] == [200, 200, 429]
    limiter = RateLimiter(1)
    assert limiter.allow("a", now=0) and not limiter.allow("a", now=30) and limiter.allow("a", now=61)


def test_cors_allows_only_configured_origins_and_no_credentials():
    c = client()
    preflight = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"}
    allowed = c.options("/v1/tasks", headers={"Origin": "http://localhost:3000", **preflight})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-credentials" not in allowed.headers
    denied = c.options("/v1/tasks", headers={"Origin": "https://evil.example", **preflight})
    assert "access-control-allow-origin" not in denied.headers
