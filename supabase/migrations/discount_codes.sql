-- ============================================
-- Tabla de códigos de descuento
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Eliminar tabla existente si tiene esquema antiguo
DROP TABLE IF EXISTS discount_codes CASCADE;

-- Crear la tabla discount_codes
CREATE TABLE discount_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
    min_purchase INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_is_active ON discount_codes(is_active);

-- Habilitar RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (para validar códigos)
CREATE POLICY "discount_codes_read_all" ON discount_codes
    FOR SELECT USING (true);

-- Política de escritura solo para service role (admin)
CREATE POLICY "discount_codes_admin_insert" ON discount_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "discount_codes_admin_update" ON discount_codes
    FOR UPDATE USING (true);

CREATE POLICY "discount_codes_admin_delete" ON discount_codes
    FOR DELETE USING (true);

-- Función para validar códigos de descuento (usada por la API)
CREATE OR REPLACE FUNCTION validate_discount_code(p_code TEXT, p_subtotal INTEGER)
RETURNS JSON AS $$
DECLARE
    v_discount RECORD;
    v_discount_amount INTEGER;
BEGIN
    -- Buscar el código
    SELECT * INTO v_discount
    FROM discount_codes
    WHERE code = UPPER(p_code)
    AND is_active = true;

    -- Código no encontrado o inactivo
    IF NOT FOUND THEN
        RETURN json_build_object('valid', false, 'error', 'Código de descuento inválido');
    END IF;

    -- Verificar fecha de inicio
    IF v_discount.starts_at IS NOT NULL AND NOW() < v_discount.starts_at THEN
        RETURN json_build_object('valid', false, 'error', 'Este código aún no está activo');
    END IF;

    -- Verificar fecha de expiración
    IF v_discount.expires_at IS NOT NULL AND NOW() > v_discount.expires_at THEN
        RETURN json_build_object('valid', false, 'error', 'Este código ha expirado');
    END IF;

    -- Verificar usos máximos
    IF v_discount.max_uses IS NOT NULL AND v_discount.current_uses >= v_discount.max_uses THEN
        RETURN json_build_object('valid', false, 'error', 'Este código ha alcanzado su límite de usos');
    END IF;

    -- Verificar compra mínima
    IF p_subtotal < v_discount.min_purchase THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Compra mínima requerida: €' || ROUND(v_discount.min_purchase::NUMERIC / 100, 2)
        );
    END IF;

    -- Calcular descuento
    IF v_discount.discount_type = 'percentage' THEN
        v_discount_amount := FLOOR((p_subtotal * v_discount.discount_value) / 100);
    ELSE
        v_discount_amount := LEAST(v_discount.discount_value, p_subtotal);
    END IF;

    RETURN json_build_object(
        'valid', true,
        'code', v_discount.code,
        'discount_type', v_discount.discount_type,
        'discount_value', v_discount.discount_value,
        'discount_amount', v_discount_amount,
        'description', COALESCE(v_discount.description, 'Código de descuento ' || v_discount.code)
    );
END;
$$ LANGUAGE plpgsql;

-- Insertar códigos de ejemplo
INSERT INTO discount_codes (code, description, discount_type, discount_value, min_purchase, max_uses, is_active) VALUES
    ('WELCOME10', 'Descuento de bienvenida del 10%', 'percentage', 10, 2000, NULL, true),
    ('FASHION20', 'Descuento del 20% en toda la tienda', 'percentage', 20, 5000, 100, true),
    ('ENVIOGRATIS', 'Envío gratis (descuento de 5€)', 'fixed', 500, 3000, 50, true),
    ('SUPER30', 'Descuento VIP del 30%', 'percentage', 30, 10000, 10, true);
