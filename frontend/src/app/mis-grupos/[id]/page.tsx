'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Group, Enrollment, Attendance, Evaluation } from '@/types'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function GroupDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, me } = useAuth()
  const groupId = params.id as string

  const [group, setGroup] = useState<Group | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
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
    const loadGroupDetails = async () => {
      try {
        if (!user || !groupId) return

        const groupResponse = await apiClient.getGroup(groupId)
        setGroup(groupResponse)

        const enrollmentsData = await apiClient.getEnrollments()
        const enrollments = enrollmentsData.results || enrollmentsData
        const studentEnrollment = enrollments.find(
          (e: Enrollment) => e.group === groupId && e.status === 'active'
        )

        if (!studentEnrollment) {
          router.push('/mis-grupos')
          return
        }

        setEnrollment(studentEnrollment)

        const attendanceResponse = await apiClient.getAttendance(groupId)
        const attendanceData = attendanceResponse.results || attendanceResponse
        setAttendance(attendanceData || [])

        const evaluationsResponse = await apiClient.getEvaluations()
        const allEvaluations = evaluationsResponse.results || evaluationsResponse
        const groupEvaluations = allEvaluations.filter((e: Evaluation) => e.group === groupId)
        setEvaluations(groupEvaluations)
      } catch (error) {
        console.error('Failed to load group details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadGroupDetails()
    }
  }, [user, groupId, router])

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

  if (!group || !enrollment) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              <p className="text-lg mb-4">Group not found</p>
              <Link
                href="/mis-grupos"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to My Groups
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const attendanceRate =
    attendance.length > 0
      ? (attendance.filter((a) => a.status === 'present').length / attendance.length) * 100
      : 0

  const averageScore =
    evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
      : 0

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/mis-grupos"
            className="text-blue-600 hover:text-blue-800 font-medium mb-6 inline-block"
          >
            ← Back to My Groups
          </Link>

          <div className="bg-white rounded-lg shadow mb-8 p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{group.name}</h1>
            <p className="text-gray-600 mb-4">{group.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Level:</span> {group.level}
                </p>
                <p>
                  <span className="font-medium">Teacher:</span> {group.teacher_name}
                </p>
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      group.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {group.status}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <p>
                  <span className="font-medium">Enrolled:</span>{' '}
                  {new Date(enrollment.enrolled_at).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-medium">Start Date:</span>{' '}
                  {new Date(group.start_date).toLocaleDateString()}
                </p>
                {group.end_date && (
                  <p>
                    <span className="font-medium">End Date:</span>{' '}
                    {new Date(group.end_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <dt className="text-sm font-medium text-gray-500">Attendance Rate</dt>
              <dd className="mt-2 text-3xl font-extrabold text-green-600">
                {attendanceRate.toFixed(1)}%
              </dd>
              <p className="text-xs text-gray-600 mt-2">
                {attendance.filter((a) => a.status === 'present').length} of {attendance.length}{' '}
                classes
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <dt className="text-sm font-medium text-gray-500">Average Score</dt>
              <dd className="mt-2 text-3xl font-extrabold text-blue-600">
                {evaluations.length > 0 ? averageScore.toFixed(1) : 'N/A'}
              </dd>
              <p className="text-xs text-gray-600 mt-2">
                {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <dt className="text-sm font-medium text-gray-500">Total Classes</dt>
              <dd className="mt-2 text-3xl font-extrabold text-purple-600">
                {attendance.length}
              </dd>
              <p className="text-xs text-gray-600 mt-2">recorded attendance</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Attendance History */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Attendance History</h2>
                {attendance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendance.map((record) => (
                          <tr key={record.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  record.status === 'present'
                                    ? 'bg-green-100 text-green-800'
                                    : record.status === 'absent'
                                      ? 'bg-red-100 text-red-800'
                                      : record.status === 'late'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No attendance records yet</p>
                )}
              </div>
            </div>

            {/* Evaluations */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Evaluations</h2>
                {evaluations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Percentage
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {evaluations.map((evaluation) => (
                          <tr key={evaluation.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {evaluation.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {evaluation.score}/{evaluation.max_score}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  evaluation.percentage >= 80
                                    ? 'bg-green-100 text-green-800'
                                    : evaluation.percentage >= 60
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {evaluation.percentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No evaluations yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
