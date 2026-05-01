'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Group, Enrollment } from '@/types'
import { format } from 'date-fns'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function AttendancePage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [attendance, setAttendance] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
    const loadGroups = async () => {
      try {
        if (!user) return

        const response = await apiClient.getGroups()
        const groupsData = response.results || response
        setGroups(groupsData)
        if (groupsData.length > 0) {
          setSelectedGroup(groupsData[0])
        }
      } catch (error) {
        console.error('Failed to load groups:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadGroups()
    }
  }, [user])

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!selectedGroup) return

      try {
        const response = await apiClient.axiosInstance.get(`/groups/${selectedGroup.id}/`)
        const enrollmentsData = response.data.enrollments || []
        setEnrollments(enrollmentsData)

        const initialAttendance: { [key: string]: string } = {}
        enrollmentsData.forEach((enrollment: Enrollment) => {
          initialAttendance[enrollment.id] = 'present'
        })
        setAttendance(initialAttendance)
      } catch (error) {
        console.error('Failed to load enrollments:', error)
      }
    }

    loadEnrollments()
  }, [selectedGroup])

  const handleAttendanceChange = (enrollmentId: string, status: string) => {
    setAttendance((prev) => ({
      ...prev,
      [enrollmentId]: status,
    }))
  }

  const handleSave = async () => {
    if (!selectedGroup) return

    setIsSaving(true)
    setSaveMessage(null)
    try {
      const attendanceData = enrollments.map((enrollment) => ({
        student_id: enrollment.student,
        status: attendance[enrollment.id] || 'present',
        comments: '',
      }))

      await apiClient.markAttendanceBulk(selectedGroup.id, selectedDate, attendanceData)
      setSaveMessage({ type: 'success', text: '✓ Attendance saved successfully!' })
      setTimeout(() => setSaveMessage(null), 4000)
    } catch (error) {
      console.error('Failed to save attendance:', error)
      setSaveMessage({ type: 'error', text: 'Failed to save attendance' })
    } finally {
      setIsSaving(false)
    }
  }

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
    <ProtectedRoute allowedRoles={['teacher', 'manager']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mark Attendance</h1>
            <p className="text-gray-600">Quickly mark attendance for your class</p>
          </div>

          {saveMessage && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg ${
                saveMessage.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {saveMessage.text}
            </div>
          )}

          {/* Group Selection */}
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Group</label>
            <select
              value={selectedGroup?.id || ''}
              onChange={(e) => {
                const group = groups.find((g) => g.id === e.target.value)
                setSelectedGroup(group || null)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.level})
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Attendance List */}
          <div className="space-y-2">
            {enrollments.length > 0 ? (
              <>
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="bg-white rounded-lg shadow p-4 flex items-center justify-between hover:shadow-md transition"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{enrollment.student_name}</p>
                    </div>
                    <select
                      value={attendance[enrollment.id] || 'present'}
                      onChange={(e) => handleAttendanceChange(enrollment.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="present">✓ Present</option>
                      <option value="absent">✗ Absent</option>
                      <option value="late">⏰ Late</option>
                      <option value="excused">📋 Excused</option>
                    </select>
                  </div>
                ))}

                {/* Save Button */}
                <div className="bg-white rounded-lg shadow p-4 mt-8 flex gap-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition"
                  >
                    {isSaving ? '⏳ Saving...' : '✓ Save Attendance'}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
                <p className="text-lg mb-2">No students enrolled</p>
                <p className="text-sm">This group has no students yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
