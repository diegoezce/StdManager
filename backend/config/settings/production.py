from .base import *
import dj_database_url

DEBUG = False
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

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

# Allow frontend origin from env var (Railway)
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='').split(',') if config('CORS_ALLOWED_ORIGINS', default='') else []

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
}

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
