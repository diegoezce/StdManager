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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!hasRole(['owner', 'admin'])) {
      router.replace('/dashboard')
      return
    }
    setOrgName(user.organization_name || '')
    setBrandName(user.brand_name || '')
  }, [user])

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
      toast.success('Settings saved')
    } catch (error: any) {
      toast.error(extractErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 group"
      >
        <span className="text-lg leading-none group-hover:-translate-x-0.5 transition-transform">←</span>
        Back
      </button>

      <PageHeader
        eyebrow="Configuración"
        title="Ajustes"
        subtitle="Preferencias de la organización."
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization name
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. ABC Language Institute"
            required
          />
          <p className="mt-1 text-xs text-gray-400">Legal or commercial name of the organization.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand name
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. BLEST English"
          />
          <p className="mt-1 text-xs text-gray-400">
            Shown in the navigation bar. Falls back to organization name if empty.
          </p>
        </div>

        <div className="pt-2 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <span className="text-xs text-gray-400">
            Changes are reflected immediately in the navigation bar.
          </span>
        </div>
      </form>

      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </div>
  )
}
