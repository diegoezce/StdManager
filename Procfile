web: sh -c 'cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT'
release: sh -c 'cd backend && python manage.py migrate'
worker: sh -c 'cd backend && celery -A config worker -l info'
