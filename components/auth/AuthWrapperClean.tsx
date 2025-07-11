'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/components/navigation/Sidebar'
import LoadingSpinner from '@/components/LoadingSpinner'
import SessionTimeoutDialog from '@/components/SessionTimeoutDialog'
import { useSessionTimeout } from '@/lib/useInactivityTimeout'

interface AuthWrapperCleanProps {
  children: React.ReactNode
}

export default function AuthWrapperClean({ children }: AuthWrapperCleanProps) {
  const { isAuthenticated, isLoading, user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  // Hook para manejar timeout de inactividad
  const { showWarning, timeLeft, continueSession } = useSessionTimeout(() => {
    signOut()
  })

  // Redirigir a auth si no está autenticado (excepto si ya está en /auth)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/auth') {
      router.push('/auth')
    }
  }, [isAuthenticated, isLoading, pathname, router])

  // Redirigir al inicio si está autenticado y en /auth
  useEffect(() => {
    if (!isLoading && isAuthenticated && pathname === '/auth') {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, pathname, router])

  // Mostrar loading mientras verificamos autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado y está en página de auth, mostrar la página tal como es
  if (!isAuthenticated && pathname === '/auth') {
    return <>{children}</>
  }

  // Si no está autenticado y no está en auth, no mostrar nada (se redirigirá)
  if (!isAuthenticated) {
    return null
  }

  // Si está autenticado, mostrar la aplicación
  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Barra lateral */}
        <div className="fixed inset-y-0 left-0 z-50">
          <Sidebar />
        </div>
        
        {/* Contenido principal */}
        <div className="flex-1 ml-64">
          {/* Header con info del usuario autenticado */}
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo.png" 
                  alt="ASIF Grup" 
                  className="w-8 h-8 object-contain"
                />
                <div>
                  <h1 className="text-sm font-medium text-gray-900">
                    Sistema de Gestión ASIF Grup
                  </h1>
                  <p className="text-xs text-gray-500">
                    Usuario: {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="text-sm px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
          
          {/* Contenido de la aplicación */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
      
      {/* Diálogo de timeout de sesión */}
      <SessionTimeoutDialog
        isVisible={showWarning}
        timeLeft={timeLeft}
        onContinue={continueSession}
        onLogout={signOut}
      />
    </>
  )
} 