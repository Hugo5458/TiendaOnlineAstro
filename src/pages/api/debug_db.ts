import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured, createServerClient } from '../../lib/supabase';

export const GET: APIRoute = async () => {
    const configured = isSupabaseConfigured();
    let dbStatus = 'Desconectado';
    let products: any[] = [];
    let error = null;

    if (configured) {
        try {
            const admin = createServerClient();
            const { data, error: err } = await admin.from('products').select('id, name, stock').limit(3);
            if (err) {
                dbStatus = 'Error conexión: ' + err.message;
                error = err;
            } else {
                dbStatus = 'Conectado';
                products = data;
            }
        } catch (e: any) {
            dbStatus = 'Excepción: ' + e.message;
        }
    }

    return new Response(JSON.stringify({
        configured,
        dbStatus,
        products,
        envCheck: {
            url: !!import.meta.env.PUBLIC_SUPABASE_URL,
            key: !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
            serviceKey: !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY
        }
    }, null, 2));
};
