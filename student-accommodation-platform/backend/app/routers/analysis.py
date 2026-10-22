import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.listing_analyzer import AIUnavailable, ListingFacts, generate_feedback
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.listing import Listing
from app.models.user import User, UserRole
from app.schemas.analysis import ListingAnalysisOut, QualityIssue
from app.services.listing_quality import check_listing

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/listings", tags=["analysis"])

ROOM_TYPE_LABELS = {
    "single": "Single room",
    "shared_2": "Shared (2 sharing)",
    "shared_3_plus": "Shared (3 or more sharing)",
    "flat": "Full flat",
}


@router.post("/{listing_id}/analyze", response_model=ListingAnalysisOut)
def analyze_listing(
    listing_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You can only analyze your own listings")

    amenity_names = [a.name for a in listing.amenities]
    report = check_listing(
        description=listing.description,
        address_line=listing.address_line,
        image_count=len(listing.images),
        has_ac=listing.has_ac,
        has_wifi=listing.has_wifi,
        food_included=listing.food_included,
        amenity_names=amenity_names,
    )

    improved, suggestions, note, ai_ok = None, [], None, False
    try:
        feedback, note = generate_feedback(
            ListingFacts(
                title=listing.title,
                room_type_label=ROOM_TYPE_LABELS.get(listing.room_type.value, listing.room_type.value),
                monthly_rent=float(listing.monthly_rent),
                has_ac=listing.has_ac,
                has_wifi=listing.has_wifi,
                food_included=listing.food_included,
                amenity_names=amenity_names,
                address_line=listing.address_line,
                city=listing.city,
                description=listing.description,
            )
        )
        ai_ok = True
        if feedback is not None:
            improved = feedback.improved_description or None
            suggestions = feedback.suggestions
    except AIUnavailable as exc:
        note = str(exc)
    except Exception:
        # Log the real error for the developer; show the owner a safe message
        # (provider errors can echo request details we don't want to expose).
        logger.exception("Listing analysis: AI step failed")
        note = "The AI suggestions couldn't be generated just now. The checks above still apply."

    return ListingAnalysisOut(
        score=report.score,
        issues=[QualityIssue(code=i.code, message=i.message) for i in report.issues],
        ai_available=ai_ok,
        ai_note=note,
        improved_description=improved,
        suggestions=suggestions,
    )
