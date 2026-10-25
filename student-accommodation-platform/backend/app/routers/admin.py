import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Query, Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.listing import Listing
from app.models.user import User, UserRole
from app.schemas.admin import AdminListingOut, ReviewResultOut

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admins only")
    return current_user


def pending_query(db: Session) -> Query:
    """Active listings nobody has verified yet, oldest first so they're reviewed in order."""
    return (
        db.query(Listing, User)
        .join(User, Listing.owner_id == User.id)
        .filter(Listing.is_verified.is_(False), Listing.is_active.is_(True))
        .order_by(Listing.created_at.asc())
    )


def _get_listing(db: Session, listing_id: uuid.UUID) -> Listing:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.get("/listings/pending", response_model=list[AdminListingOut])
def pending_listings(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return [
        AdminListingOut(
            id=l.id,
            title=l.title,
            description=l.description,
            room_type=l.room_type,
            monthly_rent=float(l.monthly_rent),
            address_line=l.address_line,
            city=l.city,
            image_urls=[img.url for img in l.images],
            owner_name=owner.full_name,
            owner_email=owner.email,
            created_at=l.created_at,
        )
        for l, owner in pending_query(db).all()
    ]


@router.post("/listings/{listing_id}/approve", response_model=ReviewResultOut)
def approve_listing(
    listing_id: uuid.UUID, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    """Marks the listing verified: it gets the Verified badge and stays visible in search."""
    listing = _get_listing(db, listing_id)
    listing.is_verified = True
    listing.is_active = True
    db.commit()
    return ReviewResultOut(id=listing.id, is_verified=True, is_active=True)


@router.post("/listings/{listing_id}/reject", response_model=ReviewResultOut)
def reject_listing(
    listing_id: uuid.UUID, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    """Hides the listing from search. The owner still sees it, marked as hidden."""
    listing = _get_listing(db, listing_id)
    listing.is_verified = False
    listing.is_active = False
    db.commit()
    return ReviewResultOut(id=listing.id, is_verified=False, is_active=False)
