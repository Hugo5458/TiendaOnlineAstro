import { createServerClient } from '../../lib/supabase';

export const GET = async () => {
    try {
        const supabase = createServerClient();

        // Intentamos leer el primer producto para ver si hay conexión básica
        const { data: products, error: prodError } = await supabase.from('products').select('id, name').limit(1);

        // Intentamos una operación que REQUIERA service role (saltar RLS)
        // Ejemplo: Leer algo de la tabla de pedidos (que suele estar protegida)
        const { data: orders, error: orderError } = await supabase.from('orders').select('id').limit(1);

        const serviceRoleCheck = !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUCCESS' : 'FAILED';

        // SMTP check
        const smtpCheck = {
            host: !!import.meta.env.SMTP_HOST ? 'PRESENT' : 'MISSING',
            user: !!import.meta.env.SMTP_USER ? 'PRESENT' : 'MISSING',
            pass: !!import.meta.env.SMTP_PASS ? 'PRESENT' : 'MISSING'
        };

        return new Response(JSON.stringify({
            status: 'Diagnostic complete',
            connection: prodError ? 'ERROR' : 'SUCCESS', // Assuming 'error' refers to prodError for database connection
            serviceRoleCheck,
            smtpCheck,
            databaseError: prodError ? prodError.message : null, // Using prodError for database error
            orderCount: orders ? orders.length : 0, // Using orders for order count
            env: {
                hasUrl: !!import.meta.env.PUBLIC_SUPABASE_URL,
                hasAnonKey: !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
