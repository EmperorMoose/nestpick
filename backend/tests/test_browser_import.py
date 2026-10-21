import unittest
import httpx

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from database import Base, get_db
from main import app
from models import Property, PropertyRating
from routers.properties import import_browser_listing
from schemas.property_schema import BrowserListingImport


URL = "https://www.zillow.com/homedetails/Test-Home/6191022_zpid/"


class BrowserImportTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        self.session = async_sessionmaker(self.engine, expire_on_commit=False)()

    async def asyncTearDown(self):
        await self.session.close()
        await self.engine.dispose()

    async def test_create_and_update_preserves_user_data(self):
        result = await import_browser_listing(BrowserListingImport(
            address="6301 Spring Garden Ln", zillow_url=URL, list_price=400000,
            bedrooms=3, photos=["https://photos.zillowstatic.com/example.jpg"], state="SC",
        ), self.session)
        prop = await self.session.get(Property, result["id"])
        prop.offer_price = 380000
        prop.is_top_option = True
        rating = PropertyRating(property_id=prop.id, user_name="pierce", overall=5)
        self.session.add(rating)
        await self.session.commit()
        updated = await import_browser_listing(BrowserListingImport(
            address=prop.address, zillow_url=URL + "?tracking=1", list_price=390000,
        ), self.session)
        self.assertEqual(updated["id"], prop.id)
        self.assertEqual(prop.list_price, 390000)
        self.assertEqual(prop.bedrooms, 3)
        self.assertEqual(prop.offer_price, 380000)
        self.assertEqual(prop.state, "SC")
        self.assertTrue(prop.is_top_option)
        self.assertIn("example.jpg", prop.photos_json)
        self.assertEqual((await self.session.get(PropertyRating, rating.id)).overall, 5)

    async def test_http_import_and_validation(self):
        async def session_override():
            yield self.session
        app.dependency_overrides[get_db] = session_override
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/properties/browser-import", json={
                    "address": "Test Listing", "zillow_url": URL, "list_price": 350000,
                })
                self.assertEqual(response.status_code, 200, response.text)
                saved = await client.get(f'/api/properties/{response.json()["id"]}')
                self.assertEqual(saved.json()["list_price"], 350000)
                invalid = await client.post("/api/properties/browser-import", json={"address": "Test"})
                self.assertEqual(invalid.status_code, 422)
        finally:
            app.dependency_overrides.clear()

    def test_rejects_invalid_source_and_blank_address(self):
        for changes in [{"zillow_url": "https://evil.test/zillow.com/homedetails/test"}, {"address": "  "}, {"photos": ["javascript:alert(1)"]}]:
            with self.assertRaises(ValidationError):
                BrowserListingImport(**({"address": "Test", "zillow_url": URL} | changes))


if __name__ == "__main__":
    unittest.main()
