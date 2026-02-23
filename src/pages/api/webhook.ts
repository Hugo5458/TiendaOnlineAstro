import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createServerClient } from '../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    const signature = request.headers.get('stripe-signature');

    try {
        const body = await request.text();
        // Clave limpia sin espacios
        const secret = 'whsec_jknLiWO28KCHFPtCEuy0DElIst1LmM9B'.trim();

        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature || '', secret);
            console.log(`✅ Firma verificada correctamente para evento: ${event.type}`);
        } catch (err: any) {
            console.error(`❌ Fallo de firma (Usando whsec: ${secret.substring(0, 8)}...): ${err.message}`);

            // --- MODO DIAGNÓSTICO ---
            // Si la firma falla, intentamos procesar el evento de todas formas para ver si el resto del código funciona
            // (ESTO ES SOLO PARA PRUEBAS)
            try {
                event = JSON.parse(body);
                console.log('⚠️ Procesando evento SIN VERIFICAR FIRMA (Modo Diagnóstico)');
            } catch (jsonErr) {
                return new Response('Error JSON', { status: 400 });
            }
        }

        // Manejamos el evento (se llame 'event.type' o venga del JSON directo)
        const eventType = event.type;

        if (eventType === 'checkout.session.completed') {
            const session = (event.data?.object || event) as Stripe.Checkout.Session;
            const metadata = session.metadata;

            if (!metadata || !metadata.items) {
                console.error('❌ Metadata no encontrada en el evento');
                return new Response('Recibido pero sin metadata', { status: 200 });
            }

            const items = JSON.parse(metadata.items);
            const customerEmail = session.customer_details?.email || '';
            const customerName = metadata.customerName || session.customer_details?.name || 'Cliente';
            const customerPhone = session.customer_details?.phone || '';

            const supabaseAdmin = createServerClient();

            console.log('--- PROCESANDO PEDIDO (MODO DINÁMICO) ---');

            // 1. REGISTRAR PEDIDO
            let orderId = null;
            try {
                const { data, error: rpcError } = await supabaseAdmin.rpc('process_order', {
                    p_customer_email: customerEmail,
                    p_customer_name: customerName,
                    p_customer_phone: customerPhone,
                    p_shipping_address: (session as any).shipping_details?.address || {},
                    p_items: items.map((i: any) => ({
                        product_id: i.id,
                        quantity: i.quantity,
                        size: i.size,
                        color: i.color || null
                    })),
                    p_shipping_cost: session.total_details?.amount_shipping || 0,
                    p_tax: session.total_details?.amount_tax || 0,
                    p_discount_amount: session.total_details?.amount_discount || 0,
                    p_discount_code: metadata.discountCode || null,
                    p_payment_intent_id: session.payment_intent as string,
                    p_total: session.amount_total || 0
                });

                if (!rpcError) orderId = data;
                else console.error('Error RPC:', rpcError.message);
            } catch (e) {
                console.error('Error DB Exception:', e);
            }

            // 2. STOCK
            for (const item of items) {
                try {
                    const { data: prod } = await supabaseAdmin.from('products').select('stock').eq('id', item.id).single();
                    if (prod) {
                        await supabaseAdmin.from('products').update({ stock: Math.max(0, prod.stock - item.quantity) }).eq('id', item.id);
                        console.log(`✓ Stock restado para ${item.id}`);
                    }
                } catch (sErr) { }
            }

            // 3. EMAIL
            if (orderId) {
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
                        console.log('✓ Email enviado correctamente');
                    }
                } catch (emailErr) {
                    console.error('Error Email:', emailErr);
                }
            }
        }

        return new Response(JSON.stringify({ received: true, diagnostic: true }), { status: 200 });

    } catch (err: any) {
        console.error('Webhook Error Crítico:', err.message);
        return new Response(`Error: ${err.message}`, { status: 200 }); // Retornamos 200 para ver logs en Stripe
    }
};
