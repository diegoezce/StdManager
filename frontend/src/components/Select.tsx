'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
}

export function Select({ value, onChange, options, placeholder, className, size = 'md' }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const isSm = size === 'sm'

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = Math.min(options.length * 38 + 8, 280)
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 160),
      zIndex: 9999,
      ...(placeAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    })
  }, [open, options.length])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={clsx('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center justify-between gap-2 w-full bg-white border border-gray-200 rounded-md shadow-sm',
          'text-left text-gray-800 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition',
          isSm ? 'px-2.5 py-1 text-sm' : 'px-3 py-2 text-sm'
        )}
      >
        <span className={clsx('truncate', !selected && 'text-gray-400')}>
          {selected ? selected.label : (placeholder ?? 'Seleccionar…')}
        </span>
        <svg
          className={clsx('w-4 h-4 shrink-0 text-gray-400 transition-transform duration-150', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto max-h-72"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={clsx(
                'flex items-center w-full px-3 py-2 text-sm text-left transition',
                opt.value === value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-slate-50'
              )}
            >
              {opt.value === value ? (
                <svg className="w-3.5 h-3.5 mr-2 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-3.5 mr-2 shrink-0" />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
