# Onboarding de otra app a Supabase (schema propio + backup a R2)

Prompt reutilizable para migrar **otra** app a compartir el Postgres de
Supabase que ya usás, sin gastar un proyecto por app (free tier = 2
proyectos) y dejándola con backup diario a Cloudflare R2 vía GitHub Actions
(sin cron de servidor).

Cada app vive en **su propio schema** dentro de la misma base, así no chocan
(cada app Django tiene su `auth_user`, `django_migrations`, etc).

Ver también [railway-to-render-migration.md](railway-to-render-migration.md)
para los gotchas de Render/Supabase de fondo.

## Cómo usarlo

Abrí la otra app en VS Code y pegale el prompt de abajo, reemplazando:

- `<APP>` — nombre del schema para esa app (ej. `gymtracker`). Uno distinto por app.
- `<REF>` — project ref de Supabase (HealthMonitor: `uqhrupljrhzolwgtgpst`).
- `<REGION>` — región del proyecto (ej. `us-east-1`).
- `<PASS>` — contraseña del proyecto Supabase.

## Prompt

```
Quiero que esta app deje de tener su propia base y pase a compartir un
Postgres de Supabase que ya tengo, en SU PROPIO SCHEMA, y además que quede
con backup diario a Cloudflare R2 sin depender de ningún servidor/cron
(Supabase free tier da solo 2 proyectos, así consolido varias apps en uno;
y los backups los corre GitHub Actions). Es una app Django.

===========================================================================
PARTE A — Mover la DB a Supabase (schema por app)
===========================================================================
GOTCHAS (ya me quemaron antes):
- Usar SIEMPRE el connection pooler, NO la conexión directa:
  * Directo (db.<REF>.supabase.co) es IPv6-only → falla en hosts sin IPv6.
  * Pooler (aws-0-<REGION>.pooler.supabase.com, usuario postgres.<REF>) es
    IPv4. Session mode = puerto 5432. Agregar ?sslmode=require.
- Dos apps Django en el mismo schema (public) chocan (cada una tiene su
  auth_user, django_migrations, etc) → cada app va en su propio schema.

PASOS:
1. Mostrame cómo lee la DB el settings (normalmente DATABASE_URL vía
   django-environ / dj-database-url). NO cambies código: el schema se setea
   por la URL.
2. Crear el schema una vez (yo lo corro en el SQL Editor de Supabase, o
   decime y lo corrés vos con psql):
       CREATE SCHEMA IF NOT EXISTS <APP>;
3. Armar DATABASE_URL con pooler + search_path:
   postgresql://postgres.<REF>:<PASS>@aws-0-<REGION>.pooler.supabase.com:5432/postgres?sslmode=require&options=-csearch_path%3D<APP>
   (%3D = "=" URL-encodeado; django-environ lo pasa a OPTIONS['options'].)
4. Migrar y verificar que las tablas caen DENTRO del schema <APP>, no en public:
       DATABASE_URL="...options=-csearch_path%3D<APP>" python manage.py migrate
       -- verificar: SELECT table_schema, count(*) FROM information_schema.tables
          WHERE table_schema='<APP>' GROUP BY 1;
5. Levantar la app local contra esa DATABASE_URL y probar que funciona.
6. Si hay datos que migrar desde la base actual, lo vemos aparte (pg_dump/
   pg_restore deben ser >= la versión del server; Supabase está en PG17).
Mostrame settings + el DATABASE_URL final ANTES de correr migraciones.

===========================================================================
PARTE B — Backup diario a R2 con GitHub Actions
===========================================================================
Quiero un workflow que corra un pg_dump del schema <APP> y lo suba a R2, sin
cron de ningún servidor. Si la app ya tiene un management command de backup
(tipo `manage.py backup_db` que hace pg_dump -Fc + upload a R2), reusalo;
si no, creá uno equivalente. Requisitos y gotchas:

- El dump debe ser SOLO del schema de esta app: pg_dump --schema=<APP>
  (si comparto la base con otras apps, no quiero backupear las demás).
- pg_dump DEBE ser >= la versión del server (Supabase = PG17). El runner de
  ubuntu trae pg16 y su /usr/bin/pg_dump gana en el PATH, así que:
    * instalar postgresql-client-17 desde PGDG, y
    * symlinkearlo a /usr/local/bin/pg_dump (que va antes que /usr/bin), y
    * abortar el job si `pg_dump --version` no es 17.
- Secrets del repo (Settings → Secrets and variables → Actions):
    DATABASE_URL  (el pooler de Supabase con search_path al schema <APP>)
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
- Schedule diario (cron "0 9 * * *") + workflow_dispatch para probar a mano.

Este es el workflow que ya me funcionó en otra app (adaptá el nombre del
command/prefix y agregale --schema=<APP> al pg_dump):

    name: Backup database to R2
    on:
      schedule:
        - cron: "0 9 * * *"
      workflow_dispatch: {}
    jobs:
      backup:
        runs-on: ubuntu-latest
        timeout-minutes: 15
        steps:
          - uses: actions/checkout@v4
          - name: Install pg_dump 17
            run: |
              sudo install -d /usr/share/postgresql-common/pgdg
              curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
                | sudo tee /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc >/dev/null
              echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
                | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
              sudo apt-get update
              sudo apt-get install -y postgresql-client-17
              sudo ln -sf /usr/lib/postgresql/17/bin/pg_dump /usr/local/bin/pg_dump
              pg_dump --version | grep -q ' 17\.' || { echo "pg_dump no es 17"; pg_dump --version; exit 1; }
          - name: Set up uv
            uses: astral-sh/setup-uv@v5
          - name: Run backup
            env:
              DJANGO_SETTINGS_MODULE: config.settings   # ajustar si difiere
              DATABASE_URL: ${{ secrets.DATABASE_URL }}
              R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
              R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
              R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
              R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}
            run: uv run python manage.py backup_db   # o el command equivalente

Después de crear el workflow: listame los secrets que tengo que cargar y
decime cómo dispararlo a mano (Actions → Run workflow) para probar que sube
a R2 antes de confiar en el schedule.
```

## Dos cosas que no te podés saltar

1. **Backup scoped al schema (`pg_dump --schema=<APP>`).** Como varias apps
   comparten la misma base, sin `--schema` cada app backupearía *toda* la
   base (todas las apps). Si el command de backup no soporta `--schema`, hay
   que agregárselo.
2. **Prefix distinto por app en R2.** Si usás el mismo bucket para todas
   (ej. `gymtracker`), poné `R2_BACKUP_PREFIX=<app>-backups` en cada una para
   no pisar backups entre apps.

## Restaurar el backup de un schema

`pg_dump --schema=<APP>` genera objetos calificados con el schema, así que
`pg_restore` los recrea en `<APP>`. El `pg_restore` local debe ser >= la
versión del dump (instalá el client de la versión que corresponda).
