-- Migration 006: Refund Processing Functions
-- Execute in Supabase SQL Editor

-- =============================================
-- 1. PROCESS REFUND FUNCTION
-- This function processes a refund request:
-- - Restores stock for all items
-- - Updates order status to 'refunded'
-- - Updates return request status to 'refunded'
-- - Logs the status change
-- =============================================
CREATE OR REPLACE FUNCTION public.process_refund_atomic(
    p_order_id UUID,
    p_return_request_id UUID DEFAULT NULL,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_return_request RECORD;
    v_refund_amount INTEGER;
    v_refund_number VARCHAR(50);
BEGIN
    -- Generate refund number
    v_refund_number := 'REF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
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
    
    -- Check if order can be refunded (only 'delivered' status or pending return)
    IF v_order.status NOT IN ('delivered', 'return_pending') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Este pedido no puede ser reembolsado (estado: ' || v_order.status || ')'
        );
    END IF;
    
    -- Get refund amount (the order total)
    v_refund_amount := v_order.total;
    
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
    SET status = 'refunded',
        updated_at = now()
    WHERE id = p_order_id;
    
    -- Log status change
    INSERT INTO order_status_history (order_id, old_status, new_status, notes, changed_by)
    VALUES (p_order_id, v_order.status, 'refunded', COALESCE(p_admin_notes, 'Reembolso procesado'), 'system');
    
    -- If there's a return request, update it
    IF p_return_request_id IS NOT NULL THEN
        UPDATE return_requests 
        SET status = 'refunded',
            refund_amount = v_refund_amount,
            admin_notes = COALESCE(p_admin_notes, admin_notes),
            customer_notified = true,
            updated_at = now()
        WHERE id = p_return_request_id;
    ELSE
        -- Try to find and update existing return request for this order
        UPDATE return_requests 
        SET status = 'refunded',
            refund_amount = v_refund_amount,
            admin_notes = COALESCE(p_admin_notes, admin_notes),
            customer_notified = true,
            updated_at = now()
        WHERE order_id = p_order_id AND status = 'pending';
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Reembolso procesado correctamente. El stock ha sido restaurado.',
        'refund_number', v_refund_number,
        'refund_amount', v_refund_amount,
        'order_number', v_order.order_number
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error al procesar reembolso: ' || SQLERRM
    );
END;
$$;

-- =============================================
-- 2. UPDATE RETURN REQUEST STATUS FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_return_request_status(
    p_return_request_id UUID,
    p_new_status VARCHAR(50),
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_return_request RECORD;
    v_order RECORD;
BEGIN
    -- Get return request and lock it
    SELECT rr.*, o.order_number, o.status as order_status, o.total, o.customer_email
    INTO v_return_request
    FROM return_requests rr
    JOIN orders o ON o.id = rr.order_id
    WHERE rr.id = p_return_request_id
    FOR UPDATE OF rr;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Solicitud de devolución no encontrada'
        );
    END IF;
    
    -- Update the return request
    UPDATE return_requests
    SET status = p_new_status,
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        updated_at = now()
    WHERE id = p_return_request_id;
    
    -- If approved, update order status to 'return_pending'
    IF p_new_status = 'approved' THEN
        UPDATE orders
        SET status = 'return_pending',
            updated_at = now()
        WHERE id = v_return_request.order_id;
        
        INSERT INTO order_status_history (order_id, old_status, new_status, notes, changed_by)
        VALUES (v_return_request.order_id, v_return_request.order_status, 'return_pending', 'Devolución aprobada', 'admin');
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Estado actualizado correctamente',
        'new_status', p_new_status,
        'order_number', v_return_request.order_number,
        'customer_email', v_return_request.customer_email
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error: ' || SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_refund_atomic TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_return_request_status TO authenticated, anon, service_role;

-- Add 'return_pending' to valid order statuses (if using enum, this would be needed)
-- Since we're using VARCHAR, just document that valid statuses are:
-- 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'return_pending'
