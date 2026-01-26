-- =============================================
-- FashionStore Database Schema
-- Supabase PostgreSQL Migration
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price INTEGER NOT NULL CHECK (price >= 0), -- Price in cents
    compare_at_price INTEGER CHECK (compare_at_price >= 0), -- Original price for discounts
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    images TEXT[] DEFAULT '{}', -- Array of image URLs
    sizes TEXT[] DEFAULT '{"XS", "S", "M", "L", "XL", "XXL"}',
    colors TEXT[] DEFAULT '{}',
    is_featured BOOLEAN DEFAULT FALSE,
    is_flash_offer BOOLEAN DEFAULT FALSE, -- For flash offers section
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
    shipping_cost INTEGER DEFAULT 0 CHECK (shipping_cost >= 0),
    tax INTEGER DEFAULT 0 CHECK (tax >= 0),
    total INTEGER NOT NULL CHECK (total >= 0),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    payment_intent_id VARCHAR(255), -- Stripe payment intent
    payment_status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL, -- Snapshot of product name
    product_image TEXT, -- Snapshot of product image
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    size VARCHAR(20),
    color VARCHAR(50),
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    total_price INTEGER NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site settings table (for toggles like flash offers)
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID
);

-- Admin users activity log
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_flash_offer ON products(is_flash_offer) WHERE is_flash_offer = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ATOMIC STOCK DECREMENT FUNCTION
-- This prevents overselling with concurrent purchases
-- =============================================

CREATE OR REPLACE FUNCTION decrement_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
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
-- PROCESS ORDER FUNCTION
-- Atomic transaction for creating order and decrementing stock
-- =============================================

CREATE OR REPLACE FUNCTION process_order(
    p_customer_email VARCHAR(255),
    p_customer_name VARCHAR(255),
    p_customer_phone VARCHAR(50),
    p_shipping_address JSONB,
    p_items JSONB -- Array of {product_id, quantity, size, color}
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_order_number VARCHAR(50);
    v_subtotal INTEGER := 0;
    v_item JSONB;
    v_product RECORD;
    v_item_total INTEGER;
BEGIN
    -- Generate order number
    v_order_number := 'FS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Process each item and calculate subtotal
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
    
    -- Create order
    INSERT INTO orders (
        order_number,
        customer_email,
        customer_name,
        customer_phone,
        shipping_address,
        subtotal,
        total,
        status
    ) VALUES (
        v_order_number,
        p_customer_email,
        p_customer_name,
        p_customer_phone,
        p_shipping_address,
        v_subtotal,
        v_subtotal, -- TODO: Add shipping and tax
        'pending'
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

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Public read access for categories and products
CREATE POLICY "Public can view active categories"
    ON categories FOR SELECT
    USING (true);

CREATE POLICY "Public can view active products"
    ON products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public can view site settings"
    ON site_settings FOR SELECT
    USING (true);

-- Authenticated admin full access
CREATE POLICY "Admins can manage categories"
    ON categories FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage products"
    ON products FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage orders"
    ON orders FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view order items"
    ON order_items FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage site settings"
    ON site_settings FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view activity log"
    ON admin_activity_log FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert activity log"
    ON admin_activity_log FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Service role for order processing (bypasses RLS)
-- Orders are created via service role key in checkout

-- =============================================
-- SEED DATA
-- =============================================

-- Insert initial site settings
INSERT INTO site_settings (key, value, description) VALUES
    ('show_flash_offers', 'true'::jsonb, 'Toggle visibility of flash offers section on homepage'),
    ('store_name', '"FashionStore"'::jsonb, 'Store name'),
    ('store_currency', '"EUR"'::jsonb, 'Store currency code'),
    ('free_shipping_threshold', '5000'::jsonb, 'Free shipping threshold in cents (50€)')
ON CONFLICT (key) DO NOTHING;

-- Insert categories
INSERT INTO categories (name, slug, description) VALUES
    ('Camisas', 'camisas', 'Camisas elegantes para toda ocasión'),
    ('Camisetas', 'camisetas', 'Camisetas premium de algodón'),
    ('Pantalones', 'pantalones', 'Pantalones de vestir y casual'),
    ('Chalecos', 'chalecos', 'Chalecos sofisticados'),
    ('Trajes', 'trajes', 'Trajes completos de alta calidad'),
    ('Accesorios', 'accesorios', 'Complementos para tu estilo')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, slug, description, price, compare_at_price, stock, category_id, images, is_featured, is_flash_offer) VALUES
    ('Camisa Oxford Azul', 'camisa-oxford-azul', 'Camisa Oxford clásica en algodón premium. Perfecta para el día a día o eventos formales.', 5900, 7900, 25, (SELECT id FROM categories WHERE slug = 'camisas'), ARRAY['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800'], true, false),
    ('Camisa Lino Blanca', 'camisa-lino-blanca', 'Camisa de lino italiano, ideal para el verano. Transpirable y elegante.', 7500, NULL, 15, (SELECT id FROM categories WHERE slug = 'camisas'), ARRAY['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800'], true, true),
    ('Camiseta Básica Negra', 'camiseta-basica-negra', 'Camiseta esencial de algodón pima. Corte perfecto y durabilidad excepcional.', 2900, 3500, 50, (SELECT id FROM categories WHERE slug = 'camisetas'), ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'], false, true),
    ('Pantalón Chino Beige', 'pantalon-chino-beige', 'Pantalón chino de corte slim en algodón elástico. Versatilidad máxima.', 6900, NULL, 30, (SELECT id FROM categories WHERE slug = 'pantalones'), ARRAY['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800'], true, false),
    ('Chaleco de Punto Gris', 'chaleco-punto-gris', 'Chaleco de punto fino en lana merino. Perfecto para entretiempo.', 8900, 11900, 12, (SELECT id FROM categories WHERE slug = 'chalecos'), ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800'], false, true),
    ('Traje Azul Marino', 'traje-azul-marino', 'Traje completo en lana italiana. Incluye chaqueta y pantalón.', 29900, 39900, 8, (SELECT id FROM categories WHERE slug = 'trajes'), ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800'], true, false)
ON CONFLICT (slug) DO NOTHING;
