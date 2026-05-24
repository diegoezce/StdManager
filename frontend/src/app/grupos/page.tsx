'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Group, Teacher, Student } from '@/types'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useToast, ToastContainer, extractErrorMessage } from '@/components/Toast'
import { Modal } from '@/components/Modal'
import { ConfirmModal } from '@/components/ConfirmModal'

export default function GruposPage() {
  const router = useRouter()
  const { user, me, hasRole } = useAuth()
  const isReadOnly = !hasRole(['owner', 'manager', 'admin'])
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Enroll modal
  const [enrollingGroup, setEnrollingGroup] = useState<Group | null>(null)
  const [enrollSearch, setEnrollSearch] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    level: 'beginner',
    status: 'planning',
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

        const [groupsResponse, teachersResponse, studentsResponse] = await Promise.all([
          apiClient.getGroups(),
          isReadOnly ? Promise.resolve([]) : apiClient.getTeachers(),
          isReadOnly ? Promise.resolve([]) : apiClient.getStudents(),
        ])

        setGroups(groupsResponse.results || groupsResponse)
        setTeachers(teachersResponse.results || teachersResponse)
        setAllStudents((studentsResponse.results || studentsResponse).filter((s: Student) => s.is_active))
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
        status: formData.status,
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
      status: group.status || 'planning',
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
      status: 'planning',
      teacher: '',
      max_students: 20,
      description: '',
      start_date: '',
    })
  }

  const openEnrollModal = (group: Group) => {
    setEnrollingGroup(group)
    setEnrollSearch('')
    setSelectedStudents(new Set())
  }

  const handleBulkEnroll = async () => {
    if (!enrollingGroup || selectedStudents.size === 0) return
    setIsEnrolling(true)
    let enrolled = 0
    for (const studentId of selectedStudents) {
      try {
        await apiClient.enrollStudent(enrollingGroup.id, studentId)
        enrolled++
      } catch {
        // already enrolled or other error — skip silently
      }
    }
    const res = await apiClient.getGroups()
    setGroups(res.results || res)
    toast.success(`${enrolled} alumno${enrolled !== 1 ? 's' : ''} inscripto${enrolled !== 1 ? 's' : ''}`)
    setEnrollingGroup(null)
    setIsEnrolling(false)
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
    <ProtectedRoute allowedRoles={['owner', 'manager', 'admin', 'teacher']}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            eyebrow="Académico"
            title="Grupos"
            subtitle="Crea y administra los grupos de clase."
            actions={
              !isReadOnly && (
                <button
                  onClick={() => { setEditingId(null); setShowForm(true) }}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  + Crear grupo
                </button>
              )
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
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
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
                            {!isReadOnly && (
                              <button
                                onClick={() => setConfirmUnenroll({ groupId: group.id, studentId: enrollment.student, studentName: enrollment.student_name })}
                                disabled={unenrolling === enrollment.student}
                                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition ml-2 shrink-0"
                              >
                                {unenrolling === enrollment.student ? '...' : 'Remove'}
                              </button>
                            )}
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

                  {!isReadOnly && (
                    <div className="flex gap-2 border-t pt-3">
                      <button
                        onClick={() => openEnrollModal(group)}
                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition"
                      >
                        + Enroll
                      </button>
                      <button
                        onClick={() => startEditing(group)}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium transition"
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
                  )}
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
      {/* Enroll modal */}
      <Modal
        isOpen={!!enrollingGroup}
        onClose={() => setEnrollingGroup(null)}
        title={`Inscribir en ${enrollingGroup?.name}`}
      >
        {enrollingGroup && (() => {
          const enrolledIds = new Set(enrollingGroup.enrollments?.map((e: any) => e.student) ?? [])
          const sameLevel = allStudents.filter((s) => s.english_level === enrollingGroup.level && !enrolledIds.has(s.id))
          const otherLevel = allStudents.filter((s) => s.english_level !== enrollingGroup.level && !enrolledIds.has(s.id))
          const q = enrollSearch.toLowerCase()
          const filter = (list: Student[]) => q
            ? list.filter((s) => s.user_name?.toLowerCase().includes(q) || s.user_email?.toLowerCase().includes(q))
            : list

          const filteredSame = filter(sameLevel)
          const filteredOther = filter(otherLevel)
          const total = filteredSame.length + filteredOther.length

          const toggle = (id: string) => setSelectedStudents((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
          })

          const toggleAll = (list: Student[]) => {
            const ids = list.map((s) => s.id)
            const allSelected = ids.every((id) => selectedStudents.has(id))
            setSelectedStudents((prev) => {
              const next = new Set(prev)
              allSelected ? ids.forEach((id) => next.delete(id)) : ids.forEach((id) => next.add(id))
              return next
            })
          }

          const StudentItem = ({ s }: { s: Student }) => (
            <label key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedStudents.has(s.id)}
                onChange={() => toggle(s.id)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{s.user_name}</p>
                <p className="text-xs text-gray-400 truncate">{s.user_email}</p>
              </div>
            </label>
          )

          return (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Buscar alumno..."
                value={enrollSearch}
                onChange={(e) => setEnrollSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />

              {total === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {enrollSearch ? 'Sin resultados' : 'No hay alumnos disponibles para inscribir'}
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1">
                  {filteredSame.length > 0 && (
                    <div>
                      <button onClick={() => toggleAll(filteredSame)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-700 uppercase tracking-wide hover:bg-indigo-50 rounded-md transition">
                        <span className="flex-1 text-left">Mismo nivel ({filteredSame.length})</span>
                        <span className="text-indigo-400">{filteredSame.every((s) => selectedStudents.has(s.id)) ? 'Deseleccionar todos' : 'Seleccionar todos'}</span>
                      </button>
                      {filteredSame.map((s) => <StudentItem key={s.id} s={s} />)}
                    </div>
                  )}
                  {filteredOther.length > 0 && (
                    <div className={filteredSame.length > 0 ? 'mt-2' : ''}>
                      {filteredSame.length > 0 && (
                        <button onClick={() => toggleAll(filteredOther)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50 rounded-md transition">
                          <span className="flex-1 text-left">Otros niveles ({filteredOther.length})</span>
                          <span className="text-gray-400">{filteredOther.every((s) => selectedStudents.has(s.id)) ? 'Deseleccionar todos' : 'Seleccionar todos'}</span>
                        </button>
                      )}
                      {filteredOther.map((s) => <StudentItem key={s.id} s={s} />)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={handleBulkEnroll}
                  disabled={isEnrolling || selectedStudents.size === 0}
                  className="flex-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition text-sm"
                >
                  {isEnrolling ? 'Inscribiendo...' : `Inscribir ${selectedStudents.size > 0 ? `(${selectedStudents.size})` : ''}`}
                </button>
                <button onClick={() => setEnrollingGroup(null)} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-md transition text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

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
