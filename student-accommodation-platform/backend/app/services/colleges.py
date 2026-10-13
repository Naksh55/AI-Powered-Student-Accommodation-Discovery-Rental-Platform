"""
College lookup + matching, shared by the structured search endpoint
(student picks a college from a dropdown) and the natural-language search
endpoint (student types "near cgc landran").

The matching deliberately does NOT use the LLM: it's a small, deterministic
token-overlap match against the colleges table, so it behaves the same with
any LLM provider and is easy to unit test.
"""
import re
import uuid
from dataclasses import dataclass

from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.models.college import College
from app.schemas.college import CollegeOut

# "Near <college>" with no distance given falls back to this radius.
DEFAULT_RADIUS_KM = 3.0

# Words that show up in lots of college names. They can help break a tie
# between two candidates, but a query matching *only* these words
# ("university near me") must never count as naming a college.
GENERIC_WORDS = {
    "college", "colleges", "university", "institute", "institution",
    "engineering", "technology", "technical", "group", "of", "the", "and",
    "for", "school", "campus", "sector", "punjab", "india", "near", "in",
    "at", "to", "from",
}


def tokenize(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) >= 2}


def college_tokens(college) -> set[str]:
    return tokenize(college.name)


def match_college(query_text: str, colleges) -> "object | None":
    """
    Pick the college a free-text query is talking about, or None.

    A college matches when the query shares at least one *distinctive*
    word with its name. The highest-scoring college wins; a tie means the
    query is ambiguous (e.g. just "chandigarh"), so we return None rather
    than guess.
    """
    query_tokens = tokenize(query_text)
    best, best_score, tied = None, 0, False
    for college in colleges:
        matched = query_tokens & college_tokens(college)
        if not (matched - GENERIC_WORDS):
            continue
        score = len(matched)
        if score > best_score:
            best, best_score, tied = college, score, False
        elif score == best_score:
            tied = True
    return None if tied else best


def city_mentions_college(city: str, college) -> bool:
    """
    True when the LLM stuffed a college mention into the `city` field
    (e.g. city="cgc landran") — in that case the city text shouldn't also
    be applied as a text filter, since the radius search covers it.
    """
    city_tokens = tokenize(city) - GENERIC_WORDS
    return bool(city_tokens) and city_tokens <= college_tokens(college)


def college_latlng(college: College) -> tuple[float, float]:
    point = to_shape(college.location)
    return point.y, point.x  # (lat, lng)


def serialize_college(college: College) -> CollegeOut:
    lat, lng = college_latlng(college)
    return CollegeOut(
        id=college.id, name=college.name, city=college.city, latitude=lat, longitude=lng
    )


@dataclass
class CollegeResolution:
    college: College | None
    named_in_query: bool  # True when the college came from the query text


def find_college(
    db: Session, selected_id: uuid.UUID | None, query_text: str | None
) -> CollegeResolution:
    """
    A college named in the query text wins over the dropdown selection
    (typing "near cgc landran" is a more specific, more recent signal).
    """
    named = None
    if query_text:
        named = match_college(query_text, db.query(College).all())
    if named is not None:
        return CollegeResolution(named, True)

    selected = db.get(College, selected_id) if selected_id else None
    return CollegeResolution(selected, False)
