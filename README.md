# Gestión de Alquileres - Aplicación de Recibos

Aplicación web para la gestión interna de recibos de alquiler de viviendas, construida con Next.js 14, TypeScript, Tailwind CSS y Supabase.

## 🚀 Características

- ✅ **Gestión de Propietarios**: CRUD completo con validación de DNI/CIF
- 🏘️ **Gestión de Viviendas**: Vinculación con propietarios
- 👥 **Gestión de Inquilinos**: Control de datos de inquilinos
- 📋 **Contratos de Alquiler**: Gestión de contratos activos
- 🧾 **Generación de Recibos**: PDFs automáticos con cálculos
- 📚 **Historial**: Seguimiento de recibos generados

## 🛠️ Configuración Inicial

### 1. Clonar y configurar el proyecto

```bash
git clone <tu-repositorio>
cd asifproyecto
npm install
```

### 2. Configurar Supabase

1. Crea una cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el script `supabase_schema.sql`
4. Crea un bucket en **Storage** llamado `recibos_alquiler`

### 3. Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Configuración de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-aqui

# Configuración opcional para los PDFs
NEXT_PUBLIC_INMOBILIARIA_NOMBRE="Tu Inmobiliaria S.L."
NEXT_PUBLIC_INMOBILIARIA_DIRECCION="Calle Principal 123, 08001 Barcelona"
NEXT_PUBLIC_INMOBILIARIA_CIF="B12345678"
NEXT_PUBLIC_INMOBILIARIA_TELEFONO="+34 93 123 45 67"
NEXT_PUBLIC_INMOBILIARIA_EMAIL="info@tuinmobiliaria.com"
```

### 4. Ejecutar la aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📝 Uso de la Aplicación

### Flujo recomendado:

1. **Propietarios**: Añade los propietarios de las viviendas
2. **Viviendas**: Registra las viviendas y asígnalas a propietarios
3. **Inquilinos**: Añade los datos de los inquilinos
4. **Contratos**: Crea contratos vinculando viviendas e inquilinos
5. **Recibos**: Genera recibos automáticamente cada mes

### Características importantes:

- **Validación automática** de DNI/CIF españoles
- **Cálculo automático** de gestión e IVA en recibos
- **PDFs profesionales** replicando el formato especificado
- **Interfaz responsive** optimizada para escritorio

## 🏗️ Estructura del Proyecto

```
asifproyecto/
├── app/                    # Páginas de Next.js 14 (App Router)
│   ├── propietarios/      # CRUD de propietarios
│   ├── viviendas/         # CRUD de viviendas
│   ├── inquilinos/        # CRUD de inquilinos
│   ├── contratos/         # CRUD de contratos
│   └── recibos/           # Generación y historial
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes básicos (Button, Input, etc.)
│   ├── forms/            # Formularios específicos
│   └── navigation/       # Navegación (Sidebar)
├── lib/                   # Utilidades y configuración
│   ├── supabase.ts       # Cliente de Supabase
│   ├── types.ts          # Tipos TypeScript
│   ├── utils.ts          # Funciones de utilidad
│   └── pdf-generator.ts  # Generación de PDFs
└── supabase_schema.sql   # Script SQL para la base de datos
```

## 🗄️ Base de Datos

### Tablas principales:

- **propietarios**: Datos de propietarios y porcentaje de gestión
- **viviendas**: Propiedades vinculadas a propietarios
- **inquilinos**: Datos de inquilinos
- **contratos_alquiler**: Contratos activos con importes
- **recibos_alquiler**: Recibos generados con cálculos

### Relaciones:

- Vivienda → Propietario (muchos a uno)
- Contrato → Vivienda + Inquilino (muchos a uno cada)
- Recibo → Contrato (muchos a uno)

## 💰 Cálculos Automáticos

Los recibos calculan automáticamente:

- **Importe bruto**: Alquiler mensual del contrato
- **Gestión**: Porcentaje del propietario sobre el bruto
- **IVA**: 21% sobre la gestión
- **Neto propietario**: Bruto - Gestión - IVA

## 🔧 Tecnologías Utilizadas

- **Next.js 14** (App Router)
- **TypeScript** para tipado estático
- **Tailwind CSS** para estilos
- **Supabase** como base de datos y storage
- **jsPDF** para generación de PDFs
- **React** para la interfaz de usuario

## 📄 Generación de PDFs

Los recibos se generan automáticamente replicando el formato especificado:

- Cabecera con datos de la inmobiliaria
- Información del inquilino y vivienda
- Desglose detallado de importes
- Datos del propietario
- Almacenamiento automático en Supabase Storage

## 🎯 Próximas mejoras

- [ ] Filtros avanzados en listados
- [ ] Exportación masiva de datos
- [ ] Notificaciones automáticas
- [ ] Dashboard con estadísticas
- [ ] Backup automático de datos

## 📞 Soporte

Esta es una aplicación de uso personal. Para modificaciones o mejoras, consulta el código fuente y la documentación de las tecnologías utilizadas.
