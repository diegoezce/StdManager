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
import { Select } from '@/components/Select'

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'A1',
  elementary: 'A2',
  'pre-intermediate': 'B1',
  intermediate: 'B1+',
  'upper-intermediate': 'B2',
  advanced: 'C1',
}

const LEVEL_COLOR: Record<string, string> = {
  beginner: 'bg-blue-100 text-blue-700',
  elementary: 'bg-cyan-100 text-cyan-700',
  'pre-intermediate': 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  'upper-intermediate': 'bg-orange-100 text-orange-700',
  advanced: 'bg-red-100 text-red-700',
}

function initials(name: string | undefined) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function EstudiantesPage() {
  const router = useRouter()
  const { user, me, hasRole } = useAuth()
  const isReadOnly = !hasRole(['owner', 'manager', 'admin'])
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [corporateClients, setCorporateClients] = useState<{ id: string; company_name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const toast = useToast()

  // Drawer state
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null)
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'enroll'>('view')

  // Create modal state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createData, setCreateData] = useState({ email: '', first_name: '', last_name: '' })
  const [isCreating, setIsCreating] = useState(false)

  // Edit form state (used inside drawer)
  const [editData, setEditData] = useState<{
    email: string
    first_name: string
    last_name: string
    english_level: Student['english_level']
    corporate_client: string | null
  }>({ email: '', first_name: '', last_name: '', english_level: 'beginner', corporate_client: null })
  const [isSaving, setIsSaving] = useState(false)

  // Enroll state
  const [enrollGroupId, setEnrollGroupId] = useState('')
  const [isEnrolling, setIsEnrolling] = useState(false)

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
    if (user) loadData()
  }, [user])

  const openDrawer = (student: Student) => {
    setDrawerStudent(student)
    setDrawerMode('view')
    setEnrollGroupId('')
    setEditData({
      email: student.email || student.user_email || '',
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      english_level: student.english_level || 'beginner',
      corporate_client: student.corporate_client || null,
    })
  }

  const closeDrawer = () => {
    setDrawerStudent(null)
    setDrawerMode('view')
    setEnrollGroupId('')
  }

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!drawerStudent) return
    setIsSaving(true)
    try {
      await apiClient.updateStudent(drawerStudent.id, {
        first_name: editData.first_name,
        last_name: editData.last_name,
        email: editData.email,
        english_level: editData.english_level,
        corporate_client: editData.corporate_client || null,
      })
      const response = await apiClient.getStudents()
      const updated = (response.results || response) as Student[]
      setStudents(updated)
      const fresh = updated.find((s) => s.id === drawerStudent.id)
      if (fresh) setDrawerStudent(fresh)
      setDrawerMode('view')
      toast.success('Estudiante actualizado')
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleEnrollStudent = async () => {
    if (!drawerStudent || !enrollGroupId) return
    setIsEnrolling(true)
    try {
      await apiClient.enrollStudent(enrollGroupId, drawerStudent.id)
      const [studentsRes, groupsRes] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getGroups(),
      ])
      const updated = (studentsRes.results || studentsRes) as Student[]
      setStudents(updated)
      setGroups(groupsRes.results || groupsRes)
      const fresh = updated.find((s) => s.id === drawerStudent.id)
      if (fresh) setDrawerStudent(fresh)
      setEnrollGroupId('')
      setDrawerMode('view')
      toast.success('Estudiante inscripto')
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleToggleActive = async () => {
    if (!drawerStudent) return
    try {
      await apiClient.updateStudent(drawerStudent.id, { is_active: !drawerStudent.is_active })
      const updated = students.map((s) =>
        s.id === drawerStudent.id ? { ...s, is_active: !drawerStudent.is_active } : s
      )
      setStudents(updated)
      setDrawerStudent({ ...drawerStudent, is_active: !drawerStudent.is_active })
      toast.success(drawerStudent.is_active ? 'Alumno desactivado' : 'Alumno activado')
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await apiClient.register({
        email: createData.email,
        first_name: createData.first_name,
        last_name: createData.last_name,
        password: Math.random().toString(36).slice(-8),
        role: 'student',
      })
      const response = await apiClient.getStudents()
      setStudents(response.results || response)
      setShowCreateForm(false)
      setCreateData({ email: '', first_name: '', last_name: '' })
      toast.success('Estudiante creado')
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    } finally {
      setIsCreating(false)
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
    <ProtectedRoute allowedRoles={['owner', 'manager', 'admin', 'corporate_client', 'teacher']}>
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
                  onClick={() => setShowCreateForm(true)}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  + Crear estudiante
                </button>
              )
            }
          />

          {/* Create modal */}
          <Modal isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} title="Nuevo estudiante">
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text" required value={createData.first_name}
                    onChange={(e) => setCreateData({ ...createData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text" required value={createData.last_name}
                    onChange={(e) => setCreateData({ ...createData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email" required value={createData.email}
                    onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isCreating}
                  className="flex-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  {isCreating ? 'Creando...' : 'Crear estudiante'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)}
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

          {/* Students list — compact cards */}
          {filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => openDrawer(student)}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3 w-full text-left hover:shadow-md hover:border-indigo-200 transition"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm shrink-0">
                    {initials(student.user_name)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{student.user_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {student.corporate_client_name || student.user_email}
                    </p>
                  </div>
                  {/* Level + status */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLOR[student.english_level] ?? 'bg-gray-100 text-gray-600'}`}>
                      {LEVEL_LABEL[student.english_level] ?? student.english_level}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${student.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                  </div>
                  {/* Chevron */}
                  <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              {search ? (
                <p className="text-lg">No hay estudiantes que coincidan con &quot;{search}&quot;</p>
              ) : (
                <>
                  <p className="text-lg mb-2">No students yet</p>
                  {!isReadOnly && <p className="text-sm">Create a new student to get started</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Student drawer */}
      {drawerStudent && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeDrawer}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                  {initials(drawerStudent.user_name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{drawerStudent.user_name}</p>
                  <p className="text-xs text-gray-500">{drawerStudent.user_email}</p>
                </div>
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">

              {drawerMode === 'view' && (
                <div className="space-y-5">
                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Nivel</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLOR[drawerStudent.english_level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {LEVEL_LABEL[drawerStudent.english_level] ?? drawerStudent.english_level}
                      </span>
                    </div>
                    {drawerStudent.corporate_client_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Empresa</span>
                        <span className="text-sm font-medium text-gray-800">{drawerStudent.corporate_client_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Estado</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${drawerStudent.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${drawerStudent.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {drawerStudent.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Email</span>
                      <span className="text-sm text-gray-700">{drawerStudent.user_email}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isReadOnly && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setDrawerMode('edit')}
                        className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                      >
                        Editar datos
                      </button>
                      <button
                        onClick={() => setDrawerMode('enroll')}
                        className="w-full px-4 py-2.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium transition"
                      >
                        Inscribir en grupo
                      </button>
                      <button
                        onClick={handleToggleActive}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition border ${
                          drawerStudent.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {drawerStudent.is_active ? 'Desactivar alumno' : 'Activar alumno'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {drawerMode === 'edit' && (
                <form onSubmit={handleEditStudent} className="space-y-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Editar datos</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text" required value={editData.first_name}
                      onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <input
                      type="text" required value={editData.last_name}
                      onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email" required value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de inglés</label>
                    <Select
                      value={editData.english_level}
                      onChange={(val) => setEditData({ ...editData, english_level: val as any })}
                      options={[
                        { value: 'beginner', label: 'A1 – Beginner' },
                        { value: 'elementary', label: 'A2 – Elementary' },
                        { value: 'pre-intermediate', label: 'B1 – Pre-Intermediate' },
                        { value: 'intermediate', label: 'B1+ – Intermediate' },
                        { value: 'upper-intermediate', label: 'B2 – Upper Intermediate' },
                        { value: 'advanced', label: 'C1 – Advanced' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                    <Select
                      value={editData.corporate_client || ''}
                      onChange={(val) => setEditData({ ...editData, corporate_client: val || null })}
                      placeholder="Sin empresa"
                      options={[
                        { value: '', label: 'Sin empresa' },
                        ...corporateClients.map((c) => ({ value: c.id, label: c.company_name })),
                      ]}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={isSaving}
                      className="flex-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition text-sm"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button type="button" onClick={() => setDrawerMode('view')}
                      className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-md transition text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {drawerMode === 'enroll' && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-700">Inscribir en grupo</p>
                  <Select
                    value={enrollGroupId}
                    onChange={(val) => setEnrollGroupId(val)}
                    placeholder="Seleccionar grupo..."
                    options={groups
                      .filter((g) => g.available_spots > 0)
                      .map((g) => ({ value: g.id, label: `${g.name} (${g.available_spots} lugares)` }))}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnrollStudent}
                      disabled={!enrollGroupId || isEnrolling}
                      className="flex-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition text-sm"
                    >
                      {isEnrolling ? 'Inscribiendo...' : 'Inscribir'}
                    </button>
                    <button onClick={() => setDrawerMode('view')}
                      className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-md transition text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </ProtectedRoute>
  )
}
