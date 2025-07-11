'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { InquilinoForm } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import InquilinoFormComponent from '@/components/forms/InquilinoForm'
import Button from '@/components/ui/Button'

export default function NewInquilinoPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: InquilinoForm) => {
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('inquilinos')
        .insert([data])

      if (error) throw error

      router.push('/inquilinos')
    } catch (error: any) {
      console.error('Error creando inquilino:', error)
      
      // Manejar errores específicos
      if (error.code === '23505') {
        alert('Ya existe un inquilino con ese DNI')
      } else {
        alert('Error al crear el inquilino')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo inquilino</h1>
          <p className="text-gray-600 mt-2">
            Añade un nuevo inquilino al sistema
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
          onSubmit={handleSubmit}
          loading={loading}
          submitText="Crear inquilino"
        />
      </div>
    </div>
  )
} 