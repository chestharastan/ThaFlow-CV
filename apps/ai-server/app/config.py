import os
from dataclasses import dataclass, field


def _list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    # "anthropic" calls Claude; "mock" is a deterministic stand-in that calls no model.
    provider: str = field(default_factory=lambda: os.environ.get("THAFLOW_AI_PROVIDER", "anthropic"))
    model: str = field(default_factory=lambda: os.environ.get("THAFLOW_AI_MODEL", "claude-opus-5-5"))
    effort: str = field(default_factory=lambda: os.environ.get("THAFLOW_AI_EFFORT", "low"))
    # Origins of the web app allowed to call this API from a browser.
    allowed_origins: list[str] = field(default_factory=lambda: _list("THAFLOW_ALLOWED_ORIGINS", "http://localhost:3000"))
    rate_limit_per_minute: int = field(default_factory=lambda: int(os.environ.get("THAFLOW_RATE_LIMIT_PER_MINUTE", "20")))
    max_body_bytes: int = 32 * 1024
