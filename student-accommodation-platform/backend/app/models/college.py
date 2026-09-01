import uuid

from geoalchemy2 import Geography
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class College(Base):
    """
    A college/campus. Listings store their own lat/lng, and distance to a
    college is computed with a PostGIS ST_Distance query against this point
    (see app/routers/listings.py once search is built out in Week 2).
    """
    __tablename__ = "colleges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    location = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
