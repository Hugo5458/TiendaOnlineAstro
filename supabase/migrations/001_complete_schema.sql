-- FashionStore Database Schema for Supabase
-- Execute this in Supabase SQL Editor

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- in cents (€10.00 = 1000)
  compare_at_price INTEGER, -- original price for discount display
  stock INTEGER NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  images TEXT[] DEFAULT ARRAY[]::TEXT[], -- array of image URLs
  sizes TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['XS', 'S', 'M', 'L', 'XL']
  colors TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['Black', 'Navy', 'White']
  is_featured BOOLEAN DEFAULT false,
  is_flash_offer BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Site Settings Table (for toggles like show_flash_offers)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "ORD-2026-001"
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  shipping_address JSONB NOT NULL, -- {street, city, postal_code, country}
  billing_address JSONB,
  subtotal INTEGER, -- in cents
  shipping_cost INTEGER DEFAULT 0,
  tax INTEGER DEFAULT 0,
  total INTEGER NOT NULL, -- in cents
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
  payment_intent_id VARCHAR(255), -- Stripe payment intent ID
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, succeeded, failed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL,
  size VARCHAR(50),
  color VARCHAR(100),
  unit_price INTEGER NOT NULL, -- price at time of order
  total_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Customer Profiles Table (for future use - address book, etc.)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  addresses JSONB DEFAULT '[]'::JSONB, -- [{street, city, postal_code, country, is_default}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Indexes for Performance
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_is_featured ON public.products(is_featured);
CREATE INDEX idx_products_is_flash_offer ON public.products(is_flash_offer);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- 8. Row Level Security (RLS) Policies

-- Categories: Public Read, Admin Write
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are public readable"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update categories"
  ON public.categories FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete categories"
  ON public.categories FOR DELETE
  USING (auth.role() = 'service_role');

-- Products: Public Read, Admin Write
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are public readable"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert products"
  ON public.products FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update products"
  ON public.products FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete products"
  ON public.products FOR DELETE
  USING (auth.role() = 'service_role');

-- Orders: Authenticated users can read their own, service role full access
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders are readable by service role and owner"
  ON public.orders FOR SELECT
  USING (auth.role() = 'service_role' OR customer_email = auth.jwt() ->> 'email');

CREATE POLICY "Only service role can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update orders"
  ON public.orders FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

-- Order Items: Same as Orders
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items readable by service role"
  ON public.order_items FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Site Settings: Public read, service role write
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are public readable"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Only service role can manage site settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update site settings"
  ON public.site_settings FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

-- Customer Profiles: Users can read their own, service role full access
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.customer_profiles FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own profile"
  ON public.customer_profiles FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- 9. Insert Demo Data
INSERT INTO public.categories (name, slug, description) VALUES
  ('Camisas', 'camisas', 'Camisas elegantes y premium'),
  ('Camisetas', 'camisetas', 'Camisetas de algodón y calidad'),
  ('Pantalones', 'pantalones', 'Pantalones de vestir'),
  ('Chalecos', 'chalecos', 'Chalecos sofisticados'),
  ('Trajes', 'trajes', 'Trajes completos'),
  ('Accesorios', 'accesorios', 'Cinturones, pañuelos y más');

INSERT INTO public.site_settings (key, value, description) VALUES
  ('show_flash_offers', 'true'::JSONB, 'Toggle para mostrar/ocultar sección de ofertas flash'),
  ('shipping_cost', '500'::JSONB, 'Coste de envío en céntimos'),
  ('tax_rate', '21'::JSONB, 'Porcentaje de IVA');

-- 10. Supabase Storage Setup
-- (Manual en Supabase Dashboard)
-- - Crear bucket: "products-images"
-- - Política: Public read, Authenticated upload
