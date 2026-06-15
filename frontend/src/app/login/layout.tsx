import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description:
    'Accede a tu cuenta institucional de BLEST para gestionar estudiantes, grupos, asistencias, evaluaciones y reportes.',
  alternates: {
    canonical: '/login',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
