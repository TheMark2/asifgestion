'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Credenciales predefinidas
const VALID_EMAIL = 'asifgrup@gmail.com'
const VALID_PASSWORD = 'AsifGestion2024#'

interface AuthUser {
  email: string
  isAuthenticated: boolean
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Funciones de localStorage
const saveAuthUser = (email: string): AuthUser => {
  const user: AuthUser = {
    email,
    isAuthenticated: true
  }
  localStorage.setItem('asif_auth_user', JSON.stringify(user))
  return user
}

const getCurrentUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('asif_auth_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const clearAuthUser = (): void => {
  localStorage.removeItem('asif_auth_user')
}

const validateCredentials = (email: string, password: string): boolean => {
  return email === VALID_EMAIL && password === VALID_PASSWORD
}

// Provider del contexto
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Inicializar estado desde localStorage
  useEffect(() => {
    const savedUser = getCurrentUser()
    setUser(savedUser)
    setIsLoading(false)
  }, [])

  // Función de login
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!validateCredentials(email, password)) {
      return { success: false, error: 'Email o contraseña incorrectos' }
    }
    
    const newUser = saveAuthUser(email)
    setUser(newUser)
    
    return { success: true }
  }

  // Función de logout
  const signOut = () => {
    clearAuthUser()
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user?.isAuthenticated,
    isLoading,
    login,
    signOut
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

// Hook para usar el contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
} 