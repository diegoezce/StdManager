FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV DJANGO_SETTINGS_MODULE=config.settings.production
# Placeholder key used only for collectstatic at build time.
# Set a real SECRET_KEY in Railway environment variables.
ENV SECRET_KEY=build-time-placeholder-not-used-in-production

RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p logs

RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Runs migrations then starts gunicorn on Railway's dynamic PORT (defaults to 8000).
CMD ["/bin/sh", "-c", "python manage.py migrate --no-input && python -c 'import config.wsgi; print(\"WSGI OK\")' && exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 4 --timeout 120 --access-logfile - --error-logfile -"]
