# Stage 1: Build React frontend
FROM node:20-slim AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python runtime
FROM python:3.11-slim
WORKDIR /app

# Install Python deps first (better layer caching)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install chromium --with-deps

# Copy backend source
COPY backend/ .

# Copy built frontend — main.py resolves Path(__file__).parent.parent / "frontend/dist"
# so with main.py at /app, that's /frontend/dist
COPY --from=frontend /app/dist /frontend/dist

EXPOSE 8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
