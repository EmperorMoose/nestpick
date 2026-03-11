"""
Orchestrates all neighborhood data services for a property.
Called after a property is saved to populate neighborhood_data.
"""
from __future__ import annotations

import asyncio
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import NeighborhoodData
from services import census_service, crime_service, fema_service, walkscore_service


async def enrich_property(
    db: AsyncSession,
    lat: float,
    lng: float,
    census_tract: str,
    address: str,
    state_fips: str = "37",
    county_fips: str = "119",
) -> NeighborhoodData:
    """Fetch all neighborhood data for a property and upsert into neighborhood_data table."""

    # Check if we have fresh data already
    result = await db.execute(select(NeighborhoodData).where(NeighborhoodData.census_tract == census_tract))
    existing = result.scalar_one_or_none()

    if existing:
        # Refresh if crime data is stale (>30 days) or ACS demographics are missing
        needs_crime_refresh = (
            existing.crime_last_fetched is None
            or (datetime.utcnow() - existing.crime_last_fetched).days > 30
        )
        needs_acs_refresh = existing.median_income is None
        if not needs_crime_refresh and not needs_acs_refresh:
            return existing

    # Run all fetches in parallel
    tract_code = census_tract[-6:] if len(census_tract) >= 6 else census_tract

    acs_data, crime_data, flood_data, walk_data = await asyncio.gather(
        census_service.fetch_tract_demographics(state_fips, county_fips, tract_code),
        crime_service.fetch_crime_data(lat, lng),
        fema_service.fetch_flood_zone(lat, lng),
        walkscore_service.fetch_scores(lat, lng, address),
        return_exceptions=True,
    )

    # Build update dict, skipping any failed fetches
    update: dict = {"census_tract": census_tract, "data_fetched_at": datetime.utcnow()}

    if isinstance(acs_data, dict):
        update.update(acs_data)

    if isinstance(crime_data, dict):
        update["total_crimes_1yr"] = crime_data.get("total")
        update["violent_crimes_1yr"] = crime_data.get("violent")
        update["property_crimes_1yr"] = crime_data.get("property")
        update["crime_last_fetched"] = datetime.utcnow()

    if isinstance(flood_data, dict):
        update.update(flood_data)

    if isinstance(walk_data, dict):
        update.update(walk_data)

    if existing:
        for k, v in update.items():
            setattr(existing, k, v)
        neighborhood = existing
    else:
        neighborhood = NeighborhoodData(**update)
        db.add(neighborhood)

    try:
        await db.commit()
        await db.refresh(neighborhood)
    except Exception:
        # Race condition: another task committed first — rollback and fetch existing
        await db.rollback()
        result2 = await db.execute(
            select(NeighborhoodData).where(NeighborhoodData.census_tract == census_tract)
        )
        neighborhood = result2.scalar_one_or_none()

    return neighborhood
