'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Student, Group } from '@/types'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useToast, ToastContainer, extractErrorMessage } from '@/components/Toast'
import { Modal } from '@/components/Modal'

export default function EstudiantesPage() {
  const router = useRouter()
  const { user, me, hasRole } = useAuth()
  const isReadOnly = !hasRole(['owner', 'manager', 'admin'])
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [corporateClients, setCorporateClients] = useState<{ id: string; company_name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    email: string
    first_name: string
    last_name: string
    english_level: Student['english_level']
    corporate_client: string | null
  }>({
    email: '',
    first_name: '',
    last_name: '',
    english_level: 'beginner',
    corporate_client: null,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
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

        const [studentsResponse, groupsResponse, clientsResult] = await Promise.all([
          apiClient.getStudents(),
          apiClient.getGroups(),
          apiClient.getCorporateClients().catch(() => []),
        ])

        setStudents(studentsResponse.results || studentsResponse)
        setGroups(groupsResponse.results || groupsResponse)
        setCorporateClients(clientsResult.results || clientsResult)
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

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await apiClient.register({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: Math.random().toString(36).slice(-8),
        role: 'student',
      })

      const response = await apiClient.getStudents()
      setStudents(response.results || response)
      cancelEditing()
    } catch (error: any) {
      console.error('Failed to create student:', error)
      toast.error(extractErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setIsSaving(true)

    try {
      await apiClient.updateStudent(editingId, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        english_level: formData.english_level,
        corporate_client: formData.corporate_client || null,
      })

      const response = await apiClient.getStudents()
      setStudents(response.results || response)
      cancelEditing()
    } catch (error: any) {
      console.error('Failed to update student:', error)
      toast.error(extractErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (student: Student) => {
    setEditingId(student.id)
    setFormData({
      email: student.email || student.user_email || '',
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      english_level: student.english_level || 'beginner',
      corporate_client: student.corporate_client || null,
    })
    setShowForm(true)
  }

  const cancelEditing = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      english_level: 'beginner',
      corporate_client: null,
    })
  }

  const handleEnrollStudent = async (studentId: string, groupId: string) => {
    try {
      await apiClient.enrollStudent(groupId, studentId)
      const [studentsRes, groupsRes] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getGroups(),
      ])
      setStudents(studentsRes.results || studentsRes)
      setGroups(groupsRes.results || groupsRes)
      setSelectedStudentForEnroll(null)
      toast.success('Estudiante inscripto')
    } catch (error: any) {
      console.error('Failed to enroll student:', error)
      toast.error(extractErrorMessage(error))
    }
  }

  const handleToggleActive = async (student: Student) => {
    try {
      await apiClient.updateStudent(student.id, { is_active: !student.is_active })
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, is_active: !s.is_active } : s))
      )
      toast.success(student.is_active ? 'Alumno desactivado' : 'Alumno activado')
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    }
  }

  const filteredStudents = students
    .filter((s) => {
      const q = search.toLowerCase()
      return (
        s.user_name?.toLowerCase().includes(q) ||
        s.user_email?.toLowerCase().includes(q) ||
        s.corporate_client_name?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''))

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
    <ProtectedRoute allowedRoles={['owner', 'manager', 'admin', 'corporate_client']}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            eyebrow="Comunidad"
            title="Estudiantes"
            subtitle="Crea y gestiona cuentas de estudiantes."
            actions={
              !isReadOnly && (
                <button
                  onClick={() => { setEditingId(null); setShowForm(true) }}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  + Crear estudiante
                </button>
              )
            }
          />

          <Modal
            isOpen={showForm}
            onClose={cancelEditing}
            title={editingId ? 'Editar estudiante' : 'Nuevo estudiante'}
          >
            <form onSubmit={editingId ? handleEditStudent : handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de inglés</label>
                  <select
                    value={formData.english_level}
                    onChange={(e) => setFormData({ ...formData, english_level: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="beginner">A1 – Beginner</option>
                    <option value="elementary">A2 – Elementary</option>
                    <option value="pre-intermediate">B1 – Pre-Intermediate</option>
                    <option value="intermediate">B1+ – Intermediate</option>
                    <option value="upper-intermediate">B2 – Upper Intermediate</option>
                    <option value="advanced">C1 – Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  <select
                    value={formData.corporate_client || ''}
                    onChange={(e) => setFormData({ ...formData, corporate_client: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sin empresa</option>
                    {corporateClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  {editingId
                    ? isSaving ? 'Guardando...' : 'Guardar cambios'
                    : isSaving ? 'Creando...' : 'Crear estudiante'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-md transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </Modal>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar por nombre, email o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Students List */}
          {filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredStudents.map((student) => (
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
                        {student.corporate_client_name && (
                          <p>
                            <span className="font-medium">Company:</span>{' '}
                            {student.corporate_client_name}
                          </p>
                        )}
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
                      {isReadOnly ? null : editingId === student.id ? null : selectedStudentForEnroll === student.id ? (
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
                        <>
                          <button
                            onClick={() => startEditing(student)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setSelectedStudentForEnroll(student.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition"
                          >
                            Enroll
                          </button>
                          <button
                            onClick={() => handleToggleActive(student)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition border ${
                              student.is_active
                                ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                : 'border-green-300 text-green-700 hover:bg-green-50'
                            }`}
                          >
                            {student.is_active ? 'Desactivar' : 'Activar'}
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
              {search ? (
                <p className="text-lg">No hay estudiantes que coincidan con "{search}"</p>
              ) : (
                <>
                  <p className="text-lg mb-2">No students yet</p>
                  <p className="text-sm">Create a new student to get started</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </ProtectedRoute>
  )
}
