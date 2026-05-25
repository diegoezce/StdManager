

# BLEST Landing Page Prompt

Create a modern SaaS landing page for a product called BLEST.

BLEST is a modern academic management platform focused on language institutes, especially English institutes in LATAM.

The landing page must be fully in Spanish.

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Framer Motion
- Mobile-first responsive design

## Design Inspiration

The visual style should feel similar to:

- Linear
- Vercel
- Supabase
- Notion
- Stripe

The UI must feel:

- modern
- minimal
- fast
- professional
- startup-quality
- clean
- premium

Avoid anything that looks like:

- old enterprise software
- WordPress themes
- legacy academic systems
- overloaded dashboards

## Main Value Proposition

"Enseñá más. Administrá menos."

Alternative supporting messages:

- Gestión académica moderna para institutos de idiomas.
- No más Excels ni sistemas viejos.
- Tomá asistencia en segundos desde el celular.
- Todo tu instituto en una sola plataforma.

## Primary Audience

- English institutes
- Language academies
- Small and medium educational centers
- Institute owners
- Academic coordinators
- Administrative staff

## Main Features To Highlight

- Gestión de alumnos
- Gestión de cursos y grupos
- Asistencia mobile-first
- Reportes y analíticas
- Roles y permisos
- Multi-tenant architecture
- Dashboard moderno
- Reportes personalizados potenciados por AI

## Important Product Messaging

The product should communicate:

- simplicity
- speed
- organization
- modern workflows
- visibility into institute operations

Avoid overly technical explanations.

Focus on:

- saving time
- reducing manual work
- replacing spreadsheets
- simplifying administration

## CTA Strategy

Primary CTA:

- "Probar Sandbox"

Secondary CTA:

- Floating WhatsApp button
- "¿Tenés preguntas? Escribinos"

The landing page should encourage users to explore the product immediately.

Do NOT create a “Contact Sales” enterprise-style experience.

The product should feel accessible and frictionless.

## Pricing Section

### Starter — USD 20/mes

- Hasta 30 alumnos
- Gestión de alumnos
- Cursos y grupos
- Asistencia mobile-first
- Reportes básicos
- Roles de profesores

### Growth — USD 40/mes

- Hasta 60 alumnos
- Todo lo del Starter
- Reportes avanzados
- Evaluaciones
- Certificados
- Roles administrativos

### Enterprise — Desde USD 100/mes

- Más de 100 alumnos
- Instancia dedicada
- Analíticas avanzadas
- Reportes personalizados con AI
- Multi-campus
- Soporte prioritario

## Required Sections

### 1. Hero Section

Large headline.

Modern SaaS aesthetic.

Should include:

- dashboard mockup
- mobile attendance mockup floating in front
- gradient background
- subtle animations

Primary CTA:

- Probar Sandbox

Secondary CTA:

- Ver funcionalidades

### 2. Trusted Modern Platform Section

Short section communicating:

- simple workflows
- centralized management
- modern experience

Could include simple statistics cards.

### 3. Mobile Attendance Showcase

This is one of the MOST important sections.

Show mobile attendance screenshots.

Messaging:

"Tomá asistencia en segundos desde tu celular."

Highlight:

- fast workflow
- simple UX
- mobile-first experience

### 4. Student & Group Management

Show modern tables and dashboards.

Messaging:

- no more spreadsheets
- organized data
- centralized management

### 5. Reports & Analytics

Show charts and reports.

This section should feel valuable for institute owners.

Messaging:

- visibility
- attendance trends
- performance insights
- modern analytics

Also mention:

"¿Necesitás un reporte específico? Podemos construirlo con AI."

### 6. Roles & Permissions

Show badges/cards for:

- Director
- Coordinador
- Profesor
- Alumno

Communicate:

- secure access
- organized workflows
- professional platform

### 7. Pricing Section

Modern pricing cards.

Growth plan should be visually highlighted.

### 8. Sandbox Demo Section

Very important.

Messaging examples:

- Explorá BLEST con un instituto demo.
- Probá la plataforma en minutos.
- Sin reuniones. Sin instalaciones.

CTA:

- Entrar al Sandbox

### 9. Final CTA

Strong final section.

Headline example:

"Modernizá la gestión de tu instituto."

CTA:

- Probar Sandbox

## Screenshots Strategy

The page should support replacing placeholders with real screenshots later.

Important screenshots needed:

1. Main dashboard
2. Mobile attendance screen
3. Students/groups management
4. Reports & analytics
5. Roles & permissions

Use elegant browser/device mockups.

Do not use raw screenshots directly.

## Visual Guidelines

- Use gradients carefully
- Soft shadows
- Rounded corners
- Premium spacing
- Smooth scroll animations
- Modern typography
- Clean cards
- Dark/light modern aesthetic

## Technical Requirements

- Use reusable components
- Production-quality structure
- SEO-friendly
- Fast loading
- Responsive
- Accessible
- Clean component hierarchy

## Vercel Deployment Requirements

The project must be optimized for Vercel from day one.

### Images

Use `next/image` for all images, mockups, and screenshots.

This enables automatic optimization (WebP, lazy loading, responsive sizes) via Vercel's image CDN.

### Fonts

Use `next/font` to load fonts (Inter or similar modern sans-serif).

This eliminates layout shift and ensures fonts are self-hosted via Vercel.

### Static Export

The landing has no backend logic.

Configure `next.config.js` with:

```js
output: 'export'
```

This generates a fully static site — fastest possible Vercel deploy.

### SEO & Metadata

Use Next.js 14 `Metadata` API in `layout.tsx` and `page.tsx`.

Must include:

- `title` and `description`
- Open Graph tags (`og:title`, `og:description`, `og:image`)
- Twitter card tags
- `robots` and `canonical` URL

### Environment Variables

The app URL (sandbox link) must be configurable via environment variable.

Use `NEXT_PUBLIC_APP_URL` for the sandbox CTA link.

Example: `https://app.blest.io`

Do not hardcode URLs.

## Important

Do NOT generate backend logic.

Focus entirely on:

- frontend UI
- UX
- layout
- animations
- SaaS presentation quality

Generate production-quality code.