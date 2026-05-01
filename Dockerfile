# Build stage for frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy all frontend files first
COPY frontend/ ./

# Install dependencies
RUN npm ci

# Build Next.js
RUN npm run build

# Build stage for backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy backend
COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/package*.json /app/frontend/

WORKDIR /app/backend

# Run migrations and collect static files
RUN python manage.py collectstatic --noinput || true

# Start both services
CMD gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
