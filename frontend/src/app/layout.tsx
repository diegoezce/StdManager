import type { Metadata } from 'next'
import './globals.css'
import { GoogleProvider } from '@/components/GoogleProvider'

export const metadata: Metadata = {
  title: 'BLEST',
  description: 'Platform for educational institution management',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read at request time on the server — no build-time baking needed
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  return (
    <html lang="es">
      <body className="bg-gray-50">
        <GoogleProvider clientId={googleClientId}>
          {children}
        </GoogleProvider>
      </body>
    </html>
  )
}
