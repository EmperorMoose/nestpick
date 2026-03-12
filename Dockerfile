# Stage 1: Build React frontend
FROM node:20-slim AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python runtime — official Playwright image has Chromium + all deps pre-installed
FROM mcr.microsoft.com/playwright/python:v1.49.1-jammy
WORKDIR /app

# Install Python deps (playwright already installed in base image, so skip re-installing it)
COPY backend/requirements.txt .
RUN grep -v "playwright" requirements.txt \
    | pip install --no-cache-dir -r /dev/stdin

# Create the /data directory for the Railway persistent volume mount point.
# Railway will overlay the real volume here at runtime; this just ensures the
# path exists if the container ever runs without a volume attached.
RUN mkdir -p /data

# Copy backend source
COPY backend/ .

# Copy built frontend — main.py resolves Path(__file__).parent.parent / "frontend/dist"
# so with main.py at /app, that's /frontend/dist
COPY --from=frontend /app/dist /frontend/dist

EXPOSE 8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
