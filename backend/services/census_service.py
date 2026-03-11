"""Census ACS 5-year estimates for neighborhood demographics."""
from __future__ import annotations

import httpx

ACS_BASE = "https://api.census.gov/data/2023/acs/acs5"

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
    # Retry up to 2 times — Census API can be slow
    for attempt in range(2):
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                r = await client.get(ACS_BASE, params=params)
                data = r.json()
                break
            except Exception:
                if attempt == 1:
                    return {}
                continue

    if len(data) < 2:
        return {}

    headers, values = data[0], data[1]
    row = dict(zip(headers, values))

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

    total_pop = safe_int("B01003_001E") or 1
    total_race = safe_int("B02001_001E") or total_pop
    college_pop = sum(filter(None, [safe_int(k) for k in ["B15003_022E", "B15003_023E", "B15003_024E", "B15003_025E"]]))
    pop_25 = safe_int("B15003_001E") or 1

    return {
        "median_income": safe_int("B19013_001E"),
        "median_home_value": safe_int("B25077_001E"),
        "median_rent": safe_int("B25064_001E"),
        "total_population": safe_int("B01003_001E"),
        "pct_owner_occupied": pct("B25003_002E", "B25003_001E"),
        "pct_college_degree": round(college_pop / pop_25 * 100, 1) if pop_25 else None,
        "pct_poverty": pct("B17001_002E", "B17001_001E"),
        "pct_unemployed": pct("B23025_005E", "B23025_003E"),
        "median_year_built": safe_int("B25035_001E"),
        "pct_white": round(safe_int("B02001_002E") / total_race * 100, 1) if total_race else None,
        "pct_black": round(safe_int("B02001_003E") / total_race * 100, 1) if total_race else None,
        "pct_hispanic": round(safe_int("B03002_012E") / total_race * 100, 1) if total_race else None,
        "pct_asian": round(safe_int("B02001_005E") / total_race * 100, 1) if total_race else None,
    }
