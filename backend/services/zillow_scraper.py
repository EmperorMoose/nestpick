"""
Zillow scraper: httpx (fast path) → Playwright (fallback).
Extracts property data from the __NEXT_DATA__ JSON blob embedded in listing pages.
"""
from __future__ import annotations

import asyncio
import json
import random
import re
from typing import Any

import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Sec-CH-UA": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
}


class ZillowBlockedError(Exception):
    pass


class ZillowParseError(Exception):
    pass


def normalize_url(url: str) -> str:
    """Ensure URL is a full Zillow listing URL."""
    url = url.strip()
    if not url.startswith("http"):
        url = "https://" + url
    if "zillow.com" not in url:
        raise ValueError("URL does not appear to be a Zillow listing")
    return url


def extract_address_from_url(url: str) -> tuple[str, str | None]:
    """
    Parse address and ZPID from a Zillow URL slug.
    e.g. /homedetails/1817-Little-Rock-Rd-2-Charlotte-NC-28214/460883210_zpid/
    Returns (human_address, zpid_or_None).
    """
    # Extract ZPID
    zpid = None
    zpid_match = re.search(r"/(\d+)_zpid", url)
    if zpid_match:
        zpid = zpid_match.group(1)

    # Extract slug between /homedetails/ and /{zpid}_zpid/
    slug_match = re.search(r"/homedetails/([^/]+)/", url)
    if not slug_match:
        return "", zpid

    slug = slug_match.group(1)
    # Replace hyphens with spaces: "1817-Little-Rock-Rd-2-Charlotte-NC-28214"
    address = slug.replace("-", " ")
    return address, zpid


def parse_street_from_url(url: str) -> tuple[str, str]:
    """
    Extract street_number and street_name from Zillow URL for POLARIS lookup.
    Returns (street_number, street_name_fragment).
    """
    slug_match = re.search(r"/homedetails/([^/]+)/", url)
    if not slug_match:
        return "", ""
    parts = slug_match.group(1).split("-")
    if not parts:
        return "", ""
    street_number = parts[0]
    # Take next 2-3 parts as street name (skip unit numbers and city/state/zip at end)
    # Heuristic: parts after number until we hit a known city pattern or 2-char state abbrev
    name_parts = []
    for p in parts[1:]:
        if len(p) == 2 and p.isupper():  # state abbreviation
            break
        if p.isdigit() and len(p) == 5:  # zip code
            break
        name_parts.append(p)
    # Take first 3 words of street name (number + "Little Rock Rd" → "LITTLE ROCK")
    street_name = " ".join(name_parts[:3])
    return street_number, street_name


async def scrape_httpx(url: str) -> dict[str, Any]:
    await asyncio.sleep(random.uniform(1.5, 3.5))
    async with httpx.AsyncClient(http2=True, follow_redirects=True, timeout=30) as client:
        response = await client.get(url, headers=HEADERS)

    if response.status_code in (403, 429, 451):
        raise ZillowBlockedError(f"httpx blocked: HTTP {response.status_code}")

    return _parse_html(response.text)


async def scrape_playwright(url: str) -> dict[str, Any]:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise ZillowBlockedError("Playwright not installed")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=HEADERS["User-Agent"],
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
        )
        page = await context.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30000)
        content = await page.content()
        await browser.close()

    return _parse_html(content)


def _parse_html(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")

    # Primary: __NEXT_DATA__ script tag
    script_tag = soup.find("script", {"id": "__NEXT_DATA__"})
    if script_tag and script_tag.string:
        return _extract_from_next_data(json.loads(script_tag.string))

    # Fallback: hdpApolloPreloadedData inline variable
    match = re.search(r'hdpApolloPreloadedData\s*=\s*(\{.*?\});\s*</script>', html, re.DOTALL)
    if match:
        return _extract_from_apollo(json.loads(match.group(1)))

    raise ZillowParseError("Could not find property data in Zillow page HTML")


def _safe_get(obj: Any, *keys: str, default: Any = None) -> Any:
    for key in keys:
        if not isinstance(obj, dict):
            return default
        obj = obj.get(key, default)
        if obj is None:
            return default
    return obj


def _extract_from_next_data(data: dict) -> dict[str, Any]:
    # Path varies by page type; walk defensively
    page_props = _safe_get(data, "props", "pageProps", default={})

    # Try gdpClientCache (most common for listing pages)
    # Note: Zillow often encodes this as a JSON string, not a dict
    gdp_cache = _safe_get(page_props, "componentProps", "gdpClientCache", default=None)
    if gdp_cache:
        if isinstance(gdp_cache, str):
            try:
                gdp_cache = json.loads(gdp_cache)
            except (json.JSONDecodeError, ValueError):
                gdp_cache = {}
        if isinstance(gdp_cache, dict):
            for key, val in gdp_cache.items():
                if isinstance(val, dict) and "property" in val:
                    return _normalize_property(val["property"])

    # Try initialData path
    initial_data = _safe_get(page_props, "initialData", default={})
    if initial_data and "property" in initial_data:
        return _normalize_property(initial_data["property"])

    # Try direct property key
    if "property" in page_props:
        return _normalize_property(page_props["property"])

    raise ZillowParseError("Could not locate property object in __NEXT_DATA__")


def _extract_from_apollo(data: dict) -> dict[str, Any]:
    # Apollo cache stores objects by type:id key
    for key, val in data.items():
        if isinstance(val, dict) and val.get("__typename") == "HomeDetails":
            return _normalize_property(val)
    raise ZillowParseError("Could not locate HomeDetails in Apollo cache")


def _normalize_property(raw: dict) -> dict[str, Any]:
    """Map Zillow's property object to our internal schema."""

    def g(*keys, default=None):
        return _safe_get(raw, *keys, default=default)

    # Extract schools
    schools = []
    for s in g("nearbySchools", "schools", default=[]) or []:
        schools.append({
            "name": g("name", default=None) if isinstance(s, str) else s.get("name"),
            "school_type": s.get("grades", ""),
            "greatschools_rating": s.get("rating"),
            "distance": s.get("distance"),
        })

    # Extract price history
    price_history = []
    for ph in g("priceHistory", default=[]) or []:
        price_history.append({
            "event_date": ph.get("date") or ph.get("formattedDate"),
            "price": ph.get("price"),
            "event_type": ph.get("event"),
            "source": ph.get("source"),
        })

    # Extract tax history
    tax_history = []
    for th in g("taxHistory", default=[]) or []:
        tax_history.append({
            "tax_year": th.get("year"),
            "tax_amount": th.get("taxPaid"),
            "assessed_value": th.get("value"),
        })

    # Photos — try responsivePhotos first (has direct url), then photos
    photos = []
    for img in g("responsivePhotos", default=[]) or g("photos", default=[]) or []:
        if isinstance(img, dict):
            url = img.get("url") or img.get("mixedSources", {}).get("jpeg", [{}])[0].get("url", "")
            if url:
                photos.append(url)
        elif isinstance(img, str):
            photos.append(img)

    reso = g("resoFacts", default={}) or {}
    zpid = str(g("zpid", default=""))
    address_obj = g("address", default={}) or {}

    return {
        "zpid": zpid,
        "zillow_id": zpid,
        "address": address_obj.get("streetAddress", g("address", default="")),
        "street": address_obj.get("streetAddress"),
        "city": address_obj.get("city"),
        "state": address_obj.get("state"),
        "zip": address_obj.get("zipcode"),
        "lat": g("latitude"),
        "lng": g("longitude"),
        "list_price": g("price") or g("listPrice"),
        "zestimate": g("zestimate"),
        "rent_zestimate": g("rentZestimate"),
        "home_status": g("homeStatus"),
        "days_on_market": g("daysOnZillow"),
        "bedrooms": g("bedrooms") or reso.get("bedrooms"),
        "bathrooms": g("bathrooms") or reso.get("bathrooms"),
        "living_area": g("livingArea") or g("livingAreaValue"),
        "lot_size": g("lotSize") or g("lotAreaValue"),
        "year_built": g("yearBuilt") or reso.get("yearBuilt"),
        "property_type": g("homeType") or reso.get("homeType"),
        "stories": g("stories") or reso.get("stories"),
        "garage_spaces": reso.get("garageParkingCapacity") or reso.get("parkingCapacity") or g("parkingCapacity"),
        "has_pool": g("hasPool"),
        "hoa_fee": g("monthlyHoaFee") or g("hoaFee"),
        "property_tax_rate": g("propertyTaxRate"),  # rate %, not dollar amount
        "description": g("description"),
        "mls_number": g("mlsId") or g("mlsid"),
        "photos_json": json.dumps(photos[:20]),
        "price_history": price_history,
        "tax_history": tax_history,
        "schools": schools,
        "_raw": raw,
    }


async def scrape(url: str) -> dict[str, Any]:
    """Main entry point. Returns normalized property dict or raises."""
    url = normalize_url(url)
    try:
        result = await scrape_httpx(url)
        result["_scrape_method"] = "httpx"
        return result
    except ZillowBlockedError:
        pass

    # Playwright fallback
    result = await scrape_playwright(url)
    result["_scrape_method"] = "playwright"
    return result
