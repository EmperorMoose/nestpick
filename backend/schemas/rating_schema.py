from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

RATING_FIELDS = ["layout", "aesthetics", "upkeep", "yard", "area", "neighborhood", "overall"]


class RatingUpsert(BaseModel):
    layout: Optional[int] = None
    aesthetics: Optional[int] = None
    upkeep: Optional[int] = None
    yard: Optional[int] = None
    area: Optional[int] = None
    neighborhood: Optional[int] = None
    overall: Optional[int] = None

    @field_validator("layout", "aesthetics", "upkeep", "yard", "area", "neighborhood", "overall", mode="before")
    @classmethod
    def check_range(cls, v):
        if v is not None and not (1 <= int(v) <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return v


class RatingResponse(BaseModel):
    user_name: str
    layout: Optional[int]
    aesthetics: Optional[int]
    upkeep: Optional[int]
    yard: Optional[int]
    area: Optional[int]
    neighborhood: Optional[int]
    overall: Optional[int]
    updated_at: datetime

    model_config = {"from_attributes": True}
