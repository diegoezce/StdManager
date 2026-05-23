'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Group, Teacher } from '@/types'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useToast, ToastContainer, extractErrorMessage } from '@/components/Toast'
import { Modal } from '@/components/Modal'
import { ConfirmModal } from '@/components/ConfirmModal'

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
  const [unenrolling, setUnenrolling] = useState<string | null>(null)
  const [confirmUnenroll, setConfirmUnenroll] = useState<{ groupId: string; studentId: string; studentName: string } | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toast = useToast()

  const COLLAPSED_LIMIT = 4

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(groupId) ? next.delete(groupId) : next.add(groupId)
      return next
    })
  }

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
      cancelEditing()
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

    const currentGroup = groups.find((g) => g.id === editingId)
    if (currentGroup && formData.max_students < currentGroup.enrollment_count) {
      const ok = confirm(
        `El grupo tiene ${currentGroup.enrollment_count} estudiantes inscriptos pero estás bajando la capacidad a ${formData.max_students}. Los inscriptos existentes no se eliminarán, pero no podrán enrollarse nuevos hasta que haya lugar. ¿Continuar?`
      )
      if (!ok) return
    }

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
      cancelEditing()
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
    setShowForm(true)
  }

  const cancelEditing = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '',
      level: 'beginner',
      teacher: '',
      max_students: 20,
      description: '',
      start_date: '',
    })
  }

  const handleUnenroll = async () => {
    if (!confirmUnenroll) return
    const { groupId, studentId, studentName } = confirmUnenroll
    setUnenrolling(studentId)
    try {
      await apiClient.unenrollStudent(groupId, studentId)
      const response = await apiClient.getGroups()
      setGroups(response.results || response)
      toast.success(`${studentName} removido del grupo`)
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    } finally {
      setUnenrolling(null)
      setConfirmUnenroll(null)
    }
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
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            eyebrow="Académico"
            title="Grupos"
            subtitle="Crea y administra los grupos de clase."
            actions={
              <button
                onClick={() => { setEditingId(null); setShowForm(true) }}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-medium py-2 px-4 rounded-md transition"
              >
                + Crear grupo
              </button>
            }
          />

          <Modal
            isOpen={showForm}
            onClose={cancelEditing}
            title={editingId ? 'Editar grupo' : 'Nuevo grupo'}
          >
            <form onSubmit={editingId ? handleEditGroup : handleCreateGroup} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del grupo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ej. English 101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nivel
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    Profesor
                  </label>
                  <select
                    required
                    value={formData.teacher}
                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar profesor</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.user_name} ({teacher.user_email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máx. estudiantes
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.max_students}
                    onChange={(e) =>
                      setFormData({ ...formData, max_students: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Descripción opcional del grupo"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  {editingId
                    ? isSaving ? 'Guardando...' : 'Guardar cambios'
                    : isSaving ? 'Creando...' : 'Crear grupo'}
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

          {/* Groups List */}
          {groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-t-2 border-indigo-600"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{group.name}</h2>
                      {group.description && <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                    <p><span className="font-medium">Nivel:</span> {group.level}</p>
                    <p><span className="font-medium">Profesor:</span> {group.teacher_name}</p>
                    <p>
                      <span className="font-medium">Inscriptos:</span>{' '}
                      <span className={group.enrollment_count >= group.max_students ? 'text-red-600 font-semibold' : ''}>
                        {group.enrollment_count}/{group.max_students}
                      </span>
                      {group.available_spots > 0 && (
                        <span className="ml-2 text-xs text-gray-400">({group.available_spots} disponibles)</span>
                      )}
                    </p>
                  </div>

                  {/* Enrolled students */}
                  {group.enrollments && group.enrollments.length > 0 && (
                    <div className="border-t pt-3 mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Alumnos</p>
                      <ul className="space-y-1">
                        {(expandedGroups.has(group.id)
                          ? group.enrollments
                          : group.enrollments.slice(0, COLLAPSED_LIMIT)
                        ).map((enrollment: any) => (
                          <li key={enrollment.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{enrollment.student_name}</span>
                            <button
                              onClick={() => setConfirmUnenroll({ groupId: group.id, studentId: enrollment.student, studentName: enrollment.student_name })}
                              disabled={unenrolling === enrollment.student}
                              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition ml-2 shrink-0"
                            >
                              {unenrolling === enrollment.student ? '...' : 'Remove'}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {group.enrollments.length > COLLAPSED_LIMIT && (
                        <button
                          onClick={() => toggleExpand(group.id)}
                          className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                        >
                          {expandedGroups.has(group.id)
                            ? 'Ver menos'
                            : `Ver todos (${group.enrollments.length})`}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 border-t pt-3">
                    <button
                      onClick={() => startEditing(group)}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="px-4 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-600 rounded-md text-sm font-medium transition"
                    >
                      Eliminar
                    </button>
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
      <ConfirmModal
        isOpen={!!confirmUnenroll}
        onClose={() => setConfirmUnenroll(null)}
        onConfirm={handleUnenroll}
        title="Remover alumno"
        message={`¿Remover a ${confirmUnenroll?.studentName} del grupo? Se marcará como baja.`}
        confirmLabel="Remover"
        isLoading={!!unenrolling}
      />

      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </ProtectedRoute>
  )
}
