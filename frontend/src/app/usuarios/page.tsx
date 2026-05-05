'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { User } from '@/types'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function UsuariosPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'student' as const,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [passwordReset, setPasswordReset] = useState<{
    userId: string
    email: string
    temporaryPassword: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'student', label: 'Student' },
    { value: 'corporate_client', label: 'Corporate Client' },
  ]

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

        const response = await apiClient.getUsers()
        setUsers(response.results || response)
      } catch (error) {
        console.error('Failed to load users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [user])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await apiClient.register({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: Math.random().toString(36).slice(-8),
        role: formData.role,
      })

      const response = await apiClient.getUsers()
      setUsers(response.results || response)
      setShowForm(false)
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'student',
      })
    } catch (error) {
      console.error('Failed to create user:', error)
      alert('Failed to create user')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setIsSaving(true)

    try {
      await apiClient.updateUser(editingId, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
      })

      const response = await apiClient.getUsers()
      setUsers(response.results || response)
      setEditingId(null)
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'student',
      })
    } catch (error) {
      console.error('Failed to update user:', error)
      alert('Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (u: User) => {
    setEditingId(u.id)
    setFormData({
      email: u.email || '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      role: u.role as any,
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setShowForm(false)
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'student',
    })
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      await apiClient.deleteUser(id)
      const response = await apiClient.getUsers()
      setUsers(response.results || response)
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user')
    }
  }

  const handleResetPassword = async (id: string) => {
    try {
      const response = await apiClient.resetUserPassword(id)
      setPasswordReset({
        userId: response.id,
        email: response.email,
        temporaryPassword: response.temporary_password,
      })
      setCopied(false)
    } catch (error) {
      console.error('Failed to reset password:', error)
      alert('Failed to reset password')
    }
  }

  const copyPasswordToClipboard = () => {
    if (passwordReset) {
      navigator.clipboard.writeText(passwordReset.temporaryPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600">Create and manage user accounts</p>
            </div>
            {!editingId && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                {showForm ? '✕ Cancel' : '+ Create User'}
              </button>
            )}
          </div>

          {/* Create/Edit Form */}
          {(showForm || editingId) && (
            <div className="bg-white rounded-lg shadow mb-8 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editingId ? 'Edit User' : 'New User'}
              </h2>
              <form onSubmit={editingId ? handleEditUser : handleCreateUser} className="space-y-4">
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
                      disabled={editingId ? true : false}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    {editingId
                      ? isSaving ? '⏳ Saving...' : '✓ Save User'
                      : isSaving ? '⏳ Creating...' : '✓ Create User'}
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

          {/* Users List */}
          {users.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {users.map((u) => (
                <div key={u.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {u.first_name} {u.last_name}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600 mt-2">
                        <p>
                          <span className="font-medium">Email:</span> {u.email}
                        </p>
                        <p>
                          <span className="font-medium">Role:</span>{' '}
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {u.role}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{' '}
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              u.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {editingId === u.id ? null : (
                        <>
                          <button
                            onClick={() => startEditing(u)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition"
                          >
                            ✎ Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(u.id)}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition"
                          >
                            🔑 Reset Password
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition"
                          >
                            🗑 Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              <p className="text-lg mb-2">No users yet</p>
              <p className="text-sm">Create a new user to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {passwordReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Password Reset</h3>
            <p className="text-gray-600 mb-4">
              Temporary password for <span className="font-medium">{passwordReset.email}</span>:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6 flex items-center justify-between">
              <code className="text-lg font-mono font-bold text-gray-900 break-all">
                {passwordReset.temporaryPassword}
              </code>
              <button
                onClick={copyPasswordToClipboard}
                className={`ml-3 px-3 py-2 rounded text-sm font-medium transition whitespace-nowrap ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Share this temporary password with the user. They should change it after logging in.
            </p>
            <button
              onClick={() => setPasswordReset(null)}
              className="w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
