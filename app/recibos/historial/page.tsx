'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import SelectMejorado from '@/components/ui/SelectMejorado'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatFecha, formatEuros, ocultarDocumento } from '@/lib/utils'
import { MESES } from '@/lib/types'
import DniToggle from '@/components/ui/DniToggle'
import SearchFilters, { FilterField } from '@/components/ui/SearchFilters'
import { useSearch } from '@/hooks/useSearch'
import Table, { TableColumn } from '@/components/ui/Table'

interface ReciboCompleto {
  id: string
  numero_recibo: string
  contrato_id: string
  fecha_emision: string
  importe_total_bruto: number
  importe_total_gestion: number
  iva_total_gestion: number
  importe_total_neto_propietario: number
  forma_pago_inquilino?: string
  referencia_pago_inquilino?: string
  ruta_pdf_supabase?: string
  generado: boolean
  observaciones?: string
  recibos_detalle_meses: Array<{
    mes: number
    anio: number
    importe_mes: number
    es_mes_atrasado: boolean
  }>
  contratos_alquiler: {
    viviendas: {
      direccion_completa: string
      propietarios: {
        nombre_completo: string
        dni_cif?: string
      }
    }
    contratos_inquilinos: Array<{
      inquilino_id: string
      es_titular: boolean
      inquilinos: {
        id: string
        nombre_completo: string
        dni: string
      }
    }>
  }
}

export default function HistorialRecibosPage() {
  const [recibos, setRecibos] = useState<ReciboCompleto[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

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
    data: recibos,
    searchFields: ['numero_recibo'],
    filterFunctions: {
      mes: (item, value) => {
        const mes = parseInt(value)
        return item.recibos_detalle_meses.some(detalle => detalle.mes === mes)
      },
      ano: (item, value) => {
        const ano = parseInt(value)
        return item.recibos_detalle_meses.some(detalle => detalle.anio === ano)
      },
      estado: (item, value) => {
        if (value === 'generado') return item.generado
        if (value === 'no_generado') return !item.generado
        return true
      }
    }
  })

  // Establecer filtros por defecto al cargar la página
  useEffect(() => {
    if (recibos.length > 0) {
      const mesActual = new Date().getMonth() + 1
      const anioActual = new Date().getFullYear()
      setFilterValue('mes', mesActual.toString())
      setFilterValue('ano', anioActual.toString())
    }
  }, [recibos.length])

  const filterFields: FilterField[] = [
    {
      key: 'mes',
      label: 'Mes',
      type: 'select',
      options: MESES.map((mes, index) => ({
        value: (index + 1).toString(),
        label: mes
      }))
    },
    {
      key: 'ano',
      label: 'Año',
      type: 'select',
      options: Array.from({ length: 5 }, (_, i) => {
        const ano = new Date().getFullYear() - i
        return { value: ano.toString(), label: ano.toString() }
      })
    },
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: [
        { value: 'generado', label: 'Generado' },
        { value: 'no_generado', label: 'No generado' }
      ]
    }
  ]

  useEffect(() => {
    fetchRecibos()
  }, [])

  const fetchRecibos = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('recibos_alquiler')
        .select(`
          *,
          recibos_detalle_meses (
            mes,
            anio,
            importe_mes,
            es_mes_atrasado
          ),
          contratos_alquiler (
            viviendas (
              direccion_completa,
              propietarios (
                nombre_completo,
                dni_cif
              )
            ),
            contratos_inquilinos (
              inquilino_id,
              es_titular,
              inquilinos (
                id,
                nombre_completo,
                dni
              )
            )
          )
        `)
        .order('fecha_emision', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      
      setRecibos(data as ReciboCompleto[] || [])
    } catch (error) {
      console.error('Error fetching recibos:', error)
      alert('Error al cargar el historial de recibos')
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener información de inquilinos
  const getInquilinosInfo = (recibo: ReciboCompleto) => {
    const contrato = recibo.contratos_alquiler
    
    if (contrato.contratos_inquilinos && contrato.contratos_inquilinos.length > 0) {
      const inquilinos = contrato.contratos_inquilinos.map(ci => ci.inquilinos)
      const titular = contrato.contratos_inquilinos.find(ci => ci.es_titular)?.inquilinos || inquilinos[0]
      const nombres = inquilinos.map(i => i.nombre_completo)
      
      return {
        principal: titular.nombre_completo,
        dni: ocultarDocumento(titular.dni),
        todos: nombres,
        cantidad: inquilinos.length,
        esMultiple: inquilinos.length > 1
      }
    }
    
    return {
      principal: 'Sin inquilinos',
      dni: '',
      todos: [],
      cantidad: 0,
      esMultiple: false
    }
  }

  // Función para obtener el período de un recibo (puede ser múltiples meses)
  const getPeriodoRecibo = (recibo: ReciboCompleto) => {
    if (!recibo.recibos_detalle_meses || recibo.recibos_detalle_meses.length === 0) {
      return 'Sin detalles'
    }

    const meses = recibo.recibos_detalle_meses.sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio
      return a.mes - b.mes
    })

    if (meses.length === 1) {
      const mes = meses[0]
      return `${MESES[mes.mes - 1]} ${mes.anio}`
    } else {
      const primerMes = meses[0]
      const ultimoMes = meses[meses.length - 1]
      return `${MESES[primerMes.mes - 1]} ${primerMes.anio} - ${MESES[ultimoMes.mes - 1]} ${ultimoMes.anio} (${meses.length} meses)`
    }
  }

  const downloadPDF = async (recibo: ReciboCompleto) => {
    alert('La descarga de PDFs desde Storage ha sido deshabilitada. Los PDFs se descargan directamente al generarlos.')
  }

  const deleteRecibo = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este recibo? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      // Eliminar primero los detalles de meses
      await supabase
        .from('recibos_detalle_meses')
        .delete()
        .eq('recibo_id', id)

      // Eliminar el recibo principal
      const { error } = await supabase
        .from('recibos_alquiler')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchRecibos()
      alert('Recibo eliminado exitosamente')
    } catch (error) {
      console.error('Error deleting recibo:', error)
      alert('Error al eliminar el recibo')
    }
  }

  // Definir columnas para la tabla
  const columns: TableColumn<ReciboCompleto>[] = [
    {
      key: 'numero_recibo',
      header: 'Número Recibo',
      width: '15%',
      render: (recibo) => (
        <div>
          <div className="font-medium text-gray-900">{recibo.numero_recibo}</div>
          <div className="text-sm text-gray-500">{formatFecha(recibo.fecha_emision)}</div>
        </div>
      )
    },
    {
      key: 'periodo',
      header: 'Período',
      width: '20%',
      render: (recibo) => {
        const periodo = getPeriodoRecibo(recibo)
        const mesesAtrasados = recibo.recibos_detalle_meses.filter(m => m.es_mes_atrasado).length
        return (
          <div>
            <div className="text-gray-900">{periodo}</div>
            {mesesAtrasados > 0 && (
              <div className="text-xs text-red-600">
                {mesesAtrasados} mes(es) atrasado(s)
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'inquilinos',
      header: 'Inquilinos',
      width: '15%',
      render: (recibo) => {
        const inquilinosInfo = getInquilinosInfo(recibo)
        return (
          <div>
            <div className="font-medium text-gray-900">
              {inquilinosInfo.principal}
              {inquilinosInfo.esMultiple && (
                <span className="text-gray-600 ml-1 text-xs">
                  +{inquilinosInfo.cantidad - 1} más
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">{inquilinosInfo.dni}</div>
          </div>
        )
      }
    },
    {
      key: 'vivienda',
      header: 'Vivienda / Propietario',
      width: '20%',
      render: (recibo) => (
        <div>
          <div className="text-gray-900">{recibo.contratos_alquiler.viviendas.direccion_completa}</div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {recibo.contratos_alquiler.viviendas.propietarios.nombre_completo}
            </div>
            {recibo.contratos_alquiler.viviendas.propietarios.dni_cif && (
              <DniToggle dni={recibo.contratos_alquiler.viviendas.propietarios.dni_cif} />
            )}
          </div>
        </div>
      )
    },
    {
      key: 'importe_total_bruto',
      header: 'Importe Bruto',
      width: '10%',
      render: (recibo) => (
        <div className="text-right font-medium text-gray-900">
          {formatEuros(recibo.importe_total_bruto)}
        </div>
      )
    },
    {
      key: 'importe_total_neto_propietario',
      header: 'Neto Propietario',
      width: '10%',
      render: (recibo) => (
        <div className="text-right font-medium text-gray-900">
          {formatEuros(recibo.importe_total_neto_propietario)}
        </div>
      )
    },
    {
      key: 'acciones',
      header: 'Acciones',
      width: '10%',
      render: (recibo) => (
        <div className="flex justify-center space-x-2">
          <Button
            onClick={() => deleteRecibo(recibo.id)}
            size="sm"
            variant="danger"
          >
            Eliminar
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Recibos</h1>
          <p className="text-gray-600 mt-2">
            Consulta los recibos generados anteriormente
            {!loading && totalCount > 0 && (
              <span className="ml-2 text-sm">
                ({resultCount} de {totalCount} recibos)
              </span>
            )}
          </p>
        </div>
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

      {/* Mostrar filtros activos */}
      {(Object.keys(filterValues).length > 0 || searchValue) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Filtros activos:</h3>
          <div className="flex flex-wrap gap-2">
            {searchValue && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Búsqueda: "{searchValue}"
              </span>
            )}
            {Object.entries(filterValues).map(([key, value]) => {
              if (!value) return null
              const field = filterFields.find(f => f.key === key)
              const option = field?.options?.find(o => o.value === value)
              return (
                <span key={key} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {field?.label}: {option?.label || value}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Cargando recibos..." />
      ) : (
        <div className="bg-white shadow rounded-lg">
          <Table
            data={filteredData}
            columns={columns}
            keyField="id"
            emptyMessage={
              totalCount === 0 
                ? "No hay recibos generados. Los recibos aparecerán aquí una vez que los generes."
                : "No se encontraron recibos con los filtros aplicados."
            }
          />
        </div>
      )}
    </div>
  )
} 