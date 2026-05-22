import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, eyebrow, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-8 pb-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-700 mb-2">
            {eyebrow}
          </p>
        )}
        <h1
          className="text-3xl text-slate-900 leading-tight"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
