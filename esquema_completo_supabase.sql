-- ===================================================================
-- ESQUEMA COMPLETO SUPABASE - SISTEMA DE GESTIÓN DE RECIBOS DE ALQUILER
-- ===================================================================
-- Ejecutar en Supabase SQL Editor
-- Fecha de actualización: Enero 2025

-- ===================================================================
-- TABLAS PRINCIPALES
-- ===================================================================

-- Tabla de propietarios
CREATE TABLE public.propietarios (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_completo text NOT NULL,
    dni_cif text NOT NULL UNIQUE,
    calle text,
    ciudad text,
    codigo_postal text,
    provincia text,
    email text,
    telefono text,
    porcentaje_gestion numeric(5,2) NOT NULL DEFAULT 0.00, -- Ej: 3.00 para 3%
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de viviendas
CREATE TABLE public.viviendas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    propietario_id uuid REFERENCES public.propietarios(id) NOT NULL,
    direccion_completa text NOT NULL, -- Ej: "C/ Sant Saturní nº 2, 2º C, Sant Feliu de Codines, 08182, Barcelona"
    calle text,
    numero text,
    piso_puerta text,
    ciudad text,
    codigo_postal text,
    provincia text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de inquilinos
CREATE TABLE public.inquilinos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_completo text NOT NULL,
    dni text NOT NULL UNIQUE,
    email text,
    telefono text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de contratos de alquiler (SIN inquilino_id, ya que ahora es una relación muchos-a-muchos)
CREATE TABLE public.contratos_alquiler (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vivienda_id uuid REFERENCES public.viviendas(id) NOT NULL,
    fecha_inicio_contrato date NOT NULL,
    fecha_fin_contrato date, -- Null si es indefinido
    importe_alquiler_mensual numeric(10,2) NOT NULL,
    activo boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA: Relación muchos-a-muchos entre contratos e inquilinos
CREATE TABLE public.contratos_inquilinos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id uuid REFERENCES public.contratos_alquiler(id) ON DELETE CASCADE NOT NULL,
    inquilino_id uuid REFERENCES public.inquilinos(id) NOT NULL,
    es_titular boolean NOT NULL DEFAULT false, -- Para designar un inquilino principal si es necesario
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(contrato_id, inquilino_id) -- Un inquilino no puede estar duplicado en el mismo contrato
);

-- ===================================================================
-- NUEVAS TABLAS PARA GESTIÓN AVANZADA DE RECIBOS
-- ===================================================================

-- Tabla de períodos de recibos - Para gestionar múltiples meses en un recibo
CREATE TABLE public.periodos_recibo (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    mes smallint NOT NULL CHECK (mes >= 1 AND mes <= 12), -- 1-12
    anio smallint NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
    nombre_periodo text NOT NULL, -- Ej: "Enero 2025", "Febrero-Marzo 2025"
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(mes, anio)
);

-- Tabla de recibos de alquiler - MEJORADA para soportar múltiples meses
CREATE TABLE public.recibos_alquiler (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id uuid REFERENCES public.contratos_alquiler(id) NOT NULL,
    numero_recibo text UNIQUE NOT NULL, -- Número único del recibo
    fecha_emision date NOT NULL DEFAULT now(),
    importe_total_bruto numeric(10,2) NOT NULL, -- Suma de todos los meses
    importe_total_gestion numeric(10,2) NOT NULL,
    iva_total_gestion numeric(10,2) NOT NULL,
    importe_total_neto_propietario numeric(10,2) NOT NULL,
    forma_pago_inquilino text, -- Ej: "Transferencia bancaria"
    referencia_pago_inquilino text,
    observaciones text, -- Para notas adicionales sobre pagos atrasados
    ruta_pdf_supabase text, -- URL del PDF en Supabase Storage
    generado boolean NOT NULL DEFAULT false, -- Para indicar si el PDF ya se creó
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de detalle de meses en cada recibo - Para recibos multi-mes
CREATE TABLE public.recibos_detalle_meses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recibo_id uuid REFERENCES public.recibos_alquiler(id) ON DELETE CASCADE NOT NULL,
    mes smallint NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio smallint NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
    importe_mes numeric(10,2) NOT NULL, -- Importe para este mes específico
    importe_gestion_mes numeric(10,2) NOT NULL,
    iva_gestion_mes numeric(10,2) NOT NULL,
    importe_neto_mes numeric(10,2) NOT NULL,
    es_mes_atrasado boolean NOT NULL DEFAULT false, -- Indica si era un mes pendiente
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(recibo_id, mes, anio) -- Un mes no puede estar duplicado en el mismo recibo
);

-- Tabla de meses pendientes de pago - Para gestión automática
CREATE TABLE public.meses_pendientes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id uuid REFERENCES public.contratos_alquiler(id) ON DELETE CASCADE NOT NULL,
    mes smallint NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio smallint NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
    importe_pendiente numeric(10,2) NOT NULL,
    fecha_vencimiento date NOT NULL, -- Fecha límite de pago
    notificado boolean NOT NULL DEFAULT false, -- Si se ha notificado al propietario
    fecha_notificacion date, -- Cuándo se notificó
    pagado boolean NOT NULL DEFAULT false, -- Si ya se pagó (al generar recibo)
    recibo_id uuid REFERENCES public.recibos_alquiler(id), -- Qué recibo lo pagó
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(contrato_id, mes, anio) -- Un mes no puede estar duplicado como pendiente
);

-- ===================================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ===================================================================

-- Índices existentes
CREATE INDEX idx_viviendas_propietario ON public.viviendas(propietario_id);
CREATE INDEX idx_contratos_vivienda ON public.contratos_alquiler(vivienda_id);
CREATE INDEX idx_contratos_activo ON public.contratos_alquiler(activo);
CREATE INDEX idx_contratos_inquilinos_contrato ON public.contratos_inquilinos(contrato_id);
CREATE INDEX idx_contratos_inquilinos_inquilino ON public.contratos_inquilinos(inquilino_id);

-- Nuevos índices para las nuevas tablas
CREATE INDEX idx_recibos_contrato ON public.recibos_alquiler(contrato_id);
CREATE INDEX idx_recibos_numero ON public.recibos_alquiler(numero_recibo);
CREATE INDEX idx_recibos_generado ON public.recibos_alquiler(generado);
CREATE INDEX idx_recibos_detalle_recibo ON public.recibos_detalle_meses(recibo_id);
CREATE INDEX idx_recibos_detalle_mes_anio ON public.recibos_detalle_meses(mes, anio);
CREATE INDEX idx_meses_pendientes_contrato ON public.meses_pendientes(contrato_id);
CREATE INDEX idx_meses_pendientes_pagado ON public.meses_pendientes(pagado);
CREATE INDEX idx_meses_pendientes_notificado ON public.meses_pendientes(notificado);
CREATE INDEX idx_meses_pendientes_vencimiento ON public.meses_pendientes(fecha_vencimiento);

-- ===================================================================
-- RLS (ROW LEVEL SECURITY)
-- ===================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.propietarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viviendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_alquiler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos_alquiler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos_detalle_meses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meses_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_recibo ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (permitir todas las operaciones)
CREATE POLICY "Permitir todas las operaciones en propietarios" ON public.propietarios FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en viviendas" ON public.viviendas FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en inquilinos" ON public.inquilinos FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en contratos_alquiler" ON public.contratos_alquiler FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en contratos_inquilinos" ON public.contratos_inquilinos FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en recibos_alquiler" ON public.recibos_alquiler FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en recibos_detalle_meses" ON public.recibos_detalle_meses FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en meses_pendientes" ON public.meses_pendientes FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en periodos_recibo" ON public.periodos_recibo FOR ALL USING (true);

-- ===================================================================
-- FUNCIONES Y TRIGGERS
-- ===================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_propietarios_updated_at BEFORE UPDATE ON public.propietarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_viviendas_updated_at BEFORE UPDATE ON public.viviendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inquilinos_updated_at BEFORE UPDATE ON public.inquilinos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos_alquiler FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recibos_updated_at BEFORE UPDATE ON public.recibos_alquiler FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meses_pendientes_updated_at BEFORE UPDATE ON public.meses_pendientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- FUNCIONES ESPECÍFICAS DEL SISTEMA
-- ===================================================================

-- Función para generar número de recibo único
CREATE OR REPLACE FUNCTION generar_numero_recibo()
RETURNS TEXT AS $$
DECLARE
    contador INT;
    año_actual INT := EXTRACT(YEAR FROM NOW());
    nuevo_numero TEXT;
BEGIN
    -- Obtener el siguiente número para el año actual
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_recibo FROM 'REC-' || año_actual || '-(\d+)') AS INT)), 0) + 1
    INTO contador
    FROM public.recibos_alquiler
    WHERE numero_recibo LIKE 'REC-' || año_actual || '-%';
    
    -- Generar el número con formato REC-YYYY-NNNN
    nuevo_numero := 'REC-' || año_actual || '-' || LPAD(contador::TEXT, 4, '0');
    
    RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- Función para detectar meses pendientes automáticamente
CREATE OR REPLACE FUNCTION detectar_meses_pendientes()
RETURNS void AS $$
DECLARE
    contrato_rec RECORD;
    mes_actual INT := EXTRACT(MONTH FROM NOW());
    anio_actual INT := EXTRACT(YEAR FROM NOW());
    fecha_inicio DATE;
    mes_iter INT;
    anio_iter INT;
    fecha_venc DATE;
BEGIN
    -- Para cada contrato activo
    FOR contrato_rec IN 
        SELECT ca.id, ca.fecha_inicio_contrato, ca.importe_alquiler_mensual
        FROM public.contratos_alquiler ca
        WHERE ca.activo = true
    LOOP
        fecha_inicio := contrato_rec.fecha_inicio_contrato;
        
        -- Desde el mes de inicio del contrato hasta el mes actual
        mes_iter := EXTRACT(MONTH FROM fecha_inicio);
        anio_iter := EXTRACT(YEAR FROM fecha_inicio);
        
        WHILE (anio_iter < anio_actual) OR (anio_iter = anio_actual AND mes_iter <= mes_actual) LOOP
            -- Verificar si ya existe un recibo para este mes
            IF NOT EXISTS (
                SELECT 1 FROM public.recibos_detalle_meses rdm
                JOIN public.recibos_alquiler ra ON rdm.recibo_id = ra.id
                WHERE ra.contrato_id = contrato_rec.id 
                AND rdm.mes = mes_iter 
                AND rdm.anio = anio_iter
            ) AND NOT EXISTS (
                SELECT 1 FROM public.meses_pendientes mp
                WHERE mp.contrato_id = contrato_rec.id 
                AND mp.mes = mes_iter 
                AND mp.anio = anio_iter
            ) THEN
                -- Calcular fecha de vencimiento (último día del mes)
                fecha_venc := (DATE_TRUNC('MONTH', MAKE_DATE(anio_iter, mes_iter, 1)) + INTERVAL '1 month - 1 day')::DATE;
                
                -- Insertar como mes pendiente
                INSERT INTO public.meses_pendientes (
                    contrato_id, mes, anio, importe_pendiente, fecha_vencimiento
                ) VALUES (
                    contrato_rec.id, mes_iter, anio_iter, contrato_rec.importe_alquiler_mensual, fecha_venc
                );
            END IF;
            
            -- Avanzar al siguiente mes
            mes_iter := mes_iter + 1;
            IF mes_iter > 12 THEN
                mes_iter := 1;
                anio_iter := anio_iter + 1;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- CONFIGURACIÓN DE STORAGE
-- ===================================================================

-- Crear bucket para almacenar PDFs (ejecutar desde Supabase Dashboard o con supabase-js)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recibos_alquiler', 'recibos_alquiler', false);

-- Política para el bucket de PDFs
-- CREATE POLICY "Permitir todas las operaciones en bucket recibos_alquiler" ON storage.objects FOR ALL USING (bucket_id = 'recibos_alquiler');

-- ===================================================================
-- DATOS INICIALES (OPCIONAL)
-- ===================================================================

-- Insertar períodos comunes para facilitar el uso
INSERT INTO public.periodos_recibo (mes, anio, nombre_periodo) VALUES
(1, 2025, 'Enero 2025'),
(2, 2025, 'Febrero 2025'),
(3, 2025, 'Marzo 2025'),
(4, 2025, 'Abril 2025'),
(5, 2025, 'Mayo 2025'),
(6, 2025, 'Junio 2025'),
(7, 2025, 'Julio 2025'),
(8, 2025, 'Agosto 2025'),
(9, 2025, 'Septiembre 2025'),
(10, 2025, 'Octubre 2025'),
(11, 2025, 'Noviembre 2025'),
(12, 2025, 'Diciembre 2025')
ON CONFLICT (mes, anio) DO NOTHING;

-- ===================================================================
-- NOTAS IMPORTANTES
-- ===================================================================

/*
MIGRACIÓN DESDE SISTEMA ANTERIOR:
1. Si ya tienes datos en recibos_alquiler (tabla anterior), ejecuta:
   
   -- Migrar recibos existentes a la nueva estructura
   INSERT INTO public.recibos_alquiler_nuevo 
   SELECT 
     id,
     contrato_id,
     'REC-' || anio || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') as numero_recibo,
     fecha_emision,
     importe_bruto_percibido as importe_total_bruto,
     importe_gestion as importe_total_gestion,
     iva_gestion as iva_total_gestion,
     importe_neto_propietario as importe_total_neto_propietario,
     forma_pago_inquilino,
     referencia_pago_inquilino,
     NULL as observaciones,
     ruta_pdf_supabase,
     generado,
     created_at,
     updated_at
   FROM public.recibos_alquiler_anterior;
   
   -- Crear detalles de mes para cada recibo migrado
   INSERT INTO public.recibos_detalle_meses (recibo_id, mes, anio, importe_mes, importe_gestion_mes, iva_gestion_mes, importe_neto_mes)
   SELECT 
     id as recibo_id,
     mes,
     anio,
     importe_total_bruto,
     importe_total_gestion,
     iva_total_gestion,
     importe_total_neto_propietario
   FROM public.recibos_alquiler_nuevo;

2. Ejecutar detectar_meses_pendientes() para generar automáticamente los meses pendientes:
   SELECT detectar_meses_pendientes();

3. Configurar un CRON job para ejecutar detectar_meses_pendientes() mensualmente
*/ 