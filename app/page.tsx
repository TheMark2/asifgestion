'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/LoadingSpinner'
import { IconTrendingUp, IconHome, IconUsers, IconFileText, IconReceipt } from '@tabler/icons-react'

interface DashboardStats {
  totalPropietarios: number
  totalViviendas: number
  totalInquilinos: number
  contratosActivos: number
  recibosEsteMes: number
  ingresosMensuales: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Obtener estadísticas en paralelo
      const [
        propietarios,
        viviendas, 
        inquilinos,
        contratos,
        recibos
      ] = await Promise.all([
        supabase.from('propietarios').select('id', { count: 'exact' }),
        supabase.from('viviendas').select('id', { count: 'exact' }),
        supabase.from('inquilinos').select('id', { count: 'exact' }),
        supabase.from('contratos_alquiler').select('importe_alquiler_mensual').eq('activo', true),
        supabase.from('recibos_alquiler').select('importe_total_bruto').gte('fecha_emision', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ])

      const contratosData = contratos.data || []
      const recibosData = recibos.data || []

      setStats({
        totalPropietarios: propietarios.count || 0,
        totalViviendas: viviendas.count || 0,
        totalInquilinos: inquilinos.count || 0,
        contratosActivos: contratosData.length,
        recibosEsteMes: recibosData.length,
        ingresosMensuales: contratosData.reduce((sum, c) => sum + c.importe_alquiler_mensual, 0)
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="Cargando dashboard..." />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Dashboard - ASIF Grup
        </h1>
        <p className="text-gray-600 max-w-2xl">
          Resumen general del sistema de gestión de alquileres
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <IconUsers className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Propietarios</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalPropietarios || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <IconHome className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Viviendas</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalViviendas || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <IconFileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Contratos Activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.contratosActivos || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <IconTrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ingresos Mensuales</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.ingresosMensuales || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones principales */}
      {/* Acciones principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/recibos" className="group">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <IconReceipt className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Generar Recibos</h3>
            </div>
            <p className="text-gray-600 mb-4">Crear nuevos recibos de alquiler</p>
            <Button className="w-full">Acceder</Button>
          </div>
        </Link>

        <Link href="/recibos/historial" className="group">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <IconFileText className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Historial</h3>
            </div>
            <p className="text-gray-600 mb-4">Consultar recibos generados</p>
            <Button variant="outline" className="w-full">Acceder</Button>
          </div>
        </Link>

        <Link href="/certificado-anual" className="group">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <IconTrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Certificado Anual</h3>
            </div>
            <p className="text-gray-600 mb-4">Para declaración de rentas</p>
            <Button variant="outline" className="w-full">Acceder</Button>
          </div>
        </Link>
      </div>

      {/* Información del sistema */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Información del Sistema
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Características</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Datos sensibles protegidos</li>
              <li>• Generación automática de PDFs</li>
              <li>• Gestión completa de contratos</li>
              <li>• Certificados anuales para hacienda</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Configuración</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. Configurar base de datos</li>
              <li>2. Añadir propietarios y viviendas</li>
              <li>3. Registrar inquilinos</li>
              <li>4. Crear contratos</li>
              <li>5. Generar recibos</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Acceso rápido a gestión */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestión</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/propietarios" className="text-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <IconUsers className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Propietarios</p>
            <p className="text-xs text-gray-500">{stats?.totalPropietarios || 0} registrados</p>
          </Link>

          <Link href="/viviendas" className="text-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <IconHome className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Viviendas</p>
            <p className="text-xs text-gray-500">{stats?.totalViviendas || 0} registradas</p>
          </Link>

          <Link href="/inquilinos" className="text-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <IconUsers className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Inquilinos</p>
            <p className="text-xs text-gray-500">{stats?.totalInquilinos || 0} registrados</p>
          </Link>

          <Link href="/contratos" className="text-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <IconFileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Contratos</p>
            <p className="text-xs text-gray-500">{stats?.contratosActivos || 0} activos</p>
          </Link>
        </div>
      </div>
    </div>
  )
} 