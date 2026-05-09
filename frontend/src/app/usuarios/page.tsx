'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { User } from '@/types'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useToast, ToastContainer, extractErrorMessage } from '@/components/Toast'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const array = new Uint8Array(12)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => chars[b % chars.length])
    .join('')
}

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
    password: '',
  })
  const [showPassword, setShowPassword] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Change password modal
  const [changingPasswordFor, setChangingPasswordFor] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(true)
  const [copiedNew, setCopiedNew] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const toast = useToast()

  const ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'student', label: 'Student' },
    { value: 'corporate_client', label: 'Corporate Client' },
  ]

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!user) await me()
      } catch {
        router.push('/login')
      }
    }
    checkAuth()
  }, [user, me, router])

  useEffect(() => {
    if (!user) return
    apiClient.getUsers().then((res) => {
      setUsers(res.results || res)
      setIsLoading(false)
    })
  }, [user])

  const openCreateForm = () => {
    setFormData({ email: '', first_name: '', last_name: '', role: 'student', password: generatePassword() })
    setShowPassword(true)
    setCopied(false)
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ email: '', first_name: '', last_name: '', role: 'student', password: '' })
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await apiClient.register({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        role: formData.role,
      })
      const response = await apiClient.getUsers()
      setUsers(response.results || response)
      setShowForm(false)
      setFormData({ email: '', first_name: '', last_name: '', role: 'student', password: '' })
    } catch (error: any) {
      console.error('Failed to create user:', error)
      toast.error(extractErrorMessage(error))
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
      cancelForm()
    } catch (error: any) {
      console.error('Failed to update user:', error)
      toast.error(extractErrorMessage(error))
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
      password: '',
    })
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await apiClient.deleteUser(id)
      const response = await apiClient.getUsers()
      setUsers(response.results || response)
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      toast.error(extractErrorMessage(error))
    }
  }

  const openChangePassword = (u: User) => {
    setChangingPasswordFor(u)
    setNewPassword(generatePassword())
    setShowNewPassword(true)
    setCopiedNew(false)
  }

  const handleSavePassword = async () => {
    if (!changingPasswordFor || !newPassword) return
    setIsSavingPassword(true)
    try {
      await apiClient.resetUserPassword(changingPasswordFor.id, newPassword)
      setChangingPasswordFor(null)
      setNewPassword('')
      toast.success('Password updated')
    } catch (error: any) {
      console.error('Failed to change password:', error)
      toast.error(extractErrorMessage(error))
    } finally {
      setIsSavingPassword(false)
    }
  }

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Users</h1>
              <p className="text-gray-600">Create and manage user accounts</p>
            </div>
            {!editingId && (
              <button
                onClick={openCreateForm}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                + New user
              </button>
            )}
          </div>

          {/* Create / Edit Form */}
          {(showForm || editingId) && (
            <div className="bg-white rounded-lg shadow mb-8 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editingId ? 'Edit user' : 'New user'}
              </h2>
              <form onSubmit={editingId ? handleEditUser : handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!!editingId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Password field — only on create */}
                  {!editingId && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial password
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, password: generatePassword() })}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                        >
                          Generate
                        </button>
                        <button
                          type="button"
                          onClick={() => copyText(formData.password, setCopied)}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                            copied ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {copied ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    {editingId
                      ? isSaving ? 'Saving...' : 'Save changes'
                      : isSaving ? 'Creating...' : 'Create user'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
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
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {u.role}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{' '}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                    {editingId !== u.id && (
                      <div className="flex gap-2 flex-wrap justify-end">
                        <button
                          onClick={() => startEditing(u)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openChangePassword(u)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm font-medium transition"
                        >
                          Password
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              <p className="text-lg mb-2">No users yet</p>
              <p className="text-sm">Create the first one with the button above</p>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {changingPasswordFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Change password</h3>
            <p className="text-sm text-gray-500 mb-6">
              {changingPasswordFor.first_name} {changingPasswordFor.last_name} &mdash;{' '}
              {changingPasswordFor.email}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              New password
            </label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                {showNewPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => { setNewPassword(generatePassword()); setCopiedNew(false) }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                Generate new
              </button>
              <button
                type="button"
                onClick={() => copyText(newPassword, setCopiedNew)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                  copiedNew ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copiedNew ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSavePassword}
                disabled={isSavingPassword || !newPassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                {isSavingPassword ? 'Saving...' : 'Save password'}
              </button>
              <button
                onClick={() => setChangingPasswordFor(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </ProtectedRoute>
  )
}
