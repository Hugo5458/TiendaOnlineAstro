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

        // Call the validation function
        const { data, error } = await supabase.rpc('validate_discount_code', {
            p_code: code,
            p_subtotal: subtotal
        });

        if (error) throw error;

        return new Response(JSON.stringify(data), { status: 200 });
    } catch (error: any) {
        console.error('Discount validation error:', error);
        return new Response(JSON.stringify({
            valid: false,
            error: 'Error al validar el código'
        }), { status: 500 });
    }
};
