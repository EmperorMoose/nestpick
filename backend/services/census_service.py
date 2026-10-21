"""Census ACS 5-year estimates for neighborhood demographics."""
from __future__ import annotations

import httpx
import logging
from config import settings

ACS_YEAR = 2024
ACS_BASE = f"https://api.census.gov/data/{ACS_YEAR}/acs/acs5"
REPORTER_URL = f"https://api.censusreporter.org/1.0/data/show/acs{ACS_YEAR}_5yr"
logger = logging.getLogger(__name__)

VARIABLES = {
    "B19013_001E": "median_income",
    "B25077_001E": "median_home_value",
    "B25064_001E": "median_rent",
    "B01003_001E": "total_population",
    "B25003_001E": "total_occupied",
    "B25003_002E": "owner_occupied",
    "B15003_001E": "pop_25_plus",
    "B15003_022E": "bachelors",
    "B15003_023E": "masters",
    "B15003_024E": "professional",
    "B15003_025E": "doctorate",
    "B17001_001E": "pop_poverty_denom",
    "B17001_002E": "below_poverty",
    "B23025_003E": "labor_force",
    "B23025_005E": "unemployed",
    "B25035_001E": "median_year_built",
    "B02001_001E": "total_race",
    "B02001_002E": "white",
    "B02001_003E": "black",
    "B03002_012E": "hispanic",
    "B02001_005E": "asian",
}


async def fetch_tract_demographics(state_fips: str, county_fips: str, tract: str) -> dict:
    """Fetch ACS variables for a specific census tract. tract is the 6-digit code."""
    var_names = list(VARIABLES.keys())
    params = {
        "get": "NAME," + ",".join(var_names),
        "for": f"tract:{tract}",
        "in": f"state:{state_fips} county:{county_fips}",
    }
    row = None
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        if settings.census_api_key:
            try:
                params["key"] = settings.census_api_key
                r = await client.get(ACS_BASE, params=params)
                r.raise_for_status()
                data = r.json()
                if isinstance(data, list) and len(data) >= 2:
                    row = dict(zip(data[0], data[1]))
            except Exception:
                logger.warning("Census API unavailable; trying Census Reporter")
        if row is None:
            try:
                geoid = f"14000US{state_fips}{county_fips}{tract}"
                tables = sorted({key.split("_")[0] for key in VARIABLES})
                r = await client.get(REPORTER_URL, params={"table_ids": ",".join(tables), "geo_ids": geoid})
                r.raise_for_status()
                records = r.json()["data"][geoid]
                row = {
                    key: records.get(key.split("_")[0], {}).get("estimate", {}).get(key.replace("_", "")[:-1])
                    for key in VARIABLES
                }
            except Exception:
                logger.warning("ACS economics unavailable from Census Reporter")
                return {}

    return _parse_row(row)


def _parse_row(row: dict) -> dict:

    def safe_int(key: str) -> int | None:
        v = row.get(key)
        try:
            v = int(v)
            return v if v >= 0 else None
        except (TypeError, ValueError):
            return None

    def pct(num_key: str, denom_key: str) -> float | None:
        n, d = safe_int(num_key), safe_int(denom_key)
        if n is None or d is None or d == 0:
            return None
        return round(n / d * 100, 1)

    college_values = [safe_int(k) for k in ["B15003_022E", "B15003_023E", "B15003_024E", "B15003_025E"]]
    college_pop = sum(college_values) if all(v is not None for v in college_values) else None
    pop_25 = safe_int("B15003_001E")

    return {
        "acs_vintage": ACS_YEAR,
        "median_income": safe_int("B19013_001E"),
        "median_home_value": safe_int("B25077_001E"),
        "median_rent": safe_int("B25064_001E"),
        "total_population": safe_int("B01003_001E"),
        "pct_owner_occupied": pct("B25003_002E", "B25003_001E"),
        "pct_college_degree": round(college_pop / pop_25 * 100, 1) if pop_25 and college_pop is not None else None,
        "pct_poverty": pct("B17001_002E", "B17001_001E"),
        "pct_unemployed": pct("B23025_005E", "B23025_003E"),
        "median_year_built": safe_int("B25035_001E"),
        "pct_white": pct("B02001_002E", "B02001_001E"),
        "pct_black": pct("B02001_003E", "B02001_001E"),
        "pct_hispanic": pct("B03002_012E", "B01003_001E"),
        "pct_asian": pct("B02001_005E", "B02001_001E"),
    }
