'use client'

import { Modal } from './Modal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  confirmClassName?: string
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmClassName = 'bg-red-600 hover:bg-red-700 text-white',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 font-medium py-2 px-4 rounded-md transition disabled:opacity-50 ${confirmClassName}`}
        >
          {isLoading ? '...' : confirmLabel}
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-md transition"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
