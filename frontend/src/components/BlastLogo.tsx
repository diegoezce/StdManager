import React from 'react'

interface BlastLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showWordmark?: boolean
  showTagline?: boolean
  className?: string
}

const SIZES = {
  sm: { mark: 28, wordmark: 'text-lg',  tagline: 'text-[10px]' },
  md: { mark: 40, wordmark: 'text-2xl', tagline: 'text-xs' },
  lg: { mark: 56, wordmark: 'text-3xl', tagline: 'text-sm' },
  xl: { mark: 72, wordmark: 'text-4xl', tagline: 'text-sm' },
}

export function BlastLogo({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  className = '',
}: BlastLogoProps) {
  const s = SIZES[size]

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="BLEST"
        role="img"
      >
        <rect x="2" y="2" width="60" height="60" rx="14" fill="#312E81" />
        <rect x="2" y="2" width="60" height="60" rx="14" stroke="#1E1B4B" strokeWidth="1" />
        {/* Serif "B" monogram */}
        <path
          d="M22 16 H35 C40.5 16 44 19.2 44 23.8 C44 27.3 41.8 29.7 38.6 30.6 C42.6 31.3 45.2 33.9 45.2 38 C45.2 43 41.4 46 35.4 46 H22 V16 Z M27 28.5 H34.2 C37 28.5 38.8 27 38.8 24.5 C38.8 22 37 20.5 34.2 20.5 H27 V28.5 Z M27 41.5 H34.8 C38 41.5 40 39.8 40 37 C40 34.2 38 32.6 34.8 32.6 H27 V41.5 Z"
          fill="#FBBF24"
        />
        {/* Underline serifs / accent bar */}
        <rect x="14" y="50" width="36" height="2" rx="1" fill="#FBBF24" opacity="0.85" />
      </svg>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-serif font-semibold tracking-[0.18em] text-indigo-900 ${s.wordmark}`}
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            BLEST
          </span>
          {showTagline && (
            <span className={`mt-1 uppercase tracking-[0.22em] text-slate-500 ${s.tagline}`}>
              Educational Management
            </span>
          )}
        </div>
      )}
    </div>
  )
}
