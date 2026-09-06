from .base import *
import dj_database_url

DEBUG = False
ALLOWED_HOSTS = [h for h in config('ALLOWED_HOSTS', default='').split(',') if h]

# Render injects RENDER_EXTERNAL_HOSTNAME (the *.onrender.com host) into every
# web service, and its health-check prober hits that host. Add it so the deploy
# does not fail with DisallowedHost. NOTE: this only covers the .onrender.com
# domain — custom domains must be listed explicitly via the ALLOWED_HOSTS env var.
RENDER_EXTERNAL_HOSTNAME = config('RENDER_EXTERNAL_HOSTNAME', default='')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# The frontend lives on a different host than this API, so it never shows up in
# ALLOWED_HOSTS. List its origin(s) here so CORS/CSRF always allow it, even if
# the CORS_ALLOWED_ORIGINS env var is missing.
FRONTEND_ORIGINS = ['https://blest.sparkio.me']

# CSRF needs the scheme-qualified origin for every allowed host + the frontend.
CSRF_TRUSTED_ORIGINS = [
    f'https://{h}' for h in ALLOWED_HOSTS if h not in ('localhost', '127.0.0.1')
] + FRONTEND_ORIGINS

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

# Allow frontend origin from env var, always including the known frontend
# origin(s) above so a missing/incomplete env var can't break the login.
_cors_env = [o for o in config('CORS_ALLOWED_ORIGINS', default='').split(',') if o]
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_cors_env + FRONTEND_ORIGINS))

# Railway/Render terminate SSL at the proxy and forward HTTP to the container.
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
