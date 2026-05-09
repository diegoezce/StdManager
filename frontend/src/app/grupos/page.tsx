'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Group, Teacher } from '@/types'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useToast, ToastContainer, extractErrorMessage } from '@/components/Toast'

export default function GruposPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    level: 'beginner',
    teacher: '',
    max_students: 20,
    description: '',
    start_date: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!user) {
          await me()
        }
      } catch (error: any) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [user, me, router])

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user) return

        const [groupsResponse, teachersResponse] = await Promise.all([
          apiClient.getGroups(),
          apiClient.getTeachers(),
        ])

        const groupsData = groupsResponse.results || groupsResponse
        const teachersData = teachersResponse.results || teachersResponse

        setGroups(groupsData)
        setTeachers(teachersData)
      } catch (error: any) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [user])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await apiClient.createGroup({
        ...formData,
        schedule: {
          days: ['Monday', 'Wednesday', 'Friday'],
          time: '10:00',
          duration: 60,
        },
      })

      const response = await apiClient.getGroups()
      setGroups(response.results || response)
      setShowForm(false)
      setFormData({
        name: '',
        level: 'beginner',
        teacher: '',
        max_students: 20,
        description: '',
        start_date: '',
      })
    } catch (error: any) {
      console.error('Failed to create group:', error)
      toast.error(extractErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setIsSaving(true)

    try {
      await apiClient.updateGroup(editingId, {
        name: formData.name,
        level: formData.level,
        teacher: formData.teacher,
        max_students: formData.max_students,
        description: formData.description,
        start_date: formData.start_date,
      })

      const response = await apiClient.getGroups()
      setGroups(response.results || response)
      setEditingId(null)
      setFormData({
        name: '',
        level: 'beginner',
        teacher: '',
        max_students: 20,
        description: '',
        start_date: '',
      })
    } catch (error: any) {
      console.error('Failed to update group:', error)
      toast.error(extractErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (group: Group) => {
    setEditingId(group.id)
    setFormData({
      name: group.name || '',
      level: group.level || 'beginner',
      teacher: group.teacher || '',
      max_students: group.max_students || 20,
      description: group.description || '',
      start_date: group.start_date || '',
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setShowForm(false)
    setFormData({
      name: '',
      level: 'beginner',
      teacher: '',
      max_students: 20,
      description: '',
      start_date: '',
    })
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return

    try {
      await apiClient.deleteGroup(id)
      const response = await apiClient.getGroups()
      setGroups(response.results || response)
    } catch (error: any) {
      console.error('Failed to delete group:', error)
      toast.error(extractErrorMessage(error))
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
    <ProtectedRoute allowedRoles={['owner', 'manager', 'admin']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Groups</h1>
              <p className="text-gray-600">Create and manage class groups</p>
            </div>
            {!editingId && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                {showForm ? '✕ Cancel' : '+ Create Group'}
              </button>
            )}
          </div>

          {/* Create/Edit Form */}
          {(showForm || editingId) && (
            <div className="bg-white rounded-lg shadow mb-8 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editingId ? 'Edit Group' : 'New Group'}
              </h2>
              <form onSubmit={editingId ? handleEditGroup : handleCreateGroup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., English 101"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Level
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teacher
                    </label>
                    <select
                      required
                      value={formData.teacher}
                      onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.user_name} ({teacher.user_email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Students
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.max_students}
                      onChange={(e) =>
                        setFormData({ ...formData, max_students: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description for the group"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    {editingId
                      ? isSaving ? '⏳ Saving...' : '✓ Save Group'
                      : isSaving ? '⏳ Creating...' : '✓ Create Group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      cancelEditing()
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Groups List */}
          {groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
                >
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-900">{group.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p>
                      <span className="font-medium">Level:</span> {group.level}
                    </p>
                    <p>
                      <span className="font-medium">Teacher:</span> {group.teacher_name}
                    </p>
                    <p>
                      <span className="font-medium">Students:</span> {group.enrollment_count}/
                      {group.max_students}
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
                  <div className="border-t pt-4">
                    <p className="text-2xl font-bold text-blue-600 mb-4">
                      {group.available_spots}
                    </p>
                    <p className="text-xs text-gray-600 mb-4">spots available</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(group)}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition"
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              <p className="text-lg mb-2">No groups yet</p>
              <p className="text-sm">Create a new group to get started</p>
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </ProtectedRoute>
  )
}
