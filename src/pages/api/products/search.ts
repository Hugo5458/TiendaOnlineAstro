import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim() || '';

    if (query.length < 2) {
        return new Response(JSON.stringify([]), { status: 200 });
    }

    if (!isSupabaseConfigured()) {
        // Mock data for search
        const mockResults = [
            { id: '1', name: 'Camisa Oxford Azul', slug: 'camisa-oxford-azul', price: 5900, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200' },
            { id: '2', name: 'Camisa Lino Blanca', slug: 'camisa-lino-blanca', price: 7500, image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=200' },
            { id: '9', name: 'Vestido Midi Floral', slug: 'vestido-midi-floral', price: 8900, image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=200' },
            { id: '4', name: 'Traje Azul Marino', slug: 'traje-azul-marino', price: 29900, image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200' },
        ].filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

        return new Response(JSON.stringify(mockResults), { status: 200 });
    }

    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, slug, price, images')
            .eq('is_active', true)
            .ilike('name', `%${query}%`)
            .limit(5);

        if (error) throw error;

        const results = data.map(p => ({
            ...p,
            image: p.images && p.images.length > 0 ? p.images[0] : null
        }));

        return new Response(JSON.stringify(results), { status: 200 });
    } catch (error) {
        console.error('Search error:', error);
        return new Response(JSON.stringify([]), { status: 500 });
    }
};
