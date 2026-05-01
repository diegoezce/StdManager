web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
release: python manage.py migrate
worker: celery -A config worker -l info
