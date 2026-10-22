"""
Deterministic listing-quality checks.

These run in plain Python on purpose: "is there a photo?" or "is the
description empty?" should never depend on an LLM's mood. The LLM (see
app/ai/listing_analyzer.py) is only used for the part that needs language
skills: rewriting the description and giving listing-specific tips.

Each check has a penalty; the score is 100 minus the penalties of every
issue found (floored at 0). Taking primitives instead of ORM objects keeps
this trivially unit-testable.
"""
import re
from dataclasses import dataclass

FOOD_WORDS = re.compile(r"\b(food|mess|meals?|tiffin|kitchen|cook|canteen)\b", re.I)
DISTANCE_WORDS = re.compile(
    r"\b(km|kms|kilomet(?:re|er)s?|minutes?|mins?|walk(?:ing)?|nearby|near|metres?|meters?)\b",
    re.I,
)
RULES_WORDS = re.compile(
    r"\b(deposit|notice|curfew|guests?|visitors?|rules?|lock-?in|agreement)\b", re.I
)

MIN_PHOTOS = 3
MIN_DESCRIPTION_CHARS = 80
MIN_ADDRESS_CHARS = 12


@dataclass(frozen=True)
class Issue:
    code: str
    message: str
    penalty: int


@dataclass(frozen=True)
class QualityReport:
    score: int
    issues: list[Issue]


def check_listing(
    *,
    description: str | None,
    address_line: str,
    image_count: int,
    has_ac: bool,
    has_wifi: bool,
    food_included: bool,
    amenity_names: list[str],
) -> QualityReport:
    issues: list[Issue] = []
    text = (description or "").strip()

    if image_count == 0:
        issues.append(Issue(
            "no_photos",
            "No photos yet. Students often can't visit before deciding, so photos "
            f"are what they judge you on. Add at least {MIN_PHOTOS}: the room, "
            "the washroom and the building.",
            25,
        ))
    elif image_count < MIN_PHOTOS:
        issues.append(Issue(
            "few_photos",
            f"Only {image_count} photo(s). Aim for at least {MIN_PHOTOS}: the room, "
            "the washroom and the building.",
            10,
        ))

    if not text:
        issues.append(Issue(
            "no_description",
            "No description. Say what the room is like, who it suits, and what's nearby.",
            25,
        ))
    elif len(text) < MIN_DESCRIPTION_CHARS:
        issues.append(Issue(
            "short_description",
            f"The description is very short ({len(text)} characters). "
            "A few sentences about the room and the area help students decide.",
            12,
        ))

    if not (has_ac or has_wifi or food_included or amenity_names):
        issues.append(Issue(
            "no_amenities",
            "No amenities listed. Tick AC, Wi-Fi or food if you offer them, "
            "since students filter on these.",
            10,
        ))

    if len(address_line.strip()) < MIN_ADDRESS_CHARS:
        issues.append(Issue(
            "vague_address",
            "The address is very short. Add the street, sector or landmark so "
            "students can find it.",
            8,
        ))

    # Content checks only make sense when there is a description to read.
    if text:
        if not food_included and not FOOD_WORDS.search(text):
            issues.append(Issue(
                "food_unclear",
                "It isn't clear whether food or a mess is available. "
                "Students ask this first, so say yes or no.",
                8,
            ))
        if not DISTANCE_WORDS.search(text):
            issues.append(Issue(
                "distance_missing",
                "No mention of distance to campus. Add how far the nearest "
                "college is, for example '10 min walk'.",
                10,
            ))
        if not RULES_WORDS.search(text):
            issues.append(Issue(
                "rules_missing",
                "No mention of deposit, notice period or house rules. "
                "Stating them upfront saves back-and-forth.",
                7,
            ))

    score = max(0, 100 - sum(i.penalty for i in issues))
    return QualityReport(score=score, issues=issues)
