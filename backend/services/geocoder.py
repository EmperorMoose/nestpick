"""Census Geocoder + OpenStreetMap Nominatim fallback."""
from __future__ import annotations

import httpx

CENSUS_GEOCODE_URL = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress"
CENSUS_COORDS_URL = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


async def geocode(address: str) -> dict:
    """Returns {lat, lng, census_tract, census_block, state_fips, county_fips} or empty dict."""
    result = await _census_geocode(address)
    if result:
        return result
    return await _nominatim_geocode(address)


async def census_tract_from_coords(lat: float, lng: float) -> dict:
    """Look up census tract from coordinates. More reliable than address-based lookup."""
    params = {
        "x": str(lng),
        "y": str(lat),
        "benchmark": "Public_AR_Current",
        "vintage": "Current_Current",
        "layers": "Census Tracts,2020 Census Blocks",
        "format": "json",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(CENSUS_COORDS_URL, params=params)
            data = r.json()
        except Exception:
            return {}

    result = data.get("result", {})
    geographies = result.get("geographies", {})
    tracts = geographies.get("Census Tracts", [{}])
    tract = tracts[0] if tracts else {}

    state_fips = tract.get("STATE", "")
    county_fips = tract.get("COUNTY", "")
    tract_code = tract.get("TRACT", "")
    census_tract = f"{state_fips}{county_fips}{tract_code}" if tract_code else None

    blocks = geographies.get("2020 Census Blocks", [{}])
    block = blocks[0] if blocks else {}

    return {
        "census_tract": census_tract,
        "census_block": block.get("BLOCK"),
        "state_fips": state_fips,
        "county_fips": county_fips,
    }


async def _census_geocode(address: str) -> dict:
    params = {
        "address": address,
        "benchmark": "Public_AR_Current",
        "vintage": "Current_Current",
        "format": "json",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(CENSUS_GEOCODE_URL, params=params)
            data = r.json()
        except Exception:
            return {}

    matches = data.get("result", {}).get("addressMatches", [])
    if not matches:
        return {}

    match = matches[0]
    coords = match.get("coordinates", {})
    geographies = match.get("geographies", {})
    tracts = geographies.get("Census Tracts", [{}])
    tract = tracts[0] if tracts else {}

    state_fips = tract.get("STATE", "")
    county_fips = tract.get("COUNTY", "")
    tract_code = tract.get("TRACT", "")
    census_tract = f"{state_fips}{county_fips}{tract_code}" if tract_code else None

    blocks = geographies.get("2020 Census Blocks", [{}])
    block = blocks[0] if blocks else {}

    return {
        "lat": coords.get("y"),
        "lng": coords.get("x"),
        "census_tract": census_tract,
        "census_block": block.get("BLOCK"),
        "state_fips": state_fips,
        "county_fips": county_fips,
    }


async def _nominatim_geocode(address: str) -> dict:
    params = {"q": address, "format": "json", "addressdetails": "1", "limit": "1"}
    headers = {"User-Agent": "HouseDashboard/1.0 (personal project)"}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(NOMINATIM_URL, params=params, headers=headers)
            results = r.json()
        except Exception:
            return {}

    if not results:
        return {}
    r = results[0]
    return {"lat": float(r.get("lat", 0)), "lng": float(r.get("lon", 0))}
