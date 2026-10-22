import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Query, Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.inquiry import Inquiry
from app.models.listing import Listing
from app.models.user import User, UserRole
from app.schemas.inquiry import (
    OPEN_STATUSES,
    InquiryCreate,
    InquiryOut,
    InquiryStatus,
    InquiryStatusUpdate,
    ReceivedInquiryOut,
)

router = APIRouter(prefix="/inquiries", tags=["inquiries"])


def _out(inquiry: Inquiry, listing: Listing) -> InquiryOut:
    return InquiryOut(
        id=inquiry.id,
        listing_id=inquiry.listing_id,
        listing_title=listing.title,
        status=inquiry.status,
        message=inquiry.message,
        contact_phone=inquiry.contact_phone,
        move_in_date=inquiry.move_in_date,
        created_at=inquiry.created_at,
    )


def _received_out(inquiry: Inquiry, listing: Listing, student: User) -> ReceivedInquiryOut:
    return ReceivedInquiryOut(
        **_out(inquiry, listing).model_dump(),
        student_name=student.full_name,
        student_email=student.email,
    )


def sent_query(db: Session, student: User) -> Query:
    return (
        db.query(Inquiry, Listing)
        .join(Listing, Inquiry.listing_id == Listing.id)
        .filter(Inquiry.student_id == student.id)
        .order_by(Inquiry.created_at.desc())
    )


def received_query(db: Session, owner: User) -> Query:
    query = (
        db.query(Inquiry, Listing, User)
        .join(Listing, Inquiry.listing_id == Listing.id)
        .join(User, Inquiry.student_id == User.id)
    )
    if owner.role != UserRole.ADMIN:  # admins can see everything, owners only their own
        query = query.filter(Listing.owner_id == owner.id)
    return query.order_by(Inquiry.created_at.desc())


@router.post("", response_model=InquiryOut, status_code=status.HTTP_201_CREATED)
def create_inquiry(
    payload: InquiryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only student accounts can send inquiries")

    listing = (
        db.query(Listing)
        .filter(Listing.id == payload.listing_id, Listing.is_active.is_(True))
        .first()
    )
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")

    already_open = (
        db.query(Inquiry)
        .filter(
            Inquiry.listing_id == listing.id,
            Inquiry.student_id == current_user.id,
            Inquiry.status.in_(OPEN_STATUSES),
        )
        .first()
    )
    if already_open is not None:
        raise HTTPException(
            status_code=409,
            detail="You already have an open inquiry for this listing. Check My inquiries.",
        )

    inquiry = Inquiry(
        listing_id=listing.id,
        student_id=current_user.id,
        message=payload.message,
        contact_phone=payload.contact_phone,
        move_in_date=payload.move_in_date,
        status=InquiryStatus.NEW.value,
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    return _out(inquiry, listing)


@router.get("/mine", response_model=list[InquiryOut])
def my_inquiries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """The student's own sent inquiries, newest first."""
    return [_out(i, l) for i, l in sent_query(db, current_user).all()]


@router.get("/received", response_model=list[ReceivedInquiryOut])
def received_inquiries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Inquiries about the owner's listings, newest first."""
    if current_user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owners can view received inquiries")
    return [_received_out(i, l, s) for i, l, s in received_query(db, current_user).all()]


@router.patch("/{inquiry_id}", response_model=ReceivedInquiryOut)
def update_inquiry_status(
    inquiry_id: uuid.UUID,
    payload: InquiryStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Owner marks an inquiry as contacted or closed."""
    if current_user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owners can update inquiries")

    row = (
        db.query(Inquiry, Listing, User)
        .join(Listing, Inquiry.listing_id == Listing.id)
        .join(User, Inquiry.student_id == User.id)
        .filter(Inquiry.id == inquiry_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    inquiry, listing, student = row
    if listing.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You can only update inquiries about your own listings")

    inquiry.status = payload.status.value
    db.commit()
    return _received_out(inquiry, listing, student)
