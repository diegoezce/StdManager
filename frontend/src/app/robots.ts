import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blest.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private, authenticated areas should not be indexed.
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/asistencia/',
          '/configuracion/',
          '/empresas/',
          '/estudiantes/',
          '/grupos/',
          '/mi-progreso/',
          '/mis-grupos/',
          '/reportes/',
          '/usuarios/',
          '/seleccionar-organizacion/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
