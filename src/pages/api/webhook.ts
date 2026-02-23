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
            import.meta.env.STRIPE_WEBHOOK_SECRET || 'whsec_jknLiWO28KCHFPtCEuy0DElIst1LmM9B'
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

                const shipping = (session as any).shipping_details?.address;
                const shippingAddress = {
                    line1: shipping?.line1,
                    line2: shipping?.line2,
                    city: shipping?.city,
                    state: shipping?.state,
                    postal_code: shipping?.postal_code,
                    country: shipping?.country,
                };

                console.log('--- WEBHOOK: Iniciando Procesamiento ---');

                // TAREA 1: CREAR EL PEDIDO EN LA BASE DE DATOS
                let orderId = null;
                try {
                    const { data, error: rpcError } = await supabaseAdmin.rpc('process_order', {
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

                    if (rpcError) {
                        console.error('⚠ Error en RPC process_order (el pedido no se guardó en DB):', rpcError.message);
                    } else {
                        orderId = data;
                        console.log('✓ Pedido registrado en DB:', orderId);
                    }
                } catch (dbErr) {
                    console.error('❌ Error crítico al conectar con DB para crear pedido:', dbErr);
                }

                // TAREA 2: BAJAR EL STOCK (SE HACE SIEMPRE, AUNQUE FALLE LA DB ANTERIOR)
                console.log('--- WEBHOOK: Bajando Stock ---');
                for (const item of items) {
                    try {
                        const { data: prod, error: fetchErr } = await supabaseAdmin.from('products').select('stock').eq('id', item.id).single();
                        if (!fetchErr && prod) {
                            const newStock = Math.max(0, prod.stock - item.quantity);
                            await supabaseAdmin.from('products').update({ stock: newStock }).eq('id', item.id);
                            console.log(`✓ Stock actualizado para ${item.id}: ${prod.stock} -> ${newStock}`);
                        } else {
                            console.error(`❌ Error al obtener stock para ${item.id}:`, fetchErr);
                        }
                    } catch (sErr) {
                        console.error(`❌ Excepción al restar stock para ${item.id}:`, sErr);
                    }
                }

                // TAREA 3: GENERAR FACTURA Y ENVIAR EMAIL
                if (orderId) {
                    try {
                        await supabaseAdmin.rpc('generate_invoice', { p_order_id: orderId });
                    } catch (invErr) {
                        console.error('⚠ Falló generación automática de factura:', invErr);
                    }

                    (async () => {
                        try {
                            const { sendOrderConfirmationEmail } = await import('../../lib/email');
                            const { data: orderData } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
                            const { data: orderItems } = await supabaseAdmin.from('order_items').select('*').eq('order_id', orderId);

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
                                console.log('✓ Email de confirmación enviado.');
                            }
                        } catch (e) {
                            console.error('❌ Error en proceso de envío de email:', e);
                        }
                    })();
                } else {
                    console.log('⚠ No se envía email porque el pedido no se registró en la base de datos.');
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error('Webhook Error:', err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
};
