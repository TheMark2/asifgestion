'use client'

import { useState } from 'react'
import { IconEye, IconEyeOff } from '@tabler/icons-react'

interface SensitiveDataProps {
  value: string
  type?: 'dni' | 'contract' | 'phone' | 'email' | 'default'
  maskByDefault?: boolean
  showToggle?: boolean
  className?: string
}

const SensitiveData = ({ 
  value, 
  type = 'default',
  maskByDefault = true,
  showToggle = false,
  className = '' 
}: SensitiveDataProps) => {
  const [isVisible, setIsVisible] = useState(!maskByDefault)

  const maskValue = (val: string, dataType: string) => {
    if (!val) return ''
    
    switch (dataType) {
      case 'dni':
        // Mostrar solo los primeros 2 y últimos 2 caracteres
        if (val.length <= 4) return '****'
        return `${val.slice(0, 2)}${'*'.repeat(val.length - 4)}${val.slice(-2)}`
      
      case 'contract':
        // Mostrar solo los primeros 3 caracteres
        return `${val.slice(0, 3)}${'*'.repeat(Math.max(0, val.length - 3))}`
      
      case 'phone':
        // Mostrar solo los últimos 3 dígitos
        return `${'*'.repeat(Math.max(0, val.length - 3))}${val.slice(-3)}`
      
      case 'email':
        const [user, domain] = val.split('@')
        if (!domain) return '*'.repeat(val.length)
        const maskedUser = user.length > 2 ? `${user.slice(0, 2)}${'*'.repeat(user.length - 2)}` : '**'
        return `${maskedUser}@${domain}`
      
      default:
        // Enmascarar todo excepto los primeros y últimos caracteres
        if (val.length <= 2) return '*'.repeat(val.length)
        return `${val[0]}${'*'.repeat(val.length - 2)}${val[val.length - 1]}`
    }
  }

  const displayValue = isVisible ? value : maskValue(value, type)

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <span 
        className={`font-mono text-sm px-2 py-1 rounded border transition-all duration-200 ${
          isVisible 
            ? 'bg-white border-gray-200' 
            : 'bg-gray-100 border-gray-300 cursor-pointer hover:bg-gray-200'
        }`}
        onClick={!showToggle ? toggleVisibility : undefined}
        onMouseEnter={!showToggle && !isVisible ? () => setIsVisible(true) : undefined}
        onMouseLeave={!showToggle && maskByDefault ? () => setIsVisible(false) : undefined}
        title={!isVisible ? "Haz clic para mostrar" : "Dato sensible"}
      >
        {displayValue}
      </span>
      
      {showToggle && (
        <button
          onClick={toggleVisibility}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title={isVisible ? "Ocultar" : "Mostrar"}
        >
          {isVisible ? (
            <IconEyeOff size={16} />
          ) : (
            <IconEye size={16} />
          )}
        </button>
      )}
    </div>
  )
}

export default SensitiveData 
 
 