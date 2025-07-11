'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Propietario } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { formatEuros, formatPorcentaje } from '@/lib/utils'
import { ocultarDocumento } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Table, { TableColumn } from '@/components/ui/Table'
import LoadingSpinner from '@/components/LoadingSpinner'
import DniToggle from '@/components/ui/DniToggle'
import SearchFilters, { FilterField } from '@/components/ui/SearchFilters'
import { useSearch } from '@/hooks/useSearch'

export default function PropietariosPage() {
  const [propietarios, setPropietarios] = useState<Propietario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Configurar búsqueda y filtros
  const {
    searchValue,
    setSearchValue,
    filterValues,
    setFilterValue,
    clearFilters,
    filteredData,
    resultCount,
    totalCount
  } = useSearch({
    data: propietarios,
    searchFields: ['nombre_completo', 'dni_cif', 'email', 'ciudad'],
    filterFunctions: {
      tipo: (item, value) => {
        if (value === 'sociedad') return !!item.es_sociedad
        if (value === 'particular') return !item.es_sociedad
        return true
      },
      gestion: (item, value) => {
        const gestion = item.porcentaje_gestion
        if (value === 'sin_gestion') return gestion === 0
        if (value === 'con_gestion') return gestion > 0
        if (value === 'alto') return gestion >= 10
        if (value === 'medio') return gestion >= 5 && gestion < 10
        if (value === 'bajo') return gestion > 0 && gestion < 5
        return true
      }
    }
  })

  const filterFields: FilterField[] = [
    {
      key: 'ciudad',
      label: 'Ciudad',
      type: 'text',
      placeholder: 'Filtrar por ciudad'
    },
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: 'particular', label: 'Particular' },
        { value: 'sociedad', label: 'Sociedad' }
      ]
    },
    {
      key: 'gestion',
      label: 'Gestión',
      type: 'select',
      options: [
        { value: 'sin_gestion', label: 'Sin gestión (0%)' },
        { value: 'bajo', label: 'Baja (< 5%)' },
        { value: 'medio', label: 'Media (5-10%)' },
        { value: 'alto', label: 'Alta (≥ 10%)' }
      ]
    }
  ]

  useEffect(() => {
    cargarPropietarios()
  }, [])

  const cargarPropietarios = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('propietarios')
        .select('*')
        .order('nombre_completo')

      if (error) throw error

      setPropietarios(data || [])
    } catch (error) {
      console.error('Error cargando propietarios:', error)
      setError('Error al cargar los propietarios')
    } finally {
      setLoading(false)
    }
  }

  const eliminarPropietario = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este propietario?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('propietarios')
        .delete()
        .eq('id', id)

      if (error) throw error

      await cargarPropietarios()
    } catch (error) {
      console.error('Error eliminando propietario:', error)
      alert('Error al eliminar el propietario')
    }
  }

  const columns: TableColumn<Propietario>[] = [
    {
      key: 'nombre_completo',
      header: 'Nombre',
      width: '25%',
      render: (propietario) => (
        <div>
          <div className="font-medium">
            {propietario.es_sociedad ? (
              <span className="flex items-center gap-2">
                {propietario.nombre_completo}
                <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">
                  Sociedad
                </span>
              </span>
            ) : (
              propietario.nombre_completo
            )}
          </div>
          {propietario.co_propietario && (
            <div className="text-sm text-gray-500">
              Co-propietario: {propietario.co_propietario}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'dni_cif',
      header: 'DNI/CIF',
      width: '15%',
      render: (propietario) => (
        <DniToggle dni={propietario.dni_cif} />
      )
    },
    {
      key: 'ciudad',
      header: 'Ciudad',
      width: '15%',
      render: (propietario) => propietario.ciudad || '-'
    },
    {
      key: 'email',
      header: 'Email',
      width: '20%',
      render: (propietario) => propietario.email || '-'
    },
    {
      key: 'porcentaje_gestion',
      header: 'Gestión',
      width: '10%',
      render: (propietario) => formatPorcentaje(propietario.porcentaje_gestion)
    },
    {
      key: 'acciones',
      header: 'Acciones',
      width: '15%',
      render: (propietario) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/propietarios/${propietario.id}/edit`)}
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => eliminarPropietario(propietario.id)}
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Propietarios</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los propietarios de las viviendas
            {!loading && totalCount > 0 && (
              <span className="ml-2 text-sm">
                ({resultCount} de {totalCount} propietarios)
              </span>
            )}
          </p>
        </div>
        
        <Link href="/propietarios/new">
          <Button>
            Nuevo propietario
          </Button>
        </Link>
      </div>

      {/* Filtros de búsqueda */}
      <SearchFilters
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={filterFields}
        filterValues={filterValues}
        onFilterChange={setFilterValue}
        onClearFilters={clearFilters}
      />

      {loading ? (
        <LoadingSpinner text="Cargando propietarios..." />
      ) : (
        <div className="bg-white shadow rounded-lg">
          <Table
            data={filteredData}
            columns={columns}
            keyField="id"
            emptyMessage={
              totalCount === 0 
                ? "No hay propietarios registrados. ¡Añade el primer propietario!"
                : "No se encontraron propietarios con los filtros aplicados."
            }
          />
        </div>
      )}
    </div>
  )
} 