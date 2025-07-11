-- SCRIPT DE MIGRACIÓN: Añadir campos de sociedad y co-propietario
-- =====================================================
-- IMPORTANTE: Hacer backup de la base de datos antes de ejecutar

-- 1. Añadir las nuevas columnas a la tabla propietarios
ALTER TABLE public.propietarios
ADD COLUMN IF NOT EXISTS es_sociedad boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS co_propietario text;

-- 2. Actualizar los registros existentes
UPDATE public.propietarios
SET es_sociedad = false,
    co_propietario = null
WHERE es_sociedad IS NULL;

-- 3. Añadir comentarios a las columnas
COMMENT ON COLUMN public.propietarios.es_sociedad IS 'Indica si el propietario es una sociedad';
COMMENT ON COLUMN public.propietarios.co_propietario IS 'Nombre del co-propietario si existe'; 
 
 