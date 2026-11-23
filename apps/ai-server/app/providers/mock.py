"""Deterministic provider for local development and tests. It calls no model."""

from ..schemas import ExtractedData, ExtractRequest, ExtractionResult, RewriteRequest, TextResult, TranslateRequest


class MockProvider:
    name = "mock"

    async def rewrite(self, request: RewriteRequest) -> TextResult:
        text = " ".join(request.content.text.split())
        text = text[0].upper() + text[1:]
        return TextResult(text=text if text.endswith((".", "។")) else text + ".")

    async def translate(self, request: TranslateRequest) -> TextResult:
        return TextResult(text=f"[{request.content.targetLanguage}] {request.content.text}")

    async def extract(self, request: ExtractRequest) -> ExtractionResult:
        section = request.content.hint if request.content.hint in {"education", "experiences", "skills", "projects"} else "summary"
        return ExtractionResult(
            section=section,  # type: ignore[arg-type]
            data=ExtractedData(description=request.content.text, text=request.content.text),
            missingFields=[],
            requiresConfirmation=True,
        )
