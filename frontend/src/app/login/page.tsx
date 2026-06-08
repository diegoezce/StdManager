'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { BlastLogo } from '@/components/BlastLogo'

const GoogleLogin = dynamic(
  () => import('@react-oauth/google').then((mod) => mod.GoogleLogin),
  { ssr: false }
)

export default function LoginPage() {
  const router = useRouter()
  const { login, googleLogin, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [showHelpModal, setShowHelpModal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!email || !password) {
      setLocalError('Por favor completa todos los campos')
      return
    }

    try {
      const response = await login(email, password)
      // If user has no organization, redirect to org selection
      if (response && !response.user?.organization_id) {
        router.push('/seleccionar-organizacion')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'No se pudo iniciar sesión. Verifica tus credenciales.'
      setLocalError(msg)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-slate-200 bg-white">
        <BlastLogo size="sm" showWordmark />
        <span className="text-xs text-slate-400 tracking-wider uppercase hidden sm:inline">
          A GoPlanify product
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center">
          <div className="hidden md:flex flex-col gap-6">
            <BlastLogo size="xl" showWordmark showTagline />
            <h1
              className="text-4xl text-slate-900 leading-tight"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Excelencia académica,
              <br />
              gestión moderna.
            </h1>
            <p className="text-slate-600 text-base leading-relaxed max-w-md">
              Plataforma integral para la administración de programas educativos:
              estudiantes, grupos, asistencias y reportes en un solo lugar.
            </p>
            <div className="flex gap-8 pt-4">
              <Pillar number="01" label="Estudiantes" />
              <Pillar number="02" label="Grupos" />
              <Pillar number="03" label="Reportes" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10">
            <div className="md:hidden mb-6 flex justify-center">
              <BlastLogo size="lg" showWordmark />
            </div>
            <h2
              className="text-2xl text-slate-900 mb-1"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Iniciar sesión
            </h2>
            <p className="text-sm text-slate-500 mb-8">
              Accede a tu cuenta institucional.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {localError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                  <p className="text-sm text-red-800">{localError}</p>
                </div>
              )}

              <div>
                <label htmlFor="email-address" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="tucorreo@institucion.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Contraseña
                  </label>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-md text-white font-medium bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
              >
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </button>

              <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-slate-400 uppercase">
                        O continúa con
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={async (credentialResponse) => {
                        try {
                          setLocalError('')
                          const response = await googleLogin(credentialResponse.credential!)
                          // If user has no organization, redirect to org selection
                          if (response && !response.user?.organization_id) {
                            router.push('/seleccionar-organizacion')
                          } else {
                            router.push('/dashboard')
                          }
                        } catch {
                          setLocalError('Error al iniciar sesión con Google')
                        }
                      }}
                      onError={() => {
                        setLocalError('Error en la autenticación con Google')
                      }}
                      size="large"
                      width="100%"
                      shape="rectangular"
                      theme="outline"
                      text="signin_with"
                      locale="es"
                    />
                  </div>
              </>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Al ingresar aceptas los términos institucionales.
            </p>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowHelpModal(true)}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                ¿Necesitás ayuda para ingresar?
              </button>
            </div>
          </div>
        </div>
      </main>

      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center">
            <div className="text-3xl mb-3">🔑</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">¿Problemas para ingresar?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Escribinos y te ayudamos a recuperar el acceso a tu cuenta.
            </p>
            <a
              href="mailto:info@blestlearning.com?subject=Ayuda%20para%20ingresar%20a%20BLEST"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm mb-3"
            >
              info@blestlearning.com
            </a>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <footer className="px-6 sm:px-10 py-5 border-t border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} BLEST · Educational Management Platform</span>
          <span className="tracking-wider uppercase">Powered by GoPlanify</span>
        </div>
      </footer>
    </div>
  )
}

function Pillar({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span
        className="text-2xl text-indigo-700"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {number}
      </span>
      <span className="text-xs text-slate-500 uppercase tracking-wider mt-1">{label}</span>
    </div>
  )
}
