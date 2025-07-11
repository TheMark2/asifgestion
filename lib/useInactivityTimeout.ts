'use client'

import { useEffect, useRef, useState } from 'react'

interface InactivityTimeoutConfig {
  timeout: number // tiempo en milisegundos
  warningTime: number // tiempo de aviso antes del logout
  onWarning: () => void // callback cuando se muestra la advertencia
  onTimeout: () => void // callback cuando expira el tiempo
  onUserActivity: () => void // callback cuando hay actividad del usuario
}

export function useInactivityTimeout(config: InactivityTimeoutConfig) {
  const [isActive, setIsActive] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Actividades del usuario que resetean el timer
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ]

  // Función para resetear el timer
  const resetTimer = () => {
    // Limpiar todos los timers existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current)
    }

    // Ocultar advertencia si está visible
    if (showWarning) {
      setShowWarning(false)
      setTimeLeft(0)
    }

    // Configurar timer para mostrar advertencia
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true)
      setTimeLeft(config.warningTime / 1000) // convertir a segundos
      config.onWarning()
      
      // Iniciar countdown
      startCountdown()
      
      // Configurar timeout final
      timeoutRef.current = setTimeout(() => {
        setIsActive(false)
        setShowWarning(false)
        config.onTimeout()
      }, config.warningTime)
      
    }, config.timeout - config.warningTime)

    // Notificar actividad del usuario
    config.onUserActivity()
  }

  // Función para iniciar el countdown
  const startCountdown = () => {
    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Función para continuar la sesión
  const continueSession = () => {
    setShowWarning(false)
    setTimeLeft(0)
    resetTimer()
  }

  // Función para cerrar sesión manualmente
  const logout = () => {
    setIsActive(false)
    setShowWarning(false)
    config.onTimeout()
  }

  // Configurar listeners de eventos
  useEffect(() => {
    const handleActivity = () => {
      if (isActive && !showWarning) {
        resetTimer()
      }
    }

    // Agregar listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Iniciar timer
    resetTimer()

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current)
      }
    }
  }, [isActive, showWarning])

  return {
    isActive,
    showWarning,
    timeLeft,
    continueSession,
    logout
  }
}

// Hook simplificado para usar con valores por defecto
export function useSessionTimeout(onTimeout: () => void) {
  const [showWarning, setShowWarning] = useState(false)
  
  return useInactivityTimeout({
    timeout: 30 * 60 * 1000, // 30 minutos
    warningTime: 2 * 60 * 1000, // 2 minutos de advertencia
    onWarning: () => setShowWarning(true),
    onTimeout,
    onUserActivity: () => {} // no hacer nada especial
  })
} 