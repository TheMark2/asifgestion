'use client'

import { ReactNode, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { IconX, IconAlertTriangle, IconCheck, IconInfoCircle } from '@tabler/icons-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  type?: 'default' | 'danger' | 'success' | 'warning' | 'info'
  showCloseButton?: boolean
  preventCloseOnBackdrop?: boolean
  className?: string
}

const typeStyles = {
  default: {
    headerBg: 'bg-gray-50',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-600',
    icon: IconInfoCircle
  },
  danger: {
    headerBg: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    icon: IconAlertTriangle
  },
  success: {
    headerBg: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    icon: IconCheck
  },
  warning: {
    headerBg: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    icon: IconAlertTriangle
  },
  info: {
    headerBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    icon: IconInfoCircle
  }
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  type = 'default',
  showCloseButton = true,
  preventCloseOnBackdrop = false,
  className
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  }

  const typeStyle = typeStyles[type]
  const IconComponent = typeStyle.icon

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventCloseOnBackdrop) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div className={cn(
        'relative w-full transform rounded-2xl bg-white border transition-all duration-300 ease-out',
        sizeClasses[size],
        typeStyle.borderColor,
        isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        className
      )}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={cn(
            'px-6 py-4 border-b rounded-t-2xl',
            typeStyle.borderColor,
            typeStyle.headerBg
          )}>
            <div className="flex items-center justify-between">
            {title && (
                <div className="flex items-center space-x-3">
                  <IconComponent className={cn('h-6 w-6', typeStyle.iconColor)} />
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
                </div>
            )}
            
            {showCloseButton && (
                <button
                onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Cerrar"
              >
                  <IconX className="h-5 w-5" />
                </button>
            )}
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
} 