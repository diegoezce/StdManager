# Deployment Guide - Railway

GoPlanify can be deployed to Railway with minimal configuration.

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository with this code
3. PostgreSQL database (Railway provides)
4. Redis instance (Railway provides)

## Deployment Steps

### 1. Connect GitHub Repository

1. Log in to Railway
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub account
5. Select the StudentManager repository
6. Click "Deploy"

### 2. Configure Database

Railway will automatically create a PostgreSQL database. Set these environment variables:

```
DATABASE_URL=<Railway provides automatically>
```

### 3. Configure Redis (optional)

For Celery task queue:

```
REDIS_URL=<Railway provides automatically>
```

### 4. Set Environment Variables

In Railway project settings, set these variables:

```
DEBUG=False
SECRET_KEY=<generate a strong random string>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
TIME_ZONE=UTC
```

Generate a SECRET_KEY with:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 5. Configure Domain

1. In Railway, go to Settings → Domains
2. Add a custom domain (e.g., goplanify.com)
3. Update DNS records as shown by Railway

### 6. Database Migrations

Migrations run automatically on each deploy via the release phase. Check logs to verify:

```
INFO: Running migrations...
INFO: Migrations completed successfully
```

### 7. Verify Deployment

- Backend API: https://yourdomain.com/api/v1/auth/users/me/
- Frontend: https://yourdomain.com
- API Docs: https://yourdomain.com/api/docs/

## Troubleshooting

### Check Logs
```bash
railway logs
```

### Run Commands
```bash
railway run python manage.py shell
railway run python manage.py createsuperuser
```

### Reset Database
```bash
railway run python manage.py flush
```

## Environment Variables Reference

| Variable | Required | Example |
|----------|----------|---------|
| DEBUG | No | False |
| SECRET_KEY | Yes | django-insecure-... |
| DATABASE_URL | Auto | postgresql://... |
| REDIS_URL | No | redis://... |
| ALLOWED_HOSTS | Yes | yourdomain.com |
| NEXT_PUBLIC_API_URL | Yes | https://yourdomain.com/api/v1 |
| TIME_ZONE | No | UTC |
| CORS_ALLOWED_ORIGINS | Yes | https://yourdomain.com |

## Performance Tips

1. **Enable Railway Cache**: Reduce cold starts
2. **Use PostgreSQL pooling**: via pgBouncer (Railway provides)
3. **Optimize images**: Use Pillow settings in production
4. **Database indexes**: Already set up in models

## Monitoring

- Use Railway's built-in metrics
- Monitor database connections
- Check error logs regularly
- Set up email alerts for failures

## Rollback

If deployment fails, Railway automatically keeps the previous working version. You can manually select and redeploy any previous version.

## Support

For Railway-specific issues, visit: https://docs.railway.app
