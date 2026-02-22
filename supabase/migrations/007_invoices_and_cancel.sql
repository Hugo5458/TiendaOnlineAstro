-- Migration 007: Invoices (Facturas), Credit Notes (Abonos), and Cancel Order
-- Execute in Supabase SQL Editor

-- =============================================
-- 1. INVOICES TABLE (Facturas y Abonos/Rectificativas)
-- =============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL, -- FAC-YYYYMMDD-XXXX or ABN-YYYYMMDD-XXXX
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('invoice', 'credit_note')), -- 'invoice' = factura, 'credit_note' = abono/rectificativa
  parent_invoice_id UUID REFERENCES public.invoices(id), -- For credit notes, references the original invoice
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_nif VARCHAR(20), -- Tax ID (NIF/CIF)
  billing_address JSONB,
  subtotal INTEGER NOT NULL, -- in cents (positive for invoices, negative for credit notes)
  shipping_cost INTEGER DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 21.00, -- IVA percentage
  tax_amount INTEGER NOT NULL, -- tax in cents
  discount_amount INTEGER DEFAULT 0,
  total INTEGER NOT NULL, -- total in cents (negative for credit notes!)
  status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'voided')),
  notes TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Invoice items (line items on the invoice)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL, -- in cents
  total_price INTEGER NOT NULL, -- in cents (negative for credit notes)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoices readable by service role and owner"
  ON public.invoices FOR SELECT
  USING (auth.role() = 'service_role' OR customer_email = auth.jwt() ->> 'email');

CREATE POLICY "Only service role can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update invoices"
  ON public.invoices FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Invoice items readable by service role"
  ON public.invoice_items FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can insert invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 2. GENERATE INVOICE ON ORDER COMPLETION
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_invoice(
  p_order_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
  v_tax_rate NUMERIC(5,2) := 21.00;
  v_tax_amount INTEGER;
BEGIN
  -- Get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Check if invoice already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE order_id = p_order_id AND type = 'invoice') THEN
    -- Return existing invoice id
    SELECT id INTO v_invoice_id FROM invoices WHERE order_id = p_order_id AND type = 'invoice' LIMIT 1;
    RETURN v_invoice_id;
  END IF;

  -- Generate invoice number: FAC-YYYYMMDD-XXXX
  v_invoice_number := 'FAC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Calculate tax from subtotal (IVA included in price, so tax = subtotal * 21/121)
  v_tax_amount := COALESCE(v_order.tax, ROUND(v_order.subtotal * v_tax_rate / (100 + v_tax_rate)));

  -- Create invoice
  INSERT INTO invoices (
    invoice_number, order_id, type, customer_name, customer_email,
    billing_address, subtotal, shipping_cost, tax_rate, tax_amount,
    discount_amount, total, status
  ) VALUES (
    v_invoice_number, p_order_id, 'invoice', v_order.customer_name, v_order.customer_email,
    COALESCE(v_order.billing_address, v_order.shipping_address),
    v_order.subtotal, v_order.shipping_cost, v_tax_rate, v_tax_amount,
    COALESCE(v_order.discount_amount, 0), v_order.total, 'paid'
  ) RETURNING id INTO v_invoice_id;

  -- Copy order items to invoice items
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    INSERT INTO invoice_items (invoice_id, product_name, quantity, unit_price, total_price)
    VALUES (v_invoice_id, v_item.product_name, v_item.quantity, v_item.unit_price, v_item.total_price);
  END LOOP;

  RETURN v_invoice_id;
END;
$$;

-- =============================================
-- 3. GENERATE CREDIT NOTE (ABONO/RECTIFICATIVA) ON REFUND
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_credit_note(
  p_order_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_original_invoice RECORD;
  v_item RECORD;
  v_credit_note_id UUID;
  v_credit_note_number VARCHAR(50);
  v_tax_amount INTEGER;
BEGIN
  -- Get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Check if credit note already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE order_id = p_order_id AND type = 'credit_note') THEN
    SELECT id INTO v_credit_note_id FROM invoices WHERE order_id = p_order_id AND type = 'credit_note' LIMIT 1;
    RETURN v_credit_note_id;
  END IF;

  -- Get original invoice (if exists)
  SELECT * INTO v_original_invoice FROM invoices WHERE order_id = p_order_id AND type = 'invoice' LIMIT 1;

  -- Generate credit note number: ABN-YYYYMMDD-XXXX
  v_credit_note_number := 'ABN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Tax amount (negative)
  v_tax_amount := COALESCE(v_order.tax, ROUND(v_order.subtotal * 21 / 121));

  -- Create credit note with NEGATIVE amounts
  INSERT INTO invoices (
    invoice_number, order_id, type, parent_invoice_id,
    customer_name, customer_email, billing_address,
    subtotal, shipping_cost, tax_rate, tax_amount,
    discount_amount, total, status, notes
  ) VALUES (
    v_credit_note_number, p_order_id, 'credit_note',
    v_original_invoice.id, -- reference to original invoice
    v_order.customer_name, v_order.customer_email,
    COALESCE(v_order.billing_address, v_order.shipping_address),
    -v_order.subtotal, -- NEGATIVE subtotal
    -v_order.shipping_cost, -- NEGATIVE shipping
    21.00,
    -v_tax_amount, -- NEGATIVE tax
    0,
    -v_order.total, -- NEGATIVE total (this is the key for "cuadrar caja")
    'issued',
    COALESCE(p_notes, 'Factura de abono por devolución del pedido ' || v_order.order_number)
  ) RETURNING id INTO v_credit_note_id;

  -- Copy items with negative amounts
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    INSERT INTO invoice_items (invoice_id, product_name, quantity, unit_price, total_price)
    VALUES (v_credit_note_id, v_item.product_name, v_item.quantity, v_item.unit_price, -v_item.total_price);
  END LOOP;

  RETURN v_credit_note_id;
END;
$$;

-- =============================================
-- 4. CANCEL ORDER ATOMIC (with stock restoration)
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
BEGIN
  -- Lock and get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  -- Only allow cancellation of pending/paid/processing orders (NOT shipped)
  IF v_order.status NOT IN ('pending', 'paid', 'processing') THEN
    RETURN json_build_object('success', false, 'error', 'Solo se pueden cancelar pedidos no enviados (estado actual: ' || v_order.status || ')');
  END IF;

  -- Restore stock for each item
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id
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
  BEGIN
    INSERT INTO order_status_history (order_id, old_status, new_status, notes, changed_by)
    VALUES (p_order_id, v_order.status, 'cancelled', 'Pedido cancelado por el usuario/admin', COALESCE(p_user_email, 'system'));
  EXCEPTION WHEN undefined_table THEN
    -- order_status_history table might not exist yet, that's OK
    NULL;
  END;

  RETURN json_build_object(
    'success', true,
    'message', 'Pedido cancelado correctamente. El stock ha sido restaurado.',
    'order_number', v_order.order_number,
    'restored_items', (SELECT COUNT(*) FROM order_items WHERE order_id = p_order_id)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Error al cancelar: ' || SQLERRM);
END;
$$;

-- =============================================
-- 5. UPDATE process_refund_atomic TO ALSO GENERATE CREDIT NOTE
-- =============================================
CREATE OR REPLACE FUNCTION public.process_refund_with_credit_note(
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
  v_refund_result JSON;
  v_credit_note_id UUID;
  v_invoice_id UUID;
BEGIN
  -- First, generate invoice if it doesn't exist
  v_invoice_id := generate_invoice(p_order_id);

  -- Process the refund (restore stock, update status)
  v_refund_result := (SELECT process_refund_atomic(p_order_id, p_return_request_id, p_admin_notes));

  -- If refund was successful, generate the credit note
  IF (v_refund_result->>'success')::BOOLEAN THEN
    v_credit_note_id := generate_credit_note(p_order_id, p_admin_notes);

    RETURN json_build_object(
      'success', true,
      'message', 'Reembolso procesado y factura de abono generada correctamente.',
      'refund_number', v_refund_result->>'refund_number',
      'refund_amount', (v_refund_result->>'refund_amount')::INTEGER,
      'order_number', v_refund_result->>'order_number',
      'credit_note_id', v_credit_note_id,
      'invoice_id', v_invoice_id
    );
  END IF;

  RETURN v_refund_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.generate_invoice TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_credit_note TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_atomic TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.process_refund_with_credit_note TO service_role;

-- Add discount_amount column to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE public.orders ADD COLUMN discount_amount INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_code') THEN
    ALTER TABLE public.orders ADD COLUMN discount_code VARCHAR(100);
  END IF;
END $$;
