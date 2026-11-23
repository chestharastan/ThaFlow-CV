"""Claude-backed provider using the official Anthropic SDK with structured outputs."""

from typing import TypeVar

import anthropic
from pydantic import BaseModel

from ..prompts import build_prompt
from ..schemas import ExtractRequest, ExtractionResult, RewriteRequest, TextResult, TranslateRequest
from .base import ProviderError

T = TypeVar("T", bound=BaseModel)


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, model: str, effort: str) -> None:
        # Credentials are resolved by the SDK from the environment (ANTHROPIC_API_KEY, ...).
        self._client = anthropic.AsyncAnthropic()
        self._model = model
        self._effort = effort

    async def _run(self, request: RewriteRequest | TranslateRequest | ExtractRequest, schema: type[T]) -> T:
        system, user = build_prompt(request)
        try:
            response = await self._client.messages.parse(
                model=self._model,
                max_tokens=4096,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_config={"effort": self._effort},
                output_format=schema,
            )
        except anthropic.RateLimitError as error:
            raise ProviderError("The AI service is busy. Try again in a moment.") from error
        except anthropic.APIConnectionError as error:
            raise ProviderError("The AI service could not be reached.") from error
        except anthropic.APIStatusError as error:
            # Deliberately not echoing the upstream message: it can quote request content.
            raise ProviderError(f"The AI service returned an error ({error.status_code}).") from error
        if response.stop_reason == "refusal":
            raise ProviderError("The AI declined to process this text.")
        if response.stop_reason == "max_tokens" or response.parsed_output is None:
            raise ProviderError("The AI response was incomplete.")
        return response.parsed_output

    async def rewrite(self, request: RewriteRequest) -> TextResult:
        return await self._run(request, TextResult)

    async def translate(self, request: TranslateRequest) -> TextResult:
        return await self._run(request, TextResult)

    async def extract(self, request: ExtractRequest) -> ExtractionResult:
        return await self._run(request, ExtractionResult)
