'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Vivienda, ViviendaForm } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import ViviendaFormComponent from '@/components/forms/ViviendaForm'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function EditViviendaPage() {
  const [vivienda, setVivienda] = useState<Vivienda | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (params.id) {
      cargarVivienda(params.id as string)
    }
  }, [params.id])

  const cargarVivienda = async (id: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('viviendas')
        .select(`
          *,
          propietarios (
            id,
            nombre_completo,
            dni_cif
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      setVivienda(data)
    } catch (error) {
      console.error('Error cargando vivienda:', error)
      setError('Error al cargar la vivienda')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ViviendaForm) => {
    if (!vivienda) return

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('viviendas')
        .update(data)
        .eq('id', vivienda.id)

      if (error) throw error

      router.push('/viviendas')
    } catch (error: any) {
      console.error('Error actualizando vivienda:', error)
      alert('Error al actualizar la vivienda')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <LoadingSpinner text="Cargando vivienda..." />
      </div>
    )
  }

  if (error || !vivienda) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            {error || 'No se encontró la vivienda'}
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
            Editar vivienda
          </h1>
          <p className="text-gray-600 mt-2">
            Modifica los datos de {vivienda.direccion_completa}
          </p>
        </div>
        
        <Link href="/viviendas">
          <Button variant="outline">
            Volver a viviendas
          </Button>
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <ViviendaFormComponent
          initialData={vivienda}
          onSubmit={handleSubmit}
          loading={saving}
          submitText="Actualizar vivienda"
        />
      </div>
    </div>
  )
} 