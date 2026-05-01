'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function MiProgresoPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [progress, setProgress] = useState<any>(null)
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
    const loadProgress = async () => {
      try {
        if (!user) return

        const progress = await apiClient.getStudentProgress(user.id)
        setProgress(progress)
      } catch (error) {
        console.error('Failed to load progress:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadProgress()
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Progress</h1>
            <p className="text-gray-600">Your attendance, grades, and certificates</p>
          </div>

          {progress ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Attendance */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Attendance Rate</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-green-600">
                    {progress.attendance_rate.toFixed(1)}%
                  </dd>
                  <p className="text-xs text-gray-500 mt-2">of all classes attended</p>
                </div>
              </div>

              {/* Average Score */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Score</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-blue-600">
                    {progress.average_score.toFixed(1)}
                  </dd>
                  <p className="text-xs text-gray-500 mt-2">across all evaluations</p>
                </div>
              </div>

              {/* Active Enrollments */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Groups</dt>
                  <dd className="mt-1 text-3xl font-extrabold text-purple-600">
                    {progress.enrollments.length}
                  </dd>
                  <p className="text-xs text-gray-500 mt-2">enrolled classes</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              <p>No progress data available yet.</p>
            </div>
          )}

          {/* Certificates */}
          {progress && progress.certificates.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">My Certificates</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {progress.certificates.map((cert: any) => (
                  <div key={cert.id} className="bg-white overflow-hidden shadow rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">🏆 {cert.level_achieved}</h3>
                        <p className="text-sm text-gray-600 mt-1">{cert.group_name}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Issued: {new Date(cert.issue_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
