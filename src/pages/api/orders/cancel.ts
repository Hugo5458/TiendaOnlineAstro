import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured, createServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    const accessToken = cookies.get('sb-access-token')?.value;

    if (!accessToken && isSupabaseConfigured()) {
        return new Response(JSON.stringify({
            success: false,
            error: 'No autorizado'
        }), { status: 401 });
    }

    try {
        const body = await request.json();
        const { orderId } = body;

        if (!orderId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'ID de pedido requerido'
            }), { status: 400 });
        }

        if (!isSupabaseConfigured()) {
            // Demo mode: simulate cancellation
            return new Response(JSON.stringify({
                success: true,
                message: 'Pedido cancelado correctamente (Modo Demo)'
            }), { status: 200 });
        }

        // Get user email from token
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        const userEmail = user?.email || null;

        // Call the atomic cancellation function
        const serverClient = createServerClient();
        const { data, error } = await serverClient.rpc('cancel_order_atomic', {
            p_order_id: orderId,
            p_user_email: userEmail
        });

        if (error) throw error;

        if (!data.success) {
            return new Response(JSON.stringify({
                success: false,
                error: data.error
            }), { status: 400 });
        }

        return new Response(JSON.stringify(data), { status: 200 });

    } catch (error: any) {
        console.error('Order cancellation error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al cancelar el pedido'
        }), { status: 500 });
    }
};
