from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Property, PropertyRating
from schemas.rating_schema import RATING_FIELDS, RatingResponse, RatingUpsert

router = APIRouter(prefix="/api/properties", tags=["ratings"])

VALID_USERS = {"pierce", "rach"}


@router.get("/{property_id}/ratings", response_model=list[RatingResponse])
async def get_ratings(property_id: int, db: AsyncSession = Depends(get_db)):
    # Verify property exists
    prop = await db.get(Property, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    result = await db.execute(
        select(PropertyRating).where(PropertyRating.property_id == property_id)
    )
    return result.scalars().all()


@router.put("/{property_id}/ratings/{user}", response_model=RatingResponse)
async def upsert_rating(
    property_id: int,
    user: str,
    body: RatingUpsert,
    db: AsyncSession = Depends(get_db),
):
    if user.lower() not in VALID_USERS:
        raise HTTPException(status_code=400, detail=f"Unknown user '{user}'. Must be one of: {VALID_USERS}")

    prop = await db.get(Property, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    result = await db.execute(
        select(PropertyRating).where(
            PropertyRating.property_id == property_id,
            PropertyRating.user_name == user.lower(),
        )
    )
    rating = result.scalar_one_or_none()

    if not rating:
        rating = PropertyRating(property_id=property_id, user_name=user.lower())
        db.add(rating)

    for field in RATING_FIELDS:
        setattr(rating, field, getattr(body, field))

    await db.commit()
    await db.refresh(rating)
    return rating
