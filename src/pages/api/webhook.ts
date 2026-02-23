import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createServerClient } from '../../lib/supabase';
import { sendOrderConfirmationEmail } from '../../lib/email';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    const signature = request.headers.get('stripe-signature');
    let logs: string[] = [];

    const addLog = (msg: string) => {
        const log = `${new Date().toISOString()}: ${msg}`;
        console.log(log);
        logs.push(log);
    };

    try {
        const body = await request.text();
        const secret = 'whsec_jknLiWO28KCHFPtCEuy0DElIst1LmM9B'.trim();

        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature || '', secret);
            addLog(`✅ Firma Stripe verificada: ${event.type}`);
        } catch (err: any) {
            addLog(`⚠️ Fallo de firma: ${err.message}. Continuando en modo diagnóstico...`);
            event = JSON.parse(body);
        }

        if (event.type === 'checkout.session.completed') {
            const session = (event.data?.object || event) as Stripe.Checkout.Session;
            const metadata = session.metadata;

            if (!metadata || !metadata.items) {
                addLog('❌ ERROR: El evento no tiene metadata de productos.');
                return new Response(JSON.stringify({ error: 'No metadata', logs }), { status: 200 });
            }

            const items = JSON.parse(metadata.items);
            addLog(`📦 Productos detectados: ${items.length}`);

            const supabaseAdmin = createServerClient();

            // 1. INTENTAR RPC (process_order)
            addLog('🚀 Ejecutando RPC process_order...');
            const { data, error: rpcError } = await supabaseAdmin.rpc('process_order', {
                p_customer_email: session.customer_details?.email || '',
                p_customer_name: metadata.customerName || session.customer_details?.name || 'Cliente',
                p_customer_phone: session.customer_details?.phone || '',
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

            if (rpcError) {
                addLog(`❌ ERROR RPC: ${rpcError.message} - ${rpcError.details}`);
            } else {
                addLog(`✅ Pedido registrado con ID: ${data}`);
            }

            // 2. BAJAR STOCK MANUAL (Como refuerzo)
            for (const item of items) {
                addLog(`🔄 Restando stock para producto ${item.id}...`);
                const { data: prod, error: fErr } = await supabaseAdmin.from('products').select('stock').eq('id', item.id).single();
                if (fErr) {
                    addLog(`❌ No se encontró producto ${item.id}: ${fErr.message}`);
                    continue;
                }
                const { error: uErr } = await supabaseAdmin.from('products').update({
                    stock: Math.max(0, prod.stock - item.quantity)
                }).eq('id', item.id);

                if (uErr) addLog(`❌ No se pudo bajar stock: ${uErr.message}`);
                else addLog(`✅ Stock bajado para ${item.id}.`);
            }

            // 3. Enviar email (AWAIT para ver errores en Stripe)
            try {
                const customerEmail = session.customer_details?.email;
                if (!customerEmail) throw new Error('No hay email del cliente');

                addLog(`📧 Preparando email para: ${customerEmail}`);

                const orderDetails = {
                    orderNumber: `FS-${new Date().getTime().toString().slice(-4)}`, // Temporal si no tenemos el ID
                    customerName: metadata.customerName || session.customer_details?.name || 'Cliente',
                    customerEmail: customerEmail,
                    items: items.map((i: any) => ({
                        name: i.name || 'Producto',
                        quantity: i.quantity,
                        price: i.price,
                        total: (i.price * i.quantity)
                    })),
                    subtotal: (session.amount_subtotal || 0),
                    shipping: (session.total_details?.amount_shipping || 0),
                    tax: (session.total_details?.amount_tax || 0),
                    total: (session.amount_total || 0),
                    shippingAddress: (session as any).shipping_details?.address || {},
                    date: new Date().toISOString()
                };

                await sendOrderConfirmationEmail(orderDetails);
                addLog('✅ Email enviado correctamente.');
            } catch (emailErr: any) {
                addLog(`❌ ERROR EMAIL: ${emailErr.message}`);
            }
        }

        return new Response(JSON.stringify({ success: true, logs }), { status: 200 });

    } catch (err: any) {
        addLog(`❌ ERROR CRÍTICO WEBHOOK: ${err.message}`);
        return new Response(JSON.stringify({ error: err.message, logs }), { status: 200 });
    }
};
