from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.college import College
from app.schemas.college import CollegeOut
from app.services.colleges import serialize_college

router = APIRouter(prefix="/colleges", tags=["colleges"])


@router.get("", response_model=list[CollegeOut])
def list_colleges(db: Session = Depends(get_db)):
    """Public list that powers the 'near my college' selector on /search."""
    colleges = db.query(College).order_by(College.name).all()
    return [serialize_college(c) for c in colleges]
