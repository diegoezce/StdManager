from .base import *
import os
import dj_database_url

DEBUG = False

# Build ALLOWED_HOSTS from env var, then automatically add the Railway public domain.
_allowed = config('ALLOWED_HOSTS', default='').split(',')
_railway_domain = os.environ.get('RAILWAY_PUBLIC_DOMAIN', '')
if _railway_domain and _railway_domain not in _allowed:
    _allowed.append(_railway_domain)
ALLOWED_HOSTS = [h for h in _allowed if h]  # remove empty strings

# Use DATABASE_URL provided by Railway PostgreSQL plugin
database_url = config('DATABASE_URL', default=None)
if database_url:
    DATABASES = {
        'default': dj_database_url.config(default=database_url, conn_max_age=600)
    }
else:
    # Fallback to individual variables if DATABASE_URL not provided
    DATABASES = {
        'default': {
            'ENGINE': config('DB_ENGINE', default='django.db.backends.postgresql'),
            'NAME': config('DB_NAME', default=''),
            'USER': config('DB_USER', default=''),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default=''),
            'PORT': config('DB_PORT', default='5432'),
        }
    }

# CORS: use explicit origins list when set, otherwise allow all origins.
# Set CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app in Railway env vars
# to lock this down once the frontend URL is known.
_cors_origins = config('CORS_ALLOWED_ORIGINS', default='').strip()
if _cors_origins:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOW_ALL_ORIGINS = True

# Railway terminates SSL at the proxy and forwards HTTP to the container.
# SECURE_PROXY_SSL_HEADER lets Django trust the X-Forwarded-Proto header
# so SECURE_SSL_REDIRECT works correctly without causing an infinite loop.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
