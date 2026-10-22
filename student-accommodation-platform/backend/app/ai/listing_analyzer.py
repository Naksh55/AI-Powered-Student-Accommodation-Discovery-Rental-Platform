"""
LLM half of the listing-quality analyzer: rewrites a listing's description
and gives listing-specific tips. Everything factual (missing photos, empty
description...) is checked by app/services/listing_quality.py instead.

The model is only allowed to use facts the owner already entered. Two
guards enforce that: the prompt, and a post-check that throws the draft
away if it contains numbers that appear nowhere in the listing.
"""
import logging
import os  # noqa: F401  (used if the matched key setting reads the environment)
import re
from dataclasses import dataclass, field

from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You help property owners write listings for students renting PGs, flats and rooms in India.

You are given ONLY the facts below. Rules:
- improved_description: 60 to 100 words, friendly and concrete, written for a student. Use only the facts given. Never invent amenities, distances, rent terms, house rules, furniture, or photos. Do not use marketing superlatives like "best", "luxurious" or "perfect".
- Use a bracketed placeholder ONLY for an important fact that is missing and that students always ask about: distance to campus, security deposit, notice period, or food/mess. Write it like [distance to campus]. Never add a generic placeholder such as [add details here]. If nothing important is missing, use no placeholders at all.
- suggestions: up to 3 short tips about things the description text cannot fix, such as a clearer title, which photos to add, or a listing detail that is still missing. Never repeat anything the description already says, and never restate the room type or rent."""


class AIUnavailable(Exception):
    """The LLM isn't configured; callers fall back to rule-based results only."""


class LLMFeedback(BaseModel):
    improved_description: str = Field(
        description="A rewritten student-friendly description using only the given facts."
    )
    suggestions: list[str] = Field(
        description="Up to 4 short, listing-specific tips for the owner."
    )


@dataclass
class ListingFacts:
    title: str
    room_type_label: str
    monthly_rent: float
    has_ac: bool
    has_wifi: bool
    food_included: bool
    amenity_names: list[str]
    address_line: str
    city: str
    description: str | None
    extra: dict = field(default_factory=dict)


def facts_text(f: ListingFacts) -> str:
    yes_no = lambda b: "yes" if b else "no"  # noqa: E731
    return "\n".join([
        f"Title: {f.title}",
        f"Room type: {f.room_type_label}",
        f"Monthly rent: ₹{int(f.monthly_rent):,}",
        f"AC: {yes_no(f.has_ac)}",
        f"Wi-Fi: {yes_no(f.has_wifi)}",
        f"Food included: {yes_no(f.food_included)}",
        f"Other amenities: {', '.join(f.amenity_names) or 'none listed'}",
        f"Address: {f.address_line}, {f.city}",
        f"Current description: {f.description.strip() if f.description and f.description.strip() else '(none)'}",
    ])


_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")


def _numbers(text: str) -> set[str]:
    return {m.replace(",", "") for m in _NUMBER.findall(text)}


def invents_numbers(draft: str, facts: str) -> bool:
    """True when the draft contains a number that isn't in the listing facts."""
    return bool(_numbers(draft) - _numbers(facts))


# --- llm config (matched to query_parser.py by the install script) ---------
def _llm_config() -> tuple[str, str]:
    return settings.GROQ_MODEL, settings.GROQ_API_KEY
# --- end llm config ---------------------------------------------------------

_llm = None


def _get_llm():
    global _llm
    if _llm is None:
        model, api_key = _llm_config()
        if not api_key or not model:
            raise AIUnavailable("The AI model isn't configured in backend/.env.")
        _llm = ChatGroq(model=model, api_key=api_key, temperature=0.3)
    return _llm


JSON_HINT = (
    "\n\nRespond with only a JSON object with exactly two keys: "
    '"improved_description" (a string) and "suggestions" (an array of strings).'
)


def _invoke_structured(text: str) -> LLMFeedback:
    """
    Groq models are inconsistent about forced tool calls: some intermittently
    return an empty response ("tool_use_failed"). So try tool calling first,
    then fall back to JSON mode, which is supported more broadly.
    """
    llm = _get_llm()  # raises AIUnavailable when the key/model isn't set
    last_error: Exception | None = None
    for method in ("function_calling", "json_mode"):
        system = SYSTEM_PROMPT + (JSON_HINT if method == "json_mode" else "")
        try:
            return llm.with_structured_output(LLMFeedback, method=method).invoke(
                [("system", system), ("human", text)]
            )
        except Exception as exc:  # provider errors, empty tool call, bad JSON
            logger.warning("Listing analyzer: %s failed (%s)", method, type(exc).__name__)
            last_error = exc
    raise last_error


def generate_feedback(facts: ListingFacts) -> tuple[LLMFeedback | None, str | None]:
    """
    Returns (feedback, note). `note` explains why feedback is None, or
    carries a caution; it is meant to be shown to the owner.
    """
    text = facts_text(facts)
    result = _invoke_structured(text)
    draft = result.improved_description.strip()
    suggestions = [s.strip() for s in result.suggestions if s and s.strip()][:4]

    if invents_numbers(draft, text):
        return (
            LLMFeedback(improved_description="", suggestions=suggestions),
            "The AI's draft mentioned figures that aren't in your listing, so it "
            "was discarded. Try again.",
        )
    return LLMFeedback(improved_description=draft, suggestions=suggestions), None
