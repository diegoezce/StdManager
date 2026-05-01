# GoPlanify

Educational institution management platform with multi-tenant support.

## Features

- **Multi-tenant architecture**: Isolated organizations
- **RBAC**: Super Admin, Owner, Manager, Teacher, Corporate Client, Student roles
- **BLAST Module**: English language teaching management
- **Attendance**: Mobile-first attendance marking (bulk operations)
- **Reports**: Analytics and dashboards
- **Audit Trail**: Complete action logging
- **Certificates**: Digital certificate generation

## Tech Stack

- **Backend**: Django 4.2 + Django REST Framework + PostgreSQL
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Queue**: Celery + Redis
- **Containerization**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Setup with Docker Compose

1. Clone the repository and navigate to the project:

```bash
cd /Users/diegocervera/Projects/StudentManager
```

2. Start all services:

```bash
docker-compose up --build
```

Services will be available at:
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/api/docs/
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

3. Create a superuser (in a new terminal):

```bash
docker exec goplanify_backend python manage.py createsuperuser
```

4. Initialize the database:

```bash
docker exec goplanify_backend python manage.py migrate
docker exec goplanify_backend python manage.py loaddata fixtures/seed_data.json
```

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup PostgreSQL connection
export DB_HOST=localhost
export DEBUG=True

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login/` - Login
- `POST /api/v1/auth/refresh/` - Refresh token
- `GET /api/v1/auth/users/me/` - Get current user

### Organizations
- `GET/POST /api/v1/organizations/`
- `GET/PUT/DELETE /api/v1/organizations/{slug}/`
- `GET /api/v1/organizations/{slug}/license/`
- `GET /api/v1/organizations/{slug}/stats/`

### Users
- `GET/POST /api/v1/auth/users/`
- `POST /api/v1/auth/users/{id}/assign-role/`

### BLAST Module
- `GET/POST /api/v1/groups/`
- `GET/PUT/DELETE /api/v1/groups/{id}/`
- `POST /api/v1/groups/{id}/enroll/`
- `GET /api/v1/groups/{id}/attendance/`

- `GET/POST /api/v1/students/`
- `GET /api/v1/students/{id}/progress/`

- `POST /api/v1/attendance/` - Single
- `POST /api/v1/attendance/bulk/` - Bulk (mobile-first)
- `GET /api/v1/attendance/`

- `GET/POST /api/v1/evaluations/`
- `GET /api/v1/certificates/`

### Reports
- `GET /api/v1/reports/attendance/`
- `GET /api/v1/reports/students/`
- `GET /api/v1/reports/groups/`

### Audit
- `GET /api/v1/audit-logs/`

## Database Schema

### Core
- `AuditLog`: Action logging
- `Organization`: Tenant data
- `License`: License info

### Accounts
- `CustomUser`: User model with RBAC

### BLAST
- `Teacher`: Teacher profile
- `Student`: Student profile
- `CorporateClient`: Corporate client info
- `Group`: Class/group
- `Enrollment`: Student-group relationship
- `Attendance`: Attendance records
- `Evaluation`: Assessment scores
- `Certificate`: Digital certificates

## RBAC Permissions

| Endpoint | super_admin | owner | manager | teacher | corp_client | student |
|----------|-------------|-------|---------|---------|-------------|---------|
| Organizations CRUD | ✓ | R | - | - | - | - |
| Users CRUD | ✓ | ✓ | ✓ (limited) | - | - | - |
| Groups CRUD | ✓ | ✓ | ✓ | R | - | - |
| Attendance write | ✓ | ✓ | ✓ | ✓ | - | - |
| Attendance read | ✓ | ✓ | ✓ | ✓(own) | ✓(own co.) | ✓(own) |
| Reports | ✓ | ✓ | ✓ | R(own) | R(own co.) | R(own) |
| Audit logs | ✓ | ✓ | - | - | - | - |

## Frontend Components

- **Login**: Email/password authentication with JWT
- **Dashboard**: Organization stats and quick links
- **Attendance**: Mobile-first UI for marking attendance (bulk operations with 1 click)
- **Groups**: List and manage classes
- **Reports**: Analytics and data visualization

## Demo Credentials

```
Email: admin@example.com
Password: password123
```

## Project Structure

```
goplanify/
├── backend/
│   ├── config/           # Django settings & urls
│   ├── apps/
│   │   ├── core/        # Shared models, middleware, permissions
│   │   ├── accounts/    # User & auth
│   │   ├── organizations/  # Tenant management
│   │   └── blast/       # English teaching module
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/         # Pages
│   │   ├── components/  # React components
│   │   ├── lib/         # API client, auth store
│   │   └── types/       # TypeScript types
│   └── package.json
└── docker-compose.yml
```

## Development Notes

### Adding New Features

1. Create models in `apps/blast/models.py`
2. Create serializers in `apps/blast/serializers.py`
3. Create views in `apps/blast/views.py`
4. Register URLs in `apps/blast/urls.py`
5. Add to Django admin (`apps/blast/admin.py`)

### Running Tests

```bash
# Backend
docker exec goplanify_backend python manage.py test

# Frontend
cd frontend && npm test
```

### Database Migrations

```bash
# Create migration
docker exec goplanify_backend python manage.py makemigrations

# Apply migration
docker exec goplanify_backend python manage.py migrate
```

## Performance Considerations

- Use `select_related()` and `prefetch_related()` for optimized queries
- Implement pagination for large datasets
- Use Redis for caching and sessions
- Celery for async tasks (reports, PDF generation)
- Database indexes on frequently queried fields

## Security

- JWT tokens with 1-hour expiration
- CORS configured for frontend
- RBAC for all endpoints
- Audit trail for all actions
- SQL injection prevention (Django ORM)
- CSRF protection enabled

## Deployment

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Update `SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure email for password resets
- [ ] Setup monitoring and logging
- [ ] Configure CORS properly
- [ ] Run security checks: `python manage.py check --deploy`

### Deploy to Railway

Railway is the recommended deployment platform. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

Quick start:
1. Push code to GitHub
2. Connect repository to Railway
3. Configure environment variables
4. Add PostgreSQL and Redis plugins
5. Deploy

### Alternative Deployment Options

- **Backend**: AWS ECS, Heroku, DigitalOcean App Platform, Railway
- **Frontend**: Vercel, Netlify (can also deploy from Railway)
- **Database**: AWS RDS PostgreSQL, Railway PostgreSQL
- **Redis**: AWS ElastiCache, Railway Redis

## Contributing

1. Create feature branches
2. Follow Django/Next.js conventions
3. Write tests
4. Submit pull requests

## License

Proprietary

## Support

For issues or questions, please contact support@goplanify.com
