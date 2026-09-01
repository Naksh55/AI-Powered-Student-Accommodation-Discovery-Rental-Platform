import uuid

from sqlalchemy import ForeignKey, String, Table, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base

# Many-to-many join table between listings and amenities
listing_amenities = Table(
    "listing_amenities",
    Base.metadata,
    Column("listing_id", UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    Column("amenity_id", UUID(as_uuid=True), ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True),
)


class Amenity(Base):
    __tablename__ = "amenities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # e.g. "AC", "WiFi", "Food Included", "Attached Washroom", "Power Backup"
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
