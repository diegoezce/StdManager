#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
for i in {1..30}; do
  if PGPASSWORD=postgres psql -h postgres -U postgres -d goplanify_db -c '\q' 2>/dev/null; then
    echo "PostgreSQL is up"
    break
  fi
  echo "PostgreSQL is unavailable - sleeping ($i/30)"
  sleep 1
done

echo "Running migrations..."
python manage.py migrate

echo "Starting server..."
python manage.py runserver 0.0.0.0:8000
