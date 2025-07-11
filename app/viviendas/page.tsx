'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Vivienda } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Table, { TableColumn } from '@/components/ui/Table'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ViviendasPage() {
  const [viviendas, setViviendas] = useState<Vivienda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    cargarViviendas()
  }, [])

  const cargarViviendas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('viviendas')
        .select(`
          *,
          propietarios (
            id,
            nombre_completo,
            dni_cif
          )
        `)
        .order('direccion_completa')

      if (error) throw error

      setViviendas(data || [])
    } catch (error) {
      console.error('Error cargando viviendas:', error)
      setError('Error al cargar las viviendas')
    } finally {
      setLoading(false)
    }
  }

  const eliminarVivienda = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta vivienda?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('viviendas')
        .delete()
        .eq('id', id)

      if (error) throw error

      await cargarViviendas()
    } catch (error) {
      console.error('Error eliminando vivienda:', error)
      alert('Error al eliminar la vivienda')
    }
  }

  const columns: TableColumn<Vivienda>[] = [
    {
      key: 'direccion_completa',
      header: 'Dirección',
      width: '40%'
    },
    {
      key: 'propietarios',
      header: 'Propietario',
      width: '25%',
      render: (vivienda) => 
        vivienda.propietarios 
          ? `${vivienda.propietarios.nombre_completo}`
          : 'Sin propietario'
    },
    {
      key: 'ciudad',
      header: 'Ciudad',
      width: '15%',
      render: (vivienda) => vivienda.ciudad || '-'
    },
    {
      key: 'codigo_postal',
      header: 'C.P.',
      width: '10%',
      render: (vivienda) => vivienda.codigo_postal || '-'
    },
    {
      key: 'acciones',
      header: 'Acciones',
      width: '10%',
      render: (vivienda) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/viviendas/${vivienda.id}/edit`)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => eliminarVivienda(vivienda.id)}
          >
            Eliminar
          </Button>
        </div>
      )
    }
  ]

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Viviendas</h1>
          <p className="text-gray-600 mt-2">
            Gestiona las viviendas y sus propietarios
          </p>
        </div>
        
        <Link href="/viviendas/new">
          <Button>
            Nueva vivienda
          </Button>
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner text="Cargando viviendas..." />
      ) : (
        <div className="bg-white shadow rounded-lg">
          <Table
            data={viviendas}
            columns={columns}
            keyField="id"
            emptyMessage="No hay viviendas registradas. ¡Añade la primera vivienda!"
          />
        </div>
      )}
    </div>
  )
} 