import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured, createServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();
    const { email, firstName, source = 'popup' } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Email inválido'
        }), { status: 400 });
    }

    // Generate a unique discount code for this subscriber
    const discountCode = `WELCOME${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    if (!isSupabaseConfigured()) {
        // Demo mode
        return new Response(JSON.stringify({
            success: true,
            message: '¡Te has suscrito correctamente!',
            discountCode: 'WELCOME10',
            discount: '10%'
        }), { status: 200 });
    }

    try {
        const serverClient = createServerClient();

        // Check if already subscribed
        const { data: existing } = await serverClient
            .from('newsletter_subscriptions')
            .select('id, discount_code_used')
            .eq('email', email.toLowerCase())
            .single();

        if (existing) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Ya estás suscrito a nuestra newsletter',
                discountCode: existing.discount_code_used || 'WELCOME10',
                discount: '10%',
                alreadySubscribed: true
            }), { status: 200 });
        }

        // Insert new subscription
        const { error: insertError } = await serverClient
            .from('newsletter_subscriptions')
            .insert({
                email: email.toLowerCase(),
                first_name: firstName || null,
                discount_code_used: 'WELCOME10',
                source: source
            });

        if (insertError) throw insertError;

        return new Response(JSON.stringify({
            success: true,
            message: '¡Te has suscrito correctamente!',
            discountCode: 'WELCOME10',
            discount: '10%'
        }), { status: 200 });

    } catch (error: any) {
        console.error('Newsletter subscription error:', error);

        // Handle unique constraint violation
        if (error.code === '23505') {
            return new Response(JSON.stringify({
                success: true,
                message: 'Ya estás suscrito a nuestra newsletter',
                discountCode: 'WELCOME10',
                discount: '10%',
                alreadySubscribed: true
            }), { status: 200 });
        }

        return new Response(JSON.stringify({
            success: false,
            error: 'Error al procesar la suscripción'
        }), { status: 500 });
    }
};
