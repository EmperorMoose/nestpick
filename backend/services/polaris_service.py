"""
Mecklenburg County GIS — property data via confirmed ArcGIS endpoints.
Uses TaxParcel_camadata (building details) and TaxParcel_Camaownershipvalues (ownership/value).
"""
from __future__ import annotations

import json

import httpx

BASE = "https://meckgis.mecklenburgcountync.gov/server/rest/services"
CAMA_URL = f"{BASE}/TaxParcel_camadata/MapServer/0/query"
OWNERSHIP_URL = f"{BASE}/TaxParcel_Camaownershipvalues/MapServer/0/query"

HEADERS = {"User-Agent": "HouseDashboard/1.0"}

CAMA_FIELDS = (
    "pid,streetnumber,streetname,address,yearbuilt,heatedarea,"
    "bedrooms,fullbath,halfbath,totlandval,totalbldgval,totalvalue,"
    "saleprice,saledate,ownrlstnme,ownrfrstnme,gisacres,legalacres,"
    "bldgtype,storyheight,xcoord,ycoord"
)

OWNERSHIP_FIELDS = (
    "pid,full_owner_name,amt_landvalue,amt_netbldgvalue,amt_extrafeaturevalue,"
    "amt_totalvalue,amt_price,dte_dateofsale,txt_propertyuse_desc,"
    "situsaddress1,municipality_desc"
)


async def fetch_by_address(street_number: str, street_name: str) -> dict:
    """Look up parcel by street number and name fragment."""
    where = f"streetnumber='{street_number}' AND streetname LIKE '%{street_name.upper()}%'"
    params = {"where": where, "outFields": CAMA_FIELDS, "returnGeometry": "false", "f": "json"}

    async with httpx.AsyncClient(timeout=20, headers=HEADERS) as client:
        try:
            r = await client.get(CAMA_URL, params=params)
            features = r.json().get("features", [])
        except Exception:
            return {}

    if not features:
        return {}

    return _normalize_cama(features[0]["attributes"])


async def fetch_by_coords(lat: float, lng: float) -> dict:
    """Spatial query — find parcel at a lat/lng point."""
    geom = json.dumps({"x": lng, "y": lat, "spatialReference": {"wkid": 4326}})
    params = {
        "geometry": geom,
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": CAMA_FIELDS,
        "returnGeometry": "false",
        "f": "json",
    }
    async with httpx.AsyncClient(timeout=20, headers=HEADERS) as client:
        try:
            r = await client.get(CAMA_URL, params=params)
            features = r.json().get("features", [])
        except Exception:
            return {}

    if not features:
        return {}

    return _normalize_cama(features[0]["attributes"])


async def fetch_ownership_by_pid(pid: str) -> dict:
    """Get ownership + valuation data for a parcel ID."""
    params = {"where": f"pid='{pid}'", "outFields": OWNERSHIP_FIELDS, "returnGeometry": "false", "f": "json"}
    async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
        try:
            r = await client.get(OWNERSHIP_URL, params=params)
            features = r.json().get("features", [])
        except Exception:
            return {}
    return features[0]["attributes"] if features else {}


def _normalize_cama(attrs: dict) -> dict:
    def sf(k):
        v = attrs.get(k)
        try:
            return int(float(v)) if v is not None else None
        except (TypeError, ValueError):
            return None

    def ff(k):
        v = attrs.get(k)
        try:
            return float(v) if v is not None else None
        except (TypeError, ValueError):
            return None

    # Note: in this dataset xcoord = lat, ycoord = lng (confirmed from values)
    lat = ff("xcoord")
    lng = ff("ycoord")

    return {
        "parcel_id": attrs.get("pid"),
        "assessed_value": sf("totalvalue"),
        "land_value": sf("totlandval"),
        "building_value": sf("totalbldgval"),
        "last_sale_price": sf("saleprice"),
        "owner_name": attrs.get("ownrlstnme") or attrs.get("ownrfrstnme"),
        "lot_size_sqft": int(ff("legalacres") * 43560) if ff("legalacres") else None,
        "year_built": sf("yearbuilt"),
        "heated_sqft": sf("heatedarea"),
        "bedrooms": sf("bedrooms"),
        "full_baths": sf("fullbath"),
        "half_baths": sf("halfbath"),
        "building_type": attrs.get("bldgtype"),
        "stories": attrs.get("storyheight"),
        "address": attrs.get("address"),
        "lat": lat,
        "lng": lng,
    }
