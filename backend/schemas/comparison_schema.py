from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from schemas.property_schema import PropertyListItem


class ComparisonItemResponse(BaseModel):
    property: PropertyListItem
    added_at: datetime
    notes: str | None
    user_rating: int | None

    model_config = {"from_attributes": True}


class ComparisonListResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    items: list[ComparisonItemResponse] = []

    model_config = {"from_attributes": True}


class ComparisonListCreate(BaseModel):
    name: str = "My Comparison"


class ComparisonMatrixRow(BaseModel):
    label: str
    values: list[str | int | float | bool | None]
    # Raw numeric values for delta computation (empty list = no delta for this row)
    raw: list[float | None] = []


class ComparisonMatrix(BaseModel):
    property_ids: list[int]
    addresses: list[str]
    rows: list[ComparisonMatrixRow]
