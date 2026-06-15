import type { Metadata, Viewport } from 'next'
import './globals.css'
import { GoogleProvider } from '@/components/GoogleProvider'
import Script from 'next/script'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.blestlearning.com'
const siteName = 'BLEST'
const siteDescription =
  'BLEST es la plataforma integral para la gestión de institutos de idiomas: administra estudiantes, profesores, grupos, asistencias, evaluaciones y reportes en un solo lugar.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'BLEST — Gestión integral para institutos educativos',
    template: '%s | BLEST',
  },
  description: siteDescription,
  applicationName: siteName,
  generator: 'Next.js',
  keywords: [
    'BLEST',
    'gestión educativa',
    'software para institutos de idiomas',
    'gestión de estudiantes',
    'control de asistencia',
    'plataforma educativa',
    'administración de academias',
    'escuela de inglés',
    'gestión de grupos',
    'reportes académicos',
    'SaaS educativo',
  ],
  authors: [{ name: 'GoPlanify' }],
  creator: 'GoPlanify',
  publisher: 'GoPlanify',
  category: 'education',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: siteUrl,
    siteName,
    title: 'BLEST — Gestión integral para institutos educativos',
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BLEST — Gestión integral para institutos educativos',
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4f46e5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteName,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: siteDescription,
    url: siteUrl,
    offers: {
      '@type': 'Offer',
      category: 'SaaS',
    },
    publisher: {
      '@type': 'Organization',
      name: 'GoPlanify',
    },
    inLanguage: 'es',
  }

  return (
    <html lang="es">
      <body className="bg-gray-50">
        <Script
          id="structured-data"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
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
