'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import SelectMejorado from '@/components/ui/SelectMejorado'
import SensitiveData from '@/components/ui/SensitiveData'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatEuros, formatFecha, generarOpcionesAnios, obtenerDatosCertificadoAnual } from '@/lib/utils'
import { generateCertificateAnnualPdf } from '@/lib/pdf-generator'
import type { Propietario, CertificadoAnual } from '@/lib/types'
import { IconDownload } from '@tabler/icons-react'

export default function CertificadoAnualPage() {
  const [propietarios, setPropietarios] = useState<Propietario[]>([])
  const [propietarioSeleccionado, setPropietarioSeleccionado] = useState<string>('')
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear() - 1)
  const [certificado, setCertificado] = useState<CertificadoAnual | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchPropietarios()
  }, [])

  const fetchPropietarios = async () => {
    try {
      const { data, error } = await supabase
        .from('propietarios')
        .select('*')
        .order('nombre_completo')

      if (error) throw error
      setPropietarios(data || [])
    } catch (error) {
      console.error('Error al cargar propietarios:', error)
      setError('Error al cargar propietarios')
    }
  }

  const handleGenerarCertificado = async () => {
    if (!propietarioSeleccionado) {
      setError('Debe seleccionar un propietario')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const datos = await obtenerDatosCertificadoAnual(propietarioSeleccionado, anioSeleccionado)
      
      if (!datos) {
        setError('No se encontraron datos para generar el certificado')
        return
      }

      setCertificado(datos)
    } catch (error) {
      console.error('Error al generar certificado:', error)
      setError('Error al generar el certificado')
    } finally {
      setLoading(false)
    }
  }

  const handleDescargarPdf = async () => {
    if (!certificado) return

    try {
      setLoadingPdf(true)
      const pdfBlob = await generateCertificateAnnualPdf(certificado)
      
      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `certificado-anual-${certificado.propietario.nombre_completo.replace(/\s+/g, '-')}-${certificado.anio}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al generar PDF:', error)
      setError('Error al generar el PDF')
    } finally {
      setLoadingPdf(false)
    }
  }

  const aniosDisponibles = generarOpcionesAnios(2020, new Date().getFullYear())

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Certificado Anual
        </h1>
        <p className="text-gray-600">
          Certificados de ingresos y gastos anuales para la declaración de rentas
        </p>
      </div>

      {/* Formulario de selección */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">
            Generar Certificado
          </h2>
          <p className="text-gray-600 mt-2">
            Selecciona el propietario y año para generar el certificado
          </p>
        </div>
        
        <div className="form-grid-3">
          <div>
            <SelectMejorado
              value={propietarioSeleccionado}
              onChange={(value) => setPropietarioSeleccionado(value)}
              placeholder="Seleccionar propietario..."
              label="Propietario"
              required
              searchable
              options={propietarios.map((propietario) => ({
                value: propietario.id,
                label: propietario.nombre_completo
              }))}
            />
          </div>

          <div>
            <SelectMejorado
              value={anioSeleccionado.toString()}
              onChange={(value) => setAnioSeleccionado(parseInt(value))}
              label="Año"
              required
              options={aniosDisponibles.map((anio) => ({
                value: anio.toString(),
                label: anio.toString()
              }))}
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleGenerarCertificado}
              disabled={loading || !propietarioSeleccionado}
              className="w-full"
            >
              {loading ? 'Generando...' : 'Generar Certificado'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="alert-modern alert-error">
            {error}
          </div>
        )}
      </div>

      {/* Mostrar certificado generado */}
      {certificado && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Certificado Anual {certificado.anio}
                </h2>
                <p className="text-gray-600">Documento para declaración de rentas</p>
              </div>
              <Button
                onClick={handleDescargarPdf}
                disabled={loadingPdf}
                variant="danger"
              >
                {loadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
              </Button>
            </div>
          </div>

          {/* Datos del propietario */}
          <div className="card-compact border-l-4 border-l-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Propietario</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="label-modern">Nombre Completo</span>
                  <p className="font-medium text-gray-900">{certificado.propietario.nombre_completo}</p>
                </div>
                <div>
                  <span className="label-modern">DNI/CIF</span>
                  <SensitiveData 
                    value={certificado.propietario.dni_cif} 
                    type="dni"
                    showToggle={true}
                  />
                </div>
              </div>
              <div className="space-y-3">
                {certificado.propietario.email && (
                  <div>
                    <span className="label-modern">Email</span>
                    <SensitiveData 
                      value={certificado.propietario.email} 
                      type="email"
                      maskByDefault={false}
                    />
                  </div>
                )}
                {certificado.propietario.telefono && (
                  <div>
                    <span className="label-modern">Teléfono</span>
                    <SensitiveData 
                      value={certificado.propietario.telefono} 
                      type="phone"
                      maskByDefault={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resumen totales */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Resumen Anual {certificado.anio}</h3>
            
            {/* Métricas principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 border border-gray-200 rounded">
                <p className="text-sm font-medium text-gray-600 mb-1">Ingresos Brutos</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatEuros(certificado.totales.total_ingresos_brutos)}
                </p>
              </div>
              
              <div className="text-center p-4 border border-gray-200 rounded">
                <p className="text-sm font-medium text-gray-600 mb-1">Gastos Gestión</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatEuros(certificado.totales.total_gastos_gestion)}
                </p>
              </div>
              
              <div className="text-center p-4 border border-gray-200 rounded">
                <p className="text-sm font-medium text-gray-600 mb-1">IVA Gestión</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatEuros(certificado.totales.total_iva_gestion)}
                </p>
              </div>
              
              <div className="text-center p-4 border-2 border-gray-400 rounded">
                <p className="text-sm font-medium text-gray-600 mb-1">Ingresos Netos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatEuros(certificado.totales.total_ingresos_netos)}
                </p>
              </div>
            </div>
            
            {/* Estadísticas adicionales */}
            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-1">Viviendas</p>
                  <p className="text-xl font-bold text-gray-900">{certificado.totales.numero_viviendas}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-1">Contratos</p>
                  <p className="text-xl font-bold text-gray-900">{certificado.totales.numero_contratos}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-1">% Gestión Promedio</p>
                  <p className="text-xl font-bold text-gray-900">{certificado.totales.porcentaje_gestion_promedio}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen mensual */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Resumen Mensual {certificado.anio}</h3>
            <div className="table-container">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th className="text-right">Ingresos Brutos</th>
                    <th className="text-right">Gastos Gestión</th>
                    <th className="text-right">IVA Gestión</th>
                    <th className="text-right">Ingresos Netos</th>
                  </tr>
                </thead>
                <tbody>
                  {certificado.resumen_mensual_global.map((mes, index) => (
                    <tr key={mes.mes} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="font-medium">{mes.nombre_mes}</td>
                      <td className="text-right">{formatEuros(mes.ingresos_brutos)}</td>
                      <td className="text-right">{formatEuros(mes.gastos_gestion)}</td>
                      <td className="text-right">{formatEuros(mes.iva_gestion)}</td>
                      <td className="text-right font-bold">{formatEuros(mes.ingresos_netos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detalle por viviendas */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Detalle por Viviendas</h3>
            <div className="space-y-4">
              {certificado.viviendas.map((viviendaResumen, index) => (
                <div key={viviendaResumen.vivienda.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {viviendaResumen.vivienda.direccion_completa}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {viviendaResumen.contratos.length} contrato(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Ingresos Brutos</p>
                      <p className="font-bold text-green-600">
                        {formatEuros(viviendaResumen.total_ingresos_brutos)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Gastos Gestión</p>
                      <p className="font-bold text-orange-600">
                        {formatEuros(viviendaResumen.total_gastos_gestion)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">IVA Gestión</p>
                      <p className="font-bold text-red-600">
                        {formatEuros(viviendaResumen.total_iva_gestion)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Ingresos Netos</p>
                      <p className="font-bold text-blue-600">
                        {formatEuros(viviendaResumen.total_ingresos_netos)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex justify-center mt-8">
              <LoadingSpinner />
            </div>
          )}
        </div>
      )}
    </div>
  )
} 
 
 