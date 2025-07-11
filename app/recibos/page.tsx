'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import SelectMejorado, { SelectOption } from '@/components/ui/SelectMejorado'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatFecha, formatEuros, ocultarDocumento, calcularImportesRecibo } from '@/lib/utils'
import { MESES, TIPOS_GASTOS, type GastoAdicionalForm } from '@/lib/types'
import { generateReceiptPdfFromPreview } from '@/lib/pdf-generator'
import DniToggle from '@/components/ui/DniToggle'

interface ContratoCompleto {
  id: string
  vivienda_id: string
  fecha_inicio_contrato: string
  fecha_fin_contrato?: string
  importe_alquiler_mensual: number
  activo: boolean
  viviendas: {
    id: string
    direccion_completa: string
    propietarios: {
      nombre_completo: string
      dni_cif: string
      telefono?: string
      email?: string
      porcentaje_gestion: number
    }
  }
  inquilinos: Array<{
    id: string
    nombre_completo: string
    dni: string
    telefono?: string
    email?: string
  }>
  contratos_inquilinos?: Array<{
    inquilino_id: string
    es_titular: boolean
  }>
}

interface MesSeleccionado {
  mes: number
  anio: number
  nombre_mes: string
  es_atrasado: boolean
}

interface ReciboPreview {
  contrato_id: string
  meses_seleccionados: MesSeleccionado[]
  fecha_emision: Date
  totales: {
    importe_total_bruto: number
    importe_total_gestion: number
    iva_total_gestion: number
    importe_total_neto: number
  }
  gastos_adicionales: GastoAdicionalForm[]
  totales_con_gastos: {
    total_gastos_adicionales: number
    total_gastos_deducibles: number
    total_gastos_no_deducibles: number
    importe_neto_final: number
  }
  forma_pago: string
  referencia_pago: string
  observaciones: string
  contrato: ContratoCompleto
  numero_recibo: string
}

export default function RecibosPage() {
  const [contratos, setContratos] = useState<ContratoCompleto[]>([])
  const [previewRecibos, setPreviewRecibos] = useState<ReciboPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [recibosExistentes, setRecibosExistentes] = useState<{[key: string]: boolean}>({})
  
  // Estados para generación simple
  const [contratosSeleccionados, setContratosSeleccionados] = useState<string[]>([])
  const [numeroMeses, setNumeroMeses] = useState<number>(1)
  const [mesInicial, setMesInicial] = useState<number>(new Date().getMonth() + 1)
  const [anioInicial, setAnioInicial] = useState<number>(new Date().getFullYear())
  const [mesesGenerados, setMesesGenerados] = useState<MesSeleccionado[]>([])
  const [gastosAdicionales, setGastosAdicionales] = useState<GastoAdicionalForm[]>([])
  const [formData, setFormData] = useState({
    forma_pago: 'transferencia',
    observaciones: '',
    numero_recibo: ''
  })

  useEffect(() => {
    fetchContratosActivos()
  }, [])

  useEffect(() => {
    if (contratosSeleccionados.length > 0) {
      generarMesesSecuencia()
      verificarRecibosExistentes()
    } else {
      setMesesGenerados([])
      setPreviewRecibos([])
      setRecibosExistentes({})
    }
  }, [contratosSeleccionados, numeroMeses, mesInicial, anioInicial])

  const verificarRecibosExistentes = async () => {
    if (!mesesGenerados.length) return
    
    try {
      const recibosMap: {[key: string]: boolean} = {}
      
      for (const mes of mesesGenerados) {
        const { data } = await supabase
          .from('recibos_detalle_meses')
          .select('recibo_id')
          .eq('mes', mes.mes)
          .eq('anio', mes.anio)
          .limit(1)

        const key = `${mes.mes}-${mes.anio}`
        recibosMap[key] = Boolean(data && data.length > 0)
      }

      setRecibosExistentes(recibosMap)
    } catch (error) {
      console.error('Error verificando recibos existentes:', error)
    }
  }

  const fetchContratosActivos = async () => {
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
              dni_cif,
              telefono,
              email,
              porcentaje_gestion
            )
          ),
          contratos_inquilinos (
            inquilino_id,
            es_titular,
            inquilinos (
              id,
              nombre_completo,
              dni,
              telefono,
              email
            )
          )
        `)
        .eq('activo', true)
        .order('fecha_inicio_contrato', { ascending: false })

      if (error) throw error

      // Transformar los datos
      const contratosTransformados = (data || []).map((contrato: any) => ({
        ...contrato,
        inquilinos: contrato.contratos_inquilinos?.map((ci: any) => ci.inquilinos).filter(Boolean) || []
      }))

      setContratos(contratosTransformados as ContratoCompleto[])
    } catch (error) {
      console.error('Error fetching contratos:', error)
      alert('Error al cargar los contratos activos')
    } finally {
      setLoading(false)
    }
  }

  const generarMesesSecuencia = () => {
    const mesesArray: MesSeleccionado[] = []
    
    for (let i = 0; i < numeroMeses; i++) {
      const fecha = new Date(anioInicial, mesInicial - 1 + i, 1)
      const mes = fecha.getMonth() + 1
      const anio = fecha.getFullYear()
      
      mesesArray.push({
        mes: mes,
        anio: anio,
        nombre_mes: MESES[mes - 1],
        es_atrasado: false // Por defecto no son atrasados, el usuario puede cambiar esto
      })
    }

    setMesesGenerados(mesesArray)
  }

  const toggleMesAtrasado = (index: number) => {
    const nuevosMeses = [...mesesGenerados]
    nuevosMeses[index].es_atrasado = !nuevosMeses[index].es_atrasado
    setMesesGenerados(nuevosMeses)
  }

  // Funciones para manejar gastos adicionales
  const agregarGastoAdicional = () => {
    setGastosAdicionales([...gastosAdicionales, {
      tipo_gasto: '',
      descripcion: '',
      importe: 0,
      es_deducible: true
    }])
  }

  const actualizarGastoAdicional = (index: number, campo: keyof GastoAdicionalForm, valor: any) => {
    const nuevosGastos = [...gastosAdicionales]
    if (campo === 'tipo_gasto') {
      nuevosGastos[index] = { ...nuevosGastos[index], [campo]: valor as string }
    } else if (campo === 'importe') {
      nuevosGastos[index] = { ...nuevosGastos[index], [campo]: Number(valor) }
    } else if (campo === 'es_deducible') {
      nuevosGastos[index] = { ...nuevosGastos[index], [campo]: Boolean(valor) }
    } else {
      nuevosGastos[index] = { ...nuevosGastos[index], [campo]: valor }
    }
    setGastosAdicionales(nuevosGastos)
  }

  const eliminarGastoAdicional = (index: number) => {
    const nuevosGastos = gastosAdicionales.filter((_, i) => i !== index)
    setGastosAdicionales(nuevosGastos)
  }

  const generatePreview = () => {
    if (contratosSeleccionados.length === 0 || mesesGenerados.length === 0) {
      alert('Debes seleccionar al menos un contrato y configurar los meses')
      return
    }

    if (!formData.numero_recibo) {
      alert('Debes introducir un número de recibo')
      return
    }

    const previews: ReciboPreview[] = []

    contratosSeleccionados.forEach((contratoId, index) => {
      const contrato = contratos.find(c => c.id === contratoId)
      if (!contrato) return

      // Calcular el número de recibo secuencial
      const numeroBase = parseInt(formData.numero_recibo)
      const numeroRecibo = `${(numeroBase + index).toString().padStart(formData.numero_recibo.length, '0')}25`

      // Calcular totales sumando todos los meses
      let totalBruto = 0
      let totalGestion = 0
      let totalIva = 0
      let totalNeto = 0

      mesesGenerados.forEach(mes => {
        const importes = calcularImportesRecibo(
          contrato.importe_alquiler_mensual,
          contrato.viviendas.propietarios.porcentaje_gestion
        )
        
        totalBruto += importes.importeBrutoPercibido
        totalGestion += importes.importeGestion
        totalIva += importes.ivaGestion
        totalNeto += importes.importeNetoPropietario
      })

      const mesesAtrasados = mesesGenerados.filter(m => m.es_atrasado).length
      let observaciones = formData.observaciones
      if (mesesAtrasados > 0) {
        observaciones += (observaciones ? ' | ' : '') + `Incluye ${mesesAtrasados} mes(es) atrasado(s)`
      }

      previews.push({
        contrato_id: contrato.id,
        meses_seleccionados: mesesGenerados,
        fecha_emision: new Date(),
        numero_recibo: numeroRecibo,
        totales: {
          importe_total_bruto: totalBruto,
          importe_total_gestion: totalGestion,
          iva_total_gestion: totalIva,
          importe_total_neto: totalNeto
        },
        gastos_adicionales: gastosAdicionales,
        totales_con_gastos: {
          total_gastos_adicionales: gastosAdicionales.reduce((sum, gasto) => sum + gasto.importe, 0),
          total_gastos_deducibles: gastosAdicionales.filter(g => g.es_deducible).reduce((sum, gasto) => sum + gasto.importe, 0),
          total_gastos_no_deducibles: gastosAdicionales.filter(g => !g.es_deducible).reduce((sum, gasto) => sum + gasto.importe, 0),
          importe_neto_final: totalNeto - gastosAdicionales.reduce((sum, gasto) => sum + gasto.importe, 0)
        },
        forma_pago: formData.forma_pago,
        referencia_pago: `ALQ-${contrato.id}-${Date.now()}`,
        observaciones,
        contrato
      })
    })

    setPreviewRecibos(previews)
  }

  const checkExistingRecibos = async (preview: ReciboPreview) => {
    try {
      const recibosExistentes = []
      
      for (const mes of preview.meses_seleccionados) {
        const { data } = await supabase
          .from('recibos_detalle_meses')
          .select(`
            recibo_id,
            recibos_alquiler!inner (
              contrato_id,
              numero_recibo,
              fecha_emision
            )
          `)
          .eq('mes', mes.mes)
          .eq('anio', mes.anio)
          .eq('recibos_alquiler.contrato_id', preview.contrato_id)

        if (data && data.length > 0) {
          const recibo = data[0] as any
          recibosExistentes.push({
            mes: mes.mes,
            anio: mes.anio,
            nombre_mes: mes.nombre_mes,
            numero_recibo: recibo.recibos_alquiler.numero_recibo,
            fecha_emision: recibo.recibos_alquiler.fecha_emision
          })
        }
      }

      return recibosExistentes
    } catch (error) {
      console.error('Error verificando recibos existentes:', error)
      return []
    }
  }

  const generateRecibo = async (preview: ReciboPreview) => {
    try {
      setGenerating(true)

      // Verificar si ya existe
      const existingError = await checkExistingRecibos(preview)
      if (existingError.length > 0) {
        alert(`Ya existe un recibo para los siguientes meses:\n\n${existingError.map(r => `${r.nombre_mes} ${r.anio} (Número: ${r.numero_recibo}, Fecha: ${formatFecha(r.fecha_emision)})`).join('\n')}\n\nPor favor, ajusta los meses seleccionados o el número de recibo base.`)
        return
      }

      // Usar el número de recibo introducido
      const numeroRecibo = preview.numero_recibo
      
      // Crear recibo principal
      const { data: reciboCreado, error: reciboError } = await supabase
        .from('recibos_alquiler')
        .insert({
          contrato_id: preview.contrato_id,
          numero_recibo: numeroRecibo,
          fecha_emision: preview.fecha_emision.toISOString(),
          importe_total_bruto: preview.totales.importe_total_bruto,
          importe_total_gestion: preview.totales.importe_total_gestion,
          iva_total_gestion: preview.totales.iva_total_gestion,
          importe_total_neto_propietario: preview.totales.importe_total_neto,
          forma_pago_inquilino: preview.forma_pago,
          referencia_pago_inquilino: preview.referencia_pago,
          observaciones: preview.observaciones,
          generado: true
        })
        .select()
        .single()

      if (reciboError) {
        console.error('Error creating recibo:', reciboError)
        alert('Error al crear el recibo')
        return
      }

      // Crear detalles de meses
      const detallesMeses = preview.meses_seleccionados.map(mes => {
        const importes = calcularImportesRecibo(
          preview.contrato.importe_alquiler_mensual,
          preview.contrato.viviendas.propietarios.porcentaje_gestion
        )
        
        return {
          recibo_id: reciboCreado.id,
          mes: mes.mes,
          anio: mes.anio,
          importe_mes: importes.importeBrutoPercibido,
          importe_gestion_mes: importes.importeGestion,
          iva_gestion_mes: importes.ivaGestion,
          importe_neto_mes: importes.importeNetoPropietario,
          es_mes_atrasado: mes.es_atrasado
        }
      })

      const { error: detalleError } = await supabase
        .from('recibos_detalle_meses')
        .insert(detallesMeses)

      if (detalleError) {
        console.error('Error creating detalle meses:', detalleError)
        alert('Error al crear los detalles del recibo')
        return
      }

      // Generar PDF
      const pdfBlob: Blob = await generateReceiptPdfFromPreview(preview)
      
      // Descargar PDF
      const inquilinosNombres = preview.contrato.inquilinos.map(i => i.nombre_completo)
      const rangoMeses = preview.meses_seleccionados.length === 1 
        ? `${preview.meses_seleccionados[0].nombre_mes}-${preview.meses_seleccionados[0].anio}`
        : `${preview.meses_seleccionados[0].nombre_mes}-${preview.meses_seleccionados[preview.meses_seleccionados.length - 1].nombre_mes}-${preview.meses_seleccionados[0].anio}`
      
      const fileName = `${numeroRecibo}_${preview.contrato.viviendas.direccion_completa.replace(/[^a-zA-Z0-9]/g, '_')}_${inquilinosNombres.join('_').replace(/[^a-zA-Z0-9]/g, '_')}_${rangoMeses}.pdf`
      
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Recibo generado y descargado exitosamente')
      
      // Limpiar formulario
      setNumeroMeses(1)
      setMesInicial(new Date().getMonth() + 1)
      setAnioInicial(new Date().getFullYear())
      setMesesGenerados([])
      setContratosSeleccionados([])
      setPreviewRecibos([])
      setGastosAdicionales([])
      setFormData({
        forma_pago: 'transferencia',
        observaciones: '',
        numero_recibo: ''
      })

    } catch (error) {
      console.error('Error generating recibo:', error)
      alert('Error al generar el recibo')
    } finally {
      setGenerating(false)
    }
  }

  const getInquilinosDisplay = (contrato: ContratoCompleto) => {
    if (!contrato.inquilinos || contrato.inquilinos.length === 0) {
      return {
        principal: 'Sin inquilinos',
        dni: '',
        secundarios: ''
      }
    }

    const titular = contrato.inquilinos.find(i => 
      contrato.contratos_inquilinos?.find(ci => 
        ci.inquilino_id === i.id && ci.es_titular
      )
    ) || contrato.inquilinos[0]
    
    const otros = contrato.inquilinos.filter(i => i.id !== titular.id)
    
    return {
      principal: titular.nombre_completo,
      dni: titular.dni,
      secundarios: otros.length > 0 ? `+${otros.length} más` : ''
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Generar Recibos de Alquiler
        </h1>
        <p className="text-gray-600">
          Selecciona un contrato y los meses para generar el recibo correspondiente
        </p>
      </div>

      {/* Selector de Contrato */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Seleccionar Contratos
        </h2>
        
        <SelectMejorado
          label="Contratos"
          value=""
          onChange={(value: string) => {
            if (value && !contratosSeleccionados.includes(value)) {
              setContratosSeleccionados(prev => [...prev, value])
            }
          }}
          placeholder="Buscar y seleccionar contratos..."
          searchable
          options={contratos
            .filter(contrato => !contratosSeleccionados.includes(contrato.id))
            .map(contrato => {
              const inquilinosInfo = getInquilinosDisplay(contrato)
              const propietario = contrato.viviendas.propietarios
              const searchText = `${contrato.viviendas.direccion_completa} ${inquilinosInfo.principal} ${inquilinosInfo.secundarios} ${propietario.nombre_completo} ${propietario.dni_cif} ${inquilinosInfo.dni}`.toLowerCase()
              return {
                value: contrato.id,
                label: `${contrato.viviendas.direccion_completa} - ${inquilinosInfo.principal} ${inquilinosInfo.secundarios}`,
                searchText
              } as SelectOption & { searchText: string }
            })}
        />

        {/* Contratos seleccionados */}
        {contratosSeleccionados.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Contratos seleccionados ({contratosSeleccionados.length})
            </h3>
            <div className="space-y-2">
              {contratosSeleccionados.map(contratoId => {
                const contrato = contratos.find(c => c.id === contratoId)
                if (!contrato) return null
                
                const inquilinosInfo = getInquilinosDisplay(contrato)
                
                return (
                  <div
                    key={contratoId}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {contrato.viviendas.direccion_completa}
                      </div>
                      <div className="text-sm text-gray-600">
                        {inquilinosInfo.principal} {inquilinosInfo.secundarios}
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        {formatEuros(contrato.importe_alquiler_mensual)}/mes
                      </div>
                    </div>
                    <button
                      onClick={() => setContratosSeleccionados(prev => prev.filter(id => id !== contratoId))}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Configuración del Recibo */}
      {contratosSeleccionados.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Configuración del Recibo
            </h2>
            <div className="text-sm text-gray-500">
              Paso 2 de 3
            </div>
          </div>

          {/* Información del recibo */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-semibold text-blue-900">Información del Recibo</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Contratos:</span>
                <p className="text-blue-800">{contratosSeleccionados.length} seleccionado(s)</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Importe máximo:</span>
                <p className="text-blue-800 font-semibold">
                  {formatEuros(Math.max(...contratosSeleccionados.map(id => 
                    contratos.find(c => c.id === id)?.importe_alquiler_mensual || 0
                  )))}
                </p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Total estimado:</span>
                <p className="text-blue-800 font-semibold">
                  {formatEuros(contratosSeleccionados.reduce((sum, id) => {
                    const contrato = contratos.find(c => c.id === id)
                    return sum + (contrato?.importe_alquiler_mensual || 0)
                  }, 0) * numeroMeses)}
                </p>
              </div>
            </div>
          </div>

          {/* Configuración principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Columna izquierda - Datos del recibo */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Datos del Recibo
                </h3>
                
                <div className="space-y-4">
                                      <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Recibo Base
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={formData.numero_recibo}
                          onChange={(e) => setFormData({...formData, numero_recibo: e.target.value})}
                          placeholder="001"
                          className="flex-1 rounded-l-md border border-r-0 border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="bg-gray-100 px-3 py-2 rounded-r-md border border-gray-300 text-gray-700 font-medium">
                          25
                        </span>
                      </div>
                      {contratosSeleccionados.length > 1 && formData.numero_recibo && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <div className="flex items-center text-yellow-800">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Se generarán {contratosSeleccionados.length} recibos numerados secuencialmente
                          </div>
                          <div className="mt-1 text-yellow-700">
                            Desde: <span className="font-mono">{formData.numero_recibo}25</span> hasta: <span className="font-mono">{(parseInt(formData.numero_recibo) + contratosSeleccionados.length - 1).toString().padStart(formData.numero_recibo.length, '0')}25</span>
                          </div>
                        </div>
                      )}
                    </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Forma de Pago
                    </label>
                    <select
                      value={formData.forma_pago}
                      onChange={(e) => setFormData({...formData, forma_pago: e.target.value})}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="transferencia">💳 Transferencia Bancaria</option>
                      <option value="efectivo">💵 Efectivo</option>
                      <option value="cheque">📄 Cheque</option>
                      <option value="domiciliacion">🏦 Domiciliación Bancaria</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Observaciones adicionales para el recibo..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Configuración de meses */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Período del Recibo
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Meses
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={numeroMeses}
                        onChange={(e) => setNumeroMeses(parseInt(e.target.value))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Año
                      </label>
                      <input
                        type="number"
                        min="2020"
                        max="2030"
                        value={anioInicial}
                        onChange={(e) => setAnioInicial(parseInt(e.target.value))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mes Inicial
                    </label>
                    <select
                      value={mesInicial}
                      onChange={(e) => setMesInicial(parseInt(e.target.value))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {MESES.map((mes, index) => (
                        <option key={mes} value={index + 1}>
                          {mes}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Vista previa de meses */}
              {mesesGenerados.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Meses a Incluir
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {mesesGenerados.map((mes, index) => {
                      const reciboExistente = recibosExistentes[`${mes.mes}-${mes.anio}`]
                      return (
                        <div
                          key={`${mes.anio}-${mes.mes}`}
                          className={`p-2 rounded-lg border text-sm ${
                            mes.es_atrasado
                              ? 'border-red-300 bg-red-50 text-red-800'
                              : 'border-blue-300 bg-blue-50 text-blue-800'
                          }`}
                        >
                          <div className="font-medium flex items-center justify-between">
                            <span>{mes.nombre_mes} {mes.anio}</span>
                            {reciboExistente && (
                              <span className="px-1 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                                ⚠️
                              </span>
                            )}
                          </div>
                          {mes.es_atrasado && (
                            <div className="text-xs text-red-600 mt-1">
                              Mes atrasado
                            </div>
                          )}
                          {reciboExistente && (
                            <div className="text-xs text-yellow-700 mt-1">
                              Ya existe recibo
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gastos Adicionales */}
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Gastos Adicionales
              </h3>
              <Button
                onClick={agregarGastoAdicional}
                variant="outline"
                className="text-sm"
              >
                + Agregar Gasto
              </Button>
            </div>

            {gastosAdicionales.length > 0 && (
              <div className="space-y-3">
                {gastosAdicionales.map((gasto, index) => (
                  <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <SelectMejorado
                          label="Tipo de Gasto"
                          value={gasto.tipo_gasto}
                          onChange={(value) => actualizarGastoAdicional(index, 'tipo_gasto', value as string)}
                          placeholder="Seleccionar tipo..."
                          searchable
                          options={TIPOS_GASTOS.map(tipo => ({
                            value: tipo,
                            label: tipo
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Importe
                        </label>
                        <input
                          type="number"
                          value={gasto.importe}
                          onChange={(e) => actualizarGastoAdicional(index, 'importe', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descripción (opcional)
                        </label>
                        <input
                          type="text"
                          value={gasto.descripcion || ''}
                          onChange={(e) => actualizarGastoAdicional(index, 'descripcion', e.target.value)}
                          placeholder="Detalle del gasto..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-end space-x-2">
                        <div className="flex-1">
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={gasto.es_deducible}
                              onChange={(e) => actualizarGastoAdicional(index, 'es_deducible', e.target.checked)}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="text-gray-700">Deducible</span>
                          </label>
                        </div>
                        <Button
                          onClick={() => eliminarGastoAdicional(index)}
                          variant="danger"
                          className="px-3 py-1 text-sm"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Total:</span> {formatEuros(gasto.importe)} 
                      {gasto.es_deducible ? ' (Deducible)' : ' (No deducible)'}
                    </div>
                  </div>
                ))}

                {/* Resumen de gastos adicionales */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <span className="font-medium">Total gastos:</span> {formatEuros(gastosAdicionales.reduce((sum, g) => sum + g.importe, 0))}
                      </div>
                      <div>
                        <span className="font-medium">Deducibles:</span> {formatEuros(gastosAdicionales.filter(g => g.es_deducible).reduce((sum, g) => sum + g.importe, 0))}
                      </div>
                      <div>
                        <span className="font-medium">No deducibles:</span> {formatEuros(gastosAdicionales.filter(g => !g.es_deducible).reduce((sum, g) => sum + g.importe, 0))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {gastosAdicionales.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <p>No hay gastos adicionales. Haz clic en "Agregar Gasto" para añadir uno.</p>
              </div>
            )}
          </div>

          {/* Botón de vista previa */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={generatePreview}
              variant="outline"
              disabled={numeroMeses === 0 || mesesGenerados.length === 0 || !formData.numero_recibo}
              className="px-8 py-3 text-lg"
            >
              {!formData.numero_recibo ? 'Introduce un número de recibo' : 'Generar Vista Previa'}
            </Button>
          </div>
        </div>
      )}

      {/* Vista Previa del Recibo */}
      {previewRecibos.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Vista Previa del Recibo
            </h2>
            {previewRecibos.length > 1 && (
              <Button
                onClick={async () => {
                  setGenerating(true)
                  try {
                    for (const preview of previewRecibos) {
                      await generateRecibo(preview)
                      // Pequeña pausa entre descargas para evitar saturar el navegador
                      await new Promise(resolve => setTimeout(resolve, 500))
                    }
                  } catch (error) {
                    console.error('Error generando recibos:', error)
                    alert('Error al generar algunos recibos')
                  } finally {
                    setGenerating(false)
                  }
                }}
                disabled={generating}
                className="bg-green-600 hover:bg-green-700"
              >
                {generating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Generando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar Todos ({previewRecibos.length})
                  </>
                )}
              </Button>
            )}
          </div>
          
          {previewRecibos.map((preview, index) => {
            const inquilinos = getInquilinosDisplay(preview.contrato)
            const mesesAtrasados = preview.meses_seleccionados.filter(m => m.es_atrasado).length
            
            return (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Inquilino(s)</h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {inquilinos.principal} {inquilinos.secundarios}
                    </p>
                    {inquilinos.dni && (
                      <DniToggle dni={inquilinos.dni} />
                    )}
                    <p className="text-xs text-gray-500">
                      Propietario: {preview.contrato.viviendas.propietarios.nombre_completo}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">Vivienda</h3>
                    <p className="text-sm text-gray-600">
                      {preview.contrato.viviendas.direccion_completa}
                    </p>
                  </div>
                </div>

                {/* Verificar recibos existentes para este contrato */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Meses Incluidos</h3>
                    <button
                      onClick={async () => {
                        const existentes = await checkExistingRecibos(preview)
                        if (existentes.length > 0) {
                          alert(`Recibos existentes para este contrato:\n\n${existentes.map(r => `${r.nombre_mes} ${r.anio} (Número: ${r.numero_recibo})`).join('\n')}`)
                        } else {
                          alert('No hay recibos existentes para este contrato en los meses seleccionados')
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Verificar recibos existentes
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preview.meses_seleccionados.map(mes => (
                      <span 
                        key={`${mes.anio}-${mes.mes}`}
                        className={`px-2 py-1 rounded text-xs ${
                          mes.es_atrasado 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {mes.nombre_mes} {mes.anio} {mes.es_atrasado && '(Atrasado)'}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Importe Bruto</h4>
                    <p className="text-lg font-bold text-gray-900">
                      {formatEuros(preview.totales.importe_total_bruto)}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Gestión</h4>
                    <p className="text-lg font-bold text-orange-600">
                      {formatEuros(preview.totales.importe_total_gestion)}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">IVA Gestión</h4>
                    <p className="text-lg font-bold text-orange-600">
                      {formatEuros(preview.totales.iva_total_gestion)}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Neto Propietario</h4>
                    <p className="text-lg font-bold text-green-600">
                      {formatEuros(preview.totales.importe_total_neto)}
                    </p>
                  </div>
                </div>

                {/* Gastos adicionales en vista previa */}
                {preview.gastos_adicionales.length > 0 && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Gastos Adicionales:</h4>
                    <div className="space-y-2 mb-3">
                      {preview.gastos_adicionales.map((gasto, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">
                            {gasto.tipo_gasto}
                            {gasto.descripcion && ` - ${gasto.descripcion}`}
                            {!gasto.es_deducible && ' (No deducible)'}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatEuros(gasto.importe)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-yellow-300 pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Total gastos:</span>
                          <p className="text-lg font-bold text-red-600">
                            -{formatEuros(preview.totales_con_gastos.total_gastos_adicionales)}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Gastos deducibles:</span>
                          <p className="text-sm text-green-700">
                            {formatEuros(preview.totales_con_gastos.total_gastos_deducibles)}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Neto final:</span>
                          <p className="text-lg font-bold text-blue-600">
                            {formatEuros(preview.totales_con_gastos.importe_neto_final)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {preview.observaciones && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <span className="font-medium">Observaciones:</span> {preview.observaciones}
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    onClick={() => generateRecibo(preview)}
                    disabled={generating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {generating ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Generando...
                      </>
                    ) : (
                      'Generar y Descargar Recibo'
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}



      {/* Mensaje cuando no hay contratos activos */}
      {!loading && contratos.length === 0 && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay contratos activos
          </h3>
          <p className="text-gray-500">
            Necesitas tener contratos activos para generar recibos
          </p>
        </div>
      )}
    </div>
  )
} 