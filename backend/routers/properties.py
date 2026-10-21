from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import PriceHistory, Property, PropertyRating, PropertySchool, School, TaxHistory
from schemas.property_schema import (
    PropertyCreate,
    PropertyListItem,
    PropertyResponse,
    PropertyScrapeRequest,
    PropertyUpdate,
    ScrapeStatus,
    BrowserListingImport,
)
from services import geocoder, polaris_service, enrichment_service
from services import zillow_scraper

router = APIRouter(prefix="/api/properties", tags=["properties"])


def _build_response(prop: Property) -> dict:
    """Convert ORM property with relationships to response dict."""
    data = {c.name: getattr(prop, c.name) for c in prop.__table__.columns}
    data["price_history"] = [
        {"event_date": ph.event_date, "price": ph.price, "event_type": ph.event_type, "source": ph.source}
        for ph in prop.price_history
    ]
    data["tax_history"] = [
        {"tax_year": th.tax_year, "tax_amount": th.tax_amount, "assessed_value": th.assessed_value}
        for th in prop.tax_history
    ]
    data["schools"] = [
        {
            "id": ps.school.id,
            "name": ps.school.name,
            "school_type": ps.school.school_type,
            "greatschools_rating": ps.school.greatschools_rating,
            "nc_dpi_grade": ps.school.nc_dpi_grade,
            "proficiency_pct": ps.school.proficiency_pct,
            "distance_mi": ps.distance_mi,
            "is_assigned": ps.is_assigned,
        }
        for ps in prop.schools
    ]
    return data


_RATING_CATS = ["layout", "aesthetics", "upkeep", "yard", "area", "neighborhood", "overall"]


@router.get("", response_model=list[PropertyListItem])
async def list_properties(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Property)
        .options(selectinload(Property.ratings))
        # Top options first, then newest
        .order_by(Property.is_top_option.desc(), Property.created_at.desc())
    )
    props = result.scalars().all()

    items = []
    for p in props:
        all_vals = [
            getattr(r, cat)
            for r in p.ratings
            for cat in _RATING_CATS
            if getattr(r, cat) is not None
        ]
        avg = round(sum(all_vals) / len(all_vals), 1) if all_vals else None
        items.append({
            "id": p.id,
            "address": p.address,
            "city": p.city,
            "list_price": p.list_price,
            "offer_price": p.offer_price,
            "bedrooms": p.bedrooms,
            "bathrooms": p.bathrooms,
            "living_area": p.living_area,
            "year_built": p.year_built,
            "home_status": p.home_status,
            "photos_json": p.photos_json,
            "data_source": p.data_source,
            "updated_at": p.updated_at,
            "is_top_option": p.is_top_option,
            "avg_rating": avg,
        })
    return items


@router.get("/{property_id}", response_model=dict)
async def get_property(property_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Property)
        .where(Property.id == property_id)
        .options(
            selectinload(Property.price_history),
            selectinload(Property.tax_history),
            selectinload(Property.schools).selectinload(PropertySchool.school),
        )
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return _build_response(prop)


@router.post("/scrape", response_model=ScrapeStatus)
async def scrape_property(
    body: PropertyScrapeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    zillow_data: dict[str, Any] = {}
    polaris_data: dict[str, Any] = {}
    zillow_ok = False
    polaris_ok = False

    # 1. Extract address info from the URL itself (works even if Zillow blocks)
    url_address, zpid = zillow_scraper.extract_address_from_url(body.url)
    street_number, street_name_frag = zillow_scraper.parse_street_from_url(body.url)

    # 0. Check if property already exists by URL or ZPID — update rather than insert
    existing_prop: Property | None = None
    existing_check = await db.execute(
        select(Property).where(
            (Property.zillow_url == body.url) | (Property.zpid == zpid if zpid else False)
        )
    )
    existing_prop = existing_check.scalar_one_or_none()

    # 2. Try Zillow scrape (may be blocked)
    try:
        zillow_data = await zillow_scraper.scrape(body.url)
        zillow_ok = True
    except Exception:
        logging.getLogger(__name__).exception("Zillow import failed; trying county records")

    # 3. Always try POLARIS via address parsed from URL (independent of Zillow)
    if street_number and street_name_frag:
        try:
            polaris_data = await polaris_service.fetch_by_address(street_number, street_name_frag)
            polaris_ok = bool(polaris_data)
        except Exception:
            pass

    # 4. Geocode: prefer Zillow coords, fall back to POLARIS coords, then geocoder
    lat = zillow_data.get("lat") or polaris_data.get("lat")
    lng = zillow_data.get("lng") or polaris_data.get("lng")
    geo: dict = {}
    # Build full address for Census geocoder (needs city+state for accurate results)
    street = zillow_data.get("address") or url_address
    city = zillow_data.get("city", "")
    state = zillow_data.get("state", "NC")
    zip_code = zillow_data.get("zip", "")
    suffix = " ".join(filter(None, [city, state, zip_code]))
    geocode_address = f"{street} {suffix}".strip() if suffix else street
    if geocode_address:
        geo = await geocoder.geocode(geocode_address)
        if not lat:
            lat = geo.get("lat")
        if not lng:
            lng = geo.get("lng")

    # 5. If coords available and POLARIS not yet found, try spatial lookup
    if lat and lng and not polaris_ok:
        try:
            polaris_data = await polaris_service.fetch_by_coords(lat, lng)
            polaris_ok = bool(polaris_data)
        except Exception:
            pass

    # 5b. If census_tract still missing but we have coords, use coordinate lookup (more reliable)
    if lat and lng and not geo.get("census_tract"):
        try:
            coords_geo = await geocoder.census_tract_from_coords(lat, lng)
            if coords_geo.get("census_tract"):
                geo = {**geo, **coords_geo}
        except Exception:
            pass

    if not zillow_ok and not polaris_ok:
        return ScrapeStatus(
            success=False,
            message="Could not retrieve property data from Zillow or county records. Try adding manually.",
            zillow_ok=False,
            polaris_ok=False,
        )

    # 4. Build property record (upsert: update existing or create new)
    census_tract = geo.get("census_tract")
    state_fips = geo.get("state_fips", "37")
    county_fips = geo.get("county_fips", "119")

    merged = _merge_property_data(zillow_data, polaris_data, geo)
    raw_json = json.dumps(zillow_data.get("_raw")) if zillow_data.get("_raw") else None

    if existing_prop:
        # Update in-place — refresh data without creating duplicate
        for field, value in merged.items():
            if value is not None:  # don't overwrite good data with nulls
                setattr(existing_prop, field, value)
        existing_prop.zillow_url = body.url
        existing_prop.data_source = "zillow" if zillow_ok else "polaris"
        if raw_json:
            existing_prop.raw_zillow_json = raw_json
        prop = existing_prop
    else:
        prop = Property(
            zillow_url=body.url,
            data_source="zillow" if zillow_ok else "polaris",
            raw_zillow_json=raw_json,
            **merged,
        )
        db.add(prop)

    await db.flush()  # get the ID

    # 5. Price + tax history (only on fresh insert)
    if not existing_prop:
        for ph in zillow_data.get("price_history", []):
            db.add(PriceHistory(property_id=prop.id, **ph))

        for th in zillow_data.get("tax_history", []):
            db.add(TaxHistory(property_id=prop.id, **th))

    # 6. Schools — only on fresh insert
    if not existing_prop:
        for school_data in zillow_data.get("schools", [])[:5]:
            if not school_data.get("name"):
                continue
            school = School(
                name=school_data["name"],
                school_type=school_data.get("school_type"),
                greatschools_rating=school_data.get("greatschools_rating"),
            )
            db.add(school)
            await db.flush()
            db.add(PropertySchool(
                property_id=prop.id,
                school_id=school.id,
                distance_mi=school_data.get("distance"),
            ))

    await db.commit()

    # 7. Background enrichment (neighborhood data)
    if lat and lng and census_tract:
        background_tasks.add_task(
            enrichment_service.enrich_property,
            db=db,
            lat=lat,
            lng=lng,
            census_tract=census_tract,
            address=prop.address or "",
            state_fips=state_fips,
            county_fips=county_fips,
        )

    if zillow_ok:
        msg = "Property saved successfully."
    else:
        msg = "Saved using county records only — Zillow data (price, photos, description) is unavailable. This is common on the deployed server."

    return ScrapeStatus(
        success=True,
        property_id=prop.id,
        message=msg,
        zillow_ok=zillow_ok,
        polaris_ok=polaris_ok,
    )


@router.post("/browser-import", response_model=dict)
async def import_browser_listing(body: BrowserListingImport, db: AsyncSession = Depends(get_db)):
    """Save user-copied listing data without requesting Zillow from the server."""
    _, zpid = zillow_scraper.extract_address_from_url(body.zillow_url)
    result = await db.execute(select(Property).where(
        (Property.zillow_url == body.zillow_url) | (Property.zpid == zpid if zpid else False)
    ))
    prop = result.scalars().first()
    if prop is None:
        prop = Property(address=body.address)
        db.add(prop)
    values = body.model_dump(exclude={"photos"}, exclude_none=True, exclude_unset=True)
    for field, value in values.items():
        if value != "":
            setattr(prop, field, value)
    if body.photos:
        prop.photos_json = json.dumps([str(url) for url in body.photos])
    if zpid:
        prop.zpid = zpid
        prop.zillow_id = zpid
    prop.data_source = "browser_import"
    if prop.list_price and prop.living_area:
        prop.price_per_sqft = round(prop.list_price / prop.living_area, 2)
    await db.commit()
    await db.refresh(prop)
    return {"id": prop.id, "address": prop.address}


@router.post("/manual", response_model=dict)
async def create_manual(body: PropertyCreate, db: AsyncSession = Depends(get_db)):
    geo = await geocoder.geocode(body.address)
    prop = Property(
        **body.model_dump(),
        lat=geo.get("lat"),
        lng=geo.get("lng"),
        census_tract=geo.get("census_tract"),
        data_source="manual",
    )
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return {"id": prop.id, "address": prop.address}


@router.patch("/{property_id}", response_model=dict)
async def update_property(property_id: int, body: PropertyUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(prop, field, value)
    await db.commit()
    return {"id": prop.id}


@router.patch("/{property_id}/top", response_model=dict)
async def toggle_top_option(property_id: int, db: AsyncSession = Depends(get_db)):
    """Toggle the is_top_option flag for a property."""
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    prop.is_top_option = not prop.is_top_option
    await db.commit()
    return {"id": prop.id, "is_top_option": prop.is_top_option}


@router.patch("/{property_id}/offer", response_model=dict)
async def set_offer_price(
    property_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Save (or clear) an intended offer price for a property."""
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    offer = body.get("offer_price")
    prop.offer_price = int(offer) if offer else None
    await db.commit()
    return {"id": prop.id, "offer_price": prop.offer_price}


@router.delete("/{property_id}")
async def delete_property(property_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    await db.delete(prop)
    await db.commit()
    return {"ok": True}


@router.post("/{property_id}/refresh", response_model=ScrapeStatus)
async def refresh_property(property_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop or not prop.zillow_url:
        raise HTTPException(status_code=400, detail="Property has no Zillow URL to refresh from")
    return await scrape_property(
        PropertyScrapeRequest(url=prop.zillow_url), background_tasks, db
    )


def _merge_property_data(zillow: dict, polaris: dict, geo: dict) -> dict:
    lot_size = zillow.get("lot_size") or polaris.get("lot_size_sqft")

    full_baths = polaris.get("full_baths") or 0
    half_baths = polaris.get("half_baths") or 0
    polaris_baths = (full_baths + half_baths * 0.5) if (full_baths or half_baths) else None

    living_area = zillow.get("living_area") or polaris.get("heated_sqft")

    # Compute annual tax from rate × assessed_value (Zillow gives rate as %)
    assessed = polaris.get("assessed_value")
    tax_rate = zillow.get("property_tax_rate")
    annual_tax = int(float(tax_rate) * assessed / 100) if (tax_rate and assessed) else None

    return {
        "zillow_id": zillow.get("zillow_id"),
        "zpid": zillow.get("zpid"),
        "mls_number": zillow.get("mls_number"),
        "parcel_id": polaris.get("parcel_id"),
        "address": zillow.get("address", ""),
        "street": zillow.get("street"),
        "city": zillow.get("city"),
        "state": zillow.get("state", "NC"),
        "zip": zillow.get("zip"),
        "lat": zillow.get("lat") or polaris.get("lat") or geo.get("lat"),
        "lng": zillow.get("lng") or polaris.get("lng") or geo.get("lng"),
        "census_tract": geo.get("census_tract"),
        "census_block": geo.get("census_block"),
        "list_price": zillow.get("list_price"),
        "zestimate": zillow.get("zestimate"),
        "rent_zestimate": zillow.get("rent_zestimate"),
        "price_per_sqft": (
            round(zillow["list_price"] / living_area, 2)
            if zillow.get("list_price") and living_area
            else None
        ),
        "home_status": zillow.get("home_status"),
        "days_on_market": zillow.get("days_on_market"),
        "bedrooms": zillow.get("bedrooms") or polaris.get("bedrooms"),
        "bathrooms": zillow.get("bathrooms") or polaris_baths,
        "living_area": living_area,
        "lot_size": lot_size,
        "year_built": zillow.get("year_built") or polaris.get("year_built"),
        "property_type": zillow.get("property_type") or polaris.get("building_type"),
        "stories": zillow.get("stories"),
        "garage_spaces": zillow.get("garage_spaces"),
        "has_pool": zillow.get("has_pool"),
        "hoa_fee": zillow.get("hoa_fee"),
        "assessed_value": polaris.get("assessed_value"),
        "land_value": polaris.get("land_value"),
        "building_value": polaris.get("building_value"),
        "annual_tax": annual_tax,
        "description": zillow.get("description"),
        "photos_json": zillow.get("photos_json"),
    }
