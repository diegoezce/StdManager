import type { Metadata } from 'next'
import './globals.css'

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
  return (
    <html lang="es">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
}
