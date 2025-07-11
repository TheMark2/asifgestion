'use client'

import { useState } from 'react'
import { PropietarioForm, FormErrors } from '@/lib/types'
import { validarDNI, validarCIF, validarEmail } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface PropietarioFormProps {
  initialData?: Partial<PropietarioForm>
  onSubmit: (data: PropietarioForm) => Promise<void>
  loading?: boolean
  submitText?: string
}

export default function PropietarioFormComponent({
  initialData = {},
  onSubmit,
  loading = false,
  submitText = 'Guardar'
}: PropietarioFormProps) {
  const [formData, setFormData] = useState<PropietarioForm>({
    nombre_completo: initialData.nombre_completo || '',
    dni_cif: initialData.dni_cif || '',
    calle: initialData.calle || '',
    ciudad: initialData.ciudad || '',
    codigo_postal: initialData.codigo_postal || '',
    provincia: initialData.provincia || '',
    email: initialData.email || '',
    telefono: initialData.telefono || '',
    porcentaje_gestion: initialData.porcentaje_gestion || 0,
    es_sociedad: initialData.es_sociedad || false,
    co_propietario: initialData.co_propietario || ''
  })

  const [errors, setErrors] = useState<FormErrors<PropietarioForm>>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors<PropietarioForm> = {}

    // Validaciones obligatorias
    if (!formData.nombre_completo.trim()) {
      newErrors.nombre_completo = formData.es_sociedad 
        ? 'El nombre de la sociedad es obligatorio'
        : 'El nombre completo es obligatorio'
    }

    if (!formData.dni_cif.trim()) {
      newErrors.dni_cif = 'El DNI/CIF es obligatorio'
    } else {
      const dniCif = formData.dni_cif.trim().toUpperCase()
      if (formData.es_sociedad) {
        if (!validarCIF(dniCif)) {
          newErrors.dni_cif = 'El CIF no tiene un formato válido'
        }
      } else {
        if (!validarDNI(dniCif) && !validarCIF(dniCif)) {
          newErrors.dni_cif = 'El DNI/CIF no tiene un formato válido'
        }
      }
    }

    if (formData.porcentaje_gestion < 0 || formData.porcentaje_gestion > 100) {
      newErrors.porcentaje_gestion = 'El porcentaje debe estar entre 0 y 100'
    }

    // Validaciones opcionales
    if (formData.email && !validarEmail(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido'
    }

    if (formData.codigo_postal && !/^\d{5}$/.test(formData.codigo_postal)) {
      newErrors.codigo_postal = 'El código postal debe tener 5 dígitos'
    }

    if (formData.telefono && !/^[+]?[\d\s-()]{9,15}$/.test(formData.telefono)) {
      newErrors.telefono = 'El teléfono no tiene un formato válido'
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
        dni_cif: formData.dni_cif.trim().toUpperCase()
      })
    } catch (error) {
      console.error('Error al guardar propietario:', error)
    }
  }

  const handleChange = (field: keyof PropietarioForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'porcentaje_gestion' 
      ? parseFloat(e.target.value) || 0 
      : field === 'es_sociedad'
      ? e.target.type === 'checkbox' ? e.target.checked : false
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col space-y-2">
          <Input
            label={formData.es_sociedad ? "Nombre de la sociedad" : "Nombre completo"}
            value={formData.nombre_completo}
            onChange={handleChange('nombre_completo')}
            error={errors.nombre_completo}
            required
            placeholder={formData.es_sociedad ? "Ej: Inversiones ABC S.L." : "Ej: Juan Pérez García"}
          />
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={formData.es_sociedad}
              onChange={handleChange('es_sociedad')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Es una sociedad</span>
          </label>
        </div>

        <div className="flex flex-col space-y-2">
          <Input
            label="DNI/CIF"
            value={formData.dni_cif}
            onChange={handleChange('dni_cif')}
            error={errors.dni_cif}
            required
            placeholder={formData.es_sociedad ? "Ej: B12345678" : "Ej: 12345678Z"}
          />
          <p className="text-xs text-gray-500">
            {formData.es_sociedad ? "Introduce el CIF de la sociedad" : "Introduce el DNI o CIF"}
          </p>
        </div>

        <Input
          label="Co-propietario"
          value={formData.co_propietario || ''}
          onChange={handleChange('co_propietario')}
          error={errors.co_propietario}
          placeholder="Ej: María López Sánchez"
          helper="Nombre del co-propietario (opcional)"
        />

        <Input
          label="Calle"
          value={formData.calle}
          onChange={handleChange('calle')}
          error={errors.calle}
          placeholder="Ej: Calle Mayor 123, 2ºA"
        />

        <Input
          label="Ciudad"
          value={formData.ciudad}
          onChange={handleChange('ciudad')}
          error={errors.ciudad}
          placeholder="Ej: Barcelona"
        />

        <Input
          label="Código postal"
          value={formData.codigo_postal}
          onChange={handleChange('codigo_postal')}
          error={errors.codigo_postal}
          placeholder="Ej: 08001"
          maxLength={5}
        />

        <Input
          label="Provincia"
          value={formData.provincia}
          onChange={handleChange('provincia')}
          error={errors.provincia}
          placeholder="Ej: Barcelona"
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          error={errors.email}
          placeholder="Ej: juan@email.com"
        />

        <Input
          label="Teléfono"
          value={formData.telefono}
          onChange={handleChange('telefono')}
          error={errors.telefono}
          placeholder="Ej: +34 93 123 45 67"
        />
      </div>

      <div className="max-w-sm">
        <Input
          label="Porcentaje de gestión (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={formData.porcentaje_gestion.toString()}
          onChange={handleChange('porcentaje_gestion')}
          error={errors.porcentaje_gestion}
          required
          helper="Porcentaje que se aplicará a los recibos por gestión"
        />
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