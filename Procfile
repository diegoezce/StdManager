web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-1} --threads 4 --preload --max-requests 500 --max-requests-jitter 50 --timeout 120
release: python manage.py migrate --no-input || true
