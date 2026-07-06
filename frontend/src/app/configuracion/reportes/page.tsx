'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useToast, ToastContainer, extractErrorMessage } from '@/components/Toast'

interface CorporateClient {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  is_active: boolean
  send_monthly_report: boolean
}

export default function ReportConfigPage() {
  const router = useRouter()
  const { user, me } = useAuth()
  const toast = useToast()
  const [clients, setClients] = useState<CorporateClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

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
    apiClient.getCorporateClients()
      .then((res) => setClients(res.results || res))
      .finally(() => setIsLoading(false))
  }, [user])

  const handleToggle = async (client: CorporateClient) => {
    setToggling(client.id)
    try {
      const updated = await apiClient.patchCorporateClient(client.id, {
        send_monthly_report: !client.send_monthly_report,
      })
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, ...updated } : c)))
      toast.success(
        updated.send_monthly_report
          ? `Reporte activado para ${client.company_name}`
          : `Reporte desactivado para ${client.company_name}`
      )
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    } finally {
      setToggling(null)
    }
  }

  const activeCount = clients.filter((c) => c.send_monthly_report).length

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            eyebrow="Configuración"
            title="Reporte YTD"
            subtitle="Activa o desactiva el reporte anual acumulado (Year to Date) por empresa. El reporte se envía automáticamente al email de contacto."
            actions={
              <button
                onClick={() => router.push('/configuracion')}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium transition"
              >
                ← Volver a configuración
              </button>
            }
          />

          {/* Summary pill */}
          <div className="mb-6 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
              {activeCount} de {clients.length} empresa{clients.length !== 1 ? 's' : ''} con reporte activo
            </span>
          </div>

          {clients.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-500">
              <p className="text-lg font-medium mb-1">No hay empresas</p>
              <p className="text-sm">
                Crea empresas en{' '}
                <button onClick={() => router.push('/empresas')} className="text-indigo-600 underline">
                  Empresas
                </button>{' '}
                para configurar sus reportes.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-slate-50">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Empresa</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Email de reporte</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Estado</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Enviar reporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map((c) => (
                    <tr key={c.id} className={`transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{c.company_name}</p>
                        <p className="text-xs text-gray-500">{c.contact_name}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{c.contact_email}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {c.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleToggle(c)}
                          disabled={toggling === c.id || !c.is_active}
                          aria-label={c.send_monthly_report ? 'Desactivar reporte' : 'Activar reporte'}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                            c.send_monthly_report ? 'bg-indigo-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              c.send_monthly_report ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400">
            Las empresas inactivas no pueden recibir reportes. Actívalas desde{' '}
            <button onClick={() => router.push('/empresas')} className="text-indigo-500 underline">
              Empresas
            </button>
            .
          </p>
        </div>
      </div>

      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </ProtectedRoute>
  )
}
