'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { IconMail, IconLock } from '@tabler/icons-react'
import Button from '@/components/ui/Button'

export default function AuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Campos del formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(email, password)
      
      if (result.success) {
        // Login exitoso - el AuthWrapperClean detectará el cambio y redirigirá
      } else if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-8">
            <img 
              src="/logo.png" 
              alt="ASIF Grup" 
              className="mx-auto h-20 w-auto object-contain"
            />
          </div>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  className="input-modern pl-12"
                  placeholder="Email de acceso"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <IconMail className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  className="input-modern pl-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <IconLock className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Botón de envío */}
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!email || !password}
          >
            {loading ? 'Verificando...' : 'Acceder'}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Acceso autorizado únicamente para personal de ASIF Grup
          </p>
        </div>
      </div>
    </div>
  )
} 