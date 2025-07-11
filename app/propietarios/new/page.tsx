'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PropietarioForm } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import PropietarioFormComponent from '@/components/forms/PropietarioForm'
import Button from '@/components/ui/Button'

export default function NewPropietarioPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: PropietarioForm) => {
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('propietarios')
        .insert([data])

      if (error) throw error

      router.push('/propietarios')
    } catch (error: any) {
      console.error('Error creando propietario:', error)
      
      // Manejar errores específicos
      if (error.code === '23505') {
        alert('Ya existe un propietario con ese DNI/CIF')
      } else {
        alert('Error al crear el propietario')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo propietario</h1>
          <p className="text-gray-600 mt-2">
            Añade un nuevo propietario al sistema
          </p>
        </div>
        
        <Link href="/propietarios">
          <Button variant="outline">
            Volver a propietarios
          </Button>
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <PropietarioFormComponent
          onSubmit={handleSubmit}
          loading={loading}
          submitText="Crear propietario"
        />
      </div>
    </div>
  )
} 