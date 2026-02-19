import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    if (!isSupabaseConfigured()) {
        // Demo mode: simulate discount codes
        const body = await request.json();
        const code = body.code?.toUpperCase();
        const subtotal = body.subtotal || 0;

        const demoCodes: Record<string, { type: string; value: number; min: number; desc: string }> = {
            'WELCOME10': { type: 'percentage', value: 10, min: 2000, desc: 'Descuento de bienvenida del 10%' },
            'FASHION20': { type: 'percentage', value: 20, min: 5000, desc: 'Descuento del 20% en toda la tienda' },
            'ENVIOGRATIS': { type: 'fixed', value: 500, min: 3000, desc: 'Envío gratis (descuento de 5€)' },
            'SUPER30': { type: 'percentage', value: 30, min: 10000, desc: 'Descuento VIP del 30%' },
        };

        const discount = demoCodes[code];
        if (!discount) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'Código de descuento inválido'
            }), { status: 200 });
        }

        if (subtotal < discount.min) {
            return new Response(JSON.stringify({
                valid: false,
                error: `Compra mínima requerida: €${(discount.min / 100).toFixed(2)}`
            }), { status: 200 });
        }

        const discountAmount = discount.type === 'percentage'
            ? Math.floor((subtotal * discount.value) / 100)
            : Math.min(discount.value, subtotal);

        return new Response(JSON.stringify({
            valid: true,
            code: code,
            discount_type: discount.type,
            discount_value: discount.value,
            discount_amount: discountAmount,
            description: discount.desc
        }), { status: 200 });
    }

    try {
        const body = await request.json();
        const { code, subtotal = 0 } = body;

        if (!code) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'Código requerido'
            }), { status: 200 });
        }

        // Logic moved from RPC to ensure consistency with schema
        const { data: discount, error } = await supabase
            .from('discount_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();

        if (error || !discount) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'Código de descuento inválido'
            }), { status: 200 });
        }

        if (!discount.is_active) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'El código no está activo'
            }), { status: 200 });
        }

        const now = new Date();

        // Check dates - handling possible different column names from migrations
        const start = discount.starts_at ? new Date(discount.starts_at) : (discount.valid_from ? new Date(discount.valid_from) : null);
        const end = discount.expires_at ? new Date(discount.expires_at) : (discount.valid_until ? new Date(discount.valid_until) : null);

        if (start && now < start) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'Este código aún no está activo'
            }), { status: 200 });
        }

        if (end && now > end) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'Este código ha expirado'
            }), { status: 200 });
        }

        if (discount.max_uses !== null && discount.current_uses >= discount.max_uses) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'Este código ha agotado sus usos'
            }), { status: 200 });
        }

        // Check minimum purchase (in cents) - handle schema variations
        const minPurchase = discount.min_purchase !== undefined ? discount.min_purchase : (discount.min_purchase_amount || 0);

        if (subtotal < minPurchase) {
            return new Response(JSON.stringify({
                valid: false,
                error: `Compra mínima requerida: €${(minPurchase / 100).toFixed(2)}`
            }), { status: 200 });
        }

        let discountAmount = 0;
        if (discount.discount_type === 'percentage') {
            discountAmount = Math.floor((subtotal * discount.discount_value) / 100);
        } else {
            // Fixed amount in cents
            discountAmount = Math.min(discount.discount_value, subtotal);
        }

        const result = {
            valid: true,
            code: discount.code,
            discount_type: discount.discount_type,
            discount_value: discount.discount_value,
            discount_amount: discountAmount,
            description: discount.description || `Código ${discount.code}`
        };

        return new Response(JSON.stringify(result), { status: 200 });

    } catch (error: any) {
        console.error('Discount validation error:', error);
        return new Response(JSON.stringify({
            valid: false,
            error: 'Error al validar el código'
        }), { status: 500 });
    }
};
