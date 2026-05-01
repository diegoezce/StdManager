# Railway Deployment Checklist

## Pre-Deployment (Local)

- [x] Backend Dockerfile at root: `/Dockerfile`
- [x] Frontend Dockerfile at: `/frontend/Dockerfile`
- [x] Backend requirements.txt at: `/backend/requirements.txt`
- [x] Frontend package.json at: `/frontend/package.json`
- [x] Procfile at root with correct commands (no "cd backend" prefix)
- [x] .env.example exists with all vars documented
- [x] docker-compose.yml for local dev
- [x] All TypeScript path aliases configured in tsconfig.json
- [x] Frontend config files included in Dockerfile (postcss, tailwind, next.config.js)

## Railway Setup

### 1. Create Project & Services

- [ ] Create new Railway project
- [ ] Add service: Backend → Deploy from GitHub
  - Root directory: (leave EMPTY)
  - Build: Uses /Dockerfile (auto-detected)
- [ ] Add service: Frontend → Deploy from GitHub  
  - Root directory: `frontend`
  - Build: Uses /frontend/Dockerfile (auto-detected)
- [ ] Add PostgreSQL plugin (auto-sets DATABASE_URL)
- [ ] Add Redis plugin (auto-sets REDIS_URL)

### 2. Configure Environment Variables

**Backend Service** → Settings → Variables:
```
DEBUG=False
SECRET_KEY=<generated-key>
TIME_ZONE=UTC
ALLOWED_HOSTS=<backend-domain>.railway.app,yourdomain.com
CORS_ALLOWED_ORIGINS=https://<frontend-domain>.railway.app
```

**Frontend Service** → Settings → Variables:
```
NEXT_PUBLIC_API_URL=https://<backend-domain>.railway.app/api/v1
NODE_ENV=production
```

**DO NOT SET:**
- DATABASE_URL (Railway sets automatically)
- REDIS_URL (Railway sets automatically)
- Any localhost URLs

### 3. Deploy & Verify

- [ ] Both services deploy successfully (no errors in logs)
- [ ] Frontend build completes (check for "npm run build" success)
- [ ] Backend migrations run (check Procfile release phase logs)
- [ ] Visit frontend URL in browser: `https://<frontend-domain>.railway.app`
- [ ] Try login with test credentials
- [ ] Check API connectivity (browser console should not show CORS errors)

### 4. Custom Domain (Optional)

- [ ] In Railway Settings → Domains
- [ ] Add custom domain for frontend
- [ ] Update CORS_ALLOWED_ORIGINS in Backend if needed
- [ ] Update DNS records as shown in Railway

## URLs Explained

| Type | Example | Use Case |
|------|---------|----------|
| Frontend Public | https://myapp-frontend.railway.app | What users visit |
| Backend Public | https://myapp-backend.railway.app | Frontend calls this API |
| .railway.internal | https://myapp-backend.railway.internal | Internal only (not for frontend) |
| Custom Domain | https://myapp.com | Optional personal domain |

## Troubleshooting

**"Module not found" build error?**
- Frontend Dockerfile was updated to copy all config files
- Push code to trigger rebuild

**"Cannot GET /" on frontend URL?**
- Frontend service might still be building
- Check Railway logs for npm build errors
- Verify NEXT_PUBLIC_API_URL is set in Frontend Variables

**"CORS error" or "API connection failed"?**
- Backend needs CORS_ALLOWED_ORIGINS = Frontend public URL
- Frontend needs NEXT_PUBLIC_API_URL = Backend public URL  
- Both must use .railway.app domains, not .railway.internal

**"Database connection error"?**
- PostgreSQL plugin must be added
- DATABASE_URL auto-set (don't manually add)
- Check logs for migration errors

## Key File Locations

- Backend: `/Dockerfile` (repo root)
- Backend Config: `/backend/config/settings/production.py`
- Frontend: `/frontend/Dockerfile`  
- Frontend Config: `/frontend/next.config.js`, `/frontend/tsconfig.json`
- Procfile: `/Procfile` (release phase runs migrations)
- Docs: `/DEPLOYMENT.md` (detailed guide)
- Vars: `/RAILWAY_VARS.md` (quick reference)
