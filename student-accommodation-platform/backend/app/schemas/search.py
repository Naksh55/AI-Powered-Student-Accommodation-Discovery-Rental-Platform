import uuid

from pydantic import BaseModel

from app.ai.query_parser import ParsedSearchFilters
from app.schemas.college import CollegeOut
from app.schemas.listing import ListingOut


class NaturalLanguageSearchRequest(BaseModel):
    query: str
    # The college chosen in the search page's selector, if any. A college
    # named inside the query text takes priority over this.
    college_id: uuid.UUID | None = None


class NaturalLanguageSearchResponse(BaseModel):
    # Echoed back so the frontend can show "Searching for: single room,
    # under ₹8,000, with AC" — confirming what the AI actually understood,
    # which matters since a misparse should be visible, not silent.
    parsed_filters: ParsedSearchFilters
    # Set only when a distance filter was actually applied: which college
    # it was measured from, and the radius used.
    college: CollegeOut | None = None
    applied_radius_km: float | None = None
    # Set when the user asked for a distance or "my college" but no college
    # could be resolved, so the frontend can prompt them to pick one.
    hint: str | None = None
    results: list[ListingOut]