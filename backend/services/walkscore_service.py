"""Walk Score API for walkability, transit, and bike scores."""
from __future__ import annotations

import httpx

from config import settings

WALKSCORE_URL = "https://api.walkscore.com/score"


async def fetch_scores(lat: float, lng: float, address: str) -> dict:
    if not settings.walkscore_api_key:
        return {}

    params = {
        "format": "json",
        "address": address,
        "lat": lat,
        "lon": lng,
        "transit": 1,
        "bike": 1,
        "wsapikey": settings.walkscore_api_key,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(WALKSCORE_URL, params=params)
            data = r.json()
        except Exception:
            return {}

    if data.get("status") != 1:
        return {}

    return {
        "walk_score": data.get("walkscore"),
        "walk_score_desc": data.get("description"),
        "transit_score": data.get("transit", {}).get("score") if data.get("transit") else None,
        "bike_score": data.get("bike", {}).get("score") if data.get("bike") else None,
    }
