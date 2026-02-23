import { createServerClient } from '../../lib/supabase';

export const GET = async () => {
    try {
        const supabase = createServerClient();
        const orderId = '9bbed9ae-05a8-4b77-b573-ff60d21821fe'; // El ID de tu log

        const { data: order, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (error) {
            return new Response(JSON.stringify({
                status: 'NOT_FOUND_IN_DB',
                error: error.message,
                tip: 'Si no aparece aquí, es que el RPC no hizo commit real.'
            }), { status: 404 });
        }

        return new Response(JSON.stringify({
            status: 'FOUND_IN_DB',
            order_number: order.order_number,
            total: order.total,
            items_count: order.order_items?.length,
            customer: order.customer_email
        }), { status: 200 });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
