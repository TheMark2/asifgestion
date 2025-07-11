'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ContratoAlquiler, ContratoForm } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import ContratoFormComponent from '@/components/forms/ContratoForm'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function EditContratoPage() {
  const [contrato, setContrato] = useState<ContratoAlquiler | null>(null)
  const [contratoFormData, setContratoFormData] = useState<ContratoForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (params.id) {
      cargarContrato(params.id as string)
    }
  }, [params.id])

  const cargarContrato = async (id: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('contratos_alquiler')
        .select(`
          *,
          viviendas (
            id,
            direccion_completa
          ),
          contratos_inquilinos (
            id,
            inquilino_id,
            es_titular,
            inquilinos (
              id,
              nombre_completo,
              dni
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      // Transformar los datos para el formulario
      const inquilinosIds = data.contratos_inquilinos?.map((ci: any) => ci.inquilino_id) || []
      const inquilinoTitular = data.contratos_inquilinos?.find((ci: any) => ci.es_titular)
      const inquilinos = data.contratos_inquilinos?.map((ci: any) => ci.inquilinos).filter(Boolean) || []

      const formData: ContratoForm = {
        vivienda_id: data.vivienda_id,
        inquilinos_ids: inquilinosIds,
        inquilino_titular_id: inquilinoTitular?.inquilino_id || '',
        fecha_inicio_contrato: data.fecha_inicio_contrato,
        fecha_fin_contrato: data.fecha_fin_contrato || '',
        importe_alquiler_mensual: data.importe_alquiler_mensual,
        activo: data.activo
      }

      setContrato({ ...data, inquilinos })
      setContratoFormData(formData)
    } catch (error) {
      console.error('Error cargando contrato:', error)
      setError('Error al cargar el contrato')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ContratoForm) => {
    if (!contrato) return

    try {
      setSaving(true)
      
      // Actualizar los datos del contrato
      const contratoData = {
        vivienda_id: data.vivienda_id,
        fecha_inicio_contrato: data.fecha_inicio_contrato,
        fecha_fin_contrato: data.fecha_fin_contrato,
        importe_alquiler_mensual: data.importe_alquiler_mensual,
        activo: data.activo
      }

      const { error: contratoError } = await supabase
        .from('contratos_alquiler')
        .update(contratoData)
        .eq('id', contrato.id)

      if (contratoError) throw contratoError

      // Eliminar todas las relaciones existentes
      const { error: deleteError } = await supabase
        .from('contratos_inquilinos')
        .delete()
        .eq('contrato_id', contrato.id)

      if (deleteError) throw deleteError

      // Crear las nuevas relaciones con los inquilinos
      if (data.inquilinos_ids && data.inquilinos_ids.length > 0) {
        const relacionesInquilinos = data.inquilinos_ids.map(inquilinoId => ({
          contrato_id: contrato.id,
          inquilino_id: inquilinoId,
          es_titular: inquilinoId === data.inquilino_titular_id
        }))

        const { error: relacionesError } = await supabase
          .from('contratos_inquilinos')
          .insert(relacionesInquilinos)

        if (relacionesError) throw relacionesError
      }

      alert('Contrato actualizado exitosamente')
      router.push('/contratos')
    } catch (error: any) {
      console.error('Error actualizando contrato:', error)
      alert('Error al actualizar el contrato: ' + (error.message || 'Error desconocido'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <LoadingSpinner text="Cargando contrato..." />
      </div>
    )
  }

  if (error || !contrato || !contratoFormData) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            {error || 'No se encontró el contrato'}
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
            Editar contrato
          </h1>
          <p className="text-gray-600 mt-2">
            Vivienda: {contrato.viviendas?.direccion_completa}
          </p>
          <p className="text-gray-500 text-sm">
            Inquilinos: {contrato.inquilinos?.map((i: any) => i.nombre_completo).join(', ') || 'Sin inquilinos'}
          </p>
        </div>
        
        <Link href="/contratos">
          <Button variant="outline">
            Volver a contratos
          </Button>
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <ContratoFormComponent
          initialData={contratoFormData}
          onSubmit={handleSubmit}
          loading={saving}
          submitText="Actualizar contrato"
        />
      </div>
    </div>
  )
} 