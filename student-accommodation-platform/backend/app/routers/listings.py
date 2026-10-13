import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import WKTElement
from geoalchemy2.functions import ST_DWithin
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.ai.query_parser import parse_natural_language_query
from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.amenity import Amenity
from app.models.listing import Listing, RoomType
from app.models.user import User, UserRole
from app.schemas.listing import ListingCreate, ListingOut, ListingUpdate
from app.schemas.search import NaturalLanguageSearchRequest, NaturalLanguageSearchResponse
from app.services.colleges import (
    DEFAULT_RADIUS_KM,
    city_mentions_college,
    college_latlng,
    find_college,
    serialize_college,
)

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
        tokens = [t for t in city.split() if len(t) > 2]
        if tokens:
            query = query.filter(
                or_(
                    *[
                        col.ilike(f"%{t}%")
                        for t in tokens
                        for col in (Listing.city, Listing.address_line, Listing.title)
                    ]
                )
            )
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
    college_id: uuid.UUID | None = None,
):
    # "Near my college": resolve the chosen college to coordinates
    # server-side, so the frontend never has to know them.
    if college_id is not None and lat is None and lng is None:
        college = find_college(db, college_id, None).college
        if college is None:
            raise HTTPException(status_code=404, detail="College not found")
        lat, lng = college_latlng(college)
        max_distance_km = max_distance_km or DEFAULT_RADIUS_KM

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
    uses. Distance ("within 2 km", or just "near cgc landran") is applied
    as a PostGIS radius search around a college — see find_college().
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Natural-language search isn't configured yet — add GROQ_API_KEY to backend/.env",
        )

    try:
        parsed = parse_natural_language_query(payload.query)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    print("PARSED:", parsed, "| COLLEGE_ID:", payload.college_id)   # <-- add here

    # A distance filter needs a reference point. It comes from a college
    # named in the query ("near cgc landran") or the one picked in the
    # selector. We apply it when the query asked for a distance, or when a
    # college was named outright ("near X" with no figure -> default radius).
    resolution = find_college(db, payload.college_id, payload.query)
    college = resolution.college
    wants_distance = (
        parsed.max_distance_km is not None
        or resolution.named_in_query
        or parsed.use_my_college
    )
    use_distance = college is not None and wants_distance

    hint = None
    if wants_distance and college is None:
        hint = "Pick your college in the 'Near my college' menu to filter by distance."

    lat = lng = radius_km = None
    city = parsed.city
    if use_distance:
        lat, lng = college_latlng(college)
        radius_km = parsed.max_distance_km or DEFAULT_RADIUS_KM
        # The LLM often files "cgc landran" under city; the radius search
        # already covers it, and as a text filter it would match nothing.
        if city and city_mentions_college(city, college):
            city = None

    query = apply_listing_filters(
        db,
        min_budget=parsed.min_budget,
        max_budget=parsed.max_budget,
        room_type=parsed.room_type,
        has_ac=parsed.has_ac,
        has_wifi=parsed.has_wifi,
        food_included=parsed.food_included,
        city=city,
        lat=lat,
        lng=lng,
        max_distance_km=radius_km,
    )
    return NaturalLanguageSearchResponse(
        parsed_filters=parsed,
        college=serialize_college(college) if use_distance else None,
        applied_radius_km=radius_km,
        hint=hint,
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
