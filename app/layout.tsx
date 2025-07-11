import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import AuthWrapperClean from '@/components/auth/AuthWrapperClean'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gestión de Alquileres',
  description: 'Sistema de gestión para propiedades de alquiler',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="light">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <AuthProvider>
          <AuthWrapperClean>
            {children}
          </AuthWrapperClean>
        </AuthProvider>
      </body>
    </html>
  )
} 