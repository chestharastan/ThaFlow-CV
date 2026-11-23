"""Request and response contracts. They mirror packages/ai-engine/src/types.ts.

Requests carry only the text for one task. There is deliberately no user id,
session id or CV id anywhere in this API.
"""

from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

MAX_INPUT_CHARS = 4000
Language = Literal["en", "km"]
Text = Annotated[str, Field(min_length=1, max_length=MAX_INPUT_CHARS)]


class Strict(BaseModel):
    # Unknown fields are rejected so a client can never send more than the task needs.
    model_config = ConfigDict(extra="forbid")


class RewriteContent(Strict):
    text: Text
    kind: Literal["summary", "experience", "project", "education", "general"] = "general"
    position: Optional[Annotated[str, Field(max_length=200)]] = None


class TranslateContent(Strict):
    text: Text
    targetLanguage: Language


class ExtractContent(Strict):
    text: Text
    hint: Optional[Annotated[str, Field(max_length=40)]] = None


class RewriteRequest(Strict):
    task: Literal["rewrite_text"]
    language: Language
    content: RewriteContent


class TranslateRequest(Strict):
    task: Literal["translate_text"]
    language: Language
    content: TranslateContent


class ExtractRequest(Strict):
    task: Literal["extract_section"]
    language: Language
    content: ExtractContent


TaskRequest = Annotated[
    Union[RewriteRequest, TranslateRequest, ExtractRequest], Field(discriminator="task")
]


class TextResult(BaseModel):
    text: str


class ExtractedData(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    fieldOfStudy: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    isCurrent: Optional[bool] = None
    skills: Optional[list[str]] = None
    text: Optional[str] = None


class ExtractionResult(BaseModel):
    section: Literal["education", "experiences", "skills", "projects", "summary", "unknown"]
    data: ExtractedData
    missingFields: list[str]
    requiresConfirmation: bool = True


class TaskResponse(BaseModel):
    success: bool
    result: Optional[dict] = None
    error: Optional[str] = None
