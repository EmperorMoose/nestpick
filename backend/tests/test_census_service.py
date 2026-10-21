import unittest
from unittest.mock import patch

import httpx

from services import census_service as service


class CensusServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_keyless_reporter_mapping(self):
        requests = []
        def handler(request):
            requests.append(request)
            return httpx.Response(200, json={"data": {"14000US37119005305": {
                "B19013": {"estimate": {"B19013001": 44644}},
                "B25077": {"estimate": {"B25077001": 193200}},
                "B25064": {"estimate": {"B25064001": 1321}},
                "B01003": {"estimate": {"B01003001": 4512}},
            }}})
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        with patch.object(service.settings, "census_api_key", ""), patch.object(service.httpx, "AsyncClient", return_value=client):
            data = await service.fetch_tract_demographics("37", "119", "005305")
        self.assertEqual(data["median_income"], 44644)
        self.assertEqual(data["median_home_value"], 193200)
        self.assertEqual(data["median_rent"], 1321)
        self.assertEqual(data["acs_vintage"], 2024)
        self.assertIsNone(data["pct_white"])
        self.assertIsNone(data["pct_college_degree"])
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0].url.host, "api.censusreporter.org")

    async def test_missing_key_page_falls_back_without_forwarding_key(self):
        def handler(request):
            if request.url.host == "api.census.gov":
                self.assertEqual(request.url.params["key"], "test-key")
                return httpx.Response(200, text="<html>Missing Key</html>")
            self.assertNotIn("key", request.url.params)
            return httpx.Response(200, json={"data": {"14000US37119005305": {"B19013": {"estimate": {"B19013001": 44644}}}}})
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        with patch.object(service.settings, "census_api_key", "test-key"), patch.object(service.httpx, "AsyncClient", return_value=client):
            data = await service.fetch_tract_demographics("37", "119", "005305")
        self.assertEqual(data["median_income"], 44644)

    async def test_provider_failure_returns_empty(self):
        client = httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(503)))
        with patch.object(service.settings, "census_api_key", ""), patch.object(service.httpx, "AsyncClient", return_value=client):
            self.assertEqual(await service.fetch_tract_demographics("37", "119", "005305"), {})
