'use client'

import { useEffect, useState } from 'react'
import { IconClock, IconRefresh, IconLogout } from '@tabler/icons-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface SessionTimeoutDialogProps {
  isVisible: boolean
  timeLeft: number // tiempo restante en segundos
  onContinue: () => void
  onLogout: () => void
}

export default function SessionTimeoutDialog({ 
  isVisible, 
  timeLeft, 
  onContinue, 
  onLogout 
}: SessionTimeoutDialogProps) {
  const [countdown, setCountdown] = useState(timeLeft)

  useEffect(() => {
    setCountdown(timeLeft)
  }, [timeLeft])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = (seconds: number): string => {
    if (seconds > 60) return 'text-yellow-600'
    if (seconds > 30) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressPercentage = (seconds: number): number => {
    return Math.max(0, (seconds / 120) * 100) // 120 segundos = 2 minutos
  }

  if (!isVisible) return null

  return (
    <Modal 
      isOpen={isVisible} 
      onClose={() => {}} // No permitir cerrar el modal
      showCloseButton={false}
      className="max-w-md"
    >
      <div className="text-center p-6">
        {/* Icono de advertencia */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
          <IconClock className="h-6 w-6 text-yellow-600" />
        </div>

        {/* Título */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sesión por expirar
        </h3>

        {/* Mensaje */}
        <p className="text-sm text-gray-600 mb-6">
          Su sesión expirará por inactividad en:
        </p>

        {/* Countdown con barra de progreso */}
        <div className="mb-6">
          <div className={`text-3xl font-bold mb-2 ${getTimeColor(countdown)}`}>
            {formatTime(countdown)}
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${
                countdown > 60 ? 'bg-yellow-500' : 
                countdown > 30 ? 'bg-orange-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${getProgressPercentage(countdown)}%` }}
            />
          </div>
        </div>

        {/* Mensaje de seguridad */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-blue-800">
            <strong>Medida de seguridad:</strong> Por su protección, cerramos automáticamente 
            las sesiones inactivas después de 30 minutos.
          </p>
        </div>

        {/* Botones */}
        <div className="flex space-x-3">
          <Button
            onClick={onContinue}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <IconRefresh className="h-4 w-4 mr-2" />
            Continuar sesión
          </Button>
          
          <Button
            onClick={onLogout}
            variant="outline"
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
          >
            <IconLogout className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>

        {/* Información adicional */}
        <p className="text-xs text-gray-500 mt-4">
          Haga clic en "Continuar sesión" para extender su tiempo de acceso.
        </p>
      </div>
    </Modal>
  )
}

// Componente simplificado para casos de uso básicos
export function SessionTimeoutAlert({ 
  isVisible, 
  timeLeft, 
  onContinue, 
  onLogout 
}: SessionTimeoutDialogProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <IconClock className="h-6 w-6 text-yellow-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sesión por expirar
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Su sesión expirará en <strong className="text-red-600">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</strong>
          </p>
          
          <div className="flex space-x-3">
            <Button onClick={onContinue} className="flex-1">
              Continuar
            </Button>
            <Button onClick={onLogout} variant="outline" className="flex-1">
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 