# Railway Backend Service - Environment Variables

## COPY & PASTE estos valores en Railway

### Backend Service → Settings → Variables

**Elimina TODO lo que esté ahora y agrega SOLO esto:**

```
DEBUG=False
SECRET_KEY=<GENERA UNO - ver instrucciones abajo>
TIME_ZONE=UTC
ALLOWED_HOSTS=blast-backend-production.up.railway.app,yourdomain.com
CORS_ALLOWED_ORIGINS=https://blast-frontend-production.up.railway.app
NEXT_PUBLIC_API_URL=https://blast-frontend-production.up.railway.app/api/v1
```

## Pasos:

1. **Genera un SECRET_KEY** (en tu terminal local):
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```
Cópialo.

2. **En Railway - Backend Service → Settings → Variables:**
   - Elimina TODAS las variables existentes
   - Agrega estas 6 variables:

| Variable | Valor |
|----------|-------|
| `DEBUG` | `False` |
| `SECRET_KEY` | (el que generaste arriba) |
| `TIME_ZONE` | `UTC` |
| `ALLOWED_HOSTS` | `blast-backend-production.up.railway.app,yourdomain.com` |
| `CORS_ALLOWED_ORIGINS` | `https://blast-frontend-production.up.railway.app` |
| `NEXT_PUBLIC_API_URL` | `https://blast-frontend-production.up.railway.app/api/v1` |

3. **Variables que Railway PROPORCIONA AUTOMÁTICAMENTE:**
   - `DATABASE_URL` ✓ (PostgreSQL plugin)
   - `REDIS_URL` ✓ (Redis plugin)
   - NO las edites, son automáticas

4. **Click "Deploy"** en Railway

---

## IMPORTANTE:

Reemplaza estos valores con tus URLs reales de Railway:
- `blast-backend-production.up.railway.app` → Tu URL real del Backend
- `blast-frontend-production.up.railway.app` → Tu URL real del Frontend
- `yourdomain.com` → Tu dominio personalizado (si tienes)

Puedes verlas en Railway Dashboard → Services
