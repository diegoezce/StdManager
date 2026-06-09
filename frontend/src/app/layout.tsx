import type { Metadata } from 'next'
import './globals.css'
import { GoogleProvider } from '@/components/GoogleProvider'
import Script from 'next/script'

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
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  return (
    <html lang="es">
      <body className="bg-gray-50">
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2H48H0LPHJ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2H48H0LPHJ');
          `}
        </Script>
        <GoogleProvider clientId={googleClientId}>
          {children}
        </GoogleProvider>
      </body>
    </html>
  )
}
