# Production Dockerfile for Django Backend

FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/ ./

# Create logs directory
RUN mkdir -p logs

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Health check - check if port is listening
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import socket; socket.create_connection(('localhost', 8000), timeout=5).close()"

# Create entrypoint script to run migrations before starting gunicorn
RUN echo '#!/bin/bash\nset -e\necho "[$(date)] Starting entrypoint script..."\necho "[$(date)] Running migrations..."\npython manage.py migrate --noinput 2>&1 || echo "[$(date)] Migration failed (non-fatal)"\necho "[$(date)] Migrations complete. Starting gunicorn on 0.0.0.0:8000..."\nexec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120 --access-logfile - --error-logfile -' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Run entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
