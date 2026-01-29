import type { APIRoute } from 'astro';
import Stripe from 'stripe';

import { createServerClient } from '../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return new Response('Sin firma', { status: 400 });
    }

    try {
        const body = await request.text();
        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            import.meta.env.STRIPE_WEBHOOK_SECRET || ''
        );

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const metadata = session.metadata;

            if (metadata && metadata.items) {
                const items = JSON.parse(metadata.items);
                const customerEmail = session.customer_details?.email || '';
                const customerName = metadata.customerName || session.customer_details?.name || 'Cliente';
                const customerPhone = session.customer_details?.phone || '';
                const discountCode = metadata.discountCode || null;
                const discountAmount = session.total_details?.amount_discount || 0;

                // Use server client with admin privileges
                const supabaseAdmin = createServerClient();

                // Prepare shipping address
                const shipping = (session as any).shipping_details?.address;
                const shippingAddress = {
                    line1: shipping?.line1,
                    line2: shipping?.line2,
                    city: shipping?.city,
                    state: shipping?.state,
                    postal_code: shipping?.postal_code,
                    country: shipping?.country,
                };

                // Call Supabase RPC to process order (uses SECURITY DEFINER, handles stock)
                const { data: orderId, error } = await supabaseAdmin.rpc('process_order', {
                    p_customer_email: customerEmail,
                    p_customer_name: customerName,
                    p_customer_phone: customerPhone,
                    p_shipping_address: shippingAddress,
                    p_items: items.map((i: any) => ({
                        product_id: i.id,
                        quantity: i.quantity,
                        size: i.size,
                        color: i.color || null
                    })),
                    p_shipping_cost: session.total_details?.amount_shipping || 0,
                    p_tax: session.total_details?.amount_tax || 0,
                    p_discount_amount: discountAmount,
                    p_discount_code: discountCode,
                    p_payment_intent_id: session.payment_intent as string,
                    p_total: session.amount_total || 0
                });

                if (error) {
                    console.error('Error procesando pedido Supabase:', error);
                    return new Response(`Error Supabase: ${error.message}`, { status: 500 });
                }

                // Update payment status
                await supabaseAdmin
                    .from('orders')
                    .update({
                        payment_status: 'paid',
                        status: 'processing',
                        payment_intent_id: session.payment_intent as string
                    })
                    .eq('id', orderId);

                // Send order confirmation email (non-blocking for webhook success)
                (async () => {
                    try {
                        const { sendOrderConfirmationEmail } = await import('../../lib/email');

                        // Fetch order details and items using service client
                        const { data: orderData } = await supabaseAdmin
                            .from('orders')
                            .select('*')
                            .eq('id', orderId)
                            .single();

                        const { data: orderItems } = await supabaseAdmin
                            .from('order_items')
                            .select('*')
                            .eq('order_id', orderId);

                        if (orderData && orderItems) {
                            await sendOrderConfirmationEmail({
                                orderNumber: orderData.order_number,
                                customerName: orderData.customer_name,
                                customerEmail: orderData.customer_email,
                                items: orderItems.map((item: any) => ({
                                    name: item.product_name,
                                    quantity: item.quantity,
                                    price: item.unit_price,
                                    total: item.total_price,
                                    image: item.product_image
                                })),
                                subtotal: orderData.subtotal,
                                shipping: orderData.shipping_cost,
                                tax: orderData.tax,
                                total: orderData.total,
                                shippingAddress: orderData.shipping_address,
                                date: orderData.created_at
                            });
                        }
                    } catch (emailErr) {
                        console.error('Error enviando email de confirmación:', emailErr);
                    }
                })();
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error('Webhook Error:', err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
};
