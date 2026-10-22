from pydantic import BaseModel


class QualityIssue(BaseModel):
    code: str
    message: str


class ListingAnalysisOut(BaseModel):
    # Deterministic part: always present.
    score: int
    issues: list[QualityIssue]
    # AI part: may be unavailable (no key, provider error). The checks above
    # still work, so the owner always gets something useful.
    ai_available: bool
    ai_note: str | None = None
    improved_description: str | None = None
    suggestions: list[str] = []
