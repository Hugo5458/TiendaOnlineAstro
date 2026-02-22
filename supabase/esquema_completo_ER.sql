-- =============================================
-- FashionStore - Esquema Completo de Base de Datos
-- Archivo consolidado para Diagrama Entidad-Relación
-- Generado a partir de todas las migraciones (001-007)
-- =============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: categories
-- Categorías de productos (Camisas, Pantalones, etc.)
-- Soporta jerarquía padre-hijo (Hombre > Camisas)
-- =============================================
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    description     TEXT,
    image_url       TEXT,
    parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL, -- Categoría padre (Hombre/Mujer)
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: products
-- Catálogo de productos de la tienda
-- =============================================
CREATE TABLE products (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) NOT NULL UNIQUE,
    description       TEXT,
    price             INTEGER NOT NULL CHECK (price >= 0),             -- Precio en céntimos (€10.00 = 1000)
    compare_at_price  INTEGER CHECK (compare_at_price >= 0),           -- Precio original para mostrar descuento
    stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
    images            TEXT[] DEFAULT '{}',                               -- Array de URLs de imágenes
    sizes             TEXT[] DEFAULT '{}',                               -- Ej: ['XS','S','M','L','XL']
    colors            TEXT[] DEFAULT '{}',                               -- Ej: ['Negro','Blanco','Azul']
    is_featured       BOOLEAN DEFAULT FALSE,                            -- Producto destacado
    is_flash_offer    BOOLEAN DEFAULT FALSE,                            -- Oferta flash/relámpago
    is_active         BOOLEAN DEFAULT TRUE,                             -- Visible en la tienda
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: profiles
-- Perfiles de usuarios/clientes (extiende auth.users de Supabase)
-- =============================================
CREATE TABLE profiles (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username          VARCHAR(50) UNIQUE NOT NULL,
    email             VARCHAR(255) NOT NULL,
    full_name         VARCHAR(255),
    phone             VARCHAR(50),
    address           TEXT,
    postal_code       VARCHAR(20),
    city              VARCHAR(100),
    country           VARCHAR(100) DEFAULT 'España',
    document_number   VARCHAR(50),                                      -- DNI/NIE
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: orders
-- Pedidos realizados por los clientes
-- =============================================
CREATE TABLE orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number      VARCHAR(50) NOT NULL UNIQUE,                      -- Ej: "FS-20260222-0001"
    user_id           UUID REFERENCES auth.users(id),                   -- Usuario autenticado (opcional)
    customer_email    VARCHAR(255) NOT NULL,
    customer_name     VARCHAR(255) NOT NULL,
    customer_phone    VARCHAR(50),
    shipping_address  JSONB NOT NULL,                                   -- {street, city, postal_code, country}
    billing_address   JSONB,
    subtotal          INTEGER NOT NULL CHECK (subtotal >= 0),            -- Subtotal en céntimos
    shipping_cost     INTEGER DEFAULT 0 CHECK (shipping_cost >= 0),     -- Coste de envío en céntimos
    tax               INTEGER DEFAULT 0 CHECK (tax >= 0),               -- Impuestos en céntimos
    discount_amount   INTEGER DEFAULT 0,                                -- Descuento aplicado en céntimos
    discount_code     VARCHAR(100),                                     -- Código de descuento usado
    total             INTEGER NOT NULL CHECK (total >= 0),              -- Total final en céntimos
    status            VARCHAR(50) DEFAULT 'pending'                     -- pending, paid, processing, shipped, delivered, cancelled, refunded, return_pending
                      CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled','refunded','return_pending')),
    payment_intent_id VARCHAR(255),                                     -- ID de Stripe Payment Intent
    payment_status    VARCHAR(50) DEFAULT 'pending',                    -- pending, paid, failed
    notes             TEXT,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: order_items
-- Líneas de detalle de cada pedido
-- =============================================
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name    VARCHAR(255) NOT NULL,                              -- Snapshot del nombre en momento de compra
    product_image   TEXT,                                               -- Snapshot de la imagen
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    size            VARCHAR(50),
    color           VARCHAR(100),
    unit_price      INTEGER NOT NULL CHECK (unit_price >= 0),           -- Precio unitario al momento de la compra
    total_price     INTEGER NOT NULL CHECK (total_price >= 0),          -- quantity * unit_price
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: order_status_history
-- Historial de cambios de estado de pedidos
-- =============================================
CREATE TABLE order_status_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status      VARCHAR(50),
    new_status      VARCHAR(50) NOT NULL,
    notes           TEXT,
    changed_by      VARCHAR(255),                                       -- 'system', 'admin', 'customer'
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: return_requests
-- Solicitudes de devolución de pedidos
-- =============================================
CREATE TABLE return_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reason              TEXT,
    status              VARCHAR(50) DEFAULT 'pending'                   -- pending, approved, received, refunded, rejected
                        CHECK (status IN ('pending','approved','received','refunded','rejected')),
    tracking_number     VARCHAR(100),                                   -- Número de seguimiento de devolución
    refund_amount       INTEGER,                                        -- Importe reembolsado en céntimos
    admin_notes         TEXT,
    customer_notified   BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: invoices
-- Facturas y Notas de Abono (Rectificativas)
-- =============================================
CREATE TABLE invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number      VARCHAR(50) UNIQUE NOT NULL,                    -- FAC-YYYYMMDD-XXXX o ABN-YYYYMMDD-XXXX
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type                VARCHAR(20) NOT NULL                            -- 'invoice' = factura, 'credit_note' = abono
                        CHECK (type IN ('invoice', 'credit_note')),
    parent_invoice_id   UUID REFERENCES invoices(id),                   -- Para abonos: referencia a la factura original
    customer_name       VARCHAR(255) NOT NULL,
    customer_email      VARCHAR(255) NOT NULL,
    customer_nif        VARCHAR(20),                                    -- NIF/CIF del cliente
    billing_address     JSONB,
    subtotal            INTEGER NOT NULL,                                -- En céntimos (negativo en abonos)
    shipping_cost       INTEGER DEFAULT 0,
    tax_rate            NUMERIC(5,2) DEFAULT 21.00,                     -- % de IVA
    tax_amount          INTEGER NOT NULL,                                -- IVA en céntimos
    discount_amount     INTEGER DEFAULT 0,
    total               INTEGER NOT NULL,                                -- Total en céntimos (negativo en abonos)
    status              VARCHAR(20) DEFAULT 'issued'
                        CHECK (status IN ('draft', 'issued', 'paid', 'voided')),
    notes               TEXT,
    issued_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: invoice_items
-- Líneas de detalle de cada factura/abono
-- =============================================
CREATE TABLE invoice_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_name    VARCHAR(255) NOT NULL,
    quantity        INTEGER NOT NULL,
    unit_price      INTEGER NOT NULL,                                   -- Precio unitario en céntimos
    total_price     INTEGER NOT NULL,                                   -- Total en céntimos (negativo en abonos)
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: discount_codes
-- Códigos de descuento para la tienda
-- =============================================
CREATE TABLE discount_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL DEFAULT 'percentage'           -- 'percentage' o 'fixed'
                    CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value  INTEGER NOT NULL CHECK (discount_value >= 0),       -- % o céntimos según tipo
    min_purchase_amount INTEGER DEFAULT 0,                              -- Compra mínima en céntimos
    max_uses        INTEGER,                                            -- NULL = ilimitado
    current_uses    INTEGER DEFAULT 0,
    valid_from      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until     TIMESTAMP WITH TIME ZONE,
    is_active       BOOLEAN DEFAULT TRUE,
    is_newsletter_code BOOLEAN DEFAULT FALSE,                           -- Código de suscripción newsletter
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: newsletter_subscriptions
-- Suscripciones al boletín de noticias
-- =============================================
CREATE TABLE newsletter_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    first_name          VARCHAR(100),
    discount_code_used  VARCHAR(50),
    subscribed_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active           BOOLEAN DEFAULT TRUE,
    unsubscribed_at     TIMESTAMP WITH TIME ZONE,
    source              VARCHAR(50) DEFAULT 'popup'                     -- 'popup', 'footer', 'checkout'
);

-- =============================================
-- TABLA: site_settings
-- Configuración global de la tienda
-- =============================================
CREATE TABLE site_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(100) NOT NULL UNIQUE,
    value           JSONB NOT NULL,
    description     TEXT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by      UUID
);

-- =============================================
-- TABLA: admin_activity_log
-- Registro de actividad de administradores
-- =============================================
CREATE TABLE admin_activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50),                                        -- 'product', 'order', 'category', etc.
    entity_id       UUID,
    details         JSONB,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA RENDIMIENTO
-- =============================================

-- Categories
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Products
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_flash_offer ON products(is_flash_offer) WHERE is_flash_offer = TRUE;
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = TRUE;

-- Orders
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Order Items
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Order Status History
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);

-- Return Requests
CREATE INDEX idx_return_requests_order ON return_requests(order_id);

-- Invoices
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_type ON invoices(type);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Discount Codes
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active);

-- Newsletter
CREATE INDEX idx_newsletter_email ON newsletter_subscriptions(email);

-- Profiles
CREATE INDEX idx_profiles_username ON profiles(username);

-- =============================================
-- RESUMEN DE RELACIONES (para el diagrama E-R)
-- =============================================
--
-- categories.parent_id         → categories.id        (auto-referencia, jerarquía)
-- products.category_id         → categories.id        (N:1  producto pertenece a categoría)
-- profiles.id                  → auth.users.id        (1:1  perfil extiende usuario)
-- orders.user_id               → auth.users.id        (N:1  pedido pertenece a usuario)
-- order_items.order_id         → orders.id            (N:1  línea pertenece a pedido)
-- order_items.product_id       → products.id          (N:1  línea referencia producto)
-- order_status_history.order_id→ orders.id            (N:1  historial pertenece a pedido)
-- return_requests.order_id     → orders.id            (N:1  devolución pertenece a pedido)
-- invoices.order_id            → orders.id            (N:1  factura pertenece a pedido)
-- invoices.parent_invoice_id   → invoices.id          (auto-referencia, abono → factura)
-- invoice_items.invoice_id     → invoices.id          (N:1  línea pertenece a factura)
--
-- Tablas independientes (sin FK a otras tablas):
-- discount_codes, newsletter_subscriptions, site_settings, admin_activity_log
