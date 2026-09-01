import enum
import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import Boolean, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base_class import Base
from app.models.amenity import listing_amenities


class RoomType(str, enum.Enum):
    SINGLE = "single"
    SHARED_2 = "shared_2"
    SHARED_3_PLUS = "shared_3_plus"
    FLAT = "flat"


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    college_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("colleges.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    room_type: Mapped[RoomType] = mapped_column(
        Enum(RoomType, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
    )
    monthly_rent: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    has_ac: Mapped[bool] = mapped_column(Boolean, default=False)
    has_wifi: Mapped[bool] = mapped_column(Boolean, default=False)
    food_included: Mapped[bool] = mapped_column(Boolean, default=False)

    address_line: Mapped[str] = mapped_column(String(500), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    location = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)  # set by Admin module (Milestone 4)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    amenities = relationship("Amenity", secondary=listing_amenities, backref="listings")
    images = relationship("ListingImage", back_populates="listing", cascade="all, delete-orphan")
