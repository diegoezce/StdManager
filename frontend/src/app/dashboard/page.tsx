'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Organization } from '@/types'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'

export default function DashboardPage() {
  const router = useRouter()
  const { user, me, hasRole } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [clientStudents, setClientStudents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!user) {
          await me()
        }
      } catch (error) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [user, me, router])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        if (!user) return

        const orgs = await apiClient.getOrganizations()
        const org = orgs.results?.[0] || orgs[0]
        setOrganization(org)

        if (org && hasRole(['owner', 'manager', 'admin'])) {
          const stats = await apiClient.getOrganizationStats(org.slug)
          setStats(stats)
        }

        if (hasRole(['corporate_client'])) {
          const res = await apiClient.getStudents()
          setClientStudents(res.results || res)
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadDashboard()
    }
  }, [user, hasRole])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          eyebrow="Panel general"
          title={organization?.name || 'Organization'}
          subtitle={`Bienvenido${user?.first_name ? `, ${user.first_name}` : ''}.`}
        />

        {/* Owner/Manager/Admin Stats */}
        {stats && hasRole(['owner', 'manager', 'admin']) && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                <dd className="mt-1 text-3xl font-extrabold text-gray-900">{stats.users}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Students</dt>
                <dd className="mt-1 text-3xl font-extrabold text-gray-900">{stats.students}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Teachers</dt>
                <dd className="mt-1 text-3xl font-extrabold text-gray-900">{stats.teachers}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Groups</dt>
                <dd className="mt-1 text-3xl font-extrabold text-gray-900">{stats.groups}</dd>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links based on Role */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hasRole(['owner', 'manager', 'admin']) && (
            <>
              <Link href="/grupos">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg cursor-pointer transition">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">📚 Manage Groups</h3>
                    <p className="text-gray-600 text-sm">Create and manage class groups</p>
                  </div>
                </div>
              </Link>
              <Link href="/estudiantes">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg cursor-pointer transition">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">👥 Manage Students</h3>
                    <p className="text-gray-600 text-sm">Enroll and manage students</p>
                  </div>
                </div>
              </Link>
              <Link href="/asistencia">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg cursor-pointer transition">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">✓ Mark Attendance</h3>
                    <p className="text-gray-600 text-sm">Record student attendance quickly</p>
                  </div>
                </div>
              </Link>
            </>
          )}

          {hasRole(['teacher']) && (
            <>
              <Link href="/asistencia">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg cursor-pointer transition">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">✓ Mark Attendance</h3>
                    <p className="text-gray-600 text-sm">Record student attendance quickly</p>
                  </div>
                </div>
              </Link>
            </>
          )}

          {hasRole(['student']) && (
            <>
              <Link href="/mis-grupos">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg cursor-pointer transition">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">📖 My Groups</h3>
                    <p className="text-gray-600 text-sm">View your enrolled groups</p>
                  </div>
                </div>
              </Link>
              <Link href="/mi-progreso">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg cursor-pointer transition">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">📊 My Progress</h3>
                    <p className="text-gray-600 text-sm">Check your attendance and grades</p>
                  </div>
                </div>
              </Link>
            </>
          )}

          {hasRole(['corporate_client']) && (
            <>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500">Mis estudiantes</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-gray-900">{clientStudents.length}</dd>
                  <p className="text-sm text-gray-500 mt-1">
                    {clientStudents.filter((s) => s.is_active).length} activos
                  </p>
                </div>
              </div>
              <Link href="/estudiantes">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg cursor-pointer transition">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">👥 Ver estudiantes</h3>
                    <p className="text-gray-600 text-sm">Listado de empleados inscriptos</p>
                  </div>
                </div>
              </Link>
            </>
          )}

          {hasRole(['owner', 'manager', 'admin', 'corporate_client', 'teacher']) && (
            <Link href="/reportes">
              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg cursor-pointer transition">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">📈 Reports</h3>
                  <p className="text-gray-600 text-sm">View analytics and reports</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
