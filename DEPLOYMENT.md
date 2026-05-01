# Deployment Guide - Railway

GoPlanify can be deployed to Railway with minimal configuration.

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository with this code
3. PostgreSQL database (Railway provides)
4. Redis instance (Railway provides)

## Deployment Steps

### 1. Create Two Services in Railway

Backend and frontend run as **separate services** in Railway.

#### Service 1: Backend (Django)
1. Log in to Railway
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub account
5. Select the StudentManager repository
6. **DO NOT set root directory** (leave empty - Railway will use repo root)
7. Set up PostgreSQL plugin (will auto-set DATABASE_URL)
8. Deploy

#### Service 2: Frontend (Next.js)
1. In the same Railway project, click "Add Service"
2. Select "Deploy from GitHub repo"
3. Select the StudentManager repository
4. Set **root directory** to `frontend`
5. Deploy

### 2. Add PostgreSQL Plugin

1. In Railway project, click "Add"
2. Select "PostgreSQL"
3. Railway will automatically set `DATABASE_URL` environment variable

### 3. Add Redis Plugin (optional)

For Celery task queue:
1. Click "Add"
2. Select "Redis"
3. Railway will automatically set `REDIS_URL` environment variable

### 4. Configure Backend Service

**Settings → Backend Service:**
- Root directory: (leave empty)
- Build command: (leave default - Railway detects Dockerfile automatically)
- Start command: (leave default - Procfile takes precedence)

**Environment Variables:**
```
DEBUG=False
SECRET_KEY=<generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,*.railway.app
NEXT_PUBLIC_API_URL=https://backend-domain.railway.app/api/v1
TIME_ZONE=UTC
CORS_ALLOWED_ORIGINS=https://frontend-domain.railway.app
```

### 5. Configure Frontend Service

**Settings → Frontend Service:**
- Root directory: `frontend`
- Build command: `npm run build`
- Start command: `npm start`
- Port: `3000`

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://backend-domain.railway.app/api/v1
NODE_ENV=production
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
