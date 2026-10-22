import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base_class import Base


class Inquiry(Base):
    """
    A student's inquiry about a listing. This is the platform's contact
    channel: the owner sees the student's name, email and (optional) phone
    next to the message, and marks the inquiry contacted/closed.

    `status` is a plain string ("new" / "contacted" / "closed"), validated by
    the API schema, rather than a Postgres ENUM: adding a status later then
    needs no database migration.
    """

    __tablename__ = "inquiries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    move_in_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="new", server_default="new", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
