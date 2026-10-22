import enum
import re
import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

PHONE_PATTERN = re.compile(r"^[0-9+\-\s]{7,20}$")


class InquiryStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    CLOSED = "closed"


# A student may have only one inquiry per listing that isn't closed yet.
OPEN_STATUSES = (InquiryStatus.NEW.value, InquiryStatus.CONTACTED.value)


class InquiryCreate(BaseModel):
    listing_id: uuid.UUID
    message: str = Field(min_length=10, max_length=1000)
    contact_phone: str | None = None
    move_in_date: date | None = None

    @field_validator("message")
    @classmethod
    def strip_message(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Message must be at least 10 characters")
        return v

    @field_validator("contact_phone")
    @classmethod
    def check_phone(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        v = v.strip()
        if not PHONE_PATTERN.match(v):
            raise ValueError("Phone number may only contain digits, spaces, + and -")
        return v

    @field_validator("move_in_date")
    @classmethod
    def not_in_past(cls, v: date | None) -> date | None:
        if v is not None and v < date.today():
            raise ValueError("Move-in date can't be in the past")
        return v


class InquiryStatusUpdate(BaseModel):
    status: InquiryStatus


class InquiryOut(BaseModel):
    """What a student sees about an inquiry they sent."""

    id: uuid.UUID
    listing_id: uuid.UUID
    listing_title: str
    status: InquiryStatus
    message: str
    contact_phone: str | None
    move_in_date: date | None
    created_at: datetime


class ReceivedInquiryOut(InquiryOut):
    """What an owner sees: the same, plus who sent it."""

    student_name: str
    student_email: str
