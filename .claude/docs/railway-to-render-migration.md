# Migración Railway → Render (checklist code-driven)

Guía reutilizable para migrar una app de Railway a Render con un Blueprint
(`render.yaml`), 100% code-driven, sin depender del dashboard salvo lo mínimo.
Destila los tropiezos reales de la migración de HealthMonitor.

## Prompt para pegar en otro proyecto

```
Quiero migrar esta app de Railway a Render, 100% code-driven (sin tocar
dashboards salvo lo mínimo imprescindible). Usá un Blueprint (render.yaml).
Seguí estos pasos y cuidados, que ya me quemaron en otro proyecto:

1. render.yaml — creá un `databases:` (Postgres) y los `services:` necesarios
   (web / mcp / cron), todos Docker reutilizando el mismo Dockerfile. Si el
   proyecto ya branchea por SERVICE_ROLE (como en Railway), reusá ese mismo
   mecanismo; para un cron usá `type: cron` con `dockerCommand` propio.

2. PLAN DE BASE DE DATOS: 'starter' es legacy y Render lo RECHAZA para DBs
   nuevas. Usá `plan: basic-256mb`. Los planes de los servicios web/cron sí
   pueden seguir en 'starter'.

3. DATABASE_URL: inyectala con
     fromDatabase: { name: <db>, property: connectionString }
   Revisá el settings: si cuando DATABASE_URL falta cae a un default tipo
   localhost, un error "connection refused 127.0.0.1:5432" significa que la
   var no está llegando (DB no creada, distinta región, o servicio creado a
   mano en vez de por Blueprint).

4. ALLOWED_HOSTS / hosts permitidos: Render inyecta RENDER_EXTERNAL_HOSTNAME
   automáticamente en los web services y su health-check prober pega a ese
   host. Hacé que el settings lo lea y lo agregue a ALLOWED_HOSTS y
   CSRF_TRUSTED_ORIGINS (patrón igual al de RAILWAY_PUBLIC_DOMAIN si existe).
   OJO: RENDER_EXTERNAL_HOSTNAME trae SOLO el dominio *.onrender.com, NO los
   custom domains — esos hay que listarlos explícitos en el env var del
   blueprint. Un healthcheck que falla en loop (deploy que corre minutos y no
   pasa nunca) suele ser DisallowedHost por esto.

5. Si hay un server MCP / cualquier allowlist de Host aparte (ej.
   DNS-rebinding), aplicale el mismo tratamiento con RENDER_EXTERNAL_HOSTNAME.

6. Migrar los datos: si hay backups en R2 (o similar), en vez de crear
   usuarios/superuser a mano, restaurá el backup — trae cuentas + datos.
   Verificá que la imagen tenga postgresql-client de versión >= a la del
   server, y corré el comando de restore una sola vez (Shell del web con las
   4 credenciales R2 seteadas, o el servicio cron apuntado temporalmente al
   restore).

7. Secretos/tokens: si un token está como `generateValue: true`, Render
   genera uno NUEVO distinto al de Railway. Si algún cliente externo (ej.
   connector MCP) usaba el token viejo, va a fallar. Decidí conmigo: o fijo
   el token viejo en el blueprint (sync:false / valor propio) para reusar la
   config del cliente sin cambios, o uso el nuevo y actualizo el cliente.

8. Variables que van a mano (sync:false): dominios custom y credenciales
   externas (R2, etc.). Todo lo demás (DATABASE_URL, hosts .onrender.com,
   secretos generados) que sea automático.

Primero mostrame el render.yaml y el settings antes de aplicar cambios, y
commiteá+pusheá cada fix (auto-deploy). Después verificá con curl que
/health responde 200 y que el healthcheck pasa.
```

## Gotchas (referencia rápida)

| Síntoma | Causa | Fix |
|---|---|---|
| `render.yaml` rechaza el plan de la DB | `plan: starter` es legacy para DBs nuevas | `plan: basic-256mb` (los servicios web/cron sí siguen en `starter`) |
| `connection refused 127.0.0.1:5432` | `DATABASE_URL` no llega; el settings cae al default localhost | `fromDatabase.property: connectionString`; verificar que el servicio se creó por Blueprint y en la misma región que la DB |
| Deploy corre minutos y nunca pasa el healthcheck | `DisallowedHost` en `/health` | leer `RENDER_EXTERNAL_HOSTNAME` en el settings; para custom domains, listarlos explícitos |
| Custom domain sigue dando `DisallowedHost` | `RENDER_EXTERNAL_HOSTNAME` solo trae el `*.onrender.com` | agregar el dominio custom explícito en `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS` |
| MCP server rechaza requests (421) | allowlist DNS-rebinding no incluye el host de Render | leer `RENDER_EXTERNAL_HOSTNAME` también ahí |
| App pide user/pass y no entra | DB nueva vacía | restaurar backup (R2) en vez de crear superuser a mano |
| Connector MCP nativo (Claude Desktop) da "couldn't register with sign-in service" | el connector intenta OAuth y cae a ese error cuando la conexión da 401 | poner el token correcto en la URL `?key=<token>`; con token válido la conexión va 200 y no intenta OAuth |
| El token viejo de Railway ya no sirve | `MCP_API_TOKEN: generateValue: true` genera uno nuevo en Render | fijar el token viejo en el blueprint, o actualizar el cliente con el nuevo |

## Env vars: quién las setea

- **Automáticas (no tocar):** `DATABASE_URL` (`fromDatabase`), secretos con
  `generateValue: true`, host `*.onrender.com` (vía `RENDER_EXTERNAL_HOSTNAME`).
- **A mano (`sync: false`):** dominios custom (`ALLOWED_HOSTS`,
  `CSRF_TRUSTED_ORIGINS`, `MCP_ALLOWED_HOSTS`) y credenciales externas (R2, etc.).

## Verificación post-deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<dominio>/health   # → 200
curl -s -o /dev/null -w "%{http_code}\n" https://<mcp>/mcp          # → 401 (vivo y protegido)
```
