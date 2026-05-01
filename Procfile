web: sh -c 'cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT'
release: cd backend && python manage.py migrate
worker: cd backend && celery -A config worker -l info
