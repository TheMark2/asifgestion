'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Inquilino } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Table, { TableColumn } from '@/components/ui/Table'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ocultarDocumento } from '@/lib/utils'
import DniToggle from '@/components/ui/DniToggle'

export default function InquilinosPage() {
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    cargarInquilinos()
  }, [])

  const cargarInquilinos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inquilinos')
        .select('*')
        .order('nombre_completo')

      if (error) throw error

      setInquilinos(data || [])
    } catch (error) {
      console.error('Error cargando inquilinos:', error)
      setError('Error al cargar los inquilinos')
    } finally {
      setLoading(false)
    }
  }

  const eliminarInquilino = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este inquilino?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('inquilinos')
        .delete()
        .eq('id', id)

      if (error) throw error

      await cargarInquilinos()
    } catch (error) {
      console.error('Error eliminando inquilino:', error)
      alert('Error al eliminar el inquilino')
    }
  }

  const columns: TableColumn<Inquilino>[] = [
    {
      key: 'nombre_completo',
      header: 'Nombre completo',
      width: '30%'
    },
    {
      key: 'dni',
      header: 'DNI',
      width: '15%',
      render: (inquilino) => (
        <DniToggle dni={inquilino.dni} />
      )
    },
    {
      key: 'email',
      header: 'Email',
      width: '25%',
      render: (inquilino) => inquilino.email || '-'
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      width: '20%',
      render: (inquilino) => inquilino.telefono || '-'
    },
    {
      key: 'acciones',
      header: 'Acciones',
      width: '10%',
      render: (inquilino) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/inquilinos/${inquilino.id}/edit`)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => eliminarInquilino(inquilino.id)}
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
          <h1 className="text-3xl font-bold text-gray-900">Inquilinos</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los inquilinos de las viviendas
          </p>
        </div>
        
        <Link href="/inquilinos/new">
          <Button>
            Nuevo inquilino
          </Button>
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner text="Cargando inquilinos..." />
      ) : (
        <div className="bg-white shadow rounded-lg">
          <Table
            data={inquilinos}
            columns={columns}
            keyField="id"
            emptyMessage="No hay inquilinos registrados. ¡Añade el primer inquilino!"
          />
        </div>
      )}
    </div>
  )
} 