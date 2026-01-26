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
        const { orderId, reason } = body;

        if (!orderId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'ID de pedido requerido'
            }), { status: 400 });
        }

        if (!isSupabaseConfigured()) {
            // Demo mode
            return new Response(JSON.stringify({
                success: true,
                message: 'Solicitud de devolución registrada (Modo Demo)',
                returnId: 'demo-return-' + Date.now()
            }), { status: 200 });
        }

        // Get user email
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        const userEmail = user?.email;

        const serverClient = createServerClient();

        // Verify order exists and belongs to user
        const { data: order, error: orderError } = await serverClient
            .from('orders')
            .select('id, status, customer_email')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Pedido no encontrado'
            }), { status: 404 });
        }

        // Verify order belongs to user
        if (userEmail && order.customer_email !== userEmail) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No tienes permiso para este pedido'
            }), { status: 403 });
        }

        // Only delivered orders can be returned
        if (order.status !== 'delivered') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Solo puedes solicitar devolución de pedidos entregados'
            }), { status: 400 });
        }

        // Check if return already requested
        const { data: existingReturn } = await serverClient
            .from('return_requests')
            .select('id')
            .eq('order_id', orderId)
            .single();

        if (existingReturn) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Ya existe una solicitud de devolución para este pedido'
            }), { status: 400 });
        }

        // Create return request
        const { data: returnRequest, error: insertError } = await serverClient
            .from('return_requests')
            .insert({
                order_id: orderId,
                reason: reason || 'No especificado',
                status: 'pending'
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return new Response(JSON.stringify({
            success: true,
            message: 'Solicitud de devolución registrada correctamente',
            returnId: returnRequest.id
        }), { status: 200 });

    } catch (error: any) {
        console.error('Return request error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al procesar la solicitud de devolución'
        }), { status: 500 });
    }
};
