import re
import uuid

from pydantic import BaseModel, Field, field_validator


class CollegeOut(BaseModel):
    id: uuid.UUID
    name: str
    city: str
    latitude: float
    longitude: float


class CollegeCreate(BaseModel):
    """A college a student adds when theirs isn't in the list yet."""

    name: str = Field(min_length=3, max_length=150)
    city: str | None = Field(default=None, max_length=120)
    # Roughly India's bounding box, so a typo can't drop a pin in the ocean.
    latitude: float = Field(ge=6.0, le=37.5)
    longitude: float = Field(ge=68.0, le=97.5)

    @field_validator("name", "city")
    @classmethod
    def tidy(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = re.sub(r"[<>]", "", v)           # these have no place in a place name
        v = re.sub(r"\s+", " ", v).strip()
        return v or None

    @field_validator("name")
    @classmethod
    def name_long_enough(cls, v: str | None) -> str:
        if v is None or len(v) < 3:
            raise ValueError("College name must be at least 3 characters")
        return v
