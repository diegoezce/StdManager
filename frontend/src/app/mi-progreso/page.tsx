'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function MiProgresoPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [progress, setProgress] = useState<any>(null)
  const [mondlyRecords, setMondlyRecords] = useState<any[]>([])
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

        const [progressData, mondlyData] = await Promise.all([
          apiClient.getStudentProgress(user.id),
          apiClient.getMondlyData().catch(() => ({})),
        ])
        setProgress(progressData)
        const email = user.email?.toLowerCase()
        const records = email && mondlyData[email] ? mondlyData[email] : []
        setMondlyRecords(records)
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
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            eyebrow="Estudiante"
            title="Mi progreso"
            subtitle="Asistencia, calificaciones y certificados."
          />

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

          {/* Mondly */}
          {mondlyRecords.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Mondly</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mondlyRecords.map((r: any, i: number) => (
                  <div key={i} className="bg-white shadow rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">{r.language}</span>
                      {r.level && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{r.level}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Points</p>
                        <p className="font-semibold text-gray-800">{r.points?.toLocaleString() ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Best streak</p>
                        <p className="font-semibold text-gray-800">{r.best_streak ?? '—'} days</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Lessons</p>
                        <p className="font-semibold text-gray-800">{r.lessons_completed ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Words learned</p>
                        <p className="font-semibold text-gray-800">{r.words_learned ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Minutes</p>
                        <p className="font-semibold text-gray-800">{r.learning_minutes ?? '—'}</p>
                      </div>
                      {r.last_active_on && (
                        <div>
                          <p className="text-gray-500 text-xs">Last active</p>
                          <p className="font-semibold text-gray-800">{new Date(r.last_active_on).toLocaleDateString()}</p>
                        </div>
                      )}
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
