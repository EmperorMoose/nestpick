"""FEMA National Flood Hazard Layer — flood zone lookup."""
from __future__ import annotations

import json

import httpx

NFHL_URL = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query"

SFHA_ZONES = {"A", "AE", "AH", "AO", "AR", "A99", "V", "VE"}


async def fetch_flood_zone(lat: float, lng: float) -> dict:
    params = {
        "geometry": json.dumps({"x": lng, "y": lat, "spatialReference": {"wkid": 4326}}),
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "FLD_ZONE,ZONE_SUBTY,SFHA_TF",
        "returnGeometry": "false",
        "f": "json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(NFHL_URL, params=params)
            data = r.json()
        except Exception:
            return {}

    features = data.get("features", [])
    if not features:
        return {"flood_zone": "X", "is_sfha": False}

    attrs = features[0].get("attributes", {})
    zone = attrs.get("FLD_ZONE", "X")
    sfha = attrs.get("SFHA_TF") == "T" or zone in SFHA_ZONES

    return {"flood_zone": zone, "is_sfha": sfha}
