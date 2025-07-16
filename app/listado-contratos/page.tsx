'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFecha, formatEuros } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Table, { TableColumn } from '@/components/ui/Table'
import LoadingSpinner from '@/components/LoadingSpinner'
import DniToggle from '@/components/ui/DniToggle'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import SearchFilters, { FilterField } from '@/components/ui/SearchFilters'
import { useSearch } from '@/hooks/useSearch'

interface ContratoCompleto {
  id: string
  vivienda_id: string
  fecha_inicio_contrato: string
  fecha_fin_contrato?: string
  importe_alquiler_mensual: number
  activo: boolean
  created_at: string
  updated_at: string
  viviendas: {
    id: string
    direccion_completa: string
    calle?: string
    propietarios: {
      id: string
      nombre_completo: string
      dni_cif: string
      porcentaje_gestion: number
    }
  }
  inquilinos: Array<{
    id: string
    nombre_completo: string
    dni: string
  }>
  liquidaciones_mensuales?: LiquidacionMensual[]
  resumen_deudas?: ResumenDeudas
  recibo_generado?: boolean // Nueva propiedad para indicar si se generó el recibo del mes filtrado
}

interface LiquidacionMensual {
  id: string
  contrato_id: string
  mes: number
  anio: number
  importe_liquidado: number
  fecha_liquidacion: string
  observaciones?: string
  created_at: string
}

interface ResumenDeudas {
  total_deuda: number
  meses_pendientes: number
  primer_mes_pendiente?: string
  meses_atrasado: number
  detalle_meses: Array<{
    mes: number
    anio: number
    nombre_mes: string
    importe_debido: number
    meses_atrasado: number
  }>
}

interface LiquidacionForm {
  mes: string
  anio: string
  importe_liquidado: string
  observaciones: string
}

interface LiquidacionMultipleForm {
  desde_mes: string
  desde_anio: string
  hasta_mes: string
  hasta_anio: string
  importe_liquidado: string
  observaciones: string
}

const MESES = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
]

export default function ListadoContratosPage() {
  const [contratos, setContratos] = useState<ContratoCompleto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modales
  const [modalLiquidacionAbierto, setModalLiquidacionAbierto] = useState(false)
  const [modalDeudasAbierto, setModalDeudasAbierto] = useState(false)
  
  const [contratoSeleccionado, setContratoSeleccionado] = useState<ContratoCompleto | null>(null)
  
  // Formularios
  const [liquidacionForm, setLiquidacionForm] = useState<LiquidacionForm>({
    mes: new Date().getMonth() + 1 + '',
    anio: new Date().getFullYear() + '',
    importe_liquidado: '',
    observaciones: ''
  })
  
  // Liquidación múltiple
  const [liquidacionMultiple, setLiquidacionMultiple] = useState(false)
  const [liquidacionMultipleForm, setLiquidacionMultipleForm] = useState<LiquidacionMultipleForm>({
    desde_mes: new Date().getMonth() + 1 + '',
    desde_anio: new Date().getFullYear() + '',
    hasta_mes: new Date().getMonth() + 1 + '',
    hasta_anio: new Date().getFullYear() + '',
    importe_liquidado: '',
    observaciones: ''
  })
  
  const [guardandoLiquidacion, setGuardandoLiquidacion] = useState(false)

  // Filtros
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1 + '')
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear() + '')

  // Configurar búsqueda y filtros avanzados
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
    data: contratos,
    searchFields: ['id'], // Usamos id como campo básico de búsqueda
    filterFunctions: {
      propietario: (item, value) => {
        const propietario = item.viviendas?.propietarios?.nombre_completo || ''
        return propietario.toLowerCase().includes(value.toLowerCase())
      },
      inquilino: (item, value) => {
        const inquilinos = item.inquilinos?.map(i => i.nombre_completo).join(' ') || ''
        return inquilinos.toLowerCase().includes(value.toLowerCase())
      },
      vivienda: (item, value) => {
        const direccion = item.viviendas?.direccion_completa || ''
        return direccion.toLowerCase().includes(value.toLowerCase())
      },
      estado_liquidacion: (item, value) => {
        const liquidado = estaLiquidado(item, parseInt(filtroMes), parseInt(filtroAnio))
        if (value === 'liquidado') return liquidado
        if (value === 'pendiente') return !liquidado
        return true
      },
      estado_contrato: (item, value) => {
        if (value === 'activo') return item.activo
        if (value === 'inactivo') return !item.activo
        return true
      },
      estado_recibo: (item, value) => {
        if (!filtroMes || !filtroAnio) return true // Solo funciona si hay mes/año filtrado
        const reciboGenerado = item.recibo_generado || false
        if (value === 'generado') return reciboGenerado
        if (value === 'no_generado') return !reciboGenerado
        return true
      },
      busqueda_general: (item, value) => {
        const searchText = [
          item.viviendas?.direccion_completa || '',
          item.viviendas?.propietarios?.nombre_completo || '',
          ...(item.inquilinos?.map(i => i.nombre_completo) || [])
        ].join(' ').toLowerCase()
        return searchText.includes(value.toLowerCase())
      }
    }
  })

  const filterFields: FilterField[] = [
    {
      key: 'propietario',
      label: 'Propietario',
      type: 'text',
      placeholder: 'Buscar por propietario'
    },
    {
      key: 'inquilino',
      label: 'Inquilino',
      type: 'text',
      placeholder: 'Buscar por inquilino'
    },
    {
      key: 'vivienda',
      label: 'Vivienda',
      type: 'text',
      placeholder: 'Buscar por dirección'
    },
    {
      key: 'estado_liquidacion',
      label: 'Estado Liquidación',
      type: 'select',
      options: [
        { value: 'liquidado', label: 'Liquidado' },
        { value: 'pendiente', label: 'Pendiente' }
      ]
    },
    {
      key: 'estado_contrato',
      label: 'Estado Contrato',
      type: 'select',
      options: [
        { value: 'activo', label: 'Activo' },
        { value: 'inactivo', label: 'Inactivo' }
      ]
    },
    {
      key: 'estado_recibo',
      label: 'Estado Recibo',
      type: 'select',
      options: [
        { value: 'generado', label: 'Generado' },
        { value: 'no_generado', label: 'No Generado' }
      ]
    }
  ]

  useEffect(() => {
    cargarContratos()
  }, [])

  const cargarContratos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('contratos_alquiler')
        .select(`
          *,
          viviendas (
            id,
            direccion_completa,
            calle,
            propietarios (
              id,
              nombre_completo,
              dni_cif,
              porcentaje_gestion
            )
          ),
          contratos_inquilinos (
            id,
            inquilinos (
              id,
              nombre_completo,
              dni
            )
          )
        `)
        .order('fecha_inicio_contrato', { ascending: false })

      if (error) throw error

      // Transformar los datos
      const contratosTransformados = (data || []).map(contrato => ({
        ...contrato,
        inquilinos: contrato.contratos_inquilinos?.map((ci: any) => ci.inquilinos).filter(Boolean) || [],
        recibo_generado: contrato.liquidaciones_mensuales?.some(liq => 
          liq.mes === parseInt(filtroMes) && liq.anio === parseInt(filtroAnio)
        )
      }))

      // Cargar datos adicionales para cada contrato
      for (const contrato of contratosTransformados) {
        // Cargar liquidaciones
        const { data: liquidacionesData } = await supabase
          .from('liquidaciones_mensuales')
          .select('*')
          .eq('contrato_id', contrato.id)
          .order('anio', { ascending: false })
          .order('mes', { ascending: false })

        contrato.liquidaciones_mensuales = liquidacionesData || []

        // Verificar si existe un recibo generado para el mes/año filtrado
        if (filtroMes && filtroAnio) {
          const { data: reciboData } = await supabase
            .from('recibos_alquiler')
            .select(`
              id,
              generado,
              recibos_detalle_meses (
                mes,
                anio
              )
            `)
            .eq('contrato_id', contrato.id)

          contrato.recibo_generado = reciboData?.some(recibo => 
            recibo.recibos_detalle_meses?.some(detalle => 
              detalle.mes === parseInt(filtroMes) && 
              detalle.anio === parseInt(filtroAnio)
            ) && recibo.generado
          ) || false
        } else {
          contrato.recibo_generado = false
        }

        // Cargar resumen de deudas usando la función de la base de datos
        try {
          const { data: deudaData } = await supabase
            .rpc('obtener_resumen_deudas_contrato', { contrato_uuid: contrato.id })

          if (deudaData && deudaData.length > 0) {
            const resumen = deudaData[0]
            
            // Obtener detalle de meses pendientes
            const { data: detalleData } = await supabase
              .rpc('obtener_meses_pendientes_liquidacion', { contrato_uuid: contrato.id })

            contrato.resumen_deudas = {
              total_deuda: resumen.total_deuda || 0,
              meses_pendientes: resumen.meses_pendientes || 0,
              primer_mes_pendiente: resumen.primer_mes_pendiente || '',
              meses_atrasado: resumen.meses_atrasado || 0,
              detalle_meses: detalleData || []
            }
          } else {
            contrato.resumen_deudas = {
              total_deuda: 0,
              meses_pendientes: 0,
              primer_mes_pendiente: '',
              meses_atrasado: 0,
              detalle_meses: []
            }
          }
        } catch (deudaError) {
          console.error('Error calculando deudas para contrato:', contrato.id, deudaError)
          contrato.resumen_deudas = {
            total_deuda: 0,
            meses_pendientes: 0,
            primer_mes_pendiente: '',
            meses_atrasado: 0,
            detalle_meses: []
          }
        }
      }

      setContratos(contratosTransformados)
    } catch (error) {
      console.error('Error cargando contratos:', error)
      setError('Error al cargar los contratos')
    } finally {
      setLoading(false)
    }
  }

  // Funciones para gestionar liquidaciones
  const abrirModalLiquidacion = (contrato: ContratoCompleto) => {
    setContratoSeleccionado(contrato)
    setLiquidacionForm({
      mes: filtroMes,
      anio: filtroAnio,
      importe_liquidado: contrato.importe_alquiler_mensual.toString(),
      observaciones: ''
    })
    setLiquidacionMultipleForm({
      desde_mes: filtroMes,
      desde_anio: filtroAnio,
      hasta_mes: filtroMes,
      hasta_anio: filtroAnio,
      importe_liquidado: contrato.importe_alquiler_mensual.toString(),
      observaciones: ''
    })
    setLiquidacionMultiple(false)
    setModalLiquidacionAbierto(true)
  }

  const cerrarModalLiquidacion = () => {
    setModalLiquidacionAbierto(false)
    setContratoSeleccionado(null)
    setLiquidacionForm({
      mes: new Date().getMonth() + 1 + '',
      anio: new Date().getFullYear() + '',
      importe_liquidado: '',
      observaciones: ''
    })
    setLiquidacionMultipleForm({
      desde_mes: new Date().getMonth() + 1 + '',
      desde_anio: new Date().getFullYear() + '',
      hasta_mes: new Date().getMonth() + 1 + '',
      hasta_anio: new Date().getFullYear() + '',
      importe_liquidado: '',
      observaciones: ''
    })
    setLiquidacionMultiple(false)
  }

  const liquidarMes = async () => {
    if (!contratoSeleccionado || !liquidacionForm.mes || !liquidacionForm.anio || !liquidacionForm.importe_liquidado) {
      alert('Por favor, completa todos los campos obligatorios')
      return
    }

    try {
      setGuardandoLiquidacion(true)
      
      const { error } = await supabase
        .rpc('liquidar_mes_contrato', {
          contrato_uuid: contratoSeleccionado.id,
          mes_liquidar: parseInt(liquidacionForm.mes),
          anio_liquidar: parseInt(liquidacionForm.anio),
          importe_liquidar: parseFloat(liquidacionForm.importe_liquidado),
          observaciones_liquidacion: liquidacionForm.observaciones || null
        })

      if (error) throw error

      await cargarContratos()
      cerrarModalLiquidacion()
    } catch (error) {
      console.error('Error liquidando mes:', error)
      alert('Error al liquidar el mes: ' + (error as any).message)
    } finally {
      setGuardandoLiquidacion(false)
    }
  }

  const liquidarMultiplesMeses = async () => {
    if (!contratoSeleccionado || !liquidacionMultipleForm.desde_mes || !liquidacionMultipleForm.desde_anio || 
        !liquidacionMultipleForm.hasta_mes || !liquidacionMultipleForm.hasta_anio || !liquidacionMultipleForm.importe_liquidado) {
      alert('Por favor, completa todos los campos obligatorios')
      return
    }

    const desdeDate = new Date(parseInt(liquidacionMultipleForm.desde_anio), parseInt(liquidacionMultipleForm.desde_mes) - 1)
    const hastaDate = new Date(parseInt(liquidacionMultipleForm.hasta_anio), parseInt(liquidacionMultipleForm.hasta_mes) - 1)
    
    if (desdeDate > hastaDate) {
      alert('La fecha "desde" no puede ser posterior a la fecha "hasta"')
      return
    }

    // Calcular meses a liquidar
    const mesesALiquidar = []
    let current = new Date(desdeDate)
    
    while (current <= hastaDate) {
      mesesALiquidar.push({
        mes: current.getMonth() + 1,
        anio: current.getFullYear()
      })
      current.setMonth(current.getMonth() + 1)
    }

    if (mesesALiquidar.length === 0) {
      alert('No hay meses válidos para liquidar')
      return
    }

    if (!confirm(`¿Estás seguro de que quieres liquidar ${mesesALiquidar.length} mes${mesesALiquidar.length !== 1 ? 'es' : ''}?`)) {
      return
    }

    try {
      setGuardandoLiquidacion(true)
      
      // Liquidar cada mes individualmente
      for (const { mes, anio } of mesesALiquidar) {
        const { error } = await supabase
          .rpc('liquidar_mes_contrato', {
            contrato_uuid: contratoSeleccionado.id,
            mes_liquidar: mes,
            anio_liquidar: anio,
            importe_liquidar: parseFloat(liquidacionMultipleForm.importe_liquidado),
            observaciones_liquidacion: liquidacionMultipleForm.observaciones || null
          })

        if (error) {
          console.error(`Error liquidando ${MESES[mes - 1].label} ${anio}:`, error)
          // Continuar con los demás meses en caso de error
        }
      }

      await cargarContratos()
      cerrarModalLiquidacion()
      alert(`Se liquidaron ${mesesALiquidar.length} mes${mesesALiquidar.length !== 1 ? 'es' : ''} correctamente`)
    } catch (error) {
      console.error('Error liquidando múltiples meses:', error)
      alert('Error al liquidar múltiples meses: ' + (error as any).message)
    } finally {
      setGuardandoLiquidacion(false)
    }
  }

  const desliquidarMes = async (contrato: ContratoCompleto, mes: number, anio: number) => {
    if (!confirm(`¿Estás seguro de que quieres des-liquidar ${MESES[mes - 1].label} ${anio}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .rpc('desliquidar_mes_contrato', {
          contrato_uuid: contrato.id,
          mes_desliquidar: mes,
          anio_desliquidar: anio
        })

      if (error) throw error

      await cargarContratos()
    } catch (error) {
      console.error('Error des-liquidando mes:', error)
      alert('Error al des-liquidar el mes')
    }
  }

  // Funciones para gestionar deudas
  const abrirModalDeudas = (contrato: ContratoCompleto) => {
    setContratoSeleccionado(contrato)
    setModalDeudasAbierto(true)
  }

  const cerrarModalDeudas = () => {
    setModalDeudasAbierto(false)
    setContratoSeleccionado(null)
  }

  // Verificar si un mes está liquidado
  const estaLiquidado = (contrato: ContratoCompleto, mes: number, anio: number) => {
    return contrato.liquidaciones_mensuales?.some(liq => 
      liq.mes === mes && liq.anio === anio
    ) || false
  }

  const columns: TableColumn<ContratoCompleto>[] = [
    {
      key: 'propietario',
      header: 'Propietario',
      width: '20%',
      render: (contrato) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {contrato.viviendas?.propietarios?.nombre_completo}
          </div>
          <DniToggle dni={contrato.viviendas?.propietarios?.dni_cif || ''} />
        </div>
      )
    },
    {
      key: 'vivienda',
      header: 'Dirección',
      width: '25%',
      render: (contrato) => (
        <div className="text-sm text-gray-900">
          {contrato.viviendas?.direccion_completa}
        </div>
      )
    },
    {
      key: 'inquilinos',
      header: 'Inquilinos',
      width: '20%',
      render: (contrato) => {
        const inquilinos = contrato.inquilinos || []
        if (inquilinos.length === 0) {
          return <span className="text-sm text-gray-400">Sin inquilinos</span>
        }
        
        return (
          <div className="space-y-1">
            {inquilinos.map((inquilino, index) => (
              <div key={inquilino.id} className="text-sm">
                <div className="font-medium text-gray-900">
                  {inquilino.nombre_completo}
                </div>
                <DniToggle dni={inquilino.dni} />
              </div>
            ))}
          </div>
        )
      }
    },
    {
      key: 'precio',
      header: 'Precio Alquiler',
      width: '10%',
      render: (contrato) => (
        <div className="text-sm font-medium text-gray-900">
          {formatEuros(contrato.importe_alquiler_mensual)}
        </div>
      )
    },
    {
      key: 'estado_liquidacion',
      header: 'Estado Liquidación',
      width: '12%',
      render: (contrato) => {
        const liquidado = estaLiquidado(contrato, parseInt(filtroMes), parseInt(filtroAnio))
        const reciboGenerado = contrato.recibo_generado || false
        return (
          <div className="space-y-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium text-center ${
              liquidado
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {liquidado ? 'Liquidado' : 'Pendiente'}
            </div>
            {filtroMes && filtroAnio && (
              <div className={`px-2 py-1 rounded text-xs text-center ${
                reciboGenerado 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                📄 {reciboGenerado ? 'Recibo generado' : 'Sin recibo'}
              </div>
            )}
            <div className={`px-2 py-1 rounded text-xs text-center ${
              contrato.activo 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {contrato.activo ? 'Activo' : 'Inactivo'}
            </div>
          </div>
        )
      }
    },
    {
      key: 'deudas',
      header: 'Deudas',
      width: '10%',
      render: (contrato) => {
        const deudas = contrato.resumen_deudas
        return (
          <div className="space-y-1">
            <div className="text-sm">
              <div className={`font-medium ${deudas?.total_deuda && deudas.total_deuda > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {deudas?.total_deuda && deudas.total_deuda > 0 ? formatEuros(deudas.total_deuda) : 'Sin deudas'}
              </div>
              {deudas?.meses_pendientes && deudas.meses_pendientes > 0 && (
                <div className="text-xs text-red-500">
                  {deudas.meses_pendientes} mes{deudas.meses_pendientes !== 1 ? 'es' : ''}
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => abrirModalDeudas(contrato)}
              className="text-xs px-2 py-1"
            >
              Ver Detalle
            </Button>
          </div>
        )
      }
    },
    {
      key: 'acciones',
      header: 'Acciones',
      width: '3%',
      render: (contrato) => (
        <div className="space-y-1">
          <Button
            variant="primary"
            size="sm"
            onClick={() => abrirModalLiquidacion(contrato)}
            className="text-xs px-2 py-1 w-full"
          >
            Liquidar
          </Button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <Button onClick={cargarContratos} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  // Calcular estadísticas para el mes/año seleccionado
  const contratosActivosDelMes = contratos.filter(c => c.activo)
  const contratosLiquidadosDelMes = contratosActivosDelMes.filter(c => 
    estaLiquidado(c, parseInt(filtroMes), parseInt(filtroAnio))
  )
  const contratosPendientesDelMes = contratosActivosDelMes.filter(c => 
    !estaLiquidado(c, parseInt(filtroMes), parseInt(filtroAnio))
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Liquidaciones y Deudas
          </h1>
          <p className="text-gray-600 mt-2">
            Gestiona las liquidaciones mensuales y consulta las deudas de los contratos
            {!loading && totalCount > 0 && (
              <span className="ml-2 text-sm">
                ({resultCount} de {totalCount} contratos)
              </span>
            )}
          </p>
        </div>
        <Button onClick={cargarContratos}>
          Actualizar
        </Button>
      </div>

      {/* Filtros de mes y año */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-3">Filtrar por mes:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes
            </label>
            <Select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              options={[
                { value: '', label: 'Seleccionar mes' },
                ...MESES
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año
            </label>
            <Select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              options={[
                { value: '', label: 'Seleccionar año' },
                { value: '2023', label: '2023' },
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
                { value: '2026', label: '2026' }
              ]}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={cargarContratos} className="w-full">
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros de búsqueda avanzados */}
      <SearchFilters
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={filterFields}
        filterValues={filterValues}
        onFilterChange={setFilterValue}
        onClearFilters={clearFilters}
      />

      {/* Mostrar filtros activos */}
      {(filtroMes || filtroAnio) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-900 mb-2">Vista actual:</h3>
          <div className="flex flex-wrap gap-2">
            {filtroMes && filtroAnio && (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                📅 Liquidaciones para {MESES.find(m => m.value === filtroMes)?.label} {filtroAnio}
              </span>
            )}
            {!filtroMes && filtroAnio && (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                📅 Año {filtroAnio} (todos los meses)
              </span>
            )}
            {filtroMes && !filtroAnio && (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                📅 {MESES.find(m => m.value === filtroMes)?.label} (todos los años)
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <Table
          data={filteredData}
          columns={columns}
          keyField="id"
          loading={false}
          emptyMessage={
            totalCount === 0 
              ? "No hay contratos registrados"
              : "No se encontraron contratos con los filtros aplicados."
          }
        />
        
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="space-y-1">
              <div>Total contratos: <span className="font-medium">{totalCount}</span></div>
              <div>Mostrando: <span className="font-medium">{resultCount}</span></div>
              <div>Contratos activos: <span className="font-medium">{filteredData.filter(c => c.activo).length}</span></div>
            </div>
            {filtroMes && filtroAnio && (
              <div className="space-y-1">
                <div className="font-medium">Para {MESES[parseInt(filtroMes) - 1]?.label} {filtroAnio}:</div>
                <div className="text-green-600">
                  Liquidados: <span className="font-medium">{filteredData.filter(c => estaLiquidado(c, parseInt(filtroMes), parseInt(filtroAnio))).length}</span>
                </div>
                <div className="text-red-600">
                  Pendientes: <span className="font-medium">{filteredData.filter(c => c.activo && !estaLiquidado(c, parseInt(filtroMes), parseInt(filtroAnio))).length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para liquidar mes */}
      <Modal
        isOpen={modalLiquidacionAbierto}
        onClose={cerrarModalLiquidacion}
        title="Liquidar Mes"
      >
        {contratoSeleccionado && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Información del Contrato</h3>
              <p className="text-sm text-gray-600">
                <strong>Propietario:</strong> {contratoSeleccionado.viviendas?.propietarios?.nombre_completo}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Vivienda:</strong> {contratoSeleccionado.viviendas?.direccion_completa}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Alquiler mensual:</strong> {formatEuros(contratoSeleccionado.importe_alquiler_mensual)}
              </p>
            </div>

            {/* Mostrar liquidaciones existentes */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Meses Liquidados</h3>
              {contratoSeleccionado.liquidaciones_mensuales && contratoSeleccionado.liquidaciones_mensuales.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {contratoSeleccionado.liquidaciones_mensuales.map((liquidacion) => (
                    <div key={liquidacion.id} className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">
                              {MESES[liquidacion.mes - 1]?.label} {liquidacion.anio}
                            </p>
                            <p className="text-xs text-gray-500">{formatFecha(liquidacion.fecha_liquidacion)}</p>
                            {liquidacion.observaciones && (
                              <p className="text-xs text-gray-600 mt-1">{liquidacion.observaciones}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-medium text-sm">{formatEuros(liquidacion.importe_liquidado)}</p>
                            <button
                              onClick={() => desliquidarMes(contratoSeleccionado, liquidacion.mes, liquidacion.anio)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Des-liquidar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No hay meses liquidados</p>
              )}
            </div>

            {/* Formulario para liquidar nuevo mes */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">Liquidar Nuevo Mes</h3>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm ${!liquidacionMultiple ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                    Un mes
                  </span>
                  <button
                    onClick={() => setLiquidacionMultiple(!liquidacionMultiple)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      liquidacionMultiple ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        liquidacionMultiple ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${liquidacionMultiple ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                    Múltiples meses
                  </span>
                </div>
              </div>

              {!liquidacionMultiple ? (
                /* Formulario de liquidación simple */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mes *
                      </label>
                      <Select
                        value={liquidacionForm.mes}
                        onChange={(e) => setLiquidacionForm({ ...liquidacionForm, mes: e.target.value })}
                        options={[
                          { value: '', label: 'Seleccionar mes' },
                          ...MESES
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Año *
                      </label>
                      <Select
                        value={liquidacionForm.anio}
                        onChange={(e) => setLiquidacionForm({ ...liquidacionForm, anio: e.target.value })}
                        options={[
                          { value: '', label: 'Seleccionar año' },
                          { value: '2023', label: '2023' },
                          { value: '2024', label: '2024' },
                          { value: '2025', label: '2025' },
                          { value: '2026', label: '2026' }
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importe Liquidado (€) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={liquidacionForm.importe_liquidado}
                        onChange={(e) => setLiquidacionForm({ ...liquidacionForm, importe_liquidado: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observaciones
                      </label>
                      <Input
                        value={liquidacionForm.observaciones}
                        onChange={(e) => setLiquidacionForm({ ...liquidacionForm, observaciones: e.target.value })}
                        placeholder="Observaciones opcionales..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-4">
                    <Button
                      variant="secondary"
                      onClick={cerrarModalLiquidacion}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={liquidarMes}
                      loading={guardandoLiquidacion}
                      disabled={!liquidacionForm.mes || !liquidacionForm.anio || !liquidacionForm.importe_liquidado}
                    >
                      Liquidar Mes
                    </Button>
                  </div>
                </>
              ) : (
                /* Formulario de liquidación múltiple */
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Liquidación múltiple:</strong> Selecciona un rango de meses para liquidar todos a la vez con el mismo importe.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Desde - Mes *
                      </label>
                      <Select
                        value={liquidacionMultipleForm.desde_mes}
                        onChange={(e) => setLiquidacionMultipleForm({ ...liquidacionMultipleForm, desde_mes: e.target.value })}
                        options={[
                          { value: '', label: 'Seleccionar mes' },
                          ...MESES
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Desde - Año *
                      </label>
                      <Select
                        value={liquidacionMultipleForm.desde_anio}
                        onChange={(e) => setLiquidacionMultipleForm({ ...liquidacionMultipleForm, desde_anio: e.target.value })}
                        options={[
                          { value: '', label: 'Seleccionar año' },
                          { value: '2023', label: '2023' },
                          { value: '2024', label: '2024' },
                          { value: '2025', label: '2025' },
                          { value: '2026', label: '2026' }
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hasta - Mes *
                      </label>
                      <Select
                        value={liquidacionMultipleForm.hasta_mes}
                        onChange={(e) => setLiquidacionMultipleForm({ ...liquidacionMultipleForm, hasta_mes: e.target.value })}
                        options={[
                          { value: '', label: 'Seleccionar mes' },
                          ...MESES
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hasta - Año *
                      </label>
                      <Select
                        value={liquidacionMultipleForm.hasta_anio}
                        onChange={(e) => setLiquidacionMultipleForm({ ...liquidacionMultipleForm, hasta_anio: e.target.value })}
                        options={[
                          { value: '', label: 'Seleccionar año' },
                          { value: '2023', label: '2023' },
                          { value: '2024', label: '2024' },
                          { value: '2025', label: '2025' },
                          { value: '2026', label: '2026' }
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importe por Mes (€) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={liquidacionMultipleForm.importe_liquidado}
                        onChange={(e) => setLiquidacionMultipleForm({ ...liquidacionMultipleForm, importe_liquidado: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observaciones
                      </label>
                      <Input
                        value={liquidacionMultipleForm.observaciones}
                        onChange={(e) => setLiquidacionMultipleForm({ ...liquidacionMultipleForm, observaciones: e.target.value })}
                        placeholder="Observaciones opcionales..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-4">
                    <Button
                      variant="secondary"
                      onClick={cerrarModalLiquidacion}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={liquidarMultiplesMeses}
                      loading={guardandoLiquidacion}
                      disabled={!liquidacionMultipleForm.desde_mes || !liquidacionMultipleForm.desde_anio || 
                               !liquidacionMultipleForm.hasta_mes || !liquidacionMultipleForm.hasta_anio || 
                               !liquidacionMultipleForm.importe_liquidado}
                    >
                      Liquidar Múltiples Meses
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal para ver deudas */}
      <Modal
        isOpen={modalDeudasAbierto}
        onClose={cerrarModalDeudas}
        title="Detalle de Deudas"
      >
        {contratoSeleccionado && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Información del Contrato</h3>
              <p className="text-sm text-gray-600">
                <strong>Propietario:</strong> {contratoSeleccionado.viviendas?.propietarios?.nombre_completo}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Vivienda:</strong> {contratoSeleccionado.viviendas?.direccion_completa}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Inquilinos:</strong> {contratoSeleccionado.inquilinos.map(i => i.nombre_completo).join(', ')}
              </p>
            </div>

            {/* Resumen de deudas */}
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-900 mb-3">Resumen de Deudas</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-red-700">
                    <strong>Total adeudado:</strong> {formatEuros(contratoSeleccionado.resumen_deudas?.total_deuda || 0)}
                  </p>
                  <p className="text-red-700">
                    <strong>Meses pendientes:</strong> {contratoSeleccionado.resumen_deudas?.meses_pendientes || 0}
                  </p>
                </div>
                <div>
                  {contratoSeleccionado.resumen_deudas?.primer_mes_pendiente && (
                    <p className="text-red-700">
                      <strong>Desde:</strong> {contratoSeleccionado.resumen_deudas.primer_mes_pendiente}
                    </p>
                  )}
                  <p className="text-red-700">
                    <strong>Meses de atraso:</strong> {contratoSeleccionado.resumen_deudas?.meses_atrasado || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalle de meses pendientes */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Meses Pendientes de Liquidar</h3>
              {contratoSeleccionado.resumen_deudas?.detalle_meses && contratoSeleccionado.resumen_deudas.detalle_meses.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {contratoSeleccionado.resumen_deudas.detalle_meses.map((mes, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{mes.nombre_mes} {mes.anio}</p>
                        <p className="text-xs text-red-600">
                          {mes.meses_atrasado > 0 ? `${mes.meses_atrasado} mes${mes.meses_atrasado !== 1 ? 'es' : ''} de atraso` : 'Mes actual'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-red-700">{formatEuros(mes.importe_debido)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600 text-center py-4">✅ No hay meses pendientes - Todo liquidado</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={cerrarModalDeudas}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
} 