# Railway Environment Variables - Complete Setup Guide

## IMPORTANT: Variables go in DIFFERENT services!

### Backend Service → Settings → Variables
**Delete ALL existing and add ONLY these:**

```
DEBUG=False
SECRET_KEY=<GENERA UNO - ver instrucciones abajo>
TIME_ZONE=UTC
ALLOWED_HOSTS=yourdomain-backend.railway.app,yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain-frontend.railway.app
```

### Frontend Service → Settings → Variables  
**Delete ALL existing and add ONLY these:**

```
NEXT_PUBLIC_API_URL=https://yourdomain-backend.railway.app/api/v1
NODE_ENV=production
```

## Step-by-Step

### 1. Find Your Railway URLs

In Railway Dashboard → Services:
- Find Backend service → go to **Settings** → copy the **Railway Domain** (looks like `yourdomain-backend.railway.app`)
- Find Frontend service → go to **Settings** → copy the **Railway Domain** (looks like `yourdomain-frontend.railway.app`)

Use these URLs for the environment variables below.

### 2. Generate a Django SECRET_KEY

Run this in your local terminal:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```
Copy the output - you'll paste it in Backend variables.

### 3. Backend Service → Settings → Variables
Delete all existing, add these 4:

| Variable | Value |
|----------|-------|
| `DEBUG` | `False` |
| `SECRET_KEY` | (paste the key from step 2) |
| `TIME_ZONE` | `UTC` |
| `ALLOWED_HOSTS` | `yourdomain-backend.railway.app,yourdomain.com` |
| `CORS_ALLOWED_ORIGINS` | `https://yourdomain-frontend.railway.app` |

### 4. Frontend Service → Settings → Variables
Delete all existing, add these 2:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://yourdomain-backend.railway.app/api/v1` |
| `NODE_ENV` | `production` |

### 5. Railway Provides Automatically
DO NOT EDIT - Railway sets these automatically:
- `DATABASE_URL` (from PostgreSQL plugin)
- `REDIS_URL` (from Redis plugin)

### 6. Deploy
After setting variables, Railway will auto-redeploy both services.

---

## How to Access Your App

1. **Frontend** (what users visit):
   - During testing: `https://yourdomain-frontend.railway.app` (Railway auto-generated)
   - Production: Set a custom domain in Railway Settings

2. **Backend API**:
   - During testing: `https://yourdomain-backend.railway.app/api/v1/`
   - Used by frontend (via NEXT_PUBLIC_API_URL env var)
   - Check health: `https://yourdomain-backend.railway.app/api/v1/auth/users/me/`

3. **URL Types**:
   - `.railway.internal`: Internal only (backend ↔ frontend within Railway)
   - `.railway.app`: Public (users access from browser)
   - Custom domain: Personal domain you own (optional)

## Troubleshooting

**Module not found errors in build?**
- The Dockerfile was updated to copy all necessary config files (tsconfig.json, postcss.config.js, tailwind.config.ts)
- Wait for the new build to complete after pushing

**CORS errors?**
- Check `CORS_ALLOWED_ORIGINS` points to your actual frontend URL
- Must include `https://` prefix
- Backend must have frontend URL, not `.railway.internal`

**Cannot connect to API?**
- Check `NEXT_PUBLIC_API_URL` points to your backend domain
- Must include full path `/api/v1`
- Frontend needs `.railway.app` domain, not `.railway.internal`
