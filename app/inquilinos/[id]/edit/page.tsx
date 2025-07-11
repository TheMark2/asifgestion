'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Inquilino, InquilinoForm } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import InquilinoFormComponent from '@/components/forms/InquilinoForm'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function EditInquilinoPage() {
  const [inquilino, setInquilino] = useState<Inquilino | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (params.id) {
      cargarInquilino(params.id as string)
    }
  }, [params.id])

  const cargarInquilino = async (id: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inquilinos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setInquilino(data)
    } catch (error) {
      console.error('Error cargando inquilino:', error)
      setError('Error al cargar el inquilino')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: InquilinoForm) => {
    if (!inquilino) return

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('inquilinos')
        .update(data)
        .eq('id', inquilino.id)

      if (error) throw error

      router.push('/inquilinos')
    } catch (error: any) {
      console.error('Error actualizando inquilino:', error)
      
      // Manejar errores específicos
      if (error.code === '23505') {
        alert('Ya existe un inquilino con ese DNI')
      } else {
        alert('Error al actualizar el inquilino')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <LoadingSpinner text="Cargando inquilino..." />
      </div>
    )
  }

  if (error || !inquilino) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            {error || 'No se encontró el inquilino'}
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
            Editar inquilino
          </h1>
          <p className="text-gray-600 mt-2">
            Modifica los datos de {inquilino.nombre_completo}
          </p>
        </div>
        
        <Link href="/inquilinos">
          <Button variant="outline">
            Volver a inquilinos
          </Button>
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <InquilinoFormComponent
          initialData={inquilino}
          onSubmit={handleSubmit}
          loading={saving}
          submitText="Actualizar inquilino"
        />
      </div>
    </div>
  )
} 