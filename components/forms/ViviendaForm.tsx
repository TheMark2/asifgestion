'use client'

import { useState, useEffect } from 'react'
import { ViviendaForm, FormErrors, Propietario } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import Input from '@/components/ui/Input'
import Select, { SelectOption } from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'

interface ViviendaFormProps {
  initialData?: Partial<ViviendaForm>
  onSubmit: (data: ViviendaForm) => Promise<void>
  loading?: boolean
  submitText?: string
}

export default function ViviendaFormComponent({
  initialData = {},
  onSubmit,
  loading = false,
  submitText = 'Guardar'
}: ViviendaFormProps) {
  const [formData, setFormData] = useState<ViviendaForm>({
    propietario_id: initialData.propietario_id || '',
    direccion_completa: initialData.direccion_completa || '',
    calle: initialData.calle || '',
    numero: initialData.numero || '',
    piso_puerta: initialData.piso_puerta || '',
    ciudad: initialData.ciudad || '',
    codigo_postal: initialData.codigo_postal || '',
    provincia: initialData.provincia || ''
  })

  const [errors, setErrors] = useState<FormErrors<ViviendaForm>>({})
  const [propietarios, setPropietarios] = useState<Pick<Propietario, 'id' | 'nombre_completo' | 'dni_cif'>[]>([])
  const [loadingPropietarios, setLoadingPropietarios] = useState(true)

  useEffect(() => {
    cargarPropietarios()
  }, [])

  const cargarPropietarios = async () => {
    try {
      setLoadingPropietarios(true)
      const { data, error } = await supabase
        .from('propietarios')
        .select('id, nombre_completo, dni_cif')
        .order('nombre_completo')

      if (error) throw error

      setPropietarios(data || [])
    } catch (error) {
      console.error('Error cargando propietarios:', error)
    } finally {
      setLoadingPropietarios(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors<ViviendaForm> = {}

    // Validaciones obligatorias
    if (!formData.propietario_id) {
      newErrors.propietario_id = 'Debes seleccionar un propietario'
    }

    if (!formData.direccion_completa.trim()) {
      newErrors.direccion_completa = 'La dirección completa es obligatoria'
    }

    // Validaciones opcionales
    if (formData.codigo_postal && !/^\d{5}$/.test(formData.codigo_postal)) {
      newErrors.codigo_postal = 'El código postal debe tener 5 dígitos'
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
      await onSubmit(formData)
    } catch (error) {
      console.error('Error al guardar vivienda:', error)
    }
  }

  const handleChange = (field: keyof ViviendaForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  // Generar dirección completa automáticamente
  const generarDireccionCompleta = () => {
    const partes = [
      formData.calle,
      formData.numero && `nº ${formData.numero}`,
      formData.piso_puerta,
      formData.ciudad,
      formData.codigo_postal,
      formData.provincia
    ].filter(Boolean)

    if (partes.length > 0) {
      setFormData(prev => ({
        ...prev,
        direccion_completa: partes.join(', ')
      }))
    }
  }

  const propietariosOptions: SelectOption[] = propietarios.map(prop => ({
    value: prop.id,
    label: `${prop.nombre_completo} (${prop.dni_cif})`
  }))

  if (loadingPropietarios) {
    return <LoadingSpinner text="Cargando propietarios..." />
  }

  if (propietarios.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          No hay propietarios registrados. <strong>Debes crear al menos un propietario antes de añadir viviendas.</strong>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <Select
          label="Propietario"
          value={formData.propietario_id}
          onChange={handleChange('propietario_id')}
          options={propietariosOptions}
          error={errors.propietario_id}
          placeholder="Selecciona un propietario"
          required
        />

        <Input
          label="Dirección completa"
          value={formData.direccion_completa}
          onChange={handleChange('direccion_completa')}
          error={errors.direccion_completa}
          required
          placeholder="Ej: C/ Sant Saturní nº 2, 2º C, Sant Feliu de Codines, 08182, Barcelona"
          helper="Dirección tal como aparecerá en los recibos"
        />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Desglose de la dirección (opcional)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Calle"
            value={formData.calle}
            onChange={handleChange('calle')}
            error={errors.calle}
            placeholder="Ej: C/ Sant Saturní"
          />

          <Input
            label="Número"
            value={formData.numero}
            onChange={handleChange('numero')}
            error={errors.numero}
            placeholder="Ej: 2"
          />

          <Input
            label="Piso/Puerta"
            value={formData.piso_puerta}
            onChange={handleChange('piso_puerta')}
            error={errors.piso_puerta}
            placeholder="Ej: 2º C"
          />

          <Input
            label="Ciudad"
            value={formData.ciudad}
            onChange={handleChange('ciudad')}
            error={errors.ciudad}
            placeholder="Ej: Sant Feliu de Codines"
          />

          <Input
            label="Código postal"
            value={formData.codigo_postal}
            onChange={handleChange('codigo_postal')}
            error={errors.codigo_postal}
            placeholder="Ej: 08182"
            maxLength={5}
          />

          <Input
            label="Provincia"
            value={formData.provincia}
            onChange={handleChange('provincia')}
            error={errors.provincia}
            placeholder="Ej: Barcelona"
          />
        </div>

        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generarDireccionCompleta}
          >
            Generar dirección completa automáticamente
          </Button>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="submit"
          loading={loading}
          disabled={loading}
        >
          {submitText}
        </Button>
      </div>
    </form>
  )
} 