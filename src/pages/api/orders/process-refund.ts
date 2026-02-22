import type { APIRoute } from 'astro';
import { isSupabaseConfigured, createServerClient } from '../../../lib/supabase';
import { sendRefundConfirmationEmail } from '../../../lib/email';

export const prerender = false;

// This endpoint is for admin to process refunds
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
        const { orderId, returnRequestId, adminNotes } = body;

        if (!orderId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'ID de pedido requerido'
            }), { status: 400 });
        }

        if (!isSupabaseConfigured()) {
            // Demo mode
            const refundNumber = 'REF-' + Date.now().toString().slice(-8);
            return new Response(JSON.stringify({
                success: true,
                message: 'Reembolso procesado correctamente (Modo Demo)',
                refundNumber: refundNumber,
                refundAmount: 5900
            }), { status: 200 });
        }

        const serverClient = createServerClient();

        // Call the atomic refund processing function (with credit note generation)
        let data, error;
        ({ data, error } = await serverClient.rpc('process_refund_with_credit_note', {
            p_order_id: orderId,
            p_return_request_id: returnRequestId || null,
            p_admin_notes: adminNotes || null
        }));

        // Fallback to old function if new one doesn't exist
        if (error && error.message?.includes('function')) {
            ({ data, error } = await serverClient.rpc('process_refund_atomic', {
                p_order_id: orderId,
                p_return_request_id: returnRequestId || null,
                p_admin_notes: adminNotes || null
            }));
        }

        if (error) {
            console.error('Refund RPC error:', error);
            throw error;
        }

        if (!data.success) {
            return new Response(JSON.stringify({
                success: false,
                error: data.error
            }), { status: 400 });
        }

        // Get order details and items for email
        const { data: order } = await serverClient
            .from('orders')
            .select('customer_email, customer_name, subtotal, shipping_cost, tax, order_items(*)')
            .eq('id', orderId)
            .single();

        // Send refund confirmation email
        if (order) {
            try {
                await sendRefundConfirmationEmail({
                    refundNumber: data.refund_number,
                    orderNumber: data.order_number,
                    customerName: order.customer_name || 'Cliente',
                    customerEmail: order.customer_email,
                    refundAmount: data.refund_amount,
                    refundDate: new Date().toISOString(),
                    items: (order.order_items || []).map((item: any) => ({
                        name: item.product_name,
                        quantity: item.quantity,
                        price: item.unit_price
                    })),
                    subtotal: order.subtotal,
                    shipping: order.shipping_cost,
                    tax: order.tax
                });
            } catch (emailError) {
                console.error('Error enviando email de confirmación de reembolso:', emailError);
                // Don't fail the request if email fails
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: data.message,
            refundNumber: data.refund_number,
            refundAmount: data.refund_amount
        }), { status: 200 });

    } catch (error: any) {
        console.error('Refund processing error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Error al procesar el reembolso'
        }), { status: 500 });
    }
};
