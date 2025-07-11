'use client'

export default function DebugPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_LOGIN_EMAIL: process.env.NEXT_PUBLIC_LOGIN_EMAIL,
    NEXT_PUBLIC_LOGIN_PASSWORD: process.env.NEXT_PUBLIC_LOGIN_PASSWORD ? 'SET' : 'NOT SET',
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Page - ASIF Grup</h1>
      <h2>Environment Variables:</h2>
      <ul>
        {Object.entries(envVars).map(([key, value]) => (
          <li key={key}>
            <strong>{key}:</strong> {value || 'UNDEFINED'}
          </li>
        ))}
      </ul>
      <h2>Runtime Info:</h2>
      <ul>
        <li><strong>Timestamp:</strong> {new Date().toLocaleString()}</li>
        <li><strong>User Agent:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'}</li>
        <li><strong>Window:</strong> {typeof window !== 'undefined' ? 'Client' : 'Server'}</li>
      </ul>
    </div>
  )
} 