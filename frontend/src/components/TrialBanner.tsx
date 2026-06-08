'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'

export function TrialBanner() {
  const { user } = useAuth()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  if (!user) return null
  if (user.organization_status !== 'trial') return null
  if (user.trial_days_remaining === null || user.trial_days_remaining <= 0) return null

  const days = user.trial_days_remaining

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-amber-800">
            <span className="font-medium">Prueba gratuita</span>
            {' · '}{days} día{days !== 1 ? 's' : ''} restante{days !== 1 ? 's' : ''}
          </p>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="text-xs font-medium text-indigo-700 hover:text-indigo-900 hover:underline transition whitespace-nowrap"
          >
            Actualizar a Pro →
          </button>
        </div>
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center">
            <div className="text-3xl mb-3">✉️</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Actualizar a Pro</h3>
            <p className="text-sm text-slate-600 mb-4">
              Para actualizar tu plan, contacta a nuestro equipo:
            </p>
            <a
              href="mailto:info@blestlearning.com"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm mb-3"
            >
              info@blestlearning.com
            </a>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
