import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BLEST — Gestión integral para institutos educativos',
    short_name: 'BLEST',
    description:
      'Plataforma integral para la administración de programas educativos: estudiantes, grupos, asistencias y reportes en un solo lugar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#4f46e5',
    lang: 'es',
    categories: ['education', 'business', 'productivity'],
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
