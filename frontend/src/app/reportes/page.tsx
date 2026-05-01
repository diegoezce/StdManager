'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'

type ReportType = 'attendance' | 'students' | 'groups'

export default function ReportesPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [reportType, setReportType] = useState<ReportType>('attendance')
  const [reportData, setReportData] = useState<any>(null)
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
    const loadReport = async () => {
      try {
        if (!user) return

        setIsLoading(true)
        const data = await apiClient.getReports(reportType)
        setReportData(data)
      } catch (error) {
        console.error('Failed to load report:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadReport()
    }
  }, [user, reportType])

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
    <ProtectedRoute allowedRoles={['owner', 'manager', 'teacher', 'corporate_client']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600">View analytics and reports</p>
          </div>

          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Select Report Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['attendance', 'students', 'groups'] as ReportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                    reportType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'attendance'
                    ? '✓ Attendance'
                    : type === 'students'
                      ? '👥 Students'
                      : '📚 Groups'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            {reportData ? (
              <div className="overflow-x-auto">
                {Array.isArray(reportData) ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(reportData[0] || {}).map((key) => (
                          <th
                            key={key}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.map((row: any, idx: number) => (
                        <tr key={idx}>
                          {Object.values(row).map((value: any, vidx: number) => (
                            <td
                              key={vidx}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(reportData, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No data available</p>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
