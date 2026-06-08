import type { Metadata } from 'next'
import './globals.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

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
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  return (
    <html lang="es">
      <body className="bg-gray-50">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__GOOGLE_CLIENT_ID = ${JSON.stringify(googleClientId)};`,
          }}
        />
        <GoogleOAuthProvider clientId={googleClientId || 'placeholder'}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}
