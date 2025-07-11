'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContratoAlquiler, EstadisticasGanancias } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { formatFecha, formatEuros, ocultarDocumento } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Table, { TableColumn } from '@/components/ui/Table'
import LoadingSpinner from '@/components/LoadingSpinner'
import DniToggle from '@/components/ui/DniToggle'

export default function ContratosPage() {
  const [contratos, setContratos] = useState<ContratoAlquiler[]>([])
  const [estadisticasGanancias, setEstadisticasGanancias] = useState<EstadisticasGanancias | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingGanancias, setLoadingGanancias] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarGanancias, setMostrarGanancias] = useState(false)
  const router = useRouter()

  useEffect(() => {
    cargarContratos()
  }, [])

  useEffect(() => {
    if (contratos.length > 0 && mostrarGanancias) {
      calcularGanancias()
    }
  }, [contratos, mostrarGanancias])

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
            propietarios (
              nombre_completo,
              porcentaje_gestion
            )
          ),
          contratos_inquilinos (
            id,
            es_titular,
            inquilinos (
              id,
              nombre_completo,
              dni
            )
          )
        `)
        .order('fecha_inicio_contrato', { ascending: false })

      if (error) throw error

      // Transformar los datos para incluir el array de inquilinos directamente
      const contratosTransformados = (data || []).map(contrato => ({
        ...contrato,
        inquilinos: contrato.contratos_inquilinos?.map((ci: any) => ci.inquilinos).filter(Boolean) || []
      }))

      setContratos(contratosTransformados)
    } catch (error) {
      console.error('Error cargando contratos:', error)
      setError('Error al cargar los contratos')
    } finally {
      setLoading(false)
    }
  }

  const calcularGanancias = async () => {
    try {
      setLoadingGanancias(true)
      
      // Calcular estadísticas basadas en el porcentaje de gestión
      const gananciasCalculadas: EstadisticasGanancias = {
        total_ganancias_mes: 0,
        total_ganancias_ano: 0,
        ganancias_por_propietario: [],
        resumen_mensual: []
      }

      // Agrupar contratos por propietario
      const contratosPorPropietario = new Map<string, ContratoAlquiler[]>()
      
      contratos.forEach(contrato => {
        if (contrato.viviendas?.propietarios && contrato.activo) {
          const propietarioId = contrato.vivienda_id // Usamos esto como key temporal
          const propietarioContratos = contratosPorPropietario.get(propietarioId) || []
          propietarioContratos.push(contrato)
          contratosPorPropietario.set(propietarioId, propietarioContratos)
        }
      })

      // Calcular ganancias por propietario
      contratosPorPropietario.forEach((contratosDelPropietario, propietarioId) => {
        const primerContrato = contratosDelPropietario[0]
        const propietario = primerContrato.viviendas!.propietarios!
        
        const contratoActivos = contratosDelPropietario.filter(c => c.activo)
        const importeTotalMensual = contratoActivos.reduce((sum, c) => sum + c.importe_alquiler_mensual, 0)
        const gananciasMensuales = importeTotalMensual * (propietario.porcentaje_gestion / 100)
        
        gananciasCalculadas.ganancias_por_propietario.push({
          propietario,
          contratos_activos: contratoActivos.length,
          importe_total_mensual: importeTotalMensual,
          ganancias_mensuales: gananciasMensuales,
          porcentaje_participacion: 0 // Se calculará después
        })

        gananciasCalculadas.total_ganancias_mes += gananciasMensuales
      })

      // Calcular ganancias anuales (estimadas)
      gananciasCalculadas.total_ganancias_ano = gananciasCalculadas.total_ganancias_mes * 12

      // Calcular porcentaje de participación
      gananciasCalculadas.ganancias_por_propietario.forEach(item => {
        item.porcentaje_participacion = gananciasCalculadas.total_ganancias_mes > 0 
          ? (item.ganancias_mensuales / gananciasCalculadas.total_ganancias_mes) * 100
          : 0
      })

      // Ordenar por ganancias mensuales descendente
      gananciasCalculadas.ganancias_por_propietario.sort((a, b) => b.ganancias_mensuales - a.ganancias_mensuales)

      // Obtener resumen de recibos generados (si existen)
      const { data: recibosData } = await supabase
        .from('recibos_alquiler')
        .select(`
          fecha_emision,
          importe_total_bruto,
          importe_total_gestion
        `)
        .gte('fecha_emision', new Date(new Date().getFullYear(), 0, 1).toISOString())

      if (recibosData && recibosData.length > 0) {
        const resumenPorMes = new Map<string, any>()
        
        recibosData.forEach(recibo => {
          const fecha = new Date(recibo.fecha_emision)
          const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`
          
          if (!resumenPorMes.has(clave)) {
            resumenPorMes.set(clave, {
              mes: fecha.getMonth() + 1,
              anio: fecha.getFullYear(),
              nombre_mes: fecha.toLocaleDateString('es-ES', { month: 'long' }),
              recibos_generados: 0,
              importe_bruto_total: 0,
              ganancias_total: 0
            })
          }
          
          const resumen = resumenPorMes.get(clave)
          resumen.recibos_generados++
          resumen.importe_bruto_total += recibo.importe_total_bruto || 0
          resumen.ganancias_total += recibo.importe_total_gestion || 0
        })

        gananciasCalculadas.resumen_mensual = Array.from(resumenPorMes.values())
          .sort((a, b) => b.anio - a.anio || b.mes - a.mes)
      }

      setEstadisticasGanancias(gananciasCalculadas)
    } catch (error) {
      console.error('Error calculando ganancias:', error)
      alert('Error al calcular las ganancias')
    } finally {
      setLoadingGanancias(false)
    }
  }

  const eliminarContrato = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este contrato? Esto también eliminará todas las relaciones con inquilinos.')) {
      return
    }

    try {
      // Primero eliminar las relaciones en contratos_inquilinos (se hace automáticamente por CASCADE)
      const { error } = await supabase
        .from('contratos_alquiler')
        .delete()
        .eq('id', id)

      if (error) throw error

      await cargarContratos()
    } catch (error) {
      console.error('Error eliminando contrato:', error)
      alert('Error al eliminar el contrato')
    }
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('contratos_alquiler')
        .update({ activo: !activo })
        .eq('id', id)

      if (error) throw error

      await cargarContratos()
    } catch (error) {
      console.error('Error actualizando contrato:', error)
      alert('Error al actualizar el estado del contrato')
    }
  }

  const columns: TableColumn<ContratoAlquiler>[] = [
    {
      key: 'vivienda',
      header: 'Vivienda',
      width: '20%',
      render: (contrato) => (
        <div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {contrato.viviendas?.direccion_completa}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {contrato.viviendas?.propietarios?.nombre_completo}
          </div>
        </div>
      )
    },
    {
      key: 'inquilinos',
      header: 'Inquilinos',
      width: '25%',
      render: (contrato) => {
        const inquilinos = contrato.inquilinos || []
        if (inquilinos.length === 0) {
          return <span className="text-sm text-gray-400">Sin inquilinos</span>
        }
        
        return (
          <div className="space-y-1">
            {inquilinos.map((inquilino, index) => {
              const esTitular = contrato.contratos_inquilinos?.find(ci => 
                ci.inquilino_id === inquilino.id && ci.es_titular
              )
              
              // Solo mostrar los primeros 2 inquilinos para ahorrar espacio
              if (index >= 2) {
                return null
              }
              
              return (
                <div key={inquilino.id} className="text-sm">
                  <div className="font-medium text-gray-900">
                    {inquilino.nombre_completo}
                    {esTitular && <span className="badge-info text-xs ml-1">Titular</span>}
                  </div>
                  <DniToggle dni={inquilino.dni} />
                </div>
              )
            })}
            {inquilinos.length > 2 && (
              <div className="text-xs text-gray-500">
                +{inquilinos.length - 2} más
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'fecha_inicio_contrato',
      header: 'Inicio',
      width: '10%',
      render: (contrato) => (
        <div className="text-sm text-gray-900">
          {formatFecha(contrato.fecha_inicio_contrato)}
        </div>
      )
    },
    {
      key: 'importe_alquiler_mensual',
      header: 'Alquiler',
      width: '10%',
      render: (contrato) => (
        <div className="text-sm font-medium text-gray-900">
          {formatEuros(contrato.importe_alquiler_mensual)}
        </div>
      )
    },
    {
      key: 'ganancias',
      header: 'Ganancia',
      width: '10%',
      render: (contrato) => {
        const porcentaje = contrato.viviendas?.propietarios?.porcentaje_gestion || 0
        const ganancia = contrato.importe_alquiler_mensual * (porcentaje / 100)
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {formatEuros(ganancia)}
            </div>
            <div className="text-xs text-gray-500">
              {porcentaje}%
            </div>
          </div>
        )
      }
    },
    {
      key: 'activo',
      header: 'Estado',
      width: '8%',
      render: (contrato) => (
        <span className={`badge-modern ${
          contrato.activo 
            ? 'badge-success' 
            : 'badge-danger'
        }`}>
          {contrato.activo ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'acciones',
      header: 'Acciones',
      width: '17%',
      render: (contrato) => (
        <div className="flex flex-col space-y-1 lg:flex-row lg:space-y-0 lg:space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/contratos/${contrato.id}/edit`)}
            className="text-xs px-2 py-1"
          >
            Editar
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => eliminarContrato(contrato.id)}
            className="text-xs px-2 py-1"
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
          <h1 className="text-3xl font-bold text-gray-900">Contratos de alquiler</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los contratos entre inquilinos y viviendas (ahora con soporte para múltiples inquilinos)
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setMostrarGanancias(!mostrarGanancias)}
          >
            {mostrarGanancias ? 'Ocultar' : 'Ver'} Ganancias
          </Button>
          <Link href="/contratos/new">
            <Button>
              Nuevo contrato
            </Button>
          </Link>
        </div>
      </div>

      {/* Sección de Ganancias */}
      {mostrarGanancias && (
        <div className="mb-8 space-y-6">
          {loadingGanancias ? (
            <div className="bg-white rounded-lg shadow p-6">
              <LoadingSpinner text="Calculando ganancias..." />
            </div>
          ) : estadisticasGanancias ? (
            <>
              {/* Resumen General */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-green-100 p-2 rounded-lg mr-3">💰</span>
                  Resumen de Ganancias por Gestión
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600">Ganancias Mensuales</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatEuros(estadisticasGanancias.total_ganancias_mes)}
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600">Ganancias Anuales (Est.)</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatEuros(estadisticasGanancias.total_ganancias_ano)}
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600">Propietarios Activos</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {estadisticasGanancias.ganancias_por_propietario.length}
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600">Contratos Activos</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {contratos.filter(c => c.activo).length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ganancias por Propietario */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ganancias por Propietario
                  </h3>
                </div>
                
                <div className="table-container">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Propietario</th>
                        <th className="text-center">Contratos</th>
                        <th className="text-center">% Gestión</th>
                        <th className="text-right">Alquiler Total</th>
                        <th className="text-right">Ganancia Mensual</th>
                        <th className="text-right">% Participación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticasGanancias.ganancias_por_propietario.map((item, index) => (
                        <tr key={item.propietario.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td>
                            <div className="font-medium text-gray-900">
                              {item.propietario.nombre_completo}
                            </div>
                            <DniToggle dni={item.propietario.dni_cif} />
                          </td>
                          <td className="text-center">
                            <span className="badge-info">
                              {item.contratos_activos}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="font-medium text-gray-900">
                              {item.propietario.porcentaje_gestion}%
                            </span>
                          </td>
                          <td className="text-right">
                            {formatEuros(item.importe_total_mensual)}
                          </td>
                          <td className="text-right">
                            <span className="font-bold text-gray-900">
                              {formatEuros(item.ganancias_mensuales)}
                            </span>
                          </td>
                          <td className="text-right text-gray-500">
                              {item.porcentaje_participacion.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumen Mensual de Recibos */}
              {estadisticasGanancias.resumen_mensual.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Histórico de Recibos Generados
                    </h3>
                  </div>
                  
                  <div className="table-container">
                    <table className="table-modern">
                      <thead>
                        <tr>
                          <th>Periodo</th>
                          <th className="text-center">Recibos</th>
                          <th className="text-right">Importe Bruto</th>
                          <th className="text-right">Ganancias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estadisticasGanancias.resumen_mensual.map((mes, index) => (
                          <tr key={`${mes.anio}-${mes.mes}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="font-medium">
                              {mes.nombre_mes} {mes.anio}
                            </td>
                            <td className="text-center">
                              <span className="badge-info">
                                {mes.recibos_generados}
                              </span>
                            </td>
                            <td className="text-right">
                              {formatEuros(mes.importe_bruto_total)}
                            </td>
                            <td className="text-right">
                              <span className="font-bold text-gray-900">
                                {formatEuros(mes.ganancias_total)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Cargando contratos..." />
      ) : (
        <>
          {contratos.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay contratos registrados
              </h3>
              <p className="text-gray-500 mb-4">
                Comienza creando tu primer contrato de alquiler
              </p>
              <Link href="/contratos/new">
                <Button>
                  Crear primer contrato
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <Table
                data={contratos}
                columns={columns}
                keyField="id"
                emptyMessage="No hay contratos que mostrar"
              />
              
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-700">
                    Total: <span className="font-medium">{contratos.length}</span> contratos
                    ({contratos.filter(c => c.activo).length} activos, {contratos.filter(c => !c.activo).length} inactivos)
                  </p>
                  
                  {contratos.filter(c => c.activo).length > 0 && (
                    <p className="text-sm text-green-700 font-medium">
                      Ganancias mensuales estimadas: <span className="font-bold">
                        {formatEuros(contratos
                          .filter(c => c.activo)
                          .reduce((sum, c) => {
                            const porcentaje = c.viviendas?.propietarios?.porcentaje_gestion || 0
                            return sum + (c.importe_alquiler_mensual * (porcentaje / 100))
                          }, 0)
                        )}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 