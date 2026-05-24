'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useToast, ToastContainer, extractErrorMessage } from '@/components/Toast'

interface License {
  type: string
  max_students: number
  max_teachers: number
  max_groups: number
  valid_from: string
  valid_to: string
  status: string
  is_expired: boolean
}

interface OrgSummary {
  id: string
  name: string
  brand_name: string
  slug: string
  license_number: string
  status: string
  is_active: boolean
  max_users: number
  license: License | null
  user_count: number
  student_count: number
  teacher_count: number
  group_count: number
  owner_email: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trial:     { label: 'Trial',     color: 'bg-yellow-100 text-yellow-800' },
  active:    { label: 'Activo',    color: 'bg-green-100 text-green-800' },
  suspended: { label: 'Suspendido', color: 'bg-red-100 text-red-800' },
  inactive:  { label: 'Inactivo',  color: 'bg-gray-100 text-gray-700' },
}

const PLAN_LABELS: Record<string, string> = {
  free:         'Free',
  basic:        'Basic',
  professional: 'Professional',
  enterprise:   'Enterprise',
}

export default function AdminPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [orgs, setOrgs] = useState<OrgSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Status change modal
  const [statusTarget, setStatusTarget] = useState<OrgSummary | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [isSavingStatus, setIsSavingStatus] = useState(false)

  // License modal
  const [licenseTarget, setLicenseTarget] = useState<OrgSummary | null>(null)
  const [licenseForm, setLicenseForm] = useState({
    type: 'basic',
    max_students: 50,
    max_teachers: 5,
    max_groups: 10,
    valid_from: '',
    valid_to: '',
    status: 'active',
  })
  const [isSavingLicense, setIsSavingLicense] = useState(false)

  // Edit org modal
  const [editTarget, setEditTarget] = useState<OrgSummary | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    brand_name: '',
    license_number: '',
    status: 'trial',
    max_users: 100,
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Owner modal (create new OR assign existing)
  const [ownerTarget, setOwnerTarget] = useState<OrgSummary | null>(null)
  const [ownerMode, setOwnerMode] = useState<'create' | 'assign'>('assign')
  const [ownerForm, setOwnerForm] = useState({ email: '', password: '', first_name: '', last_name: '' })
  const [assignEmail, setAssignEmail] = useState('')
  const [isCreatingOwner, setIsCreatingOwner] = useState(false)
  const [isAssigningOwner, setIsAssigningOwner] = useState(false)

  // Create org modal
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    brand_name: '',
    license_number: '',
    status: 'trial',
    max_users: 100,
  })
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  const loadOrgs = async () => {
    try {
      const res = await apiClient.adminGetOrganizations()
      setOrgs(res.results || res)
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadOrgs()
  }, [user])

  const openStatusModal = (org: OrgSummary) => {
    setStatusTarget(org)
    setNewStatus(org.status)
  }

  const handleUpdateStatus = async () => {
    if (!statusTarget) return
    setIsSavingStatus(true)
    try {
      const updated = await apiClient.adminUpdateOrgStatus(statusTarget.slug, newStatus)
      setOrgs((prev) => prev.map((o) => (o.slug === statusTarget.slug ? { ...o, ...updated } : o)))
      toast.success(`Estado actualizado a "${newStatus}"`)
      setStatusTarget(null)
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setIsSavingStatus(false)
    }
  }

  const openLicenseModal = (org: OrgSummary) => {
    setLicenseTarget(org)
    setLicenseForm({
      type: org.license?.type || 'basic',
      max_students: org.license?.max_students ?? 50,
      max_teachers: org.license?.max_teachers ?? 5,
      max_groups: org.license?.max_groups ?? 10,
      valid_from: org.license?.valid_from || new Date().toISOString().slice(0, 10),
      valid_to: org.license?.valid_to || '',
      status: org.license?.status || 'active',
    })
  }

  const handleUpdateLicense = async () => {
    if (!licenseTarget) return
    setIsSavingLicense(true)
    try {
      await apiClient.adminUpdateOrgLicense(licenseTarget.slug, licenseForm)
      await loadOrgs()
      toast.success('Licencia actualizada')
      setLicenseTarget(null)
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setIsSavingLicense(false)
    }
  }

  const openEditModal = (org: OrgSummary) => {
    setEditTarget(org)
    setEditForm({
      name: org.name,
      brand_name: org.brand_name || '',
      license_number: org.license_number || '',
      status: org.status,
      max_users: org.max_users,
    })
  }

  const handleUpdateOrg = async () => {
    if (!editTarget) return
    setIsSavingEdit(true)
    try {
      await apiClient.updateOrganization(editTarget.slug, editForm)
      await loadOrgs()
      toast.success('Organización actualizada')
      setEditTarget(null)
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setIsSavingEdit(false)
    }
  }

  const openOwnerModal = (org: OrgSummary) => {
    setOwnerTarget(org)
    setOwnerMode(org.owner_email ? 'assign' : 'create')
    setOwnerForm({ email: '', password: '', first_name: '', last_name: '' })
    setAssignEmail('')
  }

  const handleAssignOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerTarget) return
    setIsAssigningOwner(true)
    try {
      const res = await apiClient.adminAssignOwner(ownerTarget.slug, assignEmail)
      await loadOrgs()
      const demoted = res.demoted_previous_owner
      toast.success(demoted ? `${res.email} es ahora owner. ${demoted} pasó a manager.` : `${res.email} es ahora owner.`)
      setOwnerTarget(null)
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setIsAssigningOwner(false)
    }
  }

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerTarget) return
    setIsCreatingOwner(true)
    try {
      await apiClient.adminCreateOwner(ownerTarget.slug, ownerForm)
      await loadOrgs()
      toast.success(`Owner creado para ${ownerTarget.name}`)
      setOwnerTarget(null)
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setIsCreatingOwner(false)
    }
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingOrg(true)
    try {
      await apiClient.adminCreateOrganization(createForm)
      await loadOrgs()
      toast.success('Organización creada')
      setShowCreateOrg(false)
      setCreateForm({ name: '', brand_name: '', license_number: '', status: 'trial', max_users: 100 })
    } catch (err: any) {
      toast.error(extractErrorMessage(err))
    } finally {
      setIsCreatingOrg(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            eyebrow="Super admin"
            title="Panel de control"
            subtitle={`${orgs.length} organizaciones registradas.`}
            actions={
              <button
                onClick={() => setShowCreateOrg(true)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-medium py-2 px-4 rounded-md transition"
              >
                + Nueva organización
              </button>
            }
          />

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total orgs', value: orgs.length },
              { label: 'Activas', value: orgs.filter((o) => o.status === 'active').length },
              { label: 'Trial', value: orgs.filter((o) => o.status === 'trial').length },
              { label: 'Suspendidas', value: orgs.filter((o) => o.status === 'suspended').length },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Orgs table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Organización', 'Plan', 'Estado', 'Usuarios', 'Estudiantes', 'Teachers', 'Grupos', 'Owner', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgs.map((org) => {
                  const st = STATUS_LABELS[org.status] || { label: org.status, color: 'bg-gray-100 text-gray-700' }
                  const plan = org.license ? PLAN_LABELS[org.license.type] || org.license.type : '—'
                  return (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">{org.name}</p>
                        {org.brand_name && <p className="text-xs text-gray-400">{org.brand_name}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{plan}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">{org.user_count}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">{org.student_count}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">{org.teacher_count}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">{org.group_count}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{org.owner_email || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => openEditModal(org)}
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => openStatusModal(org)}
                            className="px-2 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded font-medium transition"
                          >
                            Estado
                          </button>
                          <button
                            onClick={() => openLicenseModal(org)}
                            className="px-2 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded font-medium transition"
                          >
                            Licencia
                          </button>
                          <button
                            onClick={() => openOwnerModal(org)}
                            className="px-2 py-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-medium transition"
                          >
                            Owner
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
            {orgs.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">
                No hay organizaciones registradas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status modal */}
      {statusTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Cambiar estado</h3>
            <p className="text-sm text-gray-500 mb-4">{statusTarget.name}</p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateStatus}
                disabled={isSavingStatus}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                {isSavingStatus ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setStatusTarget(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* License modal */}
      {licenseTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Actualizar licencia</h3>
            <p className="text-sm text-gray-500 mb-4">{licenseTarget.name}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Plan</label>
                  <select
                    value={licenseForm.type}
                    onChange={(e) => setLicenseForm({ ...licenseForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(PLAN_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estado licencia</label>
                  <select
                    value={licenseForm.status}
                    onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Activa</option>
                    <option value="expired">Expirada</option>
                    <option value="suspended">Suspendida</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'max_students', label: 'Estudiantes' },
                  { key: 'max_teachers', label: 'Teachers' },
                  { key: 'max_groups', label: 'Grupos' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={(licenseForm as any)[key]}
                      onChange={(e) => setLicenseForm({ ...licenseForm, [key]: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vigencia desde</label>
                  <input
                    type="date"
                    value={licenseForm.valid_from}
                    onChange={(e) => setLicenseForm({ ...licenseForm, valid_from: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vigencia hasta</label>
                  <input
                    type="date"
                    value={licenseForm.valid_to}
                    onChange={(e) => setLicenseForm({ ...licenseForm, valid_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleUpdateLicense}
                disabled={isSavingLicense}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                {isSavingLicense ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setLicenseTarget(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create org modal */}
      {showCreateOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva organización</h3>
            <form onSubmit={handleCreateOrg} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de marca (opcional)</label>
                <input
                  value={createForm.brand_name}
                  onChange={(e) => setCreateForm({ ...createForm, brand_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Número de licencia</label>
                <input
                  required
                  value={createForm.license_number}
                  onChange={(e) => setCreateForm({ ...createForm, license_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estado inicial</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Máx. usuarios</label>
                  <input
                    type="number"
                    min={1}
                    value={createForm.max_users}
                    onChange={(e) => setCreateForm({ ...createForm, max_users: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isCreatingOrg}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  {isCreatingOrg ? 'Creando...' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateOrg(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit org modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Editar organización</h3>
            <p className="text-sm text-gray-500 mb-4">{editTarget.slug}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de marca</label>
                <input
                  value={editForm.brand_name}
                  onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Número de licencia</label>
                <input
                  value={editForm.license_number}
                  onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Máx. usuarios</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.max_users}
                    onChange={(e) => setEditForm({ ...editForm, max_users: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleUpdateOrg}
                disabled={isSavingEdit}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                {isSavingEdit ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner modal */}
      {ownerTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Gestionar owner</h3>
            <p className="text-sm text-gray-500 mb-1">{ownerTarget.name}</p>
            {ownerTarget.owner_email && (
              <p className="text-xs text-gray-500 mb-3">Owner actual: <span className="font-medium">{ownerTarget.owner_email}</span></p>
            )}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                type="button"
                onClick={() => setOwnerMode('assign')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${
                  ownerMode === 'assign' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Asignar existente
              </button>
              <button
                type="button"
                onClick={() => setOwnerMode('create')}
                disabled={!!ownerTarget.owner_email}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  ownerMode === 'create' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                title={ownerTarget.owner_email ? 'Ya hay owner — usa Asignar' : ''}
              >
                Crear nuevo
              </button>
            </div>
            {ownerMode === 'assign' ? (
              <form onSubmit={handleAssignOwner} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email del usuario existente</label>
                  <input
                    type="email"
                    required
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Si el usuario pertenece a otra organización, será movido a <strong>{ownerTarget.name}</strong>. Si ya hay owner, será degradado a manager.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isAssigningOwner}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    {isAssigningOwner ? 'Asignando...' : 'Asignar owner'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerTarget(null)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
            <form onSubmit={handleCreateOwner} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={ownerForm.email}
                  onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={ownerForm.password}
                  onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    value={ownerForm.first_name}
                    onChange={(e) => setOwnerForm({ ...ownerForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    value={ownerForm.last_name}
                    onChange={(e) => setOwnerForm({ ...ownerForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isCreatingOwner}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  {isCreatingOwner ? 'Creando...' : 'Crear owner'}
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTarget(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </ProtectedRoute>
  )
}
