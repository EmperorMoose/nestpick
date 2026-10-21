from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CrimeIncident(BaseModel):
    date: str | None
    category: str | None
    description: str | None
    lat: float | None
    lng: float | None


class NeighborhoodResponse(BaseModel):
    acs_vintage: int | None = None
    census_tract: str
    # ACS
    median_income: int | None
    median_home_value: int | None
    median_rent: int | None
    total_population: int | None
    pct_owner_occupied: float | None
    pct_college_degree: float | None
    pct_poverty: float | None
    pct_unemployed: float | None
    median_year_built: int | None
    pct_white: float | None
    pct_black: float | None
    pct_hispanic: float | None
    pct_asian: float | None
    # Crime
    total_crimes_1yr: int | None
    violent_crimes_1yr: int | None
    property_crimes_1yr: int | None
    crime_last_fetched: datetime | None
    # Walk Score
    walk_score: int | None
    transit_score: int | None
    bike_score: int | None
    walk_score_desc: str | None
    # Flood
    flood_zone: str | None
    is_sfha: bool | None
    # Environmental
    air_quality_index: float | None
    diesel_pm: float | None
    traffic_proximity: float | None
    # Meta
    data_fetched_at: datetime

    model_config = {"from_attributes": True}
