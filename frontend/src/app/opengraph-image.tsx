import { ImageResponse } from 'next/og'

export const alt = 'BLEST — Plataforma de gestión educativa'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 60%, #6366f1 100%)',
          color: '#ffffff',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          BLEST
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 44,
            lineHeight: 1.25,
            maxWidth: 900,
            color: '#e0e7ff',
          }}
        >
          Gestión integral para institutos educativos
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 26,
            color: '#c7d2fe',
            display: 'flex',
            gap: 28,
          }}
        >
          <span>Estudiantes</span>
          <span>·</span>
          <span>Grupos</span>
          <span>·</span>
          <span>Asistencias</span>
          <span>·</span>
          <span>Reportes</span>
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 22,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: '#a5b4fc',
          }}
        >
          A GoPlanify product
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
