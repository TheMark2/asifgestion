'use client'

import { useState, useEffect } from 'react'
import { ContratoForm, FormErrors, Vivienda, Inquilino } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { formatFechaInput } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Select, { SelectOption } from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'

interface ContratoFormProps {
  initialData?: Partial<ContratoForm>
  onSubmit: (data: ContratoForm) => Promise<void>
  loading?: boolean
  submitText?: string
}

export default function ContratoFormComponent({
  initialData = {},
  onSubmit,
  loading = false,
  submitText = 'Guardar'
}: ContratoFormProps) {
  const [formData, setFormData] = useState<ContratoForm>({
    vivienda_id: initialData.vivienda_id || '',
    inquilinos_ids: initialData.inquilinos_ids || [],
    inquilino_titular_id: initialData.inquilino_titular_id || '',
    fecha_inicio_contrato: initialData.fecha_inicio_contrato || formatFechaInput(new Date()),
    fecha_fin_contrato: initialData.fecha_fin_contrato || '',
    importe_alquiler_mensual: initialData.importe_alquiler_mensual || 0,
    activo: initialData.activo ?? true
  })

  const [errors, setErrors] = useState<FormErrors<ContratoForm>>({})
  const [viviendas, setViviendas] = useState<any[]>([])
  const [inquilinos, setInquilinos] = useState<Pick<Inquilino, 'id' | 'nombre_completo' | 'dni'>[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoadingData(true)
      
      // Cargar viviendas con propietarios
      const { data: viviendasData, error: viviendasError } = await supabase
        .from('viviendas')
        .select(`
          id,
          direccion_completa,
          propietarios (
            nombre_completo
          )
        `)
        .order('direccion_completa')

      if (viviendasError) throw viviendasError

      // Cargar inquilinos
      const { data: inquilinosData, error: inquilinosError } = await supabase
        .from('inquilinos')
        .select('id, nombre_completo, dni')
        .order('nombre_completo')

      if (inquilinosError) throw inquilinosError

      setViviendas(viviendasData || [])
      setInquilinos(inquilinosData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors<ContratoForm> = {}

    // Validaciones obligatorias
    if (!formData.vivienda_id) {
      newErrors.vivienda_id = 'Debes seleccionar una vivienda'
    }

    if (!formData.inquilinos_ids || formData.inquilinos_ids.length === 0) {
      newErrors.inquilinos_ids = 'Debes seleccionar al menos un inquilino'
    }

    if (!formData.fecha_inicio_contrato) {
      newErrors.fecha_inicio_contrato = 'La fecha de inicio es obligatoria'
    }

    if (formData.importe_alquiler_mensual <= 0) {
      newErrors.importe_alquiler_mensual = 'El importe debe ser mayor que 0'
    }

    // Validar que fecha fin sea posterior a fecha inicio
    if (formData.fecha_fin_contrato && formData.fecha_inicio_contrato) {
      const fechaInicio = new Date(formData.fecha_inicio_contrato)
      const fechaFin = new Date(formData.fecha_fin_contrato)
      
      if (fechaFin <= fechaInicio) {
        newErrors.fecha_fin_contrato = 'La fecha fin debe ser posterior a la fecha de inicio'
      }
    }

    // Validar que el inquilino titular esté en la lista de inquilinos seleccionados
    if (formData.inquilino_titular_id && !formData.inquilinos_ids.includes(formData.inquilino_titular_id)) {
      newErrors.inquilino_titular_id = 'El inquilino titular debe estar entre los inquilinos seleccionados'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit({
        ...formData,
        fecha_fin_contrato: formData.fecha_fin_contrato || undefined
      })
    } catch (error) {
      console.error('Error al guardar contrato:', error)
    }
  }

  const handleChange = (field: keyof ContratoForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = field === 'importe_alquiler_mensual' 
      ? parseFloat(e.target.value) || 0
      : field === 'activo'
      ? e.target.value === 'true'
      : e.target.value

    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleInquilinoToggle = (inquilinoId: string) => {
    setFormData(prev => {
      const inquilinosIds = [...prev.inquilinos_ids]
      const index = inquilinosIds.indexOf(inquilinoId)
      
      if (index > -1) {
        // Remover inquilino
        inquilinosIds.splice(index, 1)
        // Si era el titular, limpiarlo
        const inquilinoTitular = prev.inquilino_titular_id === inquilinoId ? '' : prev.inquilino_titular_id
        return {
          ...prev,
          inquilinos_ids: inquilinosIds,
          inquilino_titular_id: inquilinoTitular
        }
      } else {
        // Agregar inquilino
        inquilinosIds.push(inquilinoId)
        // Si es el primer inquilino, marcarlo como titular
        const inquilinoTitular = prev.inquilino_titular_id || inquilinoId
        return {
          ...prev,
          inquilinos_ids: inquilinosIds,
          inquilino_titular_id: inquilinoTitular
        }
      }
    })

    // Limpiar error
    if (errors.inquilinos_ids) {
      setErrors(prev => ({
        ...prev,
        inquilinos_ids: undefined
      }))
    }
  }

  const viviendasOptions: SelectOption[] = viviendas.map(vivienda => ({
    value: vivienda.id,
    label: `${vivienda.direccion_completa} (${vivienda.propietarios?.nombre_completo || 'Sin propietario'})`
  }))

  const inquilinosTitularOptions: SelectOption[] = formData.inquilinos_ids.map(inquilinoId => {
    const inquilino = inquilinos.find(i => i.id === inquilinoId)
    return {
      value: inquilinoId,
      label: inquilino ? `${inquilino.nombre_completo} (${inquilino.dni})` : 'Inquilino no encontrado'
    }
  })

  const activoOptions: SelectOption[] = [
    { value: 'true', label: 'Activo' },
    { value: 'false', label: 'Inactivo' }
  ]

  if (loadingData) {
    return <LoadingSpinner text="Cargando datos..." />
  }

  if (viviendas.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          No hay viviendas registradas. <strong>Debes crear al menos una vivienda antes de añadir contratos.</strong>
        </p>
      </div>
    )
  }

  if (inquilinos.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          No hay inquilinos registrados. <strong>Debes crear al menos un inquilino antes de añadir contratos.</strong>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Vivienda"
          value={formData.vivienda_id}
          onChange={handleChange('vivienda_id')}
          options={viviendasOptions}
          error={errors.vivienda_id}
          placeholder="Selecciona una vivienda"
        />

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Inquilinos <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 border border-gray-300 rounded-md bg-gray-50">
            {inquilinos.map(inquilino => (
              <label
                key={inquilino.id}
                className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.inquilinos_ids.includes(inquilino.id)}
                  onChange={() => handleInquilinoToggle(inquilino.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {inquilino.nombre_completo}
                  </p>
                  <p className="text-xs text-gray-500">{inquilino.dni}</p>
                </div>
              </label>
            ))}
          </div>
          {errors.inquilinos_ids && (
            <p className="mt-1 text-sm text-red-600">{errors.inquilinos_ids}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Selecciona uno o más inquilinos para este contrato
          </p>
        </div>

        {formData.inquilinos_ids.length > 1 && (
          <Select
            label="Inquilino Titular"
            value={formData.inquilino_titular_id || ''}
            onChange={handleChange('inquilino_titular_id')}
            options={inquilinosTitularOptions}
            error={errors.inquilino_titular_id}
            placeholder="Selecciona el inquilino principal"
            helper="Designa cuál de los inquilinos será el principal para los recibos"
          />
        )}

        <Input
          type="date"
          label="Fecha de inicio del contrato"
          value={formData.fecha_inicio_contrato}
          onChange={handleChange('fecha_inicio_contrato')}
          error={errors.fecha_inicio_contrato}
          required
        />

        <Input
          type="date"
          label="Fecha de fin del contrato"
          value={formData.fecha_fin_contrato}
          onChange={handleChange('fecha_fin_contrato')}
          error={errors.fecha_fin_contrato}
          helper="Dejar vacío si el contrato es indefinido"
        />

        <Input
          type="number"
          label="Importe alquiler mensual"
          value={formData.importe_alquiler_mensual}
          onChange={handleChange('importe_alquiler_mensual')}
          error={errors.importe_alquiler_mensual}
          step="0.01"
          min="0"
          required
          placeholder="0.00"
        />

        <Select
          label="Estado del contrato"
          value={formData.activo.toString()}
          onChange={handleChange('activo')}
          options={activoOptions}
          error={errors.activo}
        />
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          loading={loading}
          disabled={loading}
          className="flex-1"
        >
          {submitText}
        </Button>
      </div>
    </form>
  )
} 