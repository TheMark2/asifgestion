# Despliegue en Vercel - ASIF Grup

## Preparación para el despliegue

### 1. Variables de entorno necesarias

Configura las siguientes variables en tu panel de Vercel:

```env
# Configuración de Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Configuración de autenticación
NEXT_PUBLIC_LOGIN_EMAIL=asifgrup@gmail.com
NEXT_PUBLIC_LOGIN_PASSWORD=AsifGestion2024#

# Configuración opcional para PDFs
NEXT_PUBLIC_COMPANY_NAME=ASIF Grup
NEXT_PUBLIC_COMPANY_ADDRESS=Your company address
NEXT_PUBLIC_COMPANY_PHONE=Your company phone
NEXT_PUBLIC_COMPANY_EMAIL=Your company email

# URLs para producción
NEXT_PUBLIC_BASE_URL=https://your-vercel-app.vercel.app
```

### 2. Comandos de despliegue

```bash
# Instalar Vercel CLI
npm install -g vercel

# Hacer login en Vercel
vercel login

# Desplegar (primera vez)
vercel --prod

# Despliegues posteriores
vercel --prod
```

### 3. Configuración automática

El proyecto incluye:
- ✅ `vercel.json` configurado
- ✅ Scripts npm optimizados
- ✅ Configuración de funciones serverless
- ✅ Manejo de PDFs con timeout extendido

### 4. Pasos post-despliegue

1. **Configurar dominio personalizado** (opcional)
2. **Verificar variables de entorno** en el panel de Vercel
3. **Probar autenticación** con las credenciales configuradas
4. **Validar generación de PDFs** en el entorno de producción

### 5. Monitoreo y mantenimiento

- Revisar logs en el panel de Vercel
- Configurar alertas para errores críticos
- Mantener actualizada la base de datos de Supabase

## Características incluidas

- 🔐 Sistema de autenticación simplificado
- 📊 Dashboard con estadísticas en tiempo real
- 🔍 Filtros de búsqueda en todas las páginas
- 📄 Generación automática de PDFs
- 📱 Diseño responsivo y moderno
- 🚀 Optimizado para producción

## Soporte técnico

En caso de problemas durante el despliegue:
1. Verificar que todas las variables de entorno estén configuradas
2. Revisar los logs de Vercel para identificar errores
3. Asegurar que la base de datos de Supabase esté accesible
4. Validar que las credenciales de autenticación sean correctas 