import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.listing import RoomType


class AdminListingOut(BaseModel):
    """A listing waiting for review, with what an admin needs to judge it."""

    id: uuid.UUID
    title: str
    description: str | None
    room_type: RoomType
    monthly_rent: float
    address_line: str
    city: str
    image_urls: list[str]
    owner_name: str
    owner_email: str
    created_at: datetime


class ReviewResultOut(BaseModel):
    id: uuid.UUID
    is_verified: bool
    is_active: bool
