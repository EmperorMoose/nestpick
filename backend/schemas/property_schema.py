from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, HttpUrl, Field, field_validator
from urllib.parse import urlparse


class PriceHistoryItem(BaseModel):
    event_date: str | None
    price: int | None
    event_type: str | None
    source: str | None


class TaxHistoryItem(BaseModel):
    tax_year: int | None
    tax_amount: int | None
    assessed_value: int | None


class SchoolInfo(BaseModel):
    id: int
    name: str
    school_type: str | None
    greatschools_rating: int | None
    nc_dpi_grade: str | None
    proficiency_pct: float | None
    distance_mi: float | None
    is_assigned: bool


class PropertyBase(BaseModel):
    address: str
    street: str | None = None
    city: str | None = None
    state: str | None = "NC"
    zip: str | None = None
    list_price: int | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    living_area: int | None = None
    lot_size: float | None = None
    year_built: int | None = None
    property_type: str | None = None
    hoa_fee: int | None = None
    description: str | None = None


class PropertyCreate(PropertyBase):
    zillow_url: str | None = None
    mls_number: str | None = None


class PropertyScrapeRequest(BaseModel):
    url: str


class BrowserListingImport(PropertyCreate):
    address: str = Field(min_length=1, max_length=500)
    zillow_url: str
    photos: list[HttpUrl] = Field(default_factory=list, max_length=20)
    home_status: str | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("zillow_url")
    @classmethod
    def listing_url(cls, value):
        parsed = urlparse(value)
        if parsed.scheme != "https" or parsed.hostname not in {"zillow.com", "www.zillow.com"} or "/homedetails/" not in parsed.path:
            raise ValueError("Use a Zillow home details URL")
        return value.split("?")[0].split("#")[0]

    @field_validator("address")
    @classmethod
    def nonblank_address(cls, value):
        if not value.strip():
            raise ValueError("Address is required")
        return value.strip()


class PropertyUpdate(BaseModel):
    list_price: int | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    living_area: int | None = None
    hoa_fee: int | None = None
    notes: str | None = None


class PropertyResponse(PropertyBase):
    id: int
    zillow_id: str | None
    zpid: str | None
    mls_number: str | None
    parcel_id: str | None
    zillow_url: str | None
    lat: float | None
    lng: float | None
    census_tract: str | None
    zestimate: int | None
    rent_zestimate: int | None
    price_per_sqft: float | None
    home_status: str | None
    days_on_market: int | None
    stories: int | None
    garage_spaces: int | None
    has_pool: bool | None
    assessed_value: int | None
    land_value: int | None
    building_value: int | None
    annual_tax: int | None
    photos_json: str | None
    features_json: str | None
    data_source: str | None
    created_at: datetime
    updated_at: datetime
    price_history: list[PriceHistoryItem] = []
    tax_history: list[TaxHistoryItem] = []
    schools: list[SchoolInfo] = []

    model_config = {"from_attributes": True}


class PropertyListItem(BaseModel):
    id: int
    address: str
    city: str | None
    list_price: int | None
    offer_price: int | None = None
    bedrooms: int | None
    bathrooms: float | None
    living_area: int | None
    year_built: int | None
    home_status: str | None
    photos_json: str | None
    data_source: str | None
    updated_at: datetime
    is_top_option: bool = False
    avg_rating: float | None = None

    model_config = {"from_attributes": True}


class ScrapeStatus(BaseModel):
    success: bool
    property_id: int | None = None
    message: str
    zillow_ok: bool = False
    polaris_ok: bool = False
