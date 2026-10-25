from fastapi import APIRouter, Depends, Response
from geoalchemy2 import WKTElement
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.college import College
from app.models.user import User
from app.schemas.college import CollegeCreate, CollegeOut
from app.services.colleges import find_nearby_college, serialize_college, with_acronym

router = APIRouter(prefix="/colleges", tags=["colleges"])


@router.get("", response_model=list[CollegeOut])
def list_colleges(db: Session = Depends(get_db)):
    """Public list that powers the 'near my college' selector on /search."""
    colleges = db.query(College).order_by(College.name).all()
    return [serialize_college(c) for c in colleges]


@router.post("", response_model=CollegeOut, status_code=201)
def add_college(
    payload: CollegeCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # must be logged in; keeps drive-by spam out
):
    """
    A student adds their college when it isn't listed. If a college already
    exists within a few hundred metres, that one is returned (HTTP 200)
    instead of creating a duplicate, so the caller can just select it.
    """
    existing = find_nearby_college(db, payload.latitude, payload.longitude)
    if existing is not None:
        response.status_code = 200
        return serialize_college(existing)

    college = College(
        name=with_acronym(payload.name),
        city=payload.city or "India",
        location=WKTElement(f"POINT({payload.longitude} {payload.latitude})", srid=4326),
    )
    db.add(college)
    db.commit()
    db.refresh(college)
    return serialize_college(college)
