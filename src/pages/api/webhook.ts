import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import { supabase, createServerClient } from '../../lib/supabase';

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

                // Prepare shipping address
                const shipping = session.shipping_details?.address;
                const shippingAddress = {
                    line1: shipping?.line1,
                    line2: shipping?.line2,
                    city: shipping?.city,
                    state: shipping?.state,
                    postal_code: shipping?.postal_code,
                    country: shipping?.country,
                };

                // Call Supabase RPC to process order
                // Note: Using service role key for this is recommended if RLS is strict
                const { data: orderId, error } = await supabase.rpc('process_order', {
                    p_customer_email: customerEmail,
                    p_customer_name: customerName,
                    p_customer_phone: customerPhone,
                    p_shipping_address: shippingAddress,
                    p_items: items.map((i: any) => ({
                        product_id: i.id,
                        quantity: i.quantity,
                        size: i.size,
                        color: i.color || null
                    }))
                });

                if (error) {
                    console.error('Error procesando pedido Supabase:', error);
                    return new Response(`Error Supabase: ${error.message}`, { status: 500 });
                }

                // Update payment status
                await supabase
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
                        const serverSupabase = createServerClient();

                        // Fetch order details and items using service client
                        const { data: orderData } = await serverSupabase
                            .from('orders')
                            .select('*')
                            .eq('id', orderId)
                            .single();

                        const { data: orderItems } = await serverSupabase
                            .from('order_items')
                            .select('*')
                            .eq('order_id', orderId);

                        // Compose email HTML
                        const formatPrice = (cents: number | null | undefined) => (cents != null ? `€${(cents/100).toFixed(2)}` : '€0.00');

                        let itemsHtml = '';
                        (orderItems || []).forEach((it: any) => {
                            itemsHtml += `<tr><td style="padding:6px 8px">${it.product_name}</td><td style="padding:6px 8px;text-align:center">${it.quantity}</td><td style="padding:6px 8px;text-align:right">${formatPrice(it.unit_price)}</td><td style="padding:6px 8px;text-align:right">${formatPrice(it.total_price)}</td></tr>`;
                        });

                        const html = `
                        <h2>Gracias por tu pedido, ${orderData?.customer_name || customerName}!</h2>
                        <p>Hemos recibido tu pedido <strong>${orderData?.order_number || ''}</strong>. A continuación tienes un resumen:</p>
                        <table style="width:100%;border-collapse:collapse">
                          <thead><tr><th style="text-align:left">Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">PVP</th><th style="text-align:right">Total</th></tr></thead>
                          <tbody>${itemsHtml}</tbody>
                        </table>
                        <p>Subtotal: <strong>${formatPrice(orderData?.subtotal)}</strong></p>
                        <p>Gastos envío: <strong>${formatPrice(orderData?.shipping_cost)}</strong></p>
                        <p>IVA: <strong>${formatPrice(orderData?.tax)}</strong></p>
                        <p>Total: <strong>${formatPrice(orderData?.total)}</strong></p>
                        <h3>Dirección de envío</h3>
                        <p>${orderData?.shipping_address ? JSON.stringify(orderData.shipping_address) : 'No disponible'}</p>
                        <p>Si tienes alguna duda, responde este correo o contacta con soporte.</p>
                        `;

                        // Create transporter using SMTP env vars
                        const transporter = nodemailer.createTransport({
                            host: import.meta.env.SMTP_HOST || '',
                            port: Number(import.meta.env.SMTP_PORT || 587),
                            secure: (import.meta.env.SMTP_SECURE === 'true') || false,
                            auth: {
                                user: import.meta.env.SMTP_USER || '',
                                pass: import.meta.env.SMTP_PASS || ''
                            }
                        });

                        const mailOptions = {
                            from: import.meta.env.EMAIL_FROM || 'no-reply@fashionstore.local',
                            to: customerEmail,
                            bcc: import.meta.env.ORDER_NOTIFICATION_EMAIL || undefined,
                            subject: `Tu pedido ${orderData?.order_number || ''} - FashionStore`,
                            text: `Gracias por tu pedido ${orderData?.customer_name || customerName}. Total: ${(orderData?.total/100).toFixed(2)} EUR`,
                            html
                        };

                        await transporter.sendMail(mailOptions);
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
