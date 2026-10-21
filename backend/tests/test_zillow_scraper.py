import json
import unittest
from unittest.mock import AsyncMock, patch

import httpx

from services import zillow_scraper as scraper


class ZillowScraperTests(unittest.IsolatedAsyncioTestCase):
    def test_human_verification_is_reported_as_blocked(self):
        with self.assertRaises(scraper.ZillowBlockedError):
            scraper._parse_html('<html><title>Access to this page has been denied</title><body>Press &amp; Hold to confirm you are a human</body></html>')

    def test_only_supported_compression_is_advertised(self):
        self.assertEqual(scraper.HEADERS["Accept-Encoding"], "gzip, deflate")

    async def test_parse_failure_uses_browser_fallback(self):
        with patch.object(scraper, "scrape_httpx", AsyncMock(side_effect=scraper.ZillowParseError("changed HTML"))), patch.object(
            scraper, "scrape_playwright", AsyncMock(return_value={"zpid": "123"})
        ) as browser:
            result = await scraper.scrape("https://www.zillow.com/homedetails/example/123_zpid/")
        browser.assert_awaited_once()
        self.assertEqual(result["_scrape_method"], "playwright")

    async def test_network_failure_uses_browser_fallback(self):
        with patch.object(scraper, "scrape_httpx", AsyncMock(side_effect=httpx.ConnectError("offline"))), patch.object(
            scraper, "scrape_playwright", AsyncMock(return_value={"zpid": "123"})
        ) as browser:
            await scraper.scrape("https://www.zillow.com/homedetails/example/123_zpid/")
        browser.assert_awaited_once()

    def test_unusable_next_data_still_tries_apollo(self):
        raw = {"HomeDetails:123": {"__typename": "HomeDetails", "zpid": 123, "address": {"streetAddress": "123 Main St"}}}
        html = '<script id="__NEXT_DATA__">{"props":{}}</script>'
        html += '<script>hdpApolloPreloadedData = ' + json.dumps(raw) + ';</script>'
        self.assertEqual(scraper._parse_html(html)["address"], "123 Main St")

    def test_school_list_and_empty_photo_sources(self):
        result = scraper._normalize_property({
            "schools": [{"name": "Test School", "rating": 8}, "invalid"],
            "responsivePhotos": [{"mixedSources": {"jpeg": []}}],
        })
        self.assertEqual(result["schools"][0]["name"], "Test School")
        self.assertEqual(result["photos_json"], "[]")


if __name__ == "__main__":
    unittest.main()
