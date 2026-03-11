"""Charlotte-Mecklenburg Police Department crime data via Charlotte GIS ArcGIS REST."""
from __future__ import annotations

import json
from datetime import datetime, timedelta

import httpx

CMPD_URL = "https://gis.charlottenc.gov/arcgis/rest/services/CMPD/CMPDIncidents/MapServer/0/query"

# NIBRS codes considered violent crimes
VIOLENT_CODES = {
    "09A", "09B", "09C",  # murder, manslaughter
    "11A", "11B", "11C", "11D",  # sex offenses
    "120",  # robbery
    "13A", "13B", "13C",  # assault
    "100",  # kidnapping
}


async def fetch_crime_data(lat: float, lng: float, radius_miles: float = 1.0) -> dict:
    """Returns crime counts and incident list for the past 12 months."""
    cutoff = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    radius_meters = int(radius_miles * 1609.34)

    params = {
        "geometry": json.dumps({"x": lng, "y": lat, "spatialReference": {"wkid": 4326}}),
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "distance": radius_meters,
        "units": "esriSRUnit_Meter",
        "where": f"DATE_REPORTED >= DATE '{cutoff}'",
        "outFields": (
            "INCIDENT_REPORT_ID,YEAR,DATE_REPORTED,"
            "HIGHEST_NIBRS_CODE,HIGHEST_NIBRS_DESCRIPTION,"
            "LOCATION_TYPE_DESCRIPTION,LATITUDE_PUBLIC,LONGITUDE_PUBLIC"
        ),
        "returnGeometry": "false",
        "resultRecordCount": 2000,
        "f": "json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.get(CMPD_URL, params=params)
            data = r.json()
        except Exception:
            return {"total": None, "violent": None, "property": None, "incidents": []}

    features = data.get("features", [])
    incidents = []
    violent_count = 0
    property_count = 0

    for f in features:
        attrs = f.get("attributes", {})
        nibrs = str(attrs.get("HIGHEST_NIBRS_CODE", "")).strip()
        category = "violent" if nibrs in VIOLENT_CODES else "property"

        if nibrs in VIOLENT_CODES:
            violent_count += 1
        else:
            property_count += 1

        incidents.append({
            "date": attrs.get("DATE_REPORTED"),
            "description": attrs.get("HIGHEST_NIBRS_DESCRIPTION"),
            "category": category,
            "lat": attrs.get("LATITUDE_PUBLIC"),
            "lng": attrs.get("LONGITUDE_PUBLIC"),
        })

    return {
        "total": len(features),
        "violent": violent_count,
        "property": property_count,
        "incidents": incidents,
    }
