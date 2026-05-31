# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project

**BLEST** — multi-tenant SaaS platform for educational institutions (English language schools). The product name is BLEST; the repo directory is StudentManager.

## Commands

### Docker (primary dev environment)

```bash
# Start all services (postgres, redis, backend :8000, frontend :3000)
docker-compose up --build

# Backend shell
docker exec -it goplanify_backend bash

# Migrations
docker exec goplanify_backend python manage.py makemigrations
docker exec goplanify_backend python manage.py migrate

# Seed demo data
docker exec goplanify_backend python manage.py seed_data

# Run backend tests
docker exec goplanify_backend python manage.py test

# Run a single test
docker exec goplanify_backend python manage.py test apps.blast.tests.TestClassName
```

### Local backend (without Docker)

```bash
cd backend
source venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.development
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # dev server on :3000
npm run build    # production build
npm run lint     # ESLint
```

## Architecture

### Multi-tenancy

Row-based isolation — every model in `apps/blast/` and `apps/organizations/` includes `organization` FK via `OrganizationMixin` ([backend/apps/core/mixins.py](backend/apps/core/mixins.py)). All queries must be scoped to `request.user.organization`. There is no schema-per-tenant; filtering by `organization` is the only isolation boundary.

### Django backend (`backend/`)

Settings are split: `config/settings/base.py` → `development.py` / `production.py`. The env variable `DJANGO_SETTINGS_MODULE` selects which is loaded.

URL layout:
- `api/v1/auth/` → `apps.accounts`
- `api/v1/organizations/` → `apps.organizations`
- `api/v1/` (everything else) → `apps.blast`

**App responsibilities:**

| App | Purpose |
|-----|---------|
| `apps.core` | `BaseModel`, `OrganizationMixin`, `AuditMixin`, `AuditLog`, `AuditMiddleware`, permissions classes |
| `apps.accounts` | `CustomUser` (email-based auth, role enum, org FK) |
| `apps.organizations` | `Organization`, `License` (tenant management) |
| `apps.blast` | All teaching domain models: `Teacher`, `Student`, `CorporateClient`, `Group`, `Enrollment`, `Attendance`, `Evaluation`, `Certificate`, `MondlyRecord` |

**RBAC** is handled in `apps.core.permissions` with per-role permission classes (`IsSuperAdmin`, `IsOwner`, `IsOwnerOrManager`, `IsTeacher`, etc.) applied at the view level. Role is a string enum on `CustomUser`, not a separate table. Roles in order of privilege: `super_admin > owner > manager > admin > teacher > corporate_client > student`.

**Audit trail**: `AuditMixin.log_change()` writes to `AuditLog`. `AuditMiddleware` attaches `request.user_ip` and `request.user_agent` to every request.

**Mondly integration**: `MondlyRecord` stores imported Mondly performance data matched to students by email. Import endpoint: `POST /api/v1/mondly/import/` (xlsx upload).

### Next.js frontend (`frontend/`)

- **Auth state**: Zustand store at `src/lib/auth.ts` — `useAuth()` hook. JWT tokens stored in `localStorage`. `hasRole(roles)` helper for conditional rendering.
- **API client**: Singleton `apiClient` at `src/lib/api.ts` — axios wrapper that auto-attaches Bearer token, redirects to `/login` on 401.
- **Route structure**: `src/app/` uses Next.js App Router. Pages are Spanish-named (`/grupos`, `/asistencia`, `/estudiantes`, `/reportes`, `/configuracion`, `/empresas`, `/usuarios`).
- **Role-gated pages**: wrap with `<ProtectedRoute>` component; check `useAuth().hasRole(...)` inside pages for conditional UI.
- **Charts**: Recharts library.

### Key data relationships

```
Organization
  └── CustomUser (role, org FK)
       └── Teacher (OneToOne → user)
       └── Student (OneToOne → user, FK → CorporateClient)
  └── CorporateClient
  └── Group (FK → Teacher, schedule as JSON)
       └── Enrollment (FK → Student, status)
       └── Attendance (FK → Student, date, status)
       └── Evaluation (FK → Student, type, score)
       └── Certificate (FK → Student)
  └── MondlyRecord (FK → Student, matched by email)
```

`Group.schedule` is a JSON field with shape: `{"days": ["MON", "WED"], "time": "18:00", "duration": 60}`.

### Adding a new feature

1. Model → `apps/blast/models.py` (use `OrganizationMixin` + `BaseModel`)
2. Serializer → `apps/blast/serializers.py`
3. ViewSet → `apps/blast/views.py` (apply permission classes)
4. URL → `apps/blast/urls.py`
5. Frontend page → `frontend/src/app/<feature>/page.tsx`
6. API method → `frontend/src/lib/api.ts`

### Deployment

Deployed on Railway. See `RAILWAY_VARS.md` for required env vars and `DEPLOYMENT.md` for the full checklist. The `Procfile` and `Dockerfile` at root are used by Railway for the backend. Frontend deploys separately via `frontend/` directory.
