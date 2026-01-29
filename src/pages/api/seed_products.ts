import type { APIRoute } from 'astro';
import { createServerClient, demoCategories, demoProducts } from '../../lib/supabase';

export const POST: APIRoute = async () => {
    const admin = createServerClient();
    const results = { categories: 0, products: 0, errors: [] as any[] };

    try {
        // 1. Insertar Categorías
        for (const cat of demoCategories) {
            // Verificar si existe por slug
            const { data: existing } = await admin.from('categories').select('id').eq('slug', cat.slug).single();

            if (!existing) {
                // Eliminar ID numérico para que genere UUID, o usar el numérico si la BD lo permite (asumimos UUID)
                // Para simplificar, insertamos sin ID y dejamos que Postgres genere, pero necesitamos mapear los viejos IDs para los productos
                const { error } = await admin.from('categories').insert({
                    name: cat.name,
                    slug: cat.slug,
                    description: cat.description,
                    image_url: cat.image_url
                });
                if (error) results.errors.push({ type: 'cat', name: cat.name, error });
                else results.categories++;
            }
        }

        // Obtener mapa real de categorías (Slug -> UUID)
        const { data: realCats } = await admin.from('categories').select('id, slug');
        const slugMap = new Map(realCats?.map(c => [c.slug, c.id]));

        // 2. Insertar Productos
        for (const prod of demoProducts) {
            const { data: existing } = await admin.from('products').select('id').eq('slug', prod.slug).single();

            if (!existing) {
                // Buscar ID real de la categoría
                const catSlug = prod.category?.slug; // demoProducts tiene el objeto category anidado
                const realCatId = catSlug ? slugMap.get(catSlug) : null;

                const { error } = await admin.from('products').insert({
                    name: prod.name,
                    slug: prod.slug,
                    description: prod.description,
                    price: prod.price,
                    compare_at_price: prod.compare_at_price,
                    stock: prod.stock,
                    category_id: realCatId,
                    images: prod.images,
                    sizes: prod.sizes,
                    colors: prod.colors,
                    is_featured: prod.is_featured,
                    is_flash_offer: prod.is_flash_offer,
                    is_active: prod.is_active
                });

                if (error) results.errors.push({ type: 'prod', name: prod.name, error });
                else results.products++;
            }
        }

        return new Response(JSON.stringify({ success: true, results }), { status: 200 });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message, results }), { status: 500 });
    }
};
