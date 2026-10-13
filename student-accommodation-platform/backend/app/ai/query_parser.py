from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.listing import RoomType

import re

_EXPLICIT_FLAT = re.compile(r"\b(entire|full|whole)\s+flat\b|\b\d\s*bhk\b", re.IGNORECASE)

SYSTEM_PROMPT = """You convert a student's natural-language housing search \
into structured search filters for a database query.

Rules:
- Only set a field if the query actually implies it. Leave every other \
field null — do not guess or default values that weren't implied.
- Budget: "under 8000", "below 8k", "max 8000" all mean max_budget=8000. \
"k" means thousands (8k = 8000). A range like "8000 to 10000" sets both \
min_budget and max_budget. A bare number with no comparison word (e.g. \
just "8000 budget") means max_budget.
- room_type: set it only if the user clearly names a type. "single room" \
or "private room" -> single. "2 sharing" or "double sharing" -> shared_2. \
"3 sharing", "triple sharing", or "dorm" -> shared_3_plus. "entire flat", \
"full flat", "whole flat", or "1BHK/2BHK/3BHK for myself" -> flat. A bare \
"flat", "place", "room", or "accommodation" must leave room_type null.
- has_ac / has_wifi / food_included: set true only if explicitly \
requested ("with AC", "needs wifi", "food included", "with mess"). Never \
set these to false — a feature simply not being mentioned means null, \
not "must not have it".
- city: the city or area name mentioned, if any, exactly as the user \
wrote it.
- max_distance_km: set it only if the user states a distance ("within \
2 km", "less than 1.5km", "500m" -> 0.5). Convert any unit to \
kilometers. Otherwise leave it null. Never invent one.
- use_my_college: true only if the user refers to their own college \
("my college", "my campus") without naming one. If they name a college, \
leave it false.
"""


class ParsedSearchFilters(BaseModel):
    """Structured filters extracted from a natural-language housing query."""

    min_budget: float | None = Field(
        default=None, description="Minimum monthly rent in INR, if a lower bound is implied."
    )
    max_budget: float | None = Field(
        default=None, description="Maximum monthly rent in INR, if an upper bound is implied."
    )
    room_type: RoomType | None = Field(default=None, description="single, shared_2, shared_3_plus, or flat.")
    has_ac: bool | None = Field(default=None, description="True only if AC is explicitly required.")
    has_wifi: bool | None = Field(default=None, description="True only if Wi-Fi is explicitly required.")
    food_included: bool | None = Field(
        default=None, description="True only if food/mess being included is explicitly required."
    )
    city: str | None = Field(default=None, description="City or area name mentioned, if any.")
    max_distance_km: float | None = Field(
        default=None, description="Maximum distance from college in kilometers, if mentioned."
    )
    use_my_college: bool = Field(
        default=False,
        description="True only if the user refers to their own college ('my college', 'my campus') without naming a specific one.",
    )


_structured_llm = None


def _get_structured_llm():
    """
    Lazily built so importing this module — and therefore starting the
    app — never requires GROQ_API_KEY to be set. The key is only
    actually needed the first time someone calls the natural-language
    search endpoint.
    """
    global _structured_llm
    if _structured_llm is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not set in .env — natural-language search "
                "is disabled until it is. Structured search still works "
                "without it."
            )
        llm = ChatGroq(
            model=settings.GROQ_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=0,
        )
        _structured_llm = llm.with_structured_output(ParsedSearchFilters)
    return _structured_llm


def parse_natural_language_query(query: str) -> ParsedSearchFilters:
    chain = _get_structured_llm()
    parsed = chain.invoke([("system", SYSTEM_PROMPT), ("human", query)])

    # The model sometimes maps a bare "flat" to RoomType.FLAT. Only keep it
    # if the user clearly asked for a whole flat ("entire flat", "2bhk").
    if parsed.room_type == RoomType.FLAT and not _EXPLICIT_FLAT.search(query):
        parsed.room_type = None

    return parsed