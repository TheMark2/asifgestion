// Tipos TypeScript para las tablas de la base de datos

export interface Propietario {
  id: string
  nombre_completo: string
  dni_cif: string
  calle?: string
  ciudad?: string
  codigo_postal?: string
  provincia?: string
  email?: string
  telefono?: string
  porcentaje_gestion: number
  es_sociedad?: boolean
  co_propietario?: string
  created_at: string
  updated_at: string
}

export interface Vivienda {
  id: string
  propietario_id: string
  direccion_completa: string
  calle?: string
  numero?: string
  piso_puerta?: string
  ciudad?: string
  codigo_postal?: string
  provincia?: string
  created_at: string
  updated_at: string
  // Relación
  propietarios?: Propietario
}

export interface Inquilino {
  id: string
  nombre_completo: string
  dni: string
  email?: string
  telefono?: string
  created_at: string
  updated_at: string
}

// NUEVA: Tabla intermedia para la relación muchos-a-muchos
export interface ContratoInquilino {
  id: string
  contrato_id: string
  inquilino_id: string
  es_titular: boolean
  created_at: string
  // Relación
  inquilinos?: Inquilino
}

export interface ContratoAlquiler {
  id: string
  vivienda_id: string
  fecha_inicio_contrato: string
  fecha_fin_contrato?: string
  importe_alquiler_mensual: number
  activo: boolean
  created_at: string
  updated_at: string
  // Relaciones
  viviendas?: Vivienda
  contratos_inquilinos?: ContratoInquilino[] // Múltiples inquilinos
  // Para compatibilidad con código existente
  inquilinos?: Inquilino[] // Array de inquilinos directamente
  gastos_contrato?: GastoContrato[] // Gastos asociados al contrato
  liquidaciones_mensuales?: LiquidacionMensual[] // Meses liquidados
  resumen_deudas?: ResumenDeudas // Resumen calculado de deudas
}

// Constantes para tipos de gastos
export const TIPOS_GASTOS = [
  'Comunidad',
  'IBI',
  'Seguro',
  'Reparaciones',
  'Mantenimiento',
  'Suministros',
  'Administración',
  'Otros'
] as const;

export type TipoGasto = typeof TIPOS_GASTOS[number];

// ===================================================================
// NUEVOS TIPOS PARA GESTIÓN AVANZADA DE RECIBOS
// ===================================================================

// Tabla de períodos de recibos
export interface PeriodoRecibo {
  id: string
  mes: number
  anio: number
  nombre_periodo: string
  created_at: string
}

// Tabla de recibos multi-mes NUEVA
export interface ReciboAlquiler {
  id: string
  contrato_id: string
  numero_recibo: string // Número único del recibo
  fecha_emision: string
  importe_total_bruto: number // Suma de todos los meses
  importe_total_gestion: number
  iva_total_gestion: number
  importe_total_neto_propietario: number
  forma_pago_inquilino?: string
  referencia_pago_inquilino?: string
  observaciones?: string // Para notas sobre pagos atrasados
  ruta_pdf_supabase?: string
  generado: boolean
  created_at: string
  updated_at: string
  // Relaciones
  contratos_alquiler?: ContratoAlquiler
  recibos_detalle_meses?: ReciboDetalleMes[] // Detalles de cada mes
}

// Tabla de detalle de meses en cada recibo
export interface ReciboDetalleMes {
  id: string
  recibo_id: string
  mes: number
  anio: number
  importe_mes: number
  importe_gestion_mes: number
  iva_gestion_mes: number
  importe_neto_mes: number
  es_mes_atrasado: boolean // Si era un mes pendiente
  created_at: string
  // Relación
  recibos_alquiler?: ReciboAlquiler
}

// ===================================================================
// TIPOS PARA FORMULARIOS
// ===================================================================

// Tipos para formularios (campos opcionales para creación)
export interface PropietarioForm {
  nombre_completo: string
  dni_cif: string
  calle?: string
  ciudad?: string
  codigo_postal?: string
  provincia?: string
  email?: string
  telefono?: string
  porcentaje_gestion: number
}

export interface ViviendaForm {
  propietario_id: string
  direccion_completa: string
  calle?: string
  numero?: string
  piso_puerta?: string
  ciudad?: string
  codigo_postal?: string
  provincia?: string
}

export interface InquilinoForm {
  nombre_completo: string
  dni: string
  email?: string
  telefono?: string
}

export interface ContratoForm {
  vivienda_id: string
  inquilinos_ids: string[] // Array de IDs de inquilinos
  inquilino_titular_id?: string // ID del inquilino principal (opcional)
  fecha_inicio_contrato: string
  fecha_fin_contrato?: string
  importe_alquiler_mensual: number
  activo: boolean
}

export interface GastoAdicionalForm {
  tipo_gasto: TipoGasto
  importe: number
  descripcion?: string
  es_deducible: boolean
}

// ===================================================================
// TIPOS PARA CÁLCULOS Y VISUALIZACIÓN
// ===================================================================

// Tipo para estadísticas de ganancias
export interface EstadisticasGanancias {
  total_ganancias_mes: number
  total_ganancias_ano: number
  ganancias_por_propietario: Array<{
    propietario: Propietario
    contratos_activos: number
    importe_total_mensual: number
    ganancias_mensuales: number
    porcentaje_participacion: number
  }>
  resumen_mensual: Array<{
    mes: number
    anio: number
    nombre_mes: string
    recibos_generados: number
    importe_bruto_total: number
    ganancias_total: number
  }>
}

// ===================================================================
// TIPOS DE CONFIGURACIÓN
// ===================================================================

// Tipos para configuración de la inmobiliaria
export interface InmobiliariaConfig {
  nombre: string
  direccion: string
  cif: string
  telefono: string
  email: string
}

// ===================================================================
// ENUMS Y CONSTANTES
// ===================================================================

// Enums útiles
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const

export const FORMAS_PAGO = [
  'Transferencia bancaria',
  'Domiciliación bancaria',
  'Efectivo',
  'Cheque',
  'Tarjeta de crédito',
  'Bizum',
  'Otros'
] as const

// Tipos para filtros en las páginas
export interface FiltrosRecibos {
  contrato_id?: string
  mes?: number
  anio?: number
  generado?: boolean
  desde_fecha?: string
  hasta_fecha?: string
}

// ===================================================================
// TIPOS DE UTILIDAD
// ===================================================================

// Tipos de utilidad
export type FormErrors<T> = Partial<Record<keyof T, string>>
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// Tipo para respuestas de la API
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Tipo para paginación
export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginationInfo
}

// ===================================================================
// TIPOS PARA COMPATIBILIDAD CON LA VERSIÓN ANTERIOR
// ===================================================================

// LEGACY: Mantenemos el tipo anterior para compatibilidad durante la migración
export interface ReciboAlquilerLegacy {
  id: string
  contrato_id: string
  mes: number
  anio: number
  fecha_emision: string
  importe_bruto_percibido: number
  importe_gestion: number
  iva_gestion: number
  importe_neto_propietario: number
  forma_pago_inquilino?: string
  referencia_pago_inquilino?: string
  ruta_pdf_supabase?: string
  generado: boolean
  created_at: string
  updated_at: string
  // Relación
  contratos_alquiler?: ContratoAlquiler
}

// Tipo para certificado anual
export interface CertificadoAnual {
  propietario: Propietario
  anio: number
  total_ingresos: number
  total_gastos: number
  total_gestion: number
  total_iva: number
  total_neto: number
  detalles_mensuales: Array<{
    mes: number
    anio: number
    nombre_mes: string
    ingresos: number
    gastos: number
    gestion: number
    iva: number
    neto: number
  }>
}

// ===================================================================
// NUEVAS INTERFACES PARA GASTOS Y LIQUIDACIONES POR CONTRATO
// ===================================================================

// Tabla de gastos por contrato
export interface GastoContrato {
  id: string
  contrato_id: string
  concepto: string // Reparaciones, Mantenimiento, IBI, Comunidad, Seguro, Gestoría, Otros
  importe: number
  fecha: string
  descripcion?: string
  created_at: string
  updated_at: string
  // Relación
  contratos_alquiler?: ContratoAlquiler
}

// Tabla de liquidaciones mensuales
export interface LiquidacionMensual {
  id: string
  contrato_id: string
  mes: number
  anio: number
  importe_liquidado: number
  fecha_liquidacion: string
  observaciones?: string
  created_at: string
  updated_at: string
  // Relación
  contratos_alquiler?: ContratoAlquiler
}

// Resumen de deudas calculado
export interface ResumenDeudas {
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

// Formulario para crear/editar gastos
export interface GastoContratoForm {
  concepto: string
  importe: string
  fecha: string
  descripcion: string
}

// Resumen de gastos por contrato
export interface ResumenGastosContrato {
  contrato_id: string
  total_gastos: number
  numero_gastos: number
  gastos_por_anio: Array<{
    anio: number
    total: number
    numero: number
  }>
  gastos_por_concepto: Array<{
    concepto: string
    total: number
    numero: number
  }>
}