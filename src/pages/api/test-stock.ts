import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { productId, quantity } = await request.json();

        console.log(`🧪 TEST STOCK: Intentando reducir ${quantity} del producto ${productId}`);

        // Usar cliente con service role (Admin)
        const supabaseAdmin = createServerClient();

        // 1. Verificar stock actual
        const { data: product, error: fetchError } = await supabaseAdmin
            .from('products')
            .select('id, name, stock')
            .eq('id', productId)
            .single();

        if (fetchError || !product) {
            return new Response(JSON.stringify({
                error: 'Producto no encontrado',
                details: fetchError
            }), { status: 404 });
        }

        console.log(`📊 Stock actual: ${product.stock}`);

        // 2. Intentar RPC
        const { data: rpcSuccess, error: rpcError } = await supabaseAdmin.rpc('decrement_stock', {
            p_product_id: productId,
            p_quantity: quantity
        });

        if (rpcError) {
            console.error('❌ RPC Error:', rpcError);
        } else {
            console.log('✅ RPC Success:', rpcSuccess);
        }

        // 3. Verificar si cambió
        const { data: productAfter } = await supabaseAdmin
            .from('products')
            .select('stock')
            .eq('id', productId)
            .single();

        return new Response(JSON.stringify({
            success: rpcSuccess,
            before: product.stock,
            after: productAfter?.stock,
            rpcError: rpcError,
            message: rpcSuccess ? 'Stock reducido correctamente' : 'Fallo al reducir stock'
        }), { status: 200 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
