import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.image import ListingImage
from app.models.listing import Listing
from app.models.user import User, UserRole

router = APIRouter(prefix="/listings", tags=["images"])

# Local dev storage. Swap this function for a Cloudinary/Firebase Storage
# upload call before deploying — everything downstream (the ListingImage
# row, the URL returned to the frontend) stays the same either way.
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_MB = 5


def _save_locally(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed")

    ext = Path(file.filename or "").suffix or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = UPLOAD_DIR / filename

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Image must be under {MAX_FILE_SIZE_MB}MB")

    dest.write_bytes(contents)
    # Served via the /uploads static mount registered in app/main.py
    return f"/uploads/{filename}"


@router.post("/{listing_id}/images", status_code=201)
def upload_listing_image(
    listing_id: uuid.UUID,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You can only add images to your own listings")

    url = _save_locally(file)
    image = ListingImage(listing_id=listing.id, url=url)
    db.add(image)
    db.commit()
    db.refresh(image)
    return {"id": image.id, "url": image.url}


@router.delete("/{listing_id}/images/{image_id}", status_code=204)
def delete_listing_image(
    listing_id: uuid.UUID,
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You can only remove images from your own listings")

    image = db.query(ListingImage).filter(ListingImage.id == image_id, ListingImage.listing_id == listing_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    db.delete(image)
    db.commit()
