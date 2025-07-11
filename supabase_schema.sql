-- Esquema SQL para la aplicación de gestión de recibos de alquiler
-- Ejecutar en Supabase SQL Editor

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

-- NUEVA TABLA: Relación muchos-a-muchos entre contratos e inquilinos
CREATE TABLE public.contratos_inquilinos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id uuid REFERENCES public.contratos_alquiler(id) ON DELETE CASCADE NOT NULL,
    inquilino_id uuid REFERENCES public.inquilinos(id) NOT NULL,
    es_titular boolean NOT NULL DEFAULT false, -- Para designar un inquilino principal si es necesario
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(contrato_id, inquilino_id) -- Un inquilino no puede estar duplicado en el mismo contrato
);

-- Tabla de recibos de alquiler
CREATE TABLE public.recibos_alquiler (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id uuid REFERENCES public.contratos_alquiler(id) NOT NULL,
    mes smallint NOT NULL CHECK (mes >= 1 AND mes <= 12), -- 1-12
    anio smallint NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
    fecha_emision date NOT NULL DEFAULT now(),
    importe_bruto_percibido numeric(10,2) NOT NULL,
    importe_gestion numeric(10,2) NOT NULL,
    iva_gestion numeric(10,2) NOT NULL,
    importe_neto_propietario numeric(10,2) NOT NULL,
    forma_pago_inquilino text, -- Ej: "Transferencia bancaria"
    referencia_pago_inquilino text,
    ruta_pdf_supabase text, -- URL del PDF en Supabase Storage
    generado boolean NOT NULL DEFAULT false, -- Para indicar si el PDF ya se creó
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(contrato_id, mes, anio) -- Un solo recibo por contrato/mes/año
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_viviendas_propietario ON public.viviendas(propietario_id);
CREATE INDEX idx_contratos_vivienda ON public.contratos_alquiler(vivienda_id);
CREATE INDEX idx_contratos_activo ON public.contratos_alquiler(activo);
CREATE INDEX idx_contratos_inquilinos_contrato ON public.contratos_inquilinos(contrato_id);
CREATE INDEX idx_contratos_inquilinos_inquilino ON public.contratos_inquilinos(inquilino_id);
CREATE INDEX idx_recibos_contrato ON public.recibos_alquiler(contrato_id);
CREATE INDEX idx_recibos_mes_anio ON public.recibos_alquiler(mes, anio);
CREATE INDEX idx_recibos_generado ON public.recibos_alquiler(generado);

-- RLS (Row Level Security) - Como no hay autenticación, permitir todo
ALTER TABLE public.propietarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viviendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_alquiler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos_alquiler ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (permitir todas las operaciones)
CREATE POLICY "Permitir todas las operaciones en propietarios" ON public.propietarios FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en viviendas" ON public.viviendas FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en inquilinos" ON public.inquilinos FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en contratos_alquiler" ON public.contratos_alquiler FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en contratos_inquilinos" ON public.contratos_inquilinos FOR ALL USING (true);
CREATE POLICY "Permitir todas las operaciones en recibos_alquiler" ON public.recibos_alquiler FOR ALL USING (true);

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

-- Crear bucket para almacenar PDFs (ejecutar desde Supabase Dashboard o con supabae-js)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recibos_alquiler', 'recibos_alquiler', false);

-- Política para el bucket de PDFs
-- CREATE POLICY "Permitir todas las operaciones en bucket recibos_alquiler" ON storage.objects FOR ALL USING (bucket_id = 'recibos_alquiler');

-- SCRIPT DE MIGRACIÓN para contratos existentes (ejecutar solo si ya tienes datos)
-- Si ya tienes contratos con inquilino_id, ejecuta esto para migrar los datos:
/*
INSERT INTO public.contratos_inquilinos (contrato_id, inquilino_id, es_titular)
SELECT id, inquilino_id, true 
FROM public.contratos_alquiler 
WHERE inquilino_id IS NOT NULL;

-- Después de migrar, eliminar la columna inquilino_id (opcional)
-- ALTER TABLE public.contratos_alquiler DROP COLUMN inquilino_id;
*/ 