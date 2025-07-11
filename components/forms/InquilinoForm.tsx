'use client'

import { useState } from 'react'
import { InquilinoForm, FormErrors } from '@/lib/types'
import { validarDNI, validarEmail } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface InquilinoFormProps {
  initialData?: Partial<InquilinoForm>
  onSubmit: (data: InquilinoForm) => Promise<void>
  loading?: boolean
  submitText?: string
}

export default function InquilinoFormComponent({
  initialData = {},
  onSubmit,
  loading = false,
  submitText = 'Guardar'
}: InquilinoFormProps) {
  const [formData, setFormData] = useState<InquilinoForm>({
    nombre_completo: initialData.nombre_completo || '',
    dni: initialData.dni || '',
    email: initialData.email || '',
    telefono: initialData.telefono || ''
  })

  const [errors, setErrors] = useState<FormErrors<InquilinoForm>>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors<InquilinoForm> = {}

    // Validaciones obligatorias
    if (!formData.nombre_completo.trim()) {
      newErrors.nombre_completo = 'El nombre completo es obligatorio'
    }

    if (!formData.dni.trim()) {
      newErrors.dni = 'El DNI es obligatorio'
    } else {
      const dni = formData.dni.trim().toUpperCase()
      if (!validarDNI(dni)) {
        newErrors.dni = 'El DNI no tiene un formato válido'
      }
    }

    // Validaciones opcionales
    if (formData.email && !validarEmail(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido'
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
        dni: formData.dni.trim().toUpperCase()
      })
    } catch (error) {
      console.error('Error al guardar inquilino:', error)
    }
  }

  const handleChange = (field: keyof InquilinoForm) => (
    e: React.ChangeEvent<HTMLInputElement>
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Nombre completo"
          value={formData.nombre_completo}
          onChange={handleChange('nombre_completo')}
          error={errors.nombre_completo}
          required
          placeholder="Ej: María García López"
        />

        <Input
          label="DNI"
          value={formData.dni}
          onChange={handleChange('dni')}
          error={errors.dni}
          required
          placeholder="Ej: 12345678Z"
          helper="Solo DNI españoles válidos"
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          error={errors.email}
          placeholder="Ej: maria@email.com"
          helper="Email de contacto del inquilino"
        />

        <Input
          label="Teléfono"
          value={formData.telefono}
          onChange={handleChange('telefono')}
          error={errors.telefono}
          placeholder="Ej: +34 93 123 45 67"
          helper="Teléfono de contacto"
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