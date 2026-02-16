import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
    if (!isSupabaseConfigured()) {
        // Demo mode
        const demoCodes = [
            {
                id: '1', code: 'WELCOME10', description: 'Descuento de bienvenida del 10%',
                discount_type: 'percentage', discount_value: 10, min_purchase: 2000,
                max_uses: null, current_uses: 5, is_active: true,
                starts_at: null, expires_at: null,
                created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
            },
            {
                id: '2', code: 'FASHION20', description: 'Descuento del 20% en toda la tienda',
                discount_type: 'percentage', discount_value: 20, min_purchase: 5000,
                max_uses: 100, current_uses: 23, is_active: true,
                starts_at: '2026-01-01T00:00:00Z', expires_at: '2026-12-31T23:59:59Z',
                created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
            },
            {
                id: '3', code: 'ENVIOGRATIS', description: 'Envío gratis (descuento de 5€)',
                discount_type: 'fixed', discount_value: 500, min_purchase: 3000,
                max_uses: 50, current_uses: 12, is_active: true,
                starts_at: null, expires_at: null,
                created_at: '2026-01-15T00:00:00Z', updated_at: '2026-01-15T00:00:00Z'
            },
            {
                id: '4', code: 'SUPER30', description: 'Descuento VIP del 30%',
                discount_type: 'percentage', discount_value: 30, min_purchase: 10000,
                max_uses: 10, current_uses: 10, is_active: false,
                starts_at: null, expires_at: '2026-01-31T23:59:59Z',
                created_at: '2026-01-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z'
            },
        ];
        return new Response(JSON.stringify(demoCodes), { status: 200 });
    }

    try {
        const { data, error } = await supabase
            .from('discount_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data || []), { status: 200 });
    } catch (error: any) {
        console.error('Error fetching discount codes:', error);
        return new Response(JSON.stringify({ error: 'Error al obtener códigos de descuento' }), { status: 500 });
    }
};

export const POST: APIRoute = async ({ request }) => {
    if (!isSupabaseConfigured()) {
        return new Response(JSON.stringify({ success: true, id: 'demo-' + Date.now() }), { status: 201 });
    }

    try {
        const body = await request.json();
        const { code, description, discount_type, discount_value, min_purchase, max_uses, is_active, starts_at, expires_at } = body;

        if (!code || !discount_type || discount_value === undefined) {
            return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), { status: 400 });
        }

        const { data, error } = await supabase
            .from('discount_codes')
            .insert({
                code: code.toUpperCase().trim(),
                description: description || null,
                discount_type,
                discount_value: Number(discount_value),
                min_purchase: Number(min_purchase) || 0,
                max_uses: max_uses ? Number(max_uses) : null,
                current_uses: 0,
                is_active: is_active !== false,
                starts_at: starts_at || null,
                expires_at: expires_at || null,
            })
            .select()
            .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), { status: 201 });
    } catch (error: any) {
        console.error('Error creating discount code:', error);
        const message = error?.message?.includes('unique') || error?.code === '23505'
            ? 'Ya existe un código de descuento con ese nombre'
            : 'Error al crear el código de descuento';
        return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
};
