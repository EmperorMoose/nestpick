from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, AsyncSessionLocal
from models import NeighborhoodData, Property
from schemas.neighborhood_schema import NeighborhoodResponse
from services import crime_service, enrichment_service, geocoder

router = APIRouter(prefix="/api", tags=["neighborhood"])


async def _enrich_neighborhood(**kwargs):
    # Background work must own its session rather than reusing a request session.
    async with AsyncSessionLocal() as session:
        await enrichment_service.enrich_property(db=session, **kwargs)


@router.get("/neighborhood/{census_tract}", response_model=NeighborhoodResponse)
async def get_neighborhood(census_tract: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NeighborhoodData).where(NeighborhoodData.census_tract == census_tract)
    )
    nd = result.scalar_one_or_none()
    if not nd:
        raise HTTPException(status_code=404, detail="Neighborhood data not yet fetched for this tract")
    return nd


@router.get("/properties/{property_id}/neighborhood")
async def get_property_neighborhood(
    property_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Browser imports may include an address but no coordinates.
    if prop.lat is None or prop.lng is None:
        address = " ".join(str(part) for part in [prop.address, prop.city, prop.state, prop.zip] if part)
        geo = await geocoder.geocode(address)
        if geo.get("lat") is not None and geo.get("lng") is not None:
            prop.lat, prop.lng = geo["lat"], geo["lng"]
        if geo.get("census_tract"):
            prop.census_tract = geo["census_tract"]
            prop.census_block = geo.get("census_block")
        await db.commit()

    # If census_tract is missing but we have coordinates, resolve it on-demand
    if not prop.census_tract and prop.lat is not None and prop.lng is not None:
        geo = await geocoder.census_tract_from_coords(prop.lat, prop.lng)
        if geo.get("census_tract"):
            prop.census_tract = geo["census_tract"]
            prop.census_block = geo.get("census_block")
            await db.commit()

    if not prop.census_tract:
        raise HTTPException(status_code=404, detail="Census tract not available for this property")

    # Check if neighborhood data exists
    nd_result = await db.execute(
        select(NeighborhoodData).where(NeighborhoodData.census_tract == prop.census_tract)
    )
    nd = nd_result.scalar_one_or_none()

    # Helper for scheduling enrichment
    def _enqueue_enrichment():
        background_tasks.add_task(
            _enrich_neighborhood,
            lat=prop.lat,
            lng=prop.lng,
            census_tract=prop.census_tract,
            address=prop.address or "",
            state_fips=prop.census_tract[:2] if prop.census_tract else "37",
            county_fips=prop.census_tract[2:5] if prop.census_tract else "119",
        )

    # No record yet — trigger enrichment and tell the client to retry
    if not nd:
        _enqueue_enrichment()
        return {"status": "fetching", "message": "Neighborhood data is being fetched. Retry in 15 seconds."}

    # Record exists but ACS demographics are missing (e.g. Census API was down during initial fetch)
    # Trigger a background refresh; return the partial data we do have right away
    if nd.median_income is None and prop.lat and prop.lng:
        _enqueue_enrichment()

    return nd


@router.get("/properties/{property_id}/crime")
async def get_property_crime(property_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop or not prop.lat or not prop.lng:
        raise HTTPException(status_code=404, detail="Property not found or missing coordinates")
    return await crime_service.fetch_crime_data(prop.lat, prop.lng)
