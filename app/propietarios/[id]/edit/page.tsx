'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Propietario, PropietarioForm } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import PropietarioFormComponent from '@/components/forms/PropietarioForm'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function EditPropietarioPage() {
  const [propietario, setPropietario] = useState<Propietario | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (params.id) {
      cargarPropietario(params.id as string)
    }
  }, [params.id])

  const cargarPropietario = async (id: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('propietarios')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setPropietario(data)
    } catch (error) {
      console.error('Error cargando propietario:', error)
      setError('Error al cargar el propietario')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: PropietarioForm) => {
    if (!propietario) return

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('propietarios')
        .update(data)
        .eq('id', propietario.id)

      if (error) throw error

      router.push('/propietarios')
    } catch (error: any) {
      console.error('Error actualizando propietario:', error)
      
      // Manejar errores específicos
      if (error.code === '23505') {
        alert('Ya existe un propietario con ese DNI/CIF')
      } else {
        alert('Error al actualizar el propietario')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <LoadingSpinner text="Cargando propietario..." />
      </div>
    )
  }

  if (error || !propietario) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            {error || 'No se encontró el propietario'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Editar propietario
          </h1>
          <p className="text-gray-600 mt-2">
            Modifica los datos de {propietario.nombre_completo}
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
          initialData={propietario}
          onSubmit={handleSubmit}
          loading={saving}
          submitText="Actualizar propietario"
        />
      </div>
    </div>
  )
} 