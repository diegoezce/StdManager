'use client'

import { useEffect, useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'

const BAKED_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export function GoogleProvider({
  clientId: serverClientId,
  children,
}: {
  clientId: string
  children: React.ReactNode
}) {
  const [clientId, setClientId] = useState(serverClientId || BAKED_CLIENT_ID)

  useEffect(() => {
    if (!clientId) {
      fetch('/api/config')
        .then((r) => r.json())
        .then((data) => {
          if (data.googleClientId) setClientId(data.googleClientId)
        })
        .catch(() => {})
    }
  }, [clientId])

  return (
    <GoogleOAuthProvider clientId={clientId} key={clientId}>
      {children}
    </GoogleOAuthProvider>
  )
}
