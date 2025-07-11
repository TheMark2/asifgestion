import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Combinar clases de Tailwind CSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatear fecha a formato español
export function formatFecha(fecha: string | Date): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Formatear fecha simple para inputs
export function formatFechaInput(fecha: string | Date): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return date.toISOString().split('T')[0]
}

// Formatear número como moneda europea
export function formatEuros(cantidad: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(cantidad)
}

// Formatear número con decimales
export function formatNumero(numero: number, decimales: number = 2): string {
  return numero.toFixed(decimales).replace('.', ',')
}

// Formatear porcentaje
export function formatPorcentaje(porcentaje: number): string {
  return `${formatNumero(porcentaje)}%`
}

// Convertir número de mes a nombre
export function obtenerNombreMes(mes: number): string {
  const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ]
  return meses[mes - 1] || 'MES INVÁLIDO'
}

// Calcular importes del recibo
export function calcularImportesRecibo(
  importeAlquilerMensual: number,
  porcentajeGestion: number,
  tasaIVA: number = 21
) {
  const importeBrutoPercibido = importeAlquilerMensual
  const importeGestion = importeBrutoPercibido * (porcentajeGestion / 100)
  const ivaGestion = importeGestion * (tasaIVA / 100)
  const importeNetoPropietario = importeBrutoPercibido - importeGestion - ivaGestion

  return {
    importeBrutoPercibido: Math.round(importeBrutoPercibido * 100) / 100,
    importeGestion: Math.round(importeGestion * 100) / 100,
    ivaGestion: Math.round(ivaGestion * 100) / 100,
    importeNetoPropietario: Math.round(importeNetoPropietario * 100) / 100
  }
}

// Validar DNI/CIF español
export function validarDNI(dni: string): boolean {
  const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i
  if (!dniRegex.test(dni)) return false

  const numero = dni.slice(0, 8)
  const letra = dni.slice(8).toUpperCase()
  const letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
  
  return letras[parseInt(numero) % 23] === letra
}

export function validarCIF(cif: string): boolean {
  const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/i
  return cifRegex.test(cif)
}

// Validar email
export function validarEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Capitalizar primera letra
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

// Generar años para selectores
export function generarOpcionesAnios(desde?: number, hasta?: number): number[] {
  const anoActual = new Date().getFullYear()
  const anoDesde = desde || anoActual - 5
  const anoHasta = hasta || anoActual + 2
  
  const anos: number[] = []
  for (let ano = anoDesde; ano <= anoHasta; ano++) {
    anos.push(ano)
  }
  
  return anos.reverse() // Años más recientes primero
}

// Debounce para búsquedas
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Configuración de la inmobiliaria (usar variables de entorno o valores por defecto)
export function obtenerConfigInmobiliaria() {
  return {
    nombre: process.env.NEXT_PUBLIC_INMOBILIARIA_NOMBRE || "Tu Inmobiliaria S.L.",
    direccion: process.env.NEXT_PUBLIC_INMOBILIARIA_DIRECCION || "Calle Principal 123, 08001 Barcelona",
    cif: process.env.NEXT_PUBLIC_INMOBILIARIA_CIF || "B12345678",
    telefono: process.env.NEXT_PUBLIC_INMOBILIARIA_TELEFONO || "+34 93 123 45 67",
    email: process.env.NEXT_PUBLIC_INMOBILIARIA_EMAIL || "info@tuinmobiliaria.com"
  }
} // ===================================================================
// FUNCIONES PARA CERTIFICADO ANUAL
// ===================================================================

import { supabase } from './supabase'
import type { CertificadoAnual, ResumenViviendaCertificado, ResumenMensualCertificado, MESES } from './types'

// Obtener datos para certificado anual de un propietario
export async function obtenerDatosCertificadoAnual(propietarioId: string, anio: number): Promise<CertificadoAnual | null> {
  try {
    // 1. Obtener datos del propietario
    const { data: propietario, error: errorPropietario } = await supabase
      .from('propietarios')
      .select('*')
      .eq('id', propietarioId)
      .single()

    if (errorPropietario || !propietario) {
      throw new Error('Propietario no encontrado')
    }

    // 2. Obtener viviendas del propietario
    const { data: viviendas, error: errorViviendas } = await supabase
      .from('viviendas')
      .select(`
        *,
        contratos_alquiler (
          id,
          fecha_inicio_contrato,
          fecha_fin_contrato,
          importe_alquiler_mensual,
          activo,
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
      .eq('propietario_id', propietarioId)

    if (errorViviendas) {
      throw new Error('Error al obtener viviendas')
    }

    // 3. Obtener recibos del año para todas las viviendas
    const contratoIds = viviendas?.flatMap(v => v.contratos_alquiler?.map((c: any) => c.id) || []) || []
    
    const { data: recibos, error: errorRecibos } = await supabase
      .from('recibos_alquiler')
      .select(`
        *,
        recibos_detalle_meses (
          mes,
          anio,
          importe_mes,
          importe_gestion_mes,
          iva_gestion_mes,
          importe_neto_mes,
          es_mes_atrasado
        )
      `)
      .in('contrato_id', contratoIds)
      .gte('fecha_emision', `${anio}-01-01`)
      .lte('fecha_emision', `${anio}-12-31`)

    if (errorRecibos) {
      throw new Error('Error al obtener recibos')
    }

    // 4. Procesar datos para crear el certificado
    const viviendasResumen: ResumenViviendaCertificado[] = []
    const resumenMensualGlobal: ResumenMensualCertificado[] = []

    // Inicializar resumen mensual global (12 meses)
    for (let mes = 1; mes <= 12; mes++) {
      resumenMensualGlobal.push({
        mes,
        anio,
        nombre_mes: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][mes - 1],
        ingresos_brutos: 0,
        gastos_gestion: 0,
        iva_gestion: 0,
        ingresos_netos: 0
      })
    }

    viviendas?.forEach(vivienda => {
      const contratos = vivienda.contratos_alquiler || []
      const resumenMensual: ResumenMensualCertificado[] = []

      // Inicializar resumen mensual por vivienda
      for (let mes = 1; mes <= 12; mes++) {
        resumenMensual.push({
          mes,
          anio,
          nombre_mes: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][mes - 1],
          ingresos_brutos: 0,
          gastos_gestion: 0,
          iva_gestion: 0,
          ingresos_netos: 0
        })
      }

      // Procesar recibos de esta vivienda
      contratos.forEach((contrato: any) => {
        const recibosContrato = recibos?.filter(r => r.contrato_id === contrato.id) || []
        
        recibosContrato.forEach(recibo => {
          recibo.recibos_detalle_meses?.forEach((detalle: any) => {
            if (detalle.anio === anio) {
              const mesIndex = detalle.mes - 1
              if (mesIndex >= 0 && mesIndex < 12) {
                resumenMensual[mesIndex].ingresos_brutos += detalle.importe_mes
                resumenMensual[mesIndex].gastos_gestion += detalle.importe_gestion_mes
                resumenMensual[mesIndex].iva_gestion += detalle.iva_gestion_mes
                resumenMensual[mesIndex].ingresos_netos += detalle.importe_neto_mes

                // Agregar al resumen global
                resumenMensualGlobal[mesIndex].ingresos_brutos += detalle.importe_mes
                resumenMensualGlobal[mesIndex].gastos_gestion += detalle.importe_gestion_mes
                resumenMensualGlobal[mesIndex].iva_gestion += detalle.iva_gestion_mes
                resumenMensualGlobal[mesIndex].ingresos_netos += detalle.importe_neto_mes
              }
            }
          })
        })
      })

      // Calcular totales de la vivienda
      const totales = resumenMensual.reduce((acc, mes) => ({
        total_ingresos_brutos: acc.total_ingresos_brutos + mes.ingresos_brutos,
        total_gastos_gestion: acc.total_gastos_gestion + mes.gastos_gestion,
        total_iva_gestion: acc.total_iva_gestion + mes.iva_gestion,
        total_ingresos_netos: acc.total_ingresos_netos + mes.ingresos_netos
      }), {
        total_ingresos_brutos: 0,
        total_gastos_gestion: 0,
        total_iva_gestion: 0,
        total_ingresos_netos: 0
      })

      viviendasResumen.push({
        vivienda,
        contratos,
        ...totales,
        resumen_mensual: resumenMensual
      })
    })

    // Calcular totales generales
    const totalesGenerales = viviendasResumen.reduce((acc, vivienda) => ({
      total_ingresos_brutos: acc.total_ingresos_brutos + vivienda.total_ingresos_brutos,
      total_gastos_gestion: acc.total_gastos_gestion + vivienda.total_gastos_gestion,
      total_iva_gestion: acc.total_iva_gestion + vivienda.total_iva_gestion,
      total_ingresos_netos: acc.total_ingresos_netos + vivienda.total_ingresos_netos,
      porcentaje_gestion_promedio: propietario.porcentaje_gestion,
      numero_viviendas: acc.numero_viviendas + 1,
      numero_contratos: acc.numero_contratos + vivienda.contratos.length
    }), {
      total_ingresos_brutos: 0,
      total_gastos_gestion: 0,
      total_iva_gestion: 0,
      total_ingresos_netos: 0,
      porcentaje_gestion_promedio: 0,
      numero_viviendas: 0,
      numero_contratos: 0
    })

    return {
      propietario,
      anio,
      fecha_emision: new Date(),
      viviendas: viviendasResumen,
      totales: totalesGenerales,
      resumen_mensual_global: resumenMensualGlobal
    }

  } catch (error) {
    console.error('Error al obtener datos del certificado anual:', error)
    return null
  }
} 

// Función para ocultar DNI/CIF
export function ocultarDocumento(documento: string): string {
  if (!documento) return ''
  
  // Para NIE (X, Y, Z seguido de 7 números y una letra)
  if (/^[XYZ]/i.test(documento)) {
    return `${documento.charAt(0)}****${documento.slice(-3)}`
  }
  
  // Para CIF (Letra seguida de 7 números y una letra o número)
  if (/^[ABCDEFGHJKLMNPQRSUVW]/i.test(documento)) {
    return `${documento.charAt(0)}****${documento.slice(-3)}`
  }
  
  // Para DNI (8 números y una letra)
  return `****${documento.slice(-3)}`
} 

