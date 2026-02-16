import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

export const GET: APIRoute = async ({ params }) => {
    const { id } = params;

    if (!isSupabaseConfigured()) {
        return new Response(JSON.stringify({ error: 'Demo mode' }), { status: 200 });
    }

    try {
        const { data, error } = await supabase
            .from('discount_codes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), { status: 200 });
    } catch (error: any) {
        console.error('Error fetching discount code:', error);
        return new Response(JSON.stringify({ error: 'Código de descuento no encontrado' }), { status: 404 });
    }
};

export const PUT: APIRoute = async ({ params, request }) => {
    const { id } = params;

    if (!isSupabaseConfigured()) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    try {
        const body = await request.json();
        const { code, description, discount_type, discount_value, min_purchase, max_uses, is_active, starts_at, expires_at } = body;

        if (!code || !discount_type || discount_value === undefined) {
            return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), { status: 400 });
        }

        const { data, error } = await supabase
            .from('discount_codes')
            .update({
                code: code.toUpperCase().trim(),
                description: description || null,
                discount_type,
                discount_value: Number(discount_value),
                min_purchase: Number(min_purchase) || 0,
                max_uses: max_uses ? Number(max_uses) : null,
                is_active: is_active !== false,
                starts_at: starts_at || null,
                expires_at: expires_at || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    } catch (error: any) {
        console.error('Error updating discount code:', error);
        const message = error?.message?.includes('unique') || error?.code === '23505'
            ? 'Ya existe un código de descuento con ese nombre'
            : 'Error al actualizar el código de descuento';
        return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
};

export const DELETE: APIRoute = async ({ params }) => {
    const { id } = params;

    if (!isSupabaseConfigured()) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    try {
        const { error } = await supabase
            .from('discount_codes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error: any) {
        console.error('Error deleting discount code:', error);
        return new Response(JSON.stringify({ error: 'Error al eliminar el código de descuento' }), { status: 500 });
    }
};
