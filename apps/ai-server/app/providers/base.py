from typing import Protocol

from ..schemas import ExtractRequest, ExtractionResult, RewriteRequest, TextResult, TranslateRequest


class ProviderError(Exception):
    """Raised with a message that is safe to return to the client (never contains request text)."""


class InferenceProvider(Protocol):
    name: str

    async def rewrite(self, request: RewriteRequest) -> TextResult: ...

    async def translate(self, request: TranslateRequest) -> TextResult: ...

    async def extract(self, request: ExtractRequest) -> ExtractionResult: ...
