-- SCRIPT DE MIGRACIÓN: Sistema de Liquidaciones Mensuales y Deudas de Inquilinos
-- =====================================================
-- Ejecutar en Supabase SQL Editor
-- Fecha: Enero 2025

-- 1. Eliminar la columna 'liquidado' de contratos_alquiler (era incorrecta)
ALTER TABLE public.contratos_alquiler 
DROP COLUMN IF EXISTS liquidado;

-- 2. Crear tabla de liquidaciones mensuales por contrato
CREATE TABLE IF NOT EXISTS public.liquidaciones_mensuales (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id uuid REFERENCES public.contratos_alquiler(id) ON DELETE CASCADE NOT NULL,
    mes smallint NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio smallint NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
    importe_liquidado numeric(10,2) NOT NULL, -- Importe que se liquidó ese mes
    fecha_liquidacion date NOT NULL DEFAULT now(), -- Cuándo se liquidó
    observaciones text, -- Notas sobre la liquidación
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(contrato_id, mes, anio) -- Solo una liquidación por contrato/mes/año
);

-- 3. Crear tabla de deudas de inquilinos (para tracking manual si es necesario)
CREATE TABLE IF NOT EXISTS public.deudas_inquilinos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id uuid REFERENCES public.contratos_alquiler(id) ON DELETE CASCADE NOT NULL,
    mes smallint NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio smallint NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
    importe_debido numeric(10,2) NOT NULL, -- Cuánto debe ese mes
    fecha_vencimiento date NOT NULL, -- Cuándo venció la deuda
    pagado boolean NOT NULL DEFAULT false, -- Si ya se pagó
    fecha_pago date, -- Cuándo se pagó (si se pagó)
    observaciones text, -- Notas sobre la deuda
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(contrato_id, mes, anio) -- Solo una deuda por contrato/mes/año
);

-- 4. Crear tabla de gastos por contrato
CREATE TABLE IF NOT EXISTS public.gastos_contrato (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id uuid REFERENCES public.contratos_alquiler(id) ON DELETE CASCADE NOT NULL,
    concepto text NOT NULL, -- Ej: "Reparaciones", "Mantenimiento", "IBI", etc.
    importe numeric(10,2) NOT NULL,
    fecha date NOT NULL,
    descripcion text, -- Descripción opcional del gasto
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_liquidaciones_contrato ON public.liquidaciones_mensuales(contrato_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_mes_anio ON public.liquidaciones_mensuales(mes, anio);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_fecha ON public.liquidaciones_mensuales(fecha_liquidacion);

CREATE INDEX IF NOT EXISTS idx_deudas_contrato ON public.deudas_inquilinos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_deudas_mes_anio ON public.deudas_inquilinos(mes, anio);
CREATE INDEX IF NOT EXISTS idx_deudas_pagado ON public.deudas_inquilinos(pagado);
CREATE INDEX IF NOT EXISTS idx_deudas_vencimiento ON public.deudas_inquilinos(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_gastos_contrato_contrato ON public.gastos_contrato(contrato_id);
CREATE INDEX IF NOT EXISTS idx_gastos_contrato_fecha ON public.gastos_contrato(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_contrato_concepto ON public.gastos_contrato(concepto);

-- 6. Habilitar RLS y crear políticas
ALTER TABLE public.liquidaciones_mensuales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todas las operaciones en liquidaciones_mensuales" ON public.liquidaciones_mensuales;
CREATE POLICY "Permitir todas las operaciones en liquidaciones_mensuales" 
ON public.liquidaciones_mensuales FOR ALL USING (true);

ALTER TABLE public.deudas_inquilinos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todas las operaciones en deudas_inquilinos" ON public.deudas_inquilinos;
CREATE POLICY "Permitir todas las operaciones en deudas_inquilinos" 
ON public.deudas_inquilinos FOR ALL USING (true);

ALTER TABLE public.gastos_contrato ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todas las operaciones en gastos_contrato" ON public.gastos_contrato;
CREATE POLICY "Permitir todas las operaciones en gastos_contrato" 
ON public.gastos_contrato FOR ALL USING (true);

-- 7. Crear triggers para updated_at
DROP TRIGGER IF EXISTS update_liquidaciones_updated_at ON public.liquidaciones_mensuales;
CREATE TRIGGER update_liquidaciones_updated_at 
BEFORE UPDATE ON public.liquidaciones_mensuales 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deudas_updated_at ON public.deudas_inquilinos;
CREATE TRIGGER update_deudas_updated_at 
BEFORE UPDATE ON public.deudas_inquilinos 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gastos_contrato_updated_at ON public.gastos_contrato;
CREATE TRIGGER update_gastos_contrato_updated_at 
BEFORE UPDATE ON public.gastos_contrato 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- FUNCIONES PARA CÁLCULOS DE DEUDAS Y LIQUIDACIONES
-- ===================================================================

-- Función para obtener meses pendientes de liquidar para un contrato
CREATE OR REPLACE FUNCTION obtener_meses_pendientes_liquidacion(contrato_uuid uuid)
RETURNS TABLE(
    mes smallint,
    anio smallint,
    nombre_mes text,
    importe_debido numeric,
    meses_atrasado integer
) AS $$
DECLARE
    fecha_inicio date;
    mes_actual integer := EXTRACT(MONTH FROM NOW());
    anio_actual integer := EXTRACT(YEAR FROM NOW());
    mes_iter integer;
    anio_iter integer;
    importe_contrato numeric;
BEGIN
    -- Obtener información del contrato
    SELECT ca.fecha_inicio_contrato, ca.importe_alquiler_mensual
    INTO fecha_inicio, importe_contrato
    FROM public.contratos_alquiler ca
    WHERE ca.id = contrato_uuid AND ca.activo = true;
    
    IF fecha_inicio IS NULL THEN
        RETURN;
    END IF;
    
    -- Iterar desde la fecha de inicio hasta el mes actual
    mes_iter := EXTRACT(MONTH FROM fecha_inicio);
    anio_iter := EXTRACT(YEAR FROM fecha_inicio);
    
    WHILE (anio_iter < anio_actual) OR (anio_iter = anio_actual AND mes_iter <= mes_actual) LOOP
        -- Verificar si este mes está liquidado
        IF NOT EXISTS (
            SELECT 1 FROM public.liquidaciones_mensuales lm
            WHERE lm.contrato_id = contrato_uuid 
            AND lm.mes = mes_iter 
            AND lm.anio = anio_iter
        ) THEN
            -- Este mes no está liquidado, agregarlo a la lista
            mes := mes_iter;
            anio := anio_iter;
            nombre_mes := CASE mes_iter
                WHEN 1 THEN 'Enero'
                WHEN 2 THEN 'Febrero'
                WHEN 3 THEN 'Marzo'
                WHEN 4 THEN 'Abril'
                WHEN 5 THEN 'Mayo'
                WHEN 6 THEN 'Junio'
                WHEN 7 THEN 'Julio'
                WHEN 8 THEN 'Agosto'
                WHEN 9 THEN 'Septiembre'
                WHEN 10 THEN 'Octubre'
                WHEN 11 THEN 'Noviembre'
                WHEN 12 THEN 'Diciembre'
            END;
            importe_debido := importe_contrato;
            meses_atrasado := (anio_actual - anio_iter) * 12 + (mes_actual - mes_iter);
            
            RETURN NEXT;
        END IF;
        
        -- Avanzar al siguiente mes
        mes_iter := mes_iter + 1;
        IF mes_iter > 12 THEN
            mes_iter := 1;
            anio_iter := anio_iter + 1;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de deudas por contrato
CREATE OR REPLACE FUNCTION obtener_resumen_deudas_contrato(contrato_uuid uuid)
RETURNS TABLE(
    total_deuda numeric,
    meses_pendientes integer,
    primer_mes_pendiente text,
    meses_atrasado integer
) AS $$
DECLARE
    deuda_total numeric := 0;
    contador_meses integer := 0;
    primer_mes text := '';
    max_atraso integer := 0;
    registro RECORD;
BEGIN
    -- Obtener todos los meses pendientes
    FOR registro IN 
        SELECT * FROM obtener_meses_pendientes_liquidacion(contrato_uuid)
        ORDER BY anio, mes
    LOOP
        deuda_total := deuda_total + registro.importe_debido;
        contador_meses := contador_meses + 1;
        
        IF primer_mes = '' THEN
            primer_mes := registro.nombre_mes || ' ' || registro.anio;
        END IF;
        
        IF registro.meses_atrasado > max_atraso THEN
            max_atraso := registro.meses_atrasado;
        END IF;
    END LOOP;
    
    total_deuda := deuda_total;
    meses_pendientes := contador_meses;
    primer_mes_pendiente := primer_mes;
    meses_atrasado := max_atraso;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Vista para obtener resumen completo de contratos con deudas
CREATE OR REPLACE VIEW vista_contratos_con_deudas AS
SELECT 
    ca.id as contrato_id,
    ca.importe_alquiler_mensual,
    ca.activo,
    ca.fecha_inicio_contrato,
    v.direccion_completa,
    p.nombre_completo as propietario,
    p.dni_cif as propietario_dni,
    -- Inquilinos concatenados
    string_agg(DISTINCT i.nombre_completo, ', ') as inquilinos,
    -- Gastos totales
    COALESCE(SUM(DISTINCT gc.importe), 0) as total_gastos,
    COUNT(DISTINCT gc.id) as numero_gastos,
    -- Liquidaciones
    COUNT(DISTINCT lm.id) as meses_liquidados,
    COALESCE(SUM(DISTINCT lm.importe_liquidado), 0) as total_liquidado
FROM public.contratos_alquiler ca
LEFT JOIN public.viviendas v ON ca.vivienda_id = v.id
LEFT JOIN public.propietarios p ON v.propietario_id = p.id
LEFT JOIN public.contratos_inquilinos ci ON ca.id = ci.contrato_id
LEFT JOIN public.inquilinos i ON ci.inquilino_id = i.id
LEFT JOIN public.gastos_contrato gc ON ca.id = gc.contrato_id
LEFT JOIN public.liquidaciones_mensuales lm ON ca.id = lm.contrato_id
GROUP BY ca.id, ca.importe_alquiler_mensual, ca.activo, ca.fecha_inicio_contrato, 
         v.direccion_completa, p.nombre_completo, p.dni_cif;

-- ===================================================================
-- FUNCIONES PARA GESTIÓN DE LIQUIDACIONES
-- ===================================================================

-- Función para liquidar un mes específico
CREATE OR REPLACE FUNCTION liquidar_mes_contrato(
    contrato_uuid uuid,
    mes_liquidar smallint,
    anio_liquidar smallint,
    importe_liquidar numeric,
    observaciones_liquidacion text DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
    -- Verificar que el contrato existe y está activo
    IF NOT EXISTS (
        SELECT 1 FROM public.contratos_alquiler 
        WHERE id = contrato_uuid AND activo = true
    ) THEN
        RAISE EXCEPTION 'El contrato no existe o no está activo';
        RETURN false;
    END IF;
    
    -- Verificar que no esté ya liquidado
    IF EXISTS (
        SELECT 1 FROM public.liquidaciones_mensuales
        WHERE contrato_id = contrato_uuid 
        AND mes = mes_liquidar 
        AND anio = anio_liquidar
    ) THEN
        RAISE EXCEPTION 'Este mes ya está liquidado';
        RETURN false;
    END IF;
    
    -- Insertar la liquidación
    INSERT INTO public.liquidaciones_mensuales (
        contrato_id, mes, anio, importe_liquidado, observaciones
    ) VALUES (
        contrato_uuid, mes_liquidar, anio_liquidar, importe_liquidar, observaciones_liquidacion
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Función para des-liquidar un mes (en caso de error)
CREATE OR REPLACE FUNCTION desliquidar_mes_contrato(
    contrato_uuid uuid,
    mes_desliquidar smallint,
    anio_desliquidar smallint
)
RETURNS boolean AS $$
BEGIN
    -- Eliminar la liquidación
    DELETE FROM public.liquidaciones_mensuales
    WHERE contrato_id = contrato_uuid 
    AND mes = mes_desliquidar 
    AND anio = anio_desliquidar;
    
    IF FOUND THEN
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Comentarios explicativos
COMMENT ON TABLE public.liquidaciones_mensuales IS 'Tabla para registrar qué meses han sido liquidados por cada contrato';
COMMENT ON TABLE public.deudas_inquilinos IS 'Tabla para tracking manual de deudas específicas de inquilinos';
COMMENT ON TABLE public.gastos_contrato IS 'Tabla para registrar gastos asociados a cada contrato de alquiler';
COMMENT ON COLUMN public.gastos_contrato.concepto IS 'Tipo de gasto: Reparaciones, Mantenimiento, IBI, Comunidad, Seguro, Gestoría, Otros';
COMMENT ON COLUMN public.gastos_contrato.importe IS 'Importe del gasto en euros (positivo)';
COMMENT ON COLUMN public.gastos_contrato.fecha IS 'Fecha en que se realizó el gasto';
COMMENT ON COLUMN public.gastos_contrato.descripcion IS 'Descripción detallada opcional del gasto';
COMMENT ON FUNCTION obtener_meses_pendientes_liquidacion IS 'Función que calcula automáticamente qué meses están pendientes de liquidar para un contrato';
COMMENT ON FUNCTION obtener_resumen_deudas_contrato IS 'Función que devuelve un resumen de la deuda total de un contrato';
COMMENT ON VIEW vista_contratos_con_deudas IS 'Vista que muestra todos los contratos con información de gastos y liquidaciones';

-- 9. Verificar los resultados de la migración
SELECT 
    'Verificación de migración:' as mensaje,
    (SELECT count(*) FROM public.contratos_alquiler) as total_contratos,
    (SELECT count(*) FROM public.liquidaciones_mensuales) as total_liquidaciones,
    (SELECT count(*) FROM public.gastos_contrato) as total_gastos;

-- Mensaje de finalización
SELECT 'Migración del sistema de liquidaciones mensuales completada exitosamente.' as resultado; 