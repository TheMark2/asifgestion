'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContratoForm } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import ContratoFormComponent from '@/components/forms/ContratoForm'
import Button from '@/components/ui/Button'

export default function NewContratoPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: ContratoForm) => {
    try {
      setLoading(true)
      
      // Crear el contrato sin inquilinos
      const contratoData = {
        vivienda_id: data.vivienda_id,
        fecha_inicio_contrato: data.fecha_inicio_contrato,
        fecha_fin_contrato: data.fecha_fin_contrato,
        importe_alquiler_mensual: data.importe_alquiler_mensual,
        activo: data.activo
      }

      const { data: contratoCreado, error: contratoError } = await supabase
        .from('contratos_alquiler')
        .insert([contratoData])
        .select()
        .single()

      if (contratoError) throw contratoError

      // Crear las relaciones con los inquilinos
      if (data.inquilinos_ids && data.inquilinos_ids.length > 0) {
        const relacionesInquilinos = data.inquilinos_ids.map(inquilinoId => ({
          contrato_id: contratoCreado.id,
          inquilino_id: inquilinoId,
          es_titular: inquilinoId === data.inquilino_titular_id
        }))

        const { error: relacionesError } = await supabase
          .from('contratos_inquilinos')
          .insert(relacionesInquilinos)

        if (relacionesError) throw relacionesError
      }

      alert('Contrato creado exitosamente')
      router.push('/contratos')
    } catch (error: any) {
      console.error('Error creando contrato:', error)
      alert('Error al crear el contrato: ' + (error.message || 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo contrato</h1>
          <p className="text-gray-600 mt-2">
            Crea un nuevo contrato de alquiler (ahora con soporte para múltiples inquilinos)
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
          onSubmit={handleSubmit}
          loading={loading}
          submitText="Crear contrato"
        />
      </div>
    </div>
  )
} 