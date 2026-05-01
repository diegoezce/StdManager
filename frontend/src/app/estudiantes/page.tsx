'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Student, Group } from '@/types'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function EstudiantesPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    english_level: 'beginner' as const,
  })
  const [isSaving, setIsSaving] = useState(false)

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
    const loadData = async () => {
      try {
        if (!user) return

        const [studentsResponse, groupsResponse] = await Promise.all([
          apiClient.getStudents(),
          apiClient.getGroups(),
        ])

        const studentsData = studentsResponse.results || studentsResponse
        const groupsData = groupsResponse.results || groupsResponse

        setStudents(studentsData)
        setGroups(groupsData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [user])

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await apiClient.axiosInstance.post('/auth/register/', {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: Math.random().toString(36).slice(-8),
        role: 'student',
      })

      const response = await apiClient.getStudents()
      setStudents(response.results || response)
      setShowForm(false)
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        english_level: 'beginner',
      })
    } catch (error) {
      console.error('Failed to create student:', error)
      alert('Failed to create student')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEnrollStudent = async (studentId: string, groupId: string) => {
    try {
      await apiClient.enrollStudent(groupId, studentId)
      const response = await apiClient.getStudents()
      setStudents(response.results || response)
      setSelectedStudentForEnroll(null)
    } catch (error) {
      console.error('Failed to enroll student:', error)
      alert('Failed to enroll student')
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
    <ProtectedRoute allowedRoles={['owner', 'manager']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
              <p className="text-gray-600">Add and manage student accounts</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {showForm ? '✕ Cancel' : '+ Create Student'}
            </button>
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow mb-8 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">New Student</h2>
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      English Level
                    </label>
                    <select
                      value={formData.english_level}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          english_level: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="elementary">Elementary</option>
                      <option value="pre-intermediate">Pre-Intermediate</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="upper-intermediate">Upper Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    {isSaving ? '⏳ Creating...' : '✓ Create Student'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Students List */}
          {students.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {students.map((student) => (
                <div key={student.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {student.user_name}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600 mt-2">
                        <p>
                          <span className="font-medium">Email:</span> {student.user_email}
                        </p>
                        <p>
                          <span className="font-medium">Level:</span>{' '}
                          {student.english_level}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{' '}
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              student.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedStudentForEnroll === student.id ? (
                        <div className="flex flex-col gap-2 min-w-[250px]">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleEnrollStudent(student.id, e.target.value)
                              }
                            }}
                            defaultValue=""
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select group to enroll...</option>
                            {groups
                              .filter((g) => g.available_spots > 0)
                              .map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name} ({group.available_spots} spots)
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => setSelectedStudentForEnroll(null)}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedStudentForEnroll(student.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition"
                        >
                          Enroll →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              <p className="text-lg mb-2">No students yet</p>
              <p className="text-sm">Create a new student to get started</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
