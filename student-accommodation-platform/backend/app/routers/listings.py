import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import WKTElement
from geoalchemy2.functions import ST_DWithin
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.ai.query_parser import parse_natural_language_query
from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.amenity import Amenity
from app.models.listing import Listing, RoomType
from app.models.user import User, UserRole
from app.schemas.listing import ListingCreate, ListingOut, ListingUpdate
from app.schemas.search import NaturalLanguageSearchRequest, NaturalLanguageSearchResponse

router = APIRouter(prefix="/listings", tags=["listings"])


def _make_point(lat: float, lng: float) -> WKTElement:
    """PostGIS point, lng first per WKT/GeoJSON convention (x=lng, y=lat)."""
    return WKTElement(f"POINT({lng} {lat})", srid=4326)


def _serialize(listing: Listing) -> ListingOut:
    point = to_shape(listing.location)
    return ListingOut(
        id=listing.id,
        owner_id=listing.owner_id,
        title=listing.title,
        description=listing.description,
        room_type=listing.room_type,
        monthly_rent=float(listing.monthly_rent),
        has_ac=listing.has_ac,
        has_wifi=listing.has_wifi,
        food_included=listing.food_included,
        address_line=listing.address_line,
        city=listing.city,
        latitude=point.y,
        longitude=point.x,
        is_verified=listing.is_verified,
        amenities=[a.name for a in listing.amenities],
        image_urls=[img.url for img in listing.images],
    )


def _get_or_create_amenities(db: Session, names: list[str]) -> list[Amenity]:
    amenities = []
    for name in names:
        amenity = db.query(Amenity).filter(Amenity.name == name).first()
        if not amenity:
            amenity = Amenity(name=name)
            db.add(amenity)
            db.flush()
        amenities.append(amenity)
    return amenities


def _require_owner_or_admin(user: User):
    if user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners can manage listings")


def apply_listing_filters(
    db: Session,
    *,
    min_budget: float | None = None,
    max_budget: float | None = None,
    room_type: RoomType | None = None,
    has_ac: bool | None = None,
    has_wifi: bool | None = None,
    food_included: bool | None = None,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    max_distance_km: float | None = None,
):
    """
    Shared filter-building logic. Used by both the structured search
    endpoint below and the natural-language search endpoint (whose
    query-parsing chain resolves a plain-text query into these same
    keyword arguments before calling this function) — one place to get
    the filtering right, two ways to call it.
    """
    query = db.query(Listing).filter(Listing.is_active.is_(True))

    if min_budget is not None:
        query = query.filter(Listing.monthly_rent >= min_budget)
    if max_budget is not None:
        query = query.filter(Listing.monthly_rent <= max_budget)
    if room_type is not None:
        query = query.filter(Listing.room_type == room_type)
    if has_ac is not None:
        query = query.filter(Listing.has_ac.is_(has_ac))
    if has_wifi is not None:
        query = query.filter(Listing.has_wifi.is_(has_wifi))
    if food_included is not None:
        query = query.filter(Listing.food_included.is_(food_included))
    if city is not None:
        query = query.filter(Listing.city.ilike(f"%{city}%"))
    if lat is not None and lng is not None and max_distance_km is not None:
        center = _make_point(lat, lng)
        query = query.filter(ST_DWithin(Listing.location, center, max_distance_km * 1000))

    return query.order_by(Listing.created_at.desc())


@router.get("", response_model=list[ListingOut])
def search_listings(
    db: Session = Depends(get_db),
    min_budget: float | None = Query(default=None, ge=0),
    max_budget: float | None = Query(default=None, ge=0),
    room_type: RoomType | None = None,
    has_ac: bool | None = None,
    has_wifi: bool | None = None,
    food_included: bool | None = None,
    city: str | None = None,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    max_distance_km: float | None = Query(default=None, gt=0),
):
    query = apply_listing_filters(
        db,
        min_budget=min_budget,
        max_budget=max_budget,
        room_type=room_type,
        has_ac=has_ac,
        has_wifi=has_wifi,
        food_included=food_included,
        city=city,
        lat=lat,
        lng=lng,
        max_distance_km=max_distance_km,
    )
    return [_serialize(listing) for listing in query.all()]


@router.post("/search/natural", response_model=NaturalLanguageSearchResponse)
def natural_language_search(
    payload: NaturalLanguageSearchRequest,
    db: Session = Depends(get_db),
):
    """
    The Milestone 3 headline feature. Takes a plain-text query like
    "single room under 8000 with AC near Mohali", parses it into
    structured filters with an LLM, then runs those filters through the
    exact same apply_listing_filters() the structured search endpoint
    uses. Distance ("within 2 km") is parsed and echoed back in
    parsed_filters for visibility, but not yet applied as a DB filter —
    that needs a known reference point (the student's college), which
    isn't wired up until the college-selection feature exists.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Natural-language search isn't configured yet — add OPENAI_API_KEY to backend/.env",
        )

    try:
        parsed = parse_natural_language_query(payload.query)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Couldn't understand that query: {exc}")

    query = apply_listing_filters(
        db,
        min_budget=parsed.min_budget,
        max_budget=parsed.max_budget,
        room_type=parsed.room_type,
        has_ac=parsed.has_ac,
        has_wifi=parsed.has_wifi,
        food_included=parsed.food_included,
        city=parsed.city,
    )
    return NaturalLanguageSearchResponse(
        parsed_filters=parsed,
        results=[_serialize(listing) for listing in query.all()],
    )


@router.get("/mine", response_model=list[ListingOut])
def list_my_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    The Owner dashboard's data source. Unlike the public search endpoint
    above, this returns the owner's listings regardless of is_active /
    is_verified state, so they can see drafts and pending-verification
    listings too. Must be registered before /{listing_id} below, or
    FastAPI will try (and fail) to parse "mine" as a UUID.
    """
    listings = (
        db.query(Listing)
        .filter(Listing.owner_id == current_user.id)
        .order_by(Listing.created_at.desc())
        .all()
    )
    return [_serialize(listing) for listing in listings]


@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: uuid.UUID, db: Session = Depends(get_db)):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return _serialize(listing)


@router.post("", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: ListingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_owner_or_admin(current_user)

    listing = Listing(
        owner_id=current_user.id,
        college_id=payload.college_id,
        title=payload.title,
        description=payload.description,
        room_type=payload.room_type,
        monthly_rent=payload.monthly_rent,
        has_ac=payload.has_ac,
        has_wifi=payload.has_wifi,
        food_included=payload.food_included,
        address_line=payload.address_line,
        city=payload.city,
        location=_make_point(payload.latitude, payload.longitude),
    )
    listing.amenities = _get_or_create_amenities(db, payload.amenity_names)

    db.add(listing)
    db.commit()
    db.refresh(listing)
    return _serialize(listing)


@router.patch("/{listing_id}", response_model=ListingOut)
def update_listing(
    listing_id: uuid.UUID,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You can only edit your own listings")

    update_data = payload.model_dump(exclude_unset=True, exclude={"latitude", "longitude", "amenity_names"})
    for field, value in update_data.items():
        setattr(listing, field, value)

    if payload.latitude is not None and payload.longitude is not None:
        listing.location = _make_point(payload.latitude, payload.longitude)

    if payload.amenity_names is not None:
        listing.amenities = _get_or_create_amenities(db, payload.amenity_names)

    db.commit()
    db.refresh(listing)
    return _serialize(listing)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You can only delete your own listings")

    db.delete(listing)
    db.commit()
