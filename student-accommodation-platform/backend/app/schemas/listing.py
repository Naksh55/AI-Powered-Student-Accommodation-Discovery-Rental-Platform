import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.listing import RoomType


class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: str | None
    room_type: RoomType
    monthly_rent: float
    has_ac: bool
    has_wifi: bool
    food_included: bool
    address_line: str
    city: str
    latitude: float
    longitude: float
    is_verified: bool
    amenities: list[str] = []
    image_urls: list[str] = []


class ListingCreate(BaseModel):
    title: str
    description: str | None = None
    room_type: RoomType
    monthly_rent: float = Field(gt=0)
    has_ac: bool = False
    has_wifi: bool = False
    food_included: bool = False
    address_line: str
    city: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    college_id: uuid.UUID | None = None
    amenity_names: list[str] = []


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    room_type: RoomType | None = None
    monthly_rent: float | None = Field(default=None, gt=0)
    has_ac: bool | None = None
    has_wifi: bool | None = None
    food_included: bool | None = None
    address_line: str | None = None
    city: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    is_active: bool | None = None
    amenity_names: list[str] | None = None
