from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.listing import RoomType

SYSTEM_PROMPT = """You convert a student's natural-language housing search \
into structured search filters for a database query.

Rules:
- Only set a field if the query actually implies it. Leave every other \
field null — do not guess or default values that weren't implied.
- Budget: "under 8000", "below 8k", "max 8000" all mean max_budget=8000. \
"k" means thousands (8k = 8000). A range like "8000 to 10000" sets both \
min_budget and max_budget. A bare number with no comparison word (e.g. \
just "8000 budget") means max_budget.
- room_type: map to exactly one of single, shared_2, shared_3_plus, flat. \
"single room" or "private room" -> single. "2 sharing" or "double \
sharing" -> shared_2. "3 sharing", "triple sharing", or "dorm" -> \
shared_3_plus. "flat", "apartment", "1BHK", "2BHK" -> flat. If room type \
isn't mentioned, leave it null.
- has_ac / has_wifi / food_included: set true only if explicitly \
requested ("with AC", "needs wifi", "food included", "with mess"). Never \
set these to false — a feature simply not being mentioned means null, \
not "must not have it".
- city: the city or area name mentioned, if any, exactly as the user \
wrote it.
- max_distance_km: a distance figure like "within 2 km" or "less than \
1.5km". Convert any unit to kilometers (e.g. "500m" -> 0.5).
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


_structured_llm = None


def _get_structured_llm():
    """
    Lazily built so importing this module — and therefore starting the
    app — never requires OPENAI_API_KEY to be set. The key is only
    actually needed the first time someone calls the natural-language
    search endpoint.
    """
    global _structured_llm
    if _structured_llm is None:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError(
                "OPENAI_API_KEY is not set in .env — natural-language search "
                "is disabled until it is. Structured search still works "
                "without it."
            )
        llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0,
        )
        _structured_llm = llm.with_structured_output(ParsedSearchFilters)
    return _structured_llm


def parse_natural_language_query(query: str) -> ParsedSearchFilters:
    """
    The Milestone 3 headline feature: turns e.g. "single room under
    ₹8,000 within 2 km of my college with AC and Wi-Fi" into a
    ParsedSearchFilters object, which the caller then runs through the
    same apply_listing_filters() function the structured search endpoint
    uses — one filtering code path, two ways to reach it.
    """
    chain = _get_structured_llm()
    return chain.invoke([("system", SYSTEM_PROMPT), ("human", query)])
