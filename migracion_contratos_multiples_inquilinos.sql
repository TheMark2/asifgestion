-- SCRIPT DE MIGRACIÓN: Contratos con múltiples inquilinos
-- =====================================================
-- Ejecutar solo si ya tienes contratos existentes con la estructura anterior
-- IMPORTANTE: Hacer backup de la base de datos antes de ejecutar

-- 1. Crear la nueva tabla de relaciones (si no existe)
CREATE TABLE IF NOT EXISTS public.contratos_inquilinos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id uuid REFERENCES public.contratos_alquiler(id) ON DELETE CASCADE NOT NULL,
    inquilino_id uuid REFERENCES public.inquilinos(id) NOT NULL,
    es_titular boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(contrato_id, inquilino_id)
);

-- 2. Crear índices para la nueva tabla
CREATE INDEX IF NOT EXISTS idx_contratos_inquilinos_contrato ON public.contratos_inquilinos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_inquilinos_inquilino ON public.contratos_inquilinos(inquilino_id);

-- 3. Habilitar RLS y crear política
ALTER TABLE public.contratos_inquilinos ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Permitir todas las operaciones en contratos_inquilinos" 
ON public.contratos_inquilinos FOR ALL USING (true);

-- 4. Migrar datos existentes (si existe la columna inquilino_id)
-- Verificar si la columna existe antes de migrar
DO $$ 
BEGIN
    -- Solo ejecutar si la columna inquilino_id existe en contratos_alquiler
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'contratos_alquiler' 
        AND column_name = 'inquilino_id'
        AND table_schema = 'public'
    ) THEN
        -- Migrar datos: cada contrato existente tendrá su inquilino como titular
        INSERT INTO public.contratos_inquilinos (contrato_id, inquilino_id, es_titular)
        SELECT id, inquilino_id, true 
        FROM public.contratos_alquiler 
        WHERE inquilino_id IS NOT NULL
        ON CONFLICT (contrato_id, inquilino_id) DO NOTHING;
        
        RAISE NOTICE 'Datos migrados exitosamente. Contratos procesados: %', 
            (SELECT count(*) FROM public.contratos_alquiler WHERE inquilino_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'La columna inquilino_id no existe. No hay datos que migrar.';
    END IF;
END $$;

-- 5. OPCIONAL: Eliminar la columna inquilino_id después de verificar que todo funciona
-- DESCOMENTA ESTAS LÍNEAS SOLO DESPUÉS DE VERIFICAR QUE LA MIGRACIÓN FUNCIONÓ:
/*
-- PASO OPCIONAL: Eliminar la columna anterior (CUIDADO: esto es irreversible)
-- ALTER TABLE public.contratos_alquiler DROP COLUMN IF EXISTS inquilino_id;
-- DROP INDEX IF EXISTS idx_contratos_inquilino;
*/

-- 6. Verificar los resultados de la migración
SELECT 
    'Verificación de migración:' as mensaje,
    (SELECT count(*) FROM public.contratos_alquiler) as total_contratos,
    (SELECT count(*) FROM public.contratos_inquilinos) as total_relaciones,
    (SELECT count(*) FROM public.contratos_inquilinos WHERE es_titular = true) as inquilinos_titulares;

-- 7. Ejemplo de consulta para verificar que los datos se migraron correctamente
SELECT 
    ca.id as contrato_id,
    v.direccion_completa as vivienda,
    string_agg(i.nombre_completo || CASE WHEN ci.es_titular THEN ' (Titular)' ELSE '' END, ', ') as inquilinos
FROM public.contratos_alquiler ca
LEFT JOIN public.viviendas v ON ca.vivienda_id = v.id
LEFT JOIN public.contratos_inquilinos ci ON ca.id = ci.contrato_id
LEFT JOIN public.inquilinos i ON ci.inquilino_id = i.id
GROUP BY ca.id, v.direccion_completa
ORDER BY ca.created_at DESC
LIMIT 10;

-- INSTRUCCIONES POST-MIGRACIÓN:
-- ===============================
-- 1. Verificar en la aplicación que todos los contratos muestran correctamente sus inquilinos
-- 2. Probar crear un nuevo contrato con múltiples inquilinos
-- 3. Probar editar un contrato existente
-- 4. Solo después de verificar que todo funciona, ejecutar el paso opcional para eliminar inquilino_id
-- 5. Actualizar cualquier consulta personalizada que use la columna inquilino_id 