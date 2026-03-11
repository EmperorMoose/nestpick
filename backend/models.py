from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Identifiers
    zillow_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    zpid: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    mls_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    parcel_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    zillow_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Address
    address: Mapped[str] = mapped_column(String, nullable=False)
    street: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String, default="NC", nullable=True)
    zip: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Census geography
    census_tract: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    census_block: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Listing data
    list_price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    zestimate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rent_zestimate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_per_sqft: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    home_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    days_on_market: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Property facts
    bedrooms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bathrooms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    living_area: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    lot_size: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    year_built: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    property_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    stories: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    garage_spaces: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    has_pool: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    hoa_fee: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # County assessment
    assessed_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    land_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    building_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    annual_tax: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Content
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photos_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    features_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_zillow_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_source: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    price_history: Mapped[List[PriceHistory]] = relationship(back_populates="property", cascade="all, delete-orphan")
    tax_history: Mapped[List[TaxHistory]] = relationship(back_populates="property", cascade="all, delete-orphan")
    schools: Mapped[List[PropertySchool]] = relationship(back_populates="property", cascade="all, delete-orphan")
    comparison_items: Mapped[List[ComparisonItem]] = relationship(back_populates="property", cascade="all, delete-orphan")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    property_id: Mapped[int] = mapped_column(Integer, ForeignKey("properties.id", ondelete="CASCADE"))
    event_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    event_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    property: Mapped[Property] = relationship(back_populates="price_history")


class TaxHistory(Base):
    __tablename__ = "tax_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    property_id: Mapped[int] = mapped_column(Integer, ForeignKey("properties.id", ondelete="CASCADE"))
    tax_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tax_amount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    assessed_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    property: Mapped[Property] = relationship(back_populates="tax_history")


class NeighborhoodData(Base):
    __tablename__ = "neighborhood_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    census_tract: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    # ACS Demographics
    median_income: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    median_home_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    median_rent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_population: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pct_owner_occupied: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pct_college_degree: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pct_poverty: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pct_unemployed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    median_year_built: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    avg_commute_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Racial composition
    pct_white: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pct_black: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pct_hispanic: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pct_asian: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Crime
    crime_radius_miles: Mapped[Optional[float]] = mapped_column(Float, default=1.0)
    total_crimes_1yr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    violent_crimes_1yr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    property_crimes_1yr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    crime_last_fetched: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Walk Score
    walk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    transit_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bike_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    walk_score_desc: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Flood zone
    flood_zone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_sfha: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Environmental
    air_quality_index: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    diesel_pm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    traffic_proximity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Metadata
    data_fetched_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    acs_vintage: Mapped[Optional[int]] = mapped_column(Integer, default=2023)


class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    school_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    greatschools_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    nc_dpi_grade: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    proficiency_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    nces_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    dpi_school_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    property_links: Mapped[List[PropertySchool]] = relationship(back_populates="school", cascade="all, delete-orphan")


class PropertySchool(Base):
    __tablename__ = "property_schools"

    property_id: Mapped[int] = mapped_column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True)
    school_id: Mapped[int] = mapped_column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), primary_key=True)
    distance_mi: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_assigned: Mapped[bool] = mapped_column(Boolean, default=False)

    property: Mapped[Property] = relationship(back_populates="schools")
    school: Mapped[School] = relationship(back_populates="property_links")


class ComparisonList(Base):
    __tablename__ = "comparison_lists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, default="My Comparison")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    items: Mapped[List[ComparisonItem]] = relationship(back_populates="comparison", cascade="all, delete-orphan")


class ComparisonItem(Base):
    __tablename__ = "comparison_items"

    comparison_id: Mapped[int] = mapped_column(Integer, ForeignKey("comparison_lists.id", ondelete="CASCADE"), primary_key=True)
    property_id: Mapped[int] = mapped_column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True)
    added_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    comparison: Mapped[ComparisonList] = relationship(back_populates="items")
    property: Mapped[Property] = relationship(back_populates="comparison_items")
