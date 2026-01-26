-- Migration 004: Improve Order Processing and Stock Management
-- Execute in Supabase SQL Editor

-- =============================================
-- 1. SECURITY FOR STOCK DECREMENT
-- =============================================
CREATE OR REPLACE FUNCTION decrement_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN 
SECURITY DEFINER -- Run as creator (admin) to bypass RLS if needed, though usually service role is enough
SET search_path = public
AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    -- Lock the row and get current stock
    SELECT stock INTO current_stock
    FROM products
    WHERE id = p_product_id
    FOR UPDATE;
    
    -- Check if we have enough stock
    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    IF current_stock < p_quantity THEN
        RETURN FALSE; -- Not enough stock
    END IF;
    
    -- Decrement stock
    UPDATE products
    SET stock = stock - p_quantity
    WHERE id = p_product_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. UPDATE PROCESS_ORDER TO HANDLE TOTALS AND DISCOUNTS
-- =============================================
DROP FUNCTION IF EXISTS process_order;

CREATE OR REPLACE FUNCTION process_order(
    p_customer_email VARCHAR(255),
    p_customer_name VARCHAR(255),
    p_customer_phone VARCHAR(50),
    p_shipping_address JSONB,
    p_items JSONB, -- Array of {product_id, quantity, size, color}
    p_shipping_cost INTEGER DEFAULT 0,
    p_tax INTEGER DEFAULT 0,
    p_discount_amount INTEGER DEFAULT 0,
    p_discount_code VARCHAR DEFAULT NULL,
    p_payment_intent_id VARCHAR DEFAULT NULL,
    p_total INTEGER DEFAULT 0 -- Expected total from payment provider
)
RETURNS UUID 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_order_number VARCHAR(50);
    v_subtotal INTEGER := 0;
    v_item JSONB;
    v_product RECORD;
    v_item_total INTEGER;
    v_calculated_total INTEGER;
BEGIN
    -- Generate order number
    v_order_number := 'FS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Process each item and calculate subtotal from REAL DB prices
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Get product and lock row
        SELECT id, name, price, stock, images[1] as image
        INTO v_product
        FROM products
        WHERE id = (v_item->>'product_id')::UUID
        FOR UPDATE;
        
        IF v_product IS NULL THEN
            RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
        END IF;
        
        IF v_product.stock < (v_item->>'quantity')::INTEGER THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_product.name;
        END IF;
        
        v_item_total := v_product.price * (v_item->>'quantity')::INTEGER;
        v_subtotal := v_subtotal + v_item_total;
    END LOOP;
    
    -- Calculate expected total (Subtotal + Shipping + Tax - Discount)
    v_calculated_total := v_subtotal + p_shipping_cost + p_tax - p_discount_amount;
    
    -- Create order
    INSERT INTO orders (
        order_number,
        customer_email,
        customer_name,
        customer_phone,
        shipping_address,
        subtotal,
        shipping_cost,
        tax,
        total,
        status,
        payment_status,
        payment_intent_id,
        discount_amount,
        discount_code
    ) VALUES (
        v_order_number,
        p_customer_email,
        p_customer_name,
        p_customer_phone,
        p_shipping_address,
        v_subtotal,
        p_shipping_cost,
        p_tax,
        -- Use passed total if provided (trusted from Stripe), else calculated
        COALESCE(NULLIF(p_total, 0), v_calculated_total), 
        'paid', -- Assuming this is called after payment success
        'paid',
        p_payment_intent_id,
        p_discount_amount,
        p_discount_code
    ) RETURNING id INTO v_order_id;
    
    -- Create order items and decrement stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT id, name, price, images[1] as image
        INTO v_product
        FROM products
        WHERE id = (v_item->>'product_id')::UUID;
        
        v_item_total := v_product.price * (v_item->>'quantity')::INTEGER;
        
        -- Insert order item
        INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            product_image,
            quantity,
            size,
            color,
            unit_price,
            total_price
        ) VALUES (
            v_order_id,
            v_product.id,
            v_product.name,
            v_product.image,
            (v_item->>'quantity')::INTEGER,
            v_item->>'size',
            v_item->>'color',
            v_product.price,
            v_item_total
        );
        
        -- Decrement stock
        UPDATE products
        SET stock = stock - (v_item->>'quantity')::INTEGER
        WHERE id = v_product.id;
    END LOOP;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION decrement_stock TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION process_order TO authenticated, anon, service_role;
