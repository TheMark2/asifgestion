export default function SimplePage() {
  return (
    <html>
      <head>
        <title>Simple Page</title>
      </head>
      <body style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>Simple Page - ASIF Grup</h1>
        <p>Esta página no usa AuthWrapper ni contexto.</p>
        <p>Si funciona, el problema está en la autenticación.</p>
        <p>Timestamp: {new Date().toISOString()}</p>
      </body>
    </html>
  )
} 