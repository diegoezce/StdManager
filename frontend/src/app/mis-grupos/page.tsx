'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Enrollment } from '@/types'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function MisGruposPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
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
    const loadEnrollments = async () => {
      try {
        if (!user) return

        const data = await apiClient.getEnrollments()
        const enrollmentsData = data.results || data
        setEnrollments(enrollmentsData.filter((e: Enrollment) => e.status === 'active'))
      } catch (error) {
        console.error('Failed to load enrollments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadEnrollments()
    }
  }, [user])

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
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Groups</h1>
            <p className="text-gray-600">Your enrolled English classes</p>
          </div>

          {enrollments.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{enrollment.group_name}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Status:</span> {enrollment.status}
                      </p>
                      <p>
                        <span className="font-medium">Enrolled:</span>{' '}
                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Link
                        href={`/mis-grupos/${enrollment.group}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              <p className="text-lg mb-2">No groups yet</p>
              <p className="text-sm">You haven't enrolled in any groups. Contact your administrator.</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
