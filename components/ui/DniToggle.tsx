'use client'

import React, { useState } from 'react'
import { ocultarDocumento } from '@/lib/utils'

interface DniToggleProps {
  dni: string
  className?: string
}

export default function DniToggle({ dni, className = '' }: DniToggleProps) {
  const [mostrarCompleto, setMostrarCompleto] = useState(false)

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-gray-600">
        {mostrarCompleto ? dni : ocultarDocumento(dni)}
      </span>
      <button
        onClick={() => setMostrarCompleto(!mostrarCompleto)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title={mostrarCompleto ? 'Ocultar DNI' : 'Mostrar DNI completo'}
      >
        {mostrarCompleto ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M14.12 14.12l1.415 1.415M14.12 14.12L9.878 9.878m4.242 4.242L8.464 8.464m5.656 5.656l1.415 1.415" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  )
} 
 
 