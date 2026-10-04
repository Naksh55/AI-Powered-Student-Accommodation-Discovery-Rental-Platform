from pydantic import BaseModel

from app.ai.query_parser import ParsedSearchFilters
from app.schemas.listing import ListingOut


class NaturalLanguageSearchRequest(BaseModel):
    query: str


class NaturalLanguageSearchResponse(BaseModel):
    # Echoed back so the frontend can show "Searching for: single room,
    # under ₹8,000, with AC" — confirming what the AI actually understood,
    # which matters since a misparse should be visible, not silent.
    parsed_filters: ParsedSearchFilters
    results: list[ListingOut]
