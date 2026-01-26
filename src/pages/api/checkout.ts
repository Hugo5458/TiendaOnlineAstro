import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
    try {
        const { items, customerEmail, customerName, discountCode } = await request.json();

        if (!items || items.length === 0) {
            return new Response(JSON.stringify({ error: 'El carrito está vacío' }), { status: 400 });
        }

        // Prepare line items for Stripe
        const lineItems = items.map((item: any) => ({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: item.name,
                    images: item.image ? [item.image] : [],
                    description: `Talla: ${item.size || 'N/A'}`,
                },
                unit_amount: item.price,
            },
            quantity: item.quantity,
        }));

        // Handle Discount
        let discounts = [];
        if (discountCode) {
            // 1. Validate against our DB
            const { data: discountData, error } = await supabase.rpc('validate_discount_code', {
                p_code: discountCode,
                p_subtotal: items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)
            });

            if (!error && discountData && discountData.valid) {
                // 2. Create a specific coupon for this checkout in Stripe
                // This ensures the discount matches exactly our DB logic
                try {
                    const couponParams: Stripe.CouponCreateParams = {
                        duration: 'once',
                        name: discountCode,
                    };

                    if (discountData.discount_type === 'percentage') {
                        couponParams.percent_off = discountData.discount_value;
                    } else {
                        couponParams.amount_off = discountData.discount_value; // Already in cents
                        couponParams.currency = 'eur';
                    }

                    const coupon = await stripe.coupons.create(couponParams);
                    discounts.push({ coupon: coupon.id });

                    // Increment usage in our DB (optimistic)
                    await supabase.rpc('apply_discount_code', { p_code: discountCode });

                } catch (stripeError) {
                    console.error('Error creating Stripe coupon:', stripeError);
                    // Continue without discount if Stripe fails, or handle error
                }
            }
        }

        // Create Stripe Checkout Session
        // Incluye los métodos de pago más populares en España
        const session = await stripe.checkout.sessions.create({
            // Métodos de pago habilitados:
            // - card: Tarjetas de crédito/débito (incluye Google Pay, Apple Pay automáticamente)
            // - paypal: Pagos con PayPal
            payment_method_types: [
                'card',
                'paypal',
            ],
            line_items: lineItems,
            discounts: discounts.length > 0 ? discounts : undefined,
            mode: 'payment',
            ...(customerEmail ? { customer_email: customerEmail } : {}),
            success_url: `${import.meta.env.PUBLIC_SITE_URL}/pedido/exito?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/pedido/cancelado`,
            shipping_address_collection: {
                allowed_countries: ['ES'],
            },
            phone_number_collection: {
                enabled: true,
            },
            // Configuración adicional para wallets
            payment_method_options: {
                card: {
                    // Habilita Google Pay y Apple Pay en pagos con tarjeta
                    setup_future_usage: undefined,
                },
            },
            billing_address_collection: 'auto',
            metadata: {
                customerName: customerName,
                discountCode: discountCode || '',
                items: JSON.stringify(items.map((i: any) => ({
                    id: i.id,
                    quantity: i.quantity,
                    size: i.size,
                    color: i.color
                }))),
            },
        });

        return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('Stripe Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
