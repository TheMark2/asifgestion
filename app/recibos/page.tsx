'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import SelectMejorado, { SelectOption } from '@/components/ui/SelectMejorado'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatFecha, formatEuros, calcularImportesRecibo } from '@/lib/utils'
import { MESES, TIPOS_GASTOS, type GastoAdicionalForm } from '@/lib/types'
import { generateReceiptPdfFromPreview } from '@/lib/pdf-generator'
import DniToggle from '@/components/ui/DniToggle'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

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
      id: string
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

interface Propietario {
  id: string
  nombre_completo: string
  dni_cif: string
  contratos: ContratoCompleto[]
}

interface MesSeleccionado {
  mes: number
  anio: number
  nombre_mes: string
  es_atrasado: boolean
}

interface ContratoConPeriodo {
  contrato: ContratoCompleto
  meses_seleccionados: MesSeleccionado[]
  periodo_personalizado: {
    mes_inicio: number
    anio_inicio: number
    numero_meses: number
  }
  gastos_adicionales?: GastoAdicionalForm[]
}

interface ReciboPreview {
  contratos: ContratoConPeriodo[]
  propietario: Propietario
  fecha_emision: Date
  totales: {
    importe_total_bruto: number
    importe_total_gestion: number
    iva_total_gestion: number
    importe_total_neto: number
  }
  totales_con_gastos: {
    total_gastos_adicionales: number
    total_gastos_deducibles: number
    total_gastos_no_deducibles: number
    importe_neto_final: number
  }
  forma_pago: string
  referencia_pago: string
  observaciones: string
  numero_recibo: string
}

type ModoSeleccion = 'contratos' | 'propietarios'

export default function RecibosPage() {
  const [contratos, setContratos] = useState<ContratoCompleto[]>([])
  const [propietarios, setPropietarios] = useState<Propietario[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  
  // Estados para el modo de selección
  const [modoSeleccion, setModoSeleccion] = useState<ModoSeleccion>('contratos')
  
  // Estados para selección por contratos individuales
  const [contratosSeleccionados, setContratosSeleccionados] = useState<ContratoConPeriodo[]>([])
  
  // Estados para selección por propietario
  const [propietarioSeleccionado, setPropietarioSeleccionado] = useState<Propietario | null>(null)
  const [contratosDelPropietario, setContratosDelPropietario] = useState<ContratoConPeriodo[]>([])
  
  // Estados para vista previa y formulario
  const [previewRecibo, setPreviewRecibo] = useState<ReciboPreview | null>(null)
  const [formData, setFormData] = useState({
    forma_pago: 'transferencia',
    observaciones: '',
    numero_recibo: ''
  })

  useEffect(() => {
    fetchContratosYPropietarios()
  }, [])

  const fetchContratosYPropietarios = async () => {
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
              id,
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

      // Transformar contratos
      const contratosTransformados = (data || []).map((contrato: any) => ({
        ...contrato,
        inquilinos: contrato.contratos_inquilinos?.map((ci: any) => ci.inquilinos).filter(Boolean) || []
      }))

      setContratos(contratosTransformados)

      // Agrupar por propietarios
      const propietariosMap = new Map<string, Propietario>()
      contratosTransformados.forEach(contrato => {
        const prop = contrato.viviendas.propietarios
        if (!propietariosMap.has(prop.id)) {
          propietariosMap.set(prop.id, {
            id: prop.id,
            nombre_completo: prop.nombre_completo,
            dni_cif: prop.dni_cif,
            contratos: []
          })
        }
        propietariosMap.get(prop.id)!.contratos.push(contrato)
      })

      setPropietarios(Array.from(propietariosMap.values()))

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // Función para calcular meses basado en inicio y número de meses
  const calcularMeses = (mesInicio: number, anioInicio: number, numeroMeses: number): MesSeleccionado[] => {
    const meses: MesSeleccionado[] = []
    let mesActual = mesInicio
    let anioActual = anioInicio
    const fechaHoy = new Date()
    const mesHoy = fechaHoy.getMonth() + 1
    const anioHoy = fechaHoy.getFullYear()

    for (let i = 0; i < numeroMeses; i++) {
      const esAtrasado = anioActual < anioHoy || (anioActual === anioHoy && mesActual < mesHoy)
      
      meses.push({
        mes: mesActual,
        anio: anioActual,
        nombre_mes: MESES[mesActual - 1] || '',
        es_atrasado: esAtrasado
      })

      mesActual++
      if (mesActual > 12) {
        mesActual = 1
        anioActual++
      }
    }

    return meses
  }

  // Agregar contrato individual
  const agregarContrato = (contratoId: string) => {
    const contrato = contratos.find(c => c.id === contratoId)
    if (!contrato) return

    const nuevoPeriodo: ContratoConPeriodo = {
      contrato,
      meses_seleccionados: calcularMeses(new Date().getMonth() + 1, new Date().getFullYear(), 1),
      periodo_personalizado: {
        mes_inicio: new Date().getMonth() + 1,
        anio_inicio: new Date().getFullYear(),
        numero_meses: 1
      },
      gastos_adicionales: []
    }

    setContratosSeleccionados(prev => [...prev, nuevoPeriodo])
  }

  // Actualizar período de un contrato
  const actualizarPeriodoContrato = (index: number, campo: string, valor: any) => {
    setContratosSeleccionados(prev => {
      const nuevosContratos = [...prev]
      const contrato = { ...nuevosContratos[index] }
      
      contrato.periodo_personalizado = {
        ...contrato.periodo_personalizado,
        [campo]: valor
      }

      // Recalcular meses
      contrato.meses_seleccionados = calcularMeses(
        contrato.periodo_personalizado.mes_inicio,
        contrato.periodo_personalizado.anio_inicio,
        contrato.periodo_personalizado.numero_meses
      )

      nuevosContratos[index] = contrato
      return nuevosContratos
    })
  }

  // Seleccionar propietario
  const seleccionarPropietario = (propietario: Propietario) => {
    setPropietarioSeleccionado(propietario)
    
    // Crear contratos con períodos por defecto
    const contratosConPeriodos = propietario.contratos.map(contrato => ({
      contrato,
      meses_seleccionados: calcularMeses(new Date().getMonth() + 1, new Date().getFullYear(), 1),
      periodo_personalizado: {
        mes_inicio: new Date().getMonth() + 1,
        anio_inicio: new Date().getFullYear(),
        numero_meses: 1
      },
      gastos_adicionales: []
    }))

    setContratosDelPropietario(contratosConPeriodos)
  }

  // Actualizar período para propietario
  const actualizarPeriodoPropietario = (index: number, campo: string, valor: any) => {
    setContratosDelPropietario(prev => {
      const nuevosContratos = [...prev]
      const contrato = { ...nuevosContratos[index] }
      
      contrato.periodo_personalizado = {
        ...contrato.periodo_personalizado,
        [campo]: valor
      }

      // Recalcular meses
      contrato.meses_seleccionados = calcularMeses(
        contrato.periodo_personalizado.mes_inicio,
        contrato.periodo_personalizado.anio_inicio,
        contrato.periodo_personalizado.numero_meses
      )

      nuevosContratos[index] = contrato
      return nuevosContratos
    })
  }

  // Generar vista previa
  const generarVistaPrevia = () => {
    const contratosParaRecibo = modoSeleccion === 'contratos' ? contratosSeleccionados : contratosDelPropietario
    
    if (contratosParaRecibo.length === 0) {
      alert('Selecciona al menos un contrato')
      return
    }

    // Calcular totales
    let importe_total_bruto = 0
    let importe_total_gestion = 0
    let iva_total_gestion = 0
    let importe_total_neto = 0

    contratosParaRecibo.forEach(({ contrato, meses_seleccionados }) => {
      meses_seleccionados.forEach(() => {
        const importes = calcularImportesRecibo(
          contrato.importe_alquiler_mensual,
          contrato.viviendas.propietarios.porcentaje_gestion
        )
        
        importe_total_bruto += importes.importeBrutoPercibido
        importe_total_gestion += importes.importeGestion
        iva_total_gestion += importes.ivaGestion
        importe_total_neto += importes.importeNetoPropietario
      })
    })

    // Calcular gastos adicionales de todos los contratos
    let total_gastos_deducibles = 0
    let total_gastos_no_deducibles = 0
    
    contratosParaRecibo.forEach(({ gastos_adicionales }) => {
      if (gastos_adicionales) {
        gastos_adicionales.forEach(gasto => {
          if (gasto.es_deducible) {
            total_gastos_deducibles += gasto.importe
          } else {
            total_gastos_no_deducibles += gasto.importe
          }
        })
      }
    })
    
    const total_gastos_adicionales = total_gastos_deducibles + total_gastos_no_deducibles
    const importe_neto_final = importe_total_neto - total_gastos_deducibles

    const propietario = modoSeleccion === 'propietarios' 
      ? propietarioSeleccionado!
      : {
          id: contratosParaRecibo[0].contrato.viviendas.propietarios.id,
          nombre_completo: contratosParaRecibo[0].contrato.viviendas.propietarios.nombre_completo,
          dni_cif: contratosParaRecibo[0].contrato.viviendas.propietarios.dni_cif,
          contratos: contratosParaRecibo.map(cp => cp.contrato)
        }

    const preview: ReciboPreview = {
      contratos: contratosParaRecibo,
      propietario,
      fecha_emision: new Date(),
      numero_recibo: formData.numero_recibo || `REC-${new Date().getFullYear()}-${Date.now()}`,
      totales: {
        importe_total_bruto,
        importe_total_gestion,
        iva_total_gestion,
        importe_total_neto
      },
      totales_con_gastos: {
        total_gastos_adicionales,
        total_gastos_deducibles,
        total_gastos_no_deducibles,
        importe_neto_final
      },
      forma_pago: formData.forma_pago,
      referencia_pago: '',
      observaciones: formData.observaciones
    }

    setPreviewRecibo(preview)
  }

  // Funciones para gastos adicionales por contrato
  const agregarGastoContrato = (contratoIndex: number, esSeleccionIndividual: boolean) => {
    const nuevoGasto: GastoAdicionalForm = {
      tipo_gasto: 'Otros',
      importe: 0,
      descripcion: '',
      es_deducible: true
    }

    if (esSeleccionIndividual) {
      setContratosSeleccionados(prev => {
        const nuevosContratos = [...prev]
        nuevosContratos[contratoIndex] = {
          ...nuevosContratos[contratoIndex],
          gastos_adicionales: [...(nuevosContratos[contratoIndex].gastos_adicionales || []), nuevoGasto]
        }
        return nuevosContratos
      })
    } else {
      setContratosDelPropietario(prev => {
        const nuevosContratos = [...prev]
        nuevosContratos[contratoIndex] = {
          ...nuevosContratos[contratoIndex],
          gastos_adicionales: [...(nuevosContratos[contratoIndex].gastos_adicionales || []), nuevoGasto]
        }
        return nuevosContratos
      })
    }
  }

  const actualizarGastoContrato = (contratoIndex: number, gastoIndex: number, campo: string, valor: any, esSeleccionIndividual: boolean) => {
    if (esSeleccionIndividual) {
      setContratosSeleccionados(prev => {
        const nuevosContratos = [...prev]
        const gastosActuales = [...(nuevosContratos[contratoIndex].gastos_adicionales || [])]
        gastosActuales[gastoIndex] = { ...gastosActuales[gastoIndex], [campo]: valor }
        nuevosContratos[contratoIndex] = {
          ...nuevosContratos[contratoIndex],
          gastos_adicionales: gastosActuales
        }
        return nuevosContratos
      })
    } else {
      setContratosDelPropietario(prev => {
        const nuevosContratos = [...prev]
        const gastosActuales = [...(nuevosContratos[contratoIndex].gastos_adicionales || [])]
        gastosActuales[gastoIndex] = { ...gastosActuales[gastoIndex], [campo]: valor }
        nuevosContratos[contratoIndex] = {
          ...nuevosContratos[contratoIndex],
          gastos_adicionales: gastosActuales
        }
        return nuevosContratos
      })
    }
  }

  const eliminarGastoContrato = (contratoIndex: number, gastoIndex: number, esSeleccionIndividual: boolean) => {
    if (esSeleccionIndividual) {
      setContratosSeleccionados(prev => {
        const nuevosContratos = [...prev]
        const gastosActuales = [...(nuevosContratos[contratoIndex].gastos_adicionales || [])]
        gastosActuales.splice(gastoIndex, 1)
        nuevosContratos[contratoIndex] = {
          ...nuevosContratos[contratoIndex],
          gastos_adicionales: gastosActuales
        }
        return nuevosContratos
      })
    } else {
      setContratosDelPropietario(prev => {
        const nuevosContratos = [...prev]
        const gastosActuales = [...(nuevosContratos[contratoIndex].gastos_adicionales || [])]
        gastosActuales.splice(gastoIndex, 1)
        nuevosContratos[contratoIndex] = {
          ...nuevosContratos[contratoIndex],
          gastos_adicionales: gastosActuales
        }
        return nuevosContratos
      })
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

  // Función para descargar PDF
  const descargarPDF = async () => {
    if (!previewRecibo) return
    
    try {
      setGenerating(true)
      const blob = await generateReceiptPdfFromPreview(previewRecibo)
      
      // Crear URL del blob y descargar
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-${previewRecibo.numero_recibo}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar el PDF')
    } finally {
      setGenerating(false)
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
          Selecciona contratos individuales o todos los contratos de un propietario
        </p>
      </div>

      {/* Selector de modo */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Modo de Generación
        </h2>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => {
              setModoSeleccion('contratos')
              setContratosSeleccionados([])
              setPropietarioSeleccionado(null)
              setPreviewRecibo(null)
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              modoSeleccion === 'contratos'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Por Contratos Individuales
          </button>
          <button
            onClick={() => {
              setModoSeleccion('propietarios')
              setContratosSeleccionados([])
              setPropietarioSeleccionado(null)
              setPreviewRecibo(null)
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              modoSeleccion === 'propietarios'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Por Propietario (Todos sus contratos)
          </button>
        </div>

        {/* Selección por contratos individuales */}
        {modoSeleccion === 'contratos' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Seleccionar Contratos Individuales
            </h3>
            
            <SelectMejorado
              label="Buscar y agregar contratos"
              value=""
              onChange={(value: string) => {
                if (value && !contratosSeleccionados.some(cs => cs.contrato.id === value)) {
                  agregarContrato(value)
                }
              }}
              placeholder="Buscar contratos..."
              searchable
              options={contratos
                .filter(contrato => !contratosSeleccionados.some(cs => cs.contrato.id === contrato.id))
                .map(contrato => {
                  const inquilinosInfo = getInquilinosDisplay(contrato)
                  const propietario = contrato.viviendas.propietarios
                  return {
                    value: contrato.id,
                    label: `${contrato.viviendas.direccion_completa} - ${inquilinosInfo.principal} (${propietario.nombre_completo})`
                  }
                })}
            />

            {/* Contratos seleccionados con configuración de período */}
            {contratosSeleccionados.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="font-medium text-gray-900">
                  Contratos Seleccionados ({contratosSeleccionados.length})
                </h4>
                {contratosSeleccionados.map((contratoConPeriodo, index) => {
                  const { contrato, periodo_personalizado, meses_seleccionados } = contratoConPeriodo
                  const inquilinosInfo = getInquilinosDisplay(contrato)
                  
                  return (
                    <div key={contrato.id} className="border rounded-lg p-4 bg-blue-50">
                      {/* Información del contrato */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{contrato.viviendas.direccion_completa}</h5>
                          <p className="text-sm text-gray-600">
                            {inquilinosInfo.principal} {inquilinosInfo.secundarios}
                          </p>
                          <p className="text-sm font-medium text-green-600">
                            {formatEuros(contrato.importe_alquiler_mensual)}/mes
                          </p>
                        </div>
                        <button
                          onClick={() => setContratosSeleccionados(prev => prev.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Configuración del período */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mes de inicio
                          </label>
                          <Select
                            value={periodo_personalizado.mes_inicio.toString()}
                            onChange={(e) => actualizarPeriodoContrato(index, 'mes_inicio', parseInt(e.target.value))}
                            options={MESES.map((mes, idx) => ({ value: (idx + 1).toString(), label: mes }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Año de inicio
                          </label>
                          <Select
                            value={periodo_personalizado.anio_inicio.toString()}
                            onChange={(e) => actualizarPeriodoContrato(index, 'anio_inicio', parseInt(e.target.value))}
                            options={[
                              { value: '2023', label: '2023' },
                              { value: '2024', label: '2024' },
                              { value: '2025', label: '2025' },
                              { value: '2026', label: '2026' }
                            ]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número de meses
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="12"
                            value={periodo_personalizado.numero_meses}
                            onChange={(e) => actualizarPeriodoContrato(index, 'numero_meses', parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>

                      {/* Vista previa de meses */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Meses incluidos ({meses_seleccionados.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {meses_seleccionados.map(mes => (
                            <span 
                              key={`${mes.anio}-${mes.mes}`}
                              className={`px-2 py-1 rounded text-xs ${
                                mes.es_atrasado 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {mes.nombre_mes} {mes.anio} {mes.es_atrasado && '(Atrasado)'}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Gastos Adicionales por Contrato */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">Gastos Adicionales para {contrato.viviendas.direccion_completa}</h5>
                          <Button
                            onClick={() => agregarGastoContrato(index, true)}
                            variant="outline"
                            className="text-sm"
                          >
                            + Agregar Gasto
                          </Button>
                        </div>
                        {contratoConPeriodo.gastos_adicionales && contratoConPeriodo.gastos_adicionales.length > 0 && (
                          <div className="space-y-3">
                            {contratoConPeriodo.gastos_adicionales.map((gasto, gastoIndex) => (
                              <div key={gastoIndex} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Tipo de Gasto
                                    </label>
                                    <Select
                                      value={gasto.tipo_gasto}
                                      onChange={(e) => actualizarGastoContrato(index, gastoIndex, 'tipo_gasto', e.target.value, true)}
                                      options={[
                                        { value: '', label: 'Seleccionar tipo' },
                                        ...TIPOS_GASTOS.map(tipo => ({ value: tipo, label: tipo }))
                                      ]}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Importe
                                    </label>
                                    <Input
                                      type="number"
                                      value={gasto.importe.toString()}
                                      onChange={(e) => actualizarGastoContrato(index, gastoIndex, 'importe', parseFloat(e.target.value) || 0, true)}
                                      placeholder="0.00"
                                      step="0.01"
                                      min="0"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Descripción (opcional)
                                    </label>
                                    <Input
                                      type="text"
                                      value={gasto.descripcion || ''}
                                      onChange={(e) => actualizarGastoContrato(index, gastoIndex, 'descripcion', e.target.value, true)}
                                      placeholder="Detalle del gasto..."
                                    />
                                  </div>

                                  <div className="flex items-end space-x-2">
                                    <div className="flex-1">
                                      <label className="flex items-center space-x-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={gasto.es_deducible}
                                          onChange={(e) => actualizarGastoContrato(index, gastoIndex, 'es_deducible', e.target.checked, true)}
                                          className="h-4 w-4 text-blue-600"
                                        />
                                        <span className="text-gray-700">Deducible</span>
                                      </label>
                                    </div>
                                    <Button
                                      onClick={() => eliminarGastoContrato(index, gastoIndex, true)}
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
                            <Button
                              onClick={() => agregarGastoContrato(index, true)}
                              variant="outline"
                              className="text-sm"
                            >
                              + Agregar Gasto
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Selección por propietario */}
        {modoSeleccion === 'propietarios' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Seleccionar Propietario
            </h3>
            
            <SelectMejorado
              label="Propietarios"
              value={propietarioSeleccionado?.id || ''}
              onChange={(value: string) => {
                const propietario = propietarios.find(p => p.id === value)
                if (propietario) {
                  seleccionarPropietario(propietario)
                }
              }}
              placeholder="Buscar propietario..."
              searchable
              options={propietarios.map(propietario => ({
                value: propietario.id,
                label: `${propietario.nombre_completo} (${propietario.contratos.length} contrato${propietario.contratos.length !== 1 ? 's' : ''})`
              }))}
            />

            {/* Contratos del propietario con configuración */}
            {propietarioSeleccionado && contratosDelPropietario.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">
                  Contratos de {propietarioSeleccionado.nombre_completo} ({contratosDelPropietario.length})
                </h4>
                
                <div className="space-y-4">
                  {contratosDelPropietario.map((contratoConPeriodo, index) => {
                    const { contrato, periodo_personalizado, meses_seleccionados } = contratoConPeriodo
                    const inquilinosInfo = getInquilinosDisplay(contrato)
                    
                    return (
                      <div key={contrato.id} className="border rounded-lg p-4 bg-green-50">
                        {/* Información del contrato */}
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900">{contrato.viviendas.direccion_completa}</h5>
                          <p className="text-sm text-gray-600">
                            {inquilinosInfo.principal} {inquilinosInfo.secundarios}
                          </p>
                          <p className="text-sm font-medium text-green-600">
                            {formatEuros(contrato.importe_alquiler_mensual)}/mes
                          </p>
                        </div>

                        {/* Configuración del período */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Mes de inicio
                            </label>
                            <Select
                              value={periodo_personalizado.mes_inicio.toString()}
                              onChange={(e) => actualizarPeriodoPropietario(index, 'mes_inicio', parseInt(e.target.value))}
                              options={MESES.map((mes, idx) => ({ value: (idx + 1).toString(), label: mes }))}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Año de inicio
                            </label>
                            <Select
                              value={periodo_personalizado.anio_inicio.toString()}
                              onChange={(e) => actualizarPeriodoPropietario(index, 'anio_inicio', parseInt(e.target.value))}
                              options={[
                                { value: '2023', label: '2023' },
                                { value: '2024', label: '2024' },
                                { value: '2025', label: '2025' },
                                { value: '2026', label: '2026' }
                              ]}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Número de meses
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="12"
                              value={periodo_personalizado.numero_meses}
                              onChange={(e) => actualizarPeriodoPropietario(index, 'numero_meses', parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>

                        {/* Vista previa de meses */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Meses incluidos ({meses_seleccionados.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {meses_seleccionados.map(mes => (
                              <span 
                                key={`${mes.anio}-${mes.mes}`}
                                className={`px-2 py-1 rounded text-xs ${
                                  mes.es_atrasado 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {mes.nombre_mes} {mes.anio} {mes.es_atrasado && '(Atrasado)'}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Gastos Adicionales por Contrato */}
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">Gastos Adicionales para {contrato.viviendas.direccion_completa}</h5>
                            <Button
                              onClick={() => agregarGastoContrato(index, false)}
                              variant="outline"
                              className="text-sm"
                            >
                              + Agregar Gasto
                            </Button>
                          </div>
                          {contratoConPeriodo.gastos_adicionales && contratoConPeriodo.gastos_adicionales.length > 0 && (
                            <div className="space-y-3">
                              {contratoConPeriodo.gastos_adicionales.map((gasto, gastoIndex) => (
                                <div key={gastoIndex} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de Gasto
                                      </label>
                                      <Select
                                        value={gasto.tipo_gasto}
                                        onChange={(e) => actualizarGastoContrato(index, gastoIndex, 'tipo_gasto', e.target.value, false)}
                                        options={[
                                          { value: '', label: 'Seleccionar tipo' },
                                          ...TIPOS_GASTOS.map(tipo => ({ value: tipo, label: tipo }))
                                        ]}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Importe
                                      </label>
                                      <Input
                                        type="number"
                                        value={gasto.importe.toString()}
                                        onChange={(e) => actualizarGastoContrato(index, gastoIndex, 'importe', parseFloat(e.target.value) || 0, false)}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Descripción (opcional)
                                      </label>
                                      <Input
                                        type="text"
                                        value={gasto.descripcion || ''}
                                        onChange={(e) => actualizarGastoContrato(index, gastoIndex, 'descripcion', e.target.value, false)}
                                        placeholder="Detalle del gasto..."
                                      />
                                    </div>

                                    <div className="flex items-end space-x-2">
                                      <div className="flex-1">
                                        <label className="flex items-center space-x-2 text-sm">
                                          <input
                                            type="checkbox"
                                            checked={gasto.es_deducible}
                                            onChange={(e) => actualizarGastoContrato(index, gastoIndex, 'es_deducible', e.target.checked, false)}
                                            className="h-4 w-4 text-blue-600"
                                          />
                                          <span className="text-gray-700">Deducible</span>
                                        </label>
                                      </div>
                                      <Button
                                        onClick={() => eliminarGastoContrato(index, gastoIndex, false)}
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
                              <Button
                                onClick={() => agregarGastoContrato(index, false)}
                                variant="outline"
                                className="text-sm"
                              >
                                + Agregar Gasto
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configuración del recibo */}
      {(contratosSeleccionados.length > 0 || contratosDelPropietario.length > 0) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configuración del Recibo
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pago
              </label>
              <Select
                value={formData.forma_pago}
                onChange={(e) => setFormData({ ...formData, forma_pago: e.target.value })}
                options={[
                  { value: 'transferencia', label: 'Transferencia bancaria' },
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'domiciliacion', label: 'Domiciliación bancaria' }
                ]}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Recibo (opcional)
              </label>
              <Input
                value={formData.numero_recibo}
                onChange={(e) => setFormData({ ...formData, numero_recibo: e.target.value })}
                placeholder="Se generará automáticamente si se deja vacío"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Observaciones adicionales..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mt-6">
            <Button
              onClick={generarVistaPrevia}
              className="w-full md:w-auto"
            >
              Generar Vista Previa
            </Button>
          </div>
        </div>
      )}

      {/* Vista previa del recibo */}
      {previewRecibo && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Vista Previa del Recibo
            </h3>
            <div className="space-x-3">
              <Button
                onClick={() => setPreviewRecibo(null)}
                variant="secondary"
              >
                Editar
              </Button>
              <Button
                onClick={descargarPDF}
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
                    Descargar PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Información del propietario */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Propietario</h4>
            <p className="text-gray-700">{previewRecibo.propietario.nombre_completo}</p>
            <DniToggle dni={previewRecibo.propietario.dni_cif} />
          </div>

          {/* Contratos incluidos */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">
              Contratos Incluidos ({previewRecibo.contratos.length})
            </h4>
            <div className="space-y-3">
              {previewRecibo.contratos.map(({ contrato, meses_seleccionados, gastos_adicionales }) => {
                const inquilinosInfo = getInquilinosDisplay(contrato)
                const mesesAtrasados = meses_seleccionados.filter(m => m.es_atrasado).length
                
                return (
                  <div key={contrato.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900">{contrato.viviendas.direccion_completa}</h5>
                        <p className="text-sm text-gray-600">
                          {inquilinosInfo.principal} {inquilinosInfo.secundarios}
                        </p>
                        {inquilinosInfo.dni && (
                          <DniToggle dni={inquilinosInfo.dni} />
                        )}
                      </div>
                      
                      <div className="text-sm">
                        <p><strong>Alquiler mensual:</strong> {formatEuros(contrato.importe_alquiler_mensual)}</p>
                        <p><strong>Total período:</strong> {formatEuros(contrato.importe_alquiler_mensual * meses_seleccionados.length)}</p>
                        {mesesAtrasados > 0 && (
                          <p className="text-red-600"><strong>Meses atrasados:</strong> {mesesAtrasados}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Meses incluidos ({meses_seleccionados.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {meses_seleccionados.map(mes => (
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

                    {/* Gastos Adicionales por Contrato */}
                    {gastos_adicionales && gastos_adicionales.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-900 mb-3">Gastos Adicionales para {contrato.viviendas.direccion_completa}</h5>
                        <div className="space-y-2 mb-3">
                          {gastos_adicionales.map((gasto, gastoIndex) => (
                            <div key={gastoIndex} className="flex justify-between items-center text-sm">
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
                        <div className="border-t pt-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-700">Gastos deducibles:</span>
                            <span className="font-medium">{formatEuros(gastos_adicionales.filter(g => g.es_deducible).reduce((sum, g) => sum + g.importe, 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-700">Gastos no deducibles:</span>
                            <span className="font-medium">{formatEuros(gastos_adicionales.filter(g => !g.es_deducible).reduce((sum, g) => sum + g.importe, 0))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Importe Bruto</p>
              <p className="text-lg font-bold text-gray-900">
                {formatEuros(previewRecibo.totales.importe_total_bruto)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Gestión</p>
              <p className="text-lg font-bold text-orange-600">
                {formatEuros(previewRecibo.totales.importe_total_gestion)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">IVA Gestión</p>
              <p className="text-lg font-bold text-orange-600">
                {formatEuros(previewRecibo.totales.iva_total_gestion)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Neto Propietario</p>
              <p className="text-lg font-bold text-green-600">
                {formatEuros(previewRecibo.totales_con_gastos.importe_neto_final)}
              </p>
            </div>
          </div>

          {/* Gastos adicionales en vista previa */}
          {/* This section is now redundant as expenses are per contract */}
          {/* {previewRecibo.gastos_adicionales.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Gastos Adicionales:</h4>
              <div className="space-y-2 mb-3">
                {previewRecibo.gastos_adicionales.map((gasto, index) => (
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
              <div className="border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Gastos deducibles:</span>
                  <span className="font-medium">{formatEuros(previewRecibo.totales_con_gastos.total_gastos_deducibles)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700">Gastos no deducibles:</span>
                  <span className="font-medium">{formatEuros(previewRecibo.totales_con_gastos.total_gastos_no_deducibles)}</span>
                </div>
              </div>
            </div>
          )} */}

          {/* Información adicional */}
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Número de recibo:</strong> {previewRecibo.numero_recibo}</p>
            <p><strong>Fecha de emisión:</strong> {formatFecha(previewRecibo.fecha_emision.toISOString())}</p>
            <p><strong>Forma de pago:</strong> {previewRecibo.forma_pago}</p>
            {previewRecibo.observaciones && (
              <p><strong>Observaciones:</strong> {previewRecibo.observaciones}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 