'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export function Navbar() {
  const router = useRouter()
  const { user, logout, hasRole } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (!user) return null

  const navItems: { label: string; href: string; roles: string[] }[] = [
    { label: 'Dashboard', href: '/dashboard', roles: ['owner', 'manager', 'teacher', 'student', 'corporate_client'] },
    { label: 'Grupos', href: '/grupos', roles: ['owner', 'manager'] },
    { label: 'Estudiantes', href: '/estudiantes', roles: ['owner', 'manager'] },
    { label: 'Asistencia', href: '/asistencia', roles: ['teacher', 'manager'] },
    { label: 'Mis Grupos', href: '/mis-grupos', roles: ['student'] },
    { label: 'Mi Progreso', href: '/mi-progreso', roles: ['student'] },
    { label: 'Reportes', href: '/reportes', roles: ['owner', 'manager', 'teacher', 'corporate_client'] },
  ]

  const visibleItems = navItems.filter((item) => hasRole(item.roles))

  const getRoleBadgeColor = () => {
    switch (user.role) {
      case 'owner':
        return 'bg-red-100 text-red-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'teacher':
        return 'bg-green-100 text-green-800'
      case 'student':
        return 'bg-purple-100 text-purple-800'
      case 'corporate_client':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              GoPlanify
            </Link>
            <div className="hidden md:flex space-x-1 ml-10">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}>
              {user.role}
            </span>
            <span className="text-sm text-gray-700">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
