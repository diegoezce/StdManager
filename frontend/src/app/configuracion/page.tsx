'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { useToast, ToastContainer, extractErrorMessage } from '@/components/Toast'
import { PageHeader } from '@/components/PageHeader'

export default function ConfiguracionPage() {
  const router = useRouter()
  const { user, hasRole, me } = useAuth()
  const toast = useToast()

  const [orgName, setOrgName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [emptyClassRate, setEmptyClassRate] = useState('0.50')
  const [saving, setSaving] = useState(false)
  const [savingRate, setSavingRate] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!hasRole(['owner', 'admin'])) {
      router.replace('/dashboard')
      return
    }
    setOrgName(user.organization_name || '')
    setBrandName(user.brand_name || '')
  }, [user])

  // Load current empty_class_rate from org
  useEffect(() => {
    if (!user?.organization_slug) return
    apiClient.getOrganization(user.organization_slug).then((org: any) => {
      if (org.empty_class_rate !== undefined) {
        setEmptyClassRate(String(org.empty_class_rate))
      }
    }).catch(() => {})
  }, [user?.organization_slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.organization_slug) return
    setSaving(true)
    try {
      await apiClient.updateOrganization(user.organization_slug, {
        name: orgName,
        brand_name: brandName,
      })
      await me()
      toast.success('Ajustes guardados')
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.organization_slug) return
    const rate = parseFloat(emptyClassRate)
    if (isNaN(rate) || rate < 0 || rate > 1) {
      toast.error('El valor debe ser entre 0 y 1 (ej. 0.5)')
      return
    }
    setSavingRate(true)
    try {
      await apiClient.updateOrganization(user.organization_slug, { empty_class_rate: rate } as any)
      toast.success('Tarifa actualizada correctamente')
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSavingRate(false)
    }
  }

  if (!user) return null

  const isOwner = hasRole(['owner'])

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 group"
      >
        <span className="text-lg leading-none group-hover:-translate-x-0.5 transition-transform">←</span>
        Volver
      </button>

      <PageHeader
        eyebrow="Configuración"
        title="Ajustes"
        subtitle="Preferencias de la organización."
      />

      {/* General settings */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la organización</label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. ABC Language Institute"
            required
          />
          <p className="mt-1 text-xs text-gray-400">Nombre legal o comercial de la organización.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de marca</label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. BLEST English"
          />
          <p className="mt-1 text-xs text-gray-400">Se muestra en la barra de navegación. Si está vacío usa el nombre de la organización.</p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Report configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-0.5">Reportes YTD</h2>
          <p className="text-xs text-gray-400">Configura qué empresas reciben el reporte anual acumulado por email.</p>
        </div>
        <button
          onClick={() => router.push('/configuracion/reportes')}
          className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-md transition"
        >
          Gestionar →
        </button>
      </div>

      {/* Teacher payment settings — owner only */}
      {isOwner && (
        <form onSubmit={handleSaveRate} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-0.5">Configuración de pagos al teacher</h2>
            <p className="text-xs text-gray-400">Se aplica cuando el teacher se presenta pero no hay alumnos.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarifa por clase sin alumnos
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={emptyClassRate}
                onChange={(e) => setEmptyClassRate(e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">horas por clase</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Valor entre 0 y 1. Por defecto 0.5 = media hora. Una clase normal vale 1h.
            </p>
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2 inline-block">
              Con el valor actual: si el teacher tuvo 8 clases normales + 2 sin alumnos →{' '}
              <strong>{(8 + 2 * parseFloat(emptyClassRate || '0')).toFixed(2)}h</strong> totales
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={savingRate}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingRate ? 'Guardando...' : 'Guardar tarifa'}
            </button>
          </div>
        </form>
      )}

      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </div>
  )
}
