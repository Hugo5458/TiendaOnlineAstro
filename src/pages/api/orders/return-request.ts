import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured, createServerClient } from '../../../lib/supabase';
import { sendRefundTicketEmail } from '../../../lib/email';

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
            const demoTicketNumber = 'TKT-' + Date.now().toString().slice(-8);
            return new Response(JSON.stringify({
                success: true,
                message: 'Solicitud de devolución registrada (Modo Demo)',
                returnId: 'demo-return-' + Date.now(),
                ticketNumber: demoTicketNumber
            }), { status: 200 });
        }

        // Get user email
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        const userEmail = user?.email;

        const serverClient = createServerClient();

        // Verify order exists and belongs to user - Include order items for the email
        const { data: order, error: orderError } = await serverClient
            .from('orders')
            .select('id, status, customer_email, customer_name, order_number, total, order_items(*)')
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

        // Generate unique ticket number
        const ticketNumber = 'TKT-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' +
            Math.random().toString(36).substring(2, 6).toUpperCase();

        // Create return request
        const { data: returnRequest, error: insertError } = await serverClient
            .from('return_requests')
            .insert({
                order_id: orderId,
                reason: reason || 'No especificado',
                status: 'pending',
                tracking_number: ticketNumber, // Use tracking_number field to store ticket number
                refund_amount: order.total
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Send refund ticket email to customer
        try {
            await sendRefundTicketEmail({
                ticketNumber: ticketNumber,
                orderNumber: order.order_number || orderId.slice(0, 8).toUpperCase(),
                customerName: order.customer_name || 'Cliente',
                customerEmail: order.customer_email,
                items: (order.order_items || []).map((item: any) => ({
                    name: item.product_name,
                    quantity: item.quantity,
                    price: item.unit_price
                })),
                refundAmount: order.total,
                reason: reason || undefined,
                requestDate: new Date().toISOString()
            });
        } catch (emailError) {
            console.error('Error enviando email de ticket:', emailError);
            // Don't fail the request if email fails
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Solicitud de devolución registrada correctamente. Te hemos enviado un ticket por email.',
            returnId: returnRequest.id,
            ticketNumber: ticketNumber
        }), { status: 200 });

    } catch (error: any) {
        console.error('Return request error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al procesar la solicitud de devolución'
        }), { status: 500 });
    }
};
