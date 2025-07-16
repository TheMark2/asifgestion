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
  
  const [guardandoLiquidacion, setGuardandoLiquidacion] = useState(false)

  // Filtros
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1 + '')
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear() + '')

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
        inquilinos: contrato.contratos_inquilinos?.map((ci: any) => ci.inquilinos).filter(Boolean) || []
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
        return (
          <div className="space-y-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium text-center ${
              liquidado
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {liquidado ? 'Liquidado' : 'Pendiente'}
            </div>
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
        <h1 className="text-2xl font-bold text-gray-900">
          Liquidaciones y Deudas
        </h1>
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
          data={contratos}
          columns={columns}
          keyField="id"
          loading={false}
          emptyMessage="No hay contratos registrados"
        />
        
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="space-y-1">
              <div>Total contratos: <span className="font-medium">{contratos.length}</span></div>
              <div>Contratos activos: <span className="font-medium">{contratosActivosDelMes.length}</span></div>
            </div>
            {filtroMes && filtroAnio && (
              <div className="space-y-1">
                <div className="font-medium">Para {MESES[parseInt(filtroMes) - 1]?.label} {filtroAnio}:</div>
                <div className="text-green-600">
                  Liquidados: <span className="font-medium">{contratosLiquidadosDelMes.length}</span>
                </div>
                <div className="text-red-600">
                  Pendientes: <span className="font-medium">{contratosPendientesDelMes.length}</span>
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
              <h3 className="font-medium text-gray-900 mb-3">Liquidar Nuevo Mes</h3>
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