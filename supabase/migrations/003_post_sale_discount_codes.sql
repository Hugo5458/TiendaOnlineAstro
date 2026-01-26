-- Migration 003: Post-Sale Management & Discount Codes
-- Execute in Supabase SQL Editor

-- =============================================
-- 1. DISCOUNT CODES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
    discount_value INTEGER NOT NULL, -- percentage (e.g., 10 = 10%) or cents for fixed
    min_purchase_amount INTEGER DEFAULT 0, -- minimum purchase in cents
    max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    is_newsletter_code BOOLEAN DEFAULT false, -- for newsletter subscription codes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 2. NEWSLETTER SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    discount_code_used VARCHAR(50),
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    source VARCHAR(50) DEFAULT 'popup' -- 'popup', 'footer', 'checkout'
);

-- =============================================
-- 3. ORDER STATUS HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by VARCHAR(255), -- 'system', 'admin', 'customer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 4. RETURN REQUESTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'received', 'refunded', 'rejected'
    tracking_number VARCHAR(100),
    refund_amount INTEGER, -- in cents
    admin_notes TEXT,
    customer_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 5. ADD user_id TO ORDERS (for RLS)
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='user_id') THEN
        ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- =============================================
-- 6. ADD discount_code TO ORDERS
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='discount_code') THEN
        ALTER TABLE public.orders ADD COLUMN discount_code VARCHAR(50);
        ALTER TABLE public.orders ADD COLUMN discount_amount INTEGER DEFAULT 0;
    END IF;
END $$;

-- =============================================
-- 7. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON public.discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_order ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- =============================================
-- 8. ATOMIC CANCEL ORDER FUNCTION
-- This function cancels an order and restores stock atomically
-- =============================================
CREATE OR REPLACE FUNCTION public.cancel_order_atomic(
    p_order_id UUID,
    p_user_email VARCHAR DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_result JSON;
BEGIN
    -- Get order and lock it
    SELECT * INTO v_order 
    FROM orders 
    WHERE id = p_order_id 
    FOR UPDATE;
    
    -- Check if order exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Pedido no encontrado'
        );
    END IF;
    
    -- Verify user owns the order (if email provided)
    IF p_user_email IS NOT NULL AND v_order.customer_email != p_user_email THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No tienes permiso para cancelar este pedido'
        );
    END IF;
    
    -- Check if cancellable (only 'pending' or 'paid' status)
    IF v_order.status NOT IN ('pending', 'paid') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Este pedido ya no puede ser cancelado (estado: ' || v_order.status || ')'
        );
    END IF;
    
    -- Restore stock for each item
    FOR v_item IN 
        SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
        IF v_item.product_id IS NOT NULL THEN
            UPDATE products 
            SET stock = stock + v_item.quantity,
                updated_at = now()
            WHERE id = v_item.product_id;
        END IF;
    END LOOP;
    
    -- Update order status
    UPDATE orders 
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_order_id;
    
    -- Log status change
    INSERT INTO order_status_history (order_id, old_status, new_status, notes, changed_by)
    VALUES (p_order_id, v_order.status, 'cancelled', 'Cancelado por el cliente', 'customer');
    
    RETURN json_build_object(
        'success', true,
        'message', 'Pedido cancelado correctamente. El stock ha sido restaurado.'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error al cancelar: ' || SQLERRM
    );
END;
$$;

-- =============================================
-- 9. VALIDATE DISCOUNT CODE FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_discount_code(
    p_code VARCHAR,
    p_subtotal INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_discount RECORD;
    v_discount_amount INTEGER;
BEGIN
    -- Find the discount code
    SELECT * INTO v_discount 
    FROM discount_codes 
    WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND (max_uses IS NULL OR current_uses < max_uses);
    
    -- Check if code exists and is valid
    IF NOT FOUND THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Código de descuento inválido o expirado'
        );
    END IF;
    
    -- Check minimum purchase
    IF v_discount.min_purchase_amount > 0 AND p_subtotal < v_discount.min_purchase_amount THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Compra mínima requerida: €' || (v_discount.min_purchase_amount / 100.0)::TEXT
        );
    END IF;
    
    -- Calculate discount amount
    IF v_discount.discount_type = 'percentage' THEN
        v_discount_amount := (p_subtotal * v_discount.discount_value) / 100;
    ELSE
        v_discount_amount := v_discount.discount_value;
    END IF;
    
    -- Make sure discount doesn't exceed subtotal
    IF v_discount_amount > p_subtotal THEN
        v_discount_amount := p_subtotal;
    END IF;
    
    RETURN json_build_object(
        'valid', true,
        'code', v_discount.code,
        'discount_type', v_discount.discount_type,
        'discount_value', v_discount.discount_value,
        'discount_amount', v_discount_amount,
        'description', v_discount.description
    );
END;
$$;

-- =============================================
-- 10. APPLY DISCOUNT CODE FUNCTION (increment usage)
-- =============================================
CREATE OR REPLACE FUNCTION public.apply_discount_code(p_code VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE discount_codes 
    SET current_uses = current_uses + 1,
        updated_at = now()
    WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true;
    
    RETURN FOUND;
END;
$$;

-- =============================================
-- 11. RLS POLICIES
-- =============================================

-- Discount Codes: Public read for validation
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Discount codes are public readable"
    ON public.discount_codes FOR SELECT
    USING (true);

CREATE POLICY "Only service role can manage discount codes"
    ON public.discount_codes FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update discount codes"
    ON public.discount_codes FOR UPDATE
    WITH CHECK (auth.role() = 'service_role');

-- Newsletter: Public insert, service role all
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to newsletter"
    ON public.newsletter_subscriptions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can manage newsletter"
    ON public.newsletter_subscriptions FOR SELECT
    USING (auth.role() = 'service_role');

-- Order Status History: Service role only
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Status history readable by service role and owner"
    ON public.order_status_history FOR SELECT
    USING (auth.role() = 'service_role');

-- Return Requests: Users can read their own
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Return requests readable by service role"
    ON public.return_requests FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Customers can create return requests"
    ON public.return_requests FOR INSERT
    WITH CHECK (true);

-- =============================================
-- 12. INSERT SAMPLE DISCOUNT CODES
-- =============================================
INSERT INTO public.discount_codes (code, description, discount_type, discount_value, min_purchase_amount, is_newsletter_code, valid_until)
VALUES 
    ('WELCOME10', 'Descuento de bienvenida del 10%', 'percentage', 10, 2000, true, now() + interval '1 year'),
    ('FASHION20', 'Descuento del 20% en toda la tienda', 'percentage', 20, 5000, false, now() + interval '6 months'),
    ('ENVIOGRATIS', 'Envío gratis (descuento de 5€)', 'fixed', 500, 3000, false, now() + interval '3 months'),
    ('SUPER30', 'Descuento VIP del 30%', 'percentage', 30, 10000, false, now() + interval '1 month')
ON CONFLICT (code) DO NOTHING;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cancel_order_atomic TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.validate_discount_code TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.apply_discount_code TO authenticated, anon;
