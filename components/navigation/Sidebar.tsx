'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  IconHome, 
  IconUser, 
  IconBuilding, 
  IconUsers, 
  IconFileText, 
  IconReceipt, 
  IconHistory, 
  IconCertificate,
  IconChevronLeft,
  IconChevronRight,
  IconSettings,
  IconShield
} from '@tabler/icons-react'

const navigation = [
  { name: 'Inicio', href: '/', icon: IconHome, description: 'Vista general del sistema' },
  { name: 'Propietarios', href: '/propietarios', icon: IconUser, description: 'Gestionar propietarios' },
  { name: 'Viviendas', href: '/viviendas', icon: IconBuilding, description: 'Gestionar propiedades' },
  { name: 'Inquilinos', href: '/inquilinos', icon: IconUsers, description: 'Gestionar inquilinos' },
  { name: 'Contratos', href: '/contratos', icon: IconFileText, description: 'Gestionar contratos de alquiler' },
  { name: 'Generar Recibos', href: '/recibos', icon: IconReceipt, description: 'Crear nuevos recibos' },
  { name: 'Historial Recibos', href: '/recibos/historial', icon: IconHistory, description: 'Consultar recibos anteriores' },
  { name: 'Certificado Anual', href: '/certificado-anual', icon: IconCertificate, description: 'Certificados para declaración de rentas' }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={cn(
      "flex h-full flex-col bg-white border-r border-gray-200 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="ASIF Grup" 
              className="w-8 h-8 object-contain"
            />
            <span className="text-sm font-medium text-gray-900">ASIF Grup</span>
          </div>
        )}
        
        {isCollapsed && (
          <img 
            src="/logo.png" 
            alt="ASIF Grup" 
            className="w-8 h-8 object-contain"
          />
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title={isCollapsed ? "Expandir" : "Contraer"}
        >
          {isCollapsed ? (
            <IconChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <IconChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const IconComponent = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <IconComponent className={cn(
                "flex-shrink-0",
                isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3",
                isActive ? "text-gray-700" : "text-gray-500"
              )} />
              
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate">{item.name}</span>
                  <span className="text-xs truncate text-gray-500">
                  {item.description}
                </span>
              </div>
              )}
            </Link>
          )
        })}
      </nav>
      
      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        {!isCollapsed ? (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Sistema de Gestión
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <IconShield className="h-4 w-4 text-gray-400" title="Sistema Protegido" />
          </div>
        )}
      </div>
    </div>
  )
} 