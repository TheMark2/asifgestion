'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ViviendaForm } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import ViviendaFormComponent from '@/components/forms/ViviendaForm'
import Button from '@/components/ui/Button'

export default function NewViviendaPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: ViviendaForm) => {
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('viviendas')
        .insert([data])

      if (error) throw error

      router.push('/viviendas')
    } catch (error: any) {
      console.error('Error creando vivienda:', error)
      alert('Error al crear la vivienda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva vivienda</h1>
          <p className="text-gray-600 mt-2">
            Añade una nueva vivienda al sistema
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
          onSubmit={handleSubmit}
          loading={loading}
          submitText="Crear vivienda"
        />
      </div>
    </div>
  )
} 