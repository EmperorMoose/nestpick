from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import ComparisonItem, ComparisonList, NeighborhoodData, Property
from schemas.comparison_schema import (
    ComparisonListCreate,
    ComparisonListResponse,
    ComparisonMatrix,
    ComparisonMatrixRow,
)

router = APIRouter(prefix="/api/comparisons", tags=["comparisons"])

MAX_COMPARISON_DISPLAY = 4

PROP_TYPE_LABELS: dict[str, str] = {
    "SINGLE_FAMILY": "Single Family",
    "MULTI_FAMILY": "Multi-Family",
    "CONDO": "Condo",
    "TOWNHOUSE": "Townhouse",
    "MANUFACTURED": "Manufactured",
    "LOT": "Land/Lot",
    "APARTMENT": "Apartment",
}


def _fmt(value, prefix="", suffix="", decimals=0):
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, float):
        value = round(value, decimals)
        if decimals == 0:
            value = int(value)
    return f"{prefix}{value:,}{suffix}" if isinstance(value, (int, float)) else str(value)


def _fmt_flood_zone(nd: NeighborhoodData | None) -> str:
    if nd is None or nd.flood_zone is None:
        return "—"
    if nd.is_sfha:
        return f"Zone {nd.flood_zone} (High Risk)"
    if nd.flood_zone.startswith("X"):
        return "Zone X (Minimal)"
    return f"Zone {nd.flood_zone}"


def _calc_pmt(price: int | None, rate_pct: float, discount: float = 1.0) -> str:
    """Monthly P&I: 20% down, 30-year fixed."""
    if not price:
        return "—"
    loan = price * discount * 0.80
    r = rate_pct / 100 / 12
    n = 360
    pmt = loan * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
    return f"${int(round(pmt)):,}/mo"


def _calc_pmt_raw(price: int | None, rate_pct: float, discount: float = 1.0) -> float | None:
    """Same as _calc_pmt but returns a raw float for delta computation."""
    if not price:
        return None
    loan = price * discount * 0.80
    r = rate_pct / 100 / 12
    n = 360
    return loan * (r * (1 + r) ** n) / ((1 + r) ** n - 1)


@router.get("", response_model=list[ComparisonListResponse])
async def list_comparisons(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ComparisonList)
        .options(selectinload(ComparisonList.items).selectinload(ComparisonItem.property))
        .order_by(ComparisonList.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ComparisonListResponse)
async def create_comparison(body: ComparisonListCreate, db: AsyncSession = Depends(get_db)):
    comp = ComparisonList(name=body.name)
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp


@router.get("/{comparison_id}", response_model=ComparisonListResponse)
async def get_comparison(comparison_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ComparisonList)
        .where(ComparisonList.id == comparison_id)
        .options(selectinload(ComparisonList.items).selectinload(ComparisonItem.property))
    )
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Comparison not found")
    return comp


@router.post("/{comparison_id}/properties/{property_id}")
async def add_to_comparison(comparison_id: int, property_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ComparisonList).where(ComparisonList.id == comparison_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Comparison not found")

    existing = await db.execute(
        select(ComparisonItem).where(
            ComparisonItem.comparison_id == comparison_id,
            ComparisonItem.property_id == property_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"ok": True, "message": "Already in comparison"}

    db.add(ComparisonItem(comparison_id=comparison_id, property_id=property_id))
    await db.commit()
    return {"ok": True}


@router.delete("/{comparison_id}/properties/{property_id}")
async def remove_from_comparison(comparison_id: int, property_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ComparisonItem).where(
            ComparisonItem.comparison_id == comparison_id,
            ComparisonItem.property_id == property_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in comparison")
    await db.delete(item)
    await db.commit()
    return {"ok": True}


@router.get("/{comparison_id}/matrix", response_model=ComparisonMatrix)
async def get_comparison_matrix(comparison_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ComparisonList)
        .where(ComparisonList.id == comparison_id)
        .options(selectinload(ComparisonList.items).selectinload(ComparisonItem.property))
    )
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Comparison not found")

    props: list[Property] = [item.property for item in comp.items[:MAX_COMPARISON_DISPLAY]]

    # Load neighborhood data for all properties in one query
    census_tracts = [p.census_tract for p in props if p.census_tract]
    nd_map: dict[str, NeighborhoodData] = {}
    if census_tracts:
        nd_result = await db.execute(
            select(NeighborhoodData).where(NeighborhoodData.census_tract.in_(census_tracts))
        )
        for nd in nd_result.scalars().all():
            nd_map[nd.census_tract] = nd

    def get_nd(p: Property) -> NeighborhoodData | None:
        return nd_map.get(p.census_tract) if p.census_tract else None

    def row(label: str, getter, raw_getter=None) -> ComparisonMatrixRow:
        values = [getter(p) for p in props]
        raw = [raw_getter(p) for p in props] if raw_getter is not None else []
        return ComparisonMatrixRow(label=label, values=values, raw=raw)

    def nd_row(label: str, getter, raw_getter=None) -> ComparisonMatrixRow:
        values = [getter(get_nd(p)) for p in props]
        raw = [raw_getter(get_nd(p)) for p in props] if raw_getter is not None else []
        return ComparisonMatrixRow(label=label, values=values, raw=raw)

    rows = [
        # --- Listing ---
        row("List Price",      lambda p: _fmt(p.list_price, "$"),
                               lambda p: float(p.list_price) if p.list_price else None),
        row("Zestimate",       lambda p: _fmt(p.zestimate, "$"),
                               lambda p: float(p.zestimate) if p.zestimate else None),
        row("Price/sqft",      lambda p: _fmt(p.price_per_sqft, "$", "/sqft", 0),
                               lambda p: float(p.price_per_sqft) if p.price_per_sqft else None),
        row("Status",          lambda p: p.home_status.replace("_", " ").title() if p.home_status else "—"),  # categorical
        row("Days on Market",  lambda p: _fmt(p.days_on_market, suffix=" days"),
                               lambda p: float(p.days_on_market) if p.days_on_market is not None else None),
        # --- Property ---
        row("Beds",            lambda p: _fmt(p.bedrooms),
                               lambda p: float(p.bedrooms) if p.bedrooms is not None else None),
        row("Baths",           lambda p: str(int(p.bathrooms)) if p.bathrooms and p.bathrooms == int(p.bathrooms) else _fmt(p.bathrooms, decimals=1),
                               lambda p: float(p.bathrooms) if p.bathrooms is not None else None),
        row("Living Area",     lambda p: _fmt(p.living_area, suffix=" sqft"),
                               lambda p: float(p.living_area) if p.living_area is not None else None),
        row("Lot Size",        lambda p: _fmt(p.lot_size, suffix=" sqft"),
                               lambda p: float(p.lot_size) if p.lot_size is not None else None),
        row("Year Built",      lambda p: str(p.year_built) if p.year_built else "—",
                               lambda p: float(p.year_built) if p.year_built else None),
        row("Type",            lambda p: PROP_TYPE_LABELS.get(p.property_type or "", p.property_type or "—")),  # categorical
        row("HOA Fee/mo",      lambda p: _fmt(p.hoa_fee, "$"),
                               lambda p: float(p.hoa_fee) if p.hoa_fee is not None else None),
        row("Has Pool",        lambda p: _fmt(p.has_pool)),  # boolean — no delta
        row("Garage Spaces",   lambda p: _fmt(p.garage_spaces),
                               lambda p: float(p.garage_spaces) if p.garage_spaces is not None else None),
        # --- Financials ---
        row("Annual Tax",      lambda p: _fmt(p.annual_tax, "$"),
                               lambda p: float(p.annual_tax) if p.annual_tax is not None else None),
        row("Assessed Value",  lambda p: _fmt(p.assessed_value, "$"),
                               lambda p: float(p.assessed_value) if p.assessed_value else None),
        # --- Neighborhood ---
        nd_row("Median Income",      lambda nd: _fmt(nd.median_income, "$") if nd else "—",
                                     lambda nd: float(nd.median_income) if nd and nd.median_income is not None else None),
        nd_row("Median Home Value",  lambda nd: _fmt(nd.median_home_value, "$") if nd else "—",
                                     lambda nd: float(nd.median_home_value) if nd and nd.median_home_value is not None else None),
        nd_row("Walk Score",         lambda nd: _fmt(nd.walk_score) if nd else "—",
                                     lambda nd: float(nd.walk_score) if nd and nd.walk_score is not None else None),
        nd_row("Transit Score",      lambda nd: _fmt(nd.transit_score) if nd else "—",
                                     lambda nd: float(nd.transit_score) if nd and nd.transit_score is not None else None),
        nd_row("Bike Score",         lambda nd: _fmt(nd.bike_score) if nd else "—",
                                     lambda nd: float(nd.bike_score) if nd and nd.bike_score is not None else None),
        nd_row("Total Crimes (1yr)", lambda nd: _fmt(nd.total_crimes_1yr) if nd else "—",
                                     lambda nd: float(nd.total_crimes_1yr) if nd and nd.total_crimes_1yr is not None else None),
        nd_row("Violent Crimes (1yr)", lambda nd: _fmt(nd.violent_crimes_1yr) if nd else "—",
                                       lambda nd: float(nd.violent_crimes_1yr) if nd and nd.violent_crimes_1yr is not None else None),
        nd_row("Poverty Rate",       lambda nd: f"{nd.pct_poverty:.1f}%" if nd and nd.pct_poverty is not None else "—",
                                     lambda nd: float(nd.pct_poverty) if nd and nd.pct_poverty is not None else None),
        nd_row("Flood Zone",         _fmt_flood_zone),  # categorical — no delta
        # --- Monthly Payments (20% dn, 30yr fixed) ---
        row("Pmt @ 5.5% — list",  lambda p: _calc_pmt(p.list_price, 5.5),
                                   lambda p: _calc_pmt_raw(p.list_price, 5.5)),
        row("Pmt @ 6.0% — list",  lambda p: _calc_pmt(p.list_price, 6.0),
                                   lambda p: _calc_pmt_raw(p.list_price, 6.0)),
        row("Pmt @ 6.5% — list",  lambda p: _calc_pmt(p.list_price, 6.5),
                                   lambda p: _calc_pmt_raw(p.list_price, 6.5)),
        row("Pmt @ 5.5% — −10%", lambda p: _calc_pmt(p.list_price, 5.5, 0.9),
                                   lambda p: _calc_pmt_raw(p.list_price, 5.5, 0.9)),
        row("Pmt @ 6.0% — −10%", lambda p: _calc_pmt(p.list_price, 6.0, 0.9),
                                   lambda p: _calc_pmt_raw(p.list_price, 6.0, 0.9)),
        row("Pmt @ 6.5% — −10%", lambda p: _calc_pmt(p.list_price, 6.5, 0.9),
                                   lambda p: _calc_pmt_raw(p.list_price, 6.5, 0.9)),
    ]

    return ComparisonMatrix(
        property_ids=[p.id for p in props],
        addresses=[p.address for p in props],
        rows=rows,
    )
