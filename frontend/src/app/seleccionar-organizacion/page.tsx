'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { BlastLogo } from '@/components/BlastLogo'
import type { Organization } from '@/types'

type Step =
  | { kind: 'list' }
  | { kind: 'requested'; orgName: string; ownerEmail: string | null }

export default function SelectOrganizationPage() {
  const router = useRouter()
  const { user, createMyOrg, isLoading } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [fetchingOrgs, setFetchingOrgs] = useState(true)
  const [localError, setLocalError] = useState('')
  const [step, setStep] = useState<Step>({ kind: 'list' })
  const [requesting, setRequesting] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (user && user.organization_id) {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const data = await apiClient.getPublicOrganizations()
        setOrganizations(data)
      } catch {
        setLocalError('No se pudieron cargar las organizaciones disponibles.')
      } finally {
        setFetchingOrgs(false)
      }
    }
    loadOrgs()
  }, [])

  const handleSelect = async (slug: string) => {
    setLocalError('')
    setRequesting(true)
    try {
      const { org_name, owner_email } = await apiClient.requestOrgAccess(slug)
      setStep({ kind: 'requested', orgName: org_name, ownerEmail: owner_email })
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || 'Error al enviar la solicitud')
    } finally {
      setRequesting(false)
    }
  }

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return
    setIsCreating(true)
    setCreateError('')
    try {
      await createMyOrg(newOrgName.trim())
      router.push('/dashboard')
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || 'Error al crear la organización')
      setIsCreating(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    router.push('/login')
  }

  const userDisplayName =
    user?.first_name
      ? `${user.first_name} ${user.last_name || ''}`
      : user?.email || ''

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-slate-200 bg-white">
        <BlastLogo size="sm" showWordmark />
        <span className="text-xs text-slate-400 tracking-wider uppercase hidden sm:inline">
          A GoPlanify product
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10">
            <div className="text-center mb-6">
              <BlastLogo size="lg" showWordmark />
            </div>

            {step.kind === 'requested' ? (
              /* ── Confirmation screen ── */
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2
                  className="text-xl text-slate-900 mb-2"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  Solicitud enviada
                </h2>
                <p className="text-sm text-slate-600 mb-1">
                  Le avisamos al administrador de{' '}
                  <span className="font-medium text-slate-800">{step.orgName}</span>{' '}
                  que quieres unirte.
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  Te van a contactar a{' '}
                  <span className="font-medium text-slate-700">{user?.email}</span>.
                </p>

                {step.ownerEmail && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6 text-left">
                    <p className="text-xs text-slate-500 mb-2">Escribile al administrador para pedir acceso:</p>
                    <p className="text-xs text-slate-400 mb-3 font-mono">{step.ownerEmail}</p>
                    <a
                      href={`mailto:${step.ownerEmail}?subject=${encodeURIComponent(`Solicitud de acceso a ${step.orgName} en BLEST`)}&body=${encodeURIComponent(`Hola,\n\nSoy ${user?.first_name || ''} ${user?.last_name || ''} (${user?.email}) y quisiera unirme a la organización "${step.orgName}" en BLEST.\n\n¿Podrías darme acceso?\n\nGracias`)}`}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Enviar email al administrador
                    </a>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              /* ── Org list ── */
              <>
                <h2
                  className="text-2xl text-slate-900 mb-1 text-center"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  Selecciona tu organización
                </h2>
                <p className="text-sm text-slate-500 mb-2 text-center">
                  Has iniciado sesión como{' '}
                  <span className="font-medium text-slate-700">{userDisplayName}</span>
                </p>
                <p className="text-xs text-slate-400 mb-8 text-center">
                  Elige la institución a la que perteneces para solicitar acceso.
                </p>

                {localError && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 mb-6">
                    <p className="text-sm text-red-800">{localError}</p>
                  </div>
                )}

                {fetchingOrgs ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <>
                    {organizations.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-slate-500 mb-1">No hay organizaciones disponibles.</p>
                        <p className="text-xs text-slate-400">Crea la tuya o contacta al administrador.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {organizations.map((org) => (
                          <button
                            key={org.id}
                            onClick={() => handleSelect(org.slug)}
                            disabled={requesting || isLoading}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition disabled:opacity-50 text-left"
                          >
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                              {(org.brand_name || org.name).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {org.brand_name || org.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{org.name}</p>
                            </div>
                            <svg
                              className="w-5 h-5 text-slate-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-5">
                      <button
                        onClick={() => { setShowCreateModal(true); setCreateError('') }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition"
                      >
                        <span className="text-base leading-none">+</span>
                        Crear nueva organización
                      </button>
                    </div>
                  </>
                )}

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <button
                    onClick={handleLogout}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition"
                  >
                    ¿No eres {userDisplayName}? Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="px-6 sm:px-10 py-5 border-t border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} BLEST · Educational Management Platform</span>
          <span className="tracking-wider uppercase">Powered by GoPlanify</span>
        </div>
      </footer>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Nueva organización</h3>
            <p className="text-sm text-slate-500 mb-4">
              Se creará en modo de prueba gratuita por 90 días.
            </p>
            {createError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 mb-3">
                <p className="text-sm text-red-800">{createError}</p>
              </div>
            )}
            <input
              type="text"
              placeholder="Nombre de tu institución"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateOrg}
                disabled={isCreating || !newOrgName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition text-sm"
              >
                {isCreating ? 'Creando...' : 'Crear'}
              </button>
              <button
                onClick={() => { setShowCreateModal(false); setCreateError('') }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
