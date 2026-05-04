web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
release: python manage.py migrate --no-input || true
worker: celery -A config worker -l info
