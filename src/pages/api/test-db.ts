import { createServerClient } from '../../lib/supabase';

export const GET = async () => {
    try {
        const supabase = createServerClient();

        // Intentamos leer el primer producto para ver si hay conexión básica
        const { data: products, error: prodError } = await supabase.from('products').select('id, name').limit(1);

        // Intentamos una operación que REQUIERA service role (saltar RLS)
        // Ejemplo: Leer algo de la tabla de pedidos (que suele estar protegida)
        const { data: orders, error: orderError } = await supabase.from('orders').select('id').limit(1);

        return new Response(JSON.stringify({
            connection: prodError ? 'FAILED' : 'SUCCESS',
            productsFound: products?.length || 0,
            errorProducts: prodError?.message || 'None',
            serviceRoleCheck: orderError ? 'FAILED (Unauthorized/Key Wrong)' : 'SUCCESS',
            errorOrders: orderError?.message || 'None',
            keyPresent: !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
            keyPrefix: import.meta.env.SUPABASE_SERVICE_ROLE_KEY ? import.meta.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 5) : 'None'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
