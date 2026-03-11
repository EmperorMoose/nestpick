from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db
from routers import comparison, neighborhood, properties


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="House Dashboard", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(properties.router)
app.include_router(neighborhood.router)
app.include_router(comparison.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Serve React build in production (Railway deployment)
# Resolve path relative to this file so it works regardless of cwd
_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
try:
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="static")
except RuntimeError:
    pass  # frontend not built yet (dev mode)
