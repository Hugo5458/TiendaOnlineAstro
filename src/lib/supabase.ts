import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Client for browser/public operations
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true
    }
});

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
    return !!(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
}

// Server client with service role for admin operations
export function createServerClient(serviceRoleKey?: string) {
    const key = serviceRoleKey || import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
    return createClient(supabaseUrl, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

// Types based on our database schema
export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    parent_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number; // in cents
    compare_at_price: number | null;
    stock: number;
    category_id: string | null;
    category?: Category;
    images: string[];
    sizes: string[];
    colors: string[];
    is_featured: boolean;
    is_flash_offer: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Order {
    id: string;
    order_number: string;
    customer_email: string;
    customer_name: string;
    customer_phone: string | null;
    shipping_address: {
        street: string;
        city: string;
        postal_code: string;
        country: string;
    };
    billing_address: object | null;
    subtotal: number;
    shipping_cost: number;
    tax: number;
    total: number;
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    payment_intent_id: string | null;
    payment_status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string | null;
    product_name: string;
    product_image: string | null;
    quantity: number;
    size: string | null;
    color: string | null;
    unit_price: number;
    total_price: number;
    created_at: string;
}

export interface SiteSetting {
    id: string;
    key: string;
    value: any;
    description: string | null;
    updated_at: string;
}

export interface DiscountCode {
    id: string;
    code: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_purchase: number;
    max_uses: number | null;
    current_uses: number;
    is_active: boolean;
    starts_at: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    order_id: string;
    type: 'invoice' | 'credit_note';
    parent_invoice_id: string | null;
    customer_name: string;
    customer_email: string;
    customer_nif: string | null;
    billing_address: object | null;
    subtotal: number;
    shipping_cost: number;
    tax_rate: number;
    tax_amount: number;
    discount_amount: number;
    total: number; // Negative for credit notes (abonos)
    status: 'draft' | 'issued' | 'paid' | 'voided';
    notes: string | null;
    issued_at: string;
    created_at: string;
    updated_at: string;
}

export interface InvoiceItem {
    id: string;
    invoice_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number; // Negative for credit notes
    created_at: string;
}

// Demo data for when Supabase is not configured
export const demoCategories: Category[] = [
    // Categorías principales
    { id: '1', name: 'Hombre', slug: 'hombre', description: 'Moda masculina elegante y sofisticada', image_url: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800', created_at: '', updated_at: '', parent_id: null },
    { id: '2', name: 'Mujer', slug: 'mujer', description: 'Moda femenina exclusiva y trendy', image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800', created_at: '', updated_at: '', parent_id: null },
    // Subcategorías Hombre
    { id: '3', name: 'Camisas Hombre', slug: 'camisas-hombre', description: 'Camisas elegantes para él', image_url: null, created_at: '', updated_at: '', parent_id: '1' },
    { id: '4', name: 'Pantalones Hombre', slug: 'pantalones-hombre', description: 'Pantalones de vestir y casual', image_url: null, created_at: '', updated_at: '', parent_id: '1' },
    { id: '5', name: 'Trajes', slug: 'trajes', description: 'Trajes completos premium', image_url: null, created_at: '', updated_at: '', parent_id: '1' },
    { id: '6', name: 'Calzado Hombre', slug: 'calzado-hombre', description: 'Zapatos y sneakers', image_url: null, created_at: '', updated_at: '', parent_id: '1' },
    // Subcategorías Mujer
    { id: '7', name: 'Vestidos', slug: 'vestidos', description: 'Vestidos para toda ocasión', image_url: null, created_at: '', updated_at: '', parent_id: '2' },
    { id: '8', name: 'Blusas', slug: 'blusas', description: 'Blusas y tops elegantes', image_url: null, created_at: '', updated_at: '', parent_id: '2' },
    { id: '9', name: 'Faldas', slug: 'faldas', description: 'Faldas modernas y clásicas', image_url: null, created_at: '', updated_at: '', parent_id: '2' },
    { id: '10', name: 'Calzado Mujer', slug: 'calzado-mujer', description: 'Tacones, sandalias y más', image_url: null, created_at: '', updated_at: '', parent_id: '2' },
    { id: '11', name: 'Accesorios', slug: 'accesorios', description: 'Bolsos, cinturones y complementos', image_url: null, created_at: '', updated_at: '', parent_id: '2' },
];

export const demoProducts: Product[] = [
    // ========== PRODUCTOS HOMBRE ==========
    {
        id: '1', name: 'Camisa Oxford Azul Premium', slug: 'camisa-oxford-azul',
        description: 'Camisa Oxford clásica confeccionada en algodón egipcio 100%. Corte slim fit con cuello button-down, perfecta para ocasiones formales o casual elegante. Botones de nácar genuino.',
        price: 5900, compare_at_price: 7900, stock: 25, category_id: '3',
        category: demoCategories[2],
        images: ['https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=800'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Azul', 'Blanco'],
        is_featured: true, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '2', name: 'Camisa Lino Italiana', slug: 'camisa-lino-blanca',
        description: 'Camisa de lino italiano de primera calidad. Textura natural y frescura incomparable. Ideal para climas cálidos y looks mediterráneos.',
        price: 7500, compare_at_price: null, stock: 15, category_id: '3',
        category: demoCategories[2],
        images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800'],
        sizes: ['S', 'M', 'L', 'XL'], colors: ['Blanco', 'Beige'],
        is_featured: true, is_flash_offer: true, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '3', name: 'Pantalón Chino Slim', slug: 'pantalon-chino-beige',
        description: 'Pantalón chino de corte slim en algodón stretch premium. Versatilidad absoluta para cualquier ocasión. Acabado suave al tacto.',
        price: 6900, compare_at_price: null, stock: 30, category_id: '4',
        category: demoCategories[3],
        images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800'],
        sizes: ['28', '30', '32', '34', '36'], colors: ['Beige', 'Navy', 'Negro'],
        is_featured: true, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '4', name: 'Traje Azul Marino Elegance', slug: 'traje-azul-marino',
        description: 'Traje completo en lana italiana Super 120s. Corte moderno con solapas estrechas. Incluye pantalón a juego. La elección perfecta para eventos importantes.',
        price: 29900, compare_at_price: 39900, stock: 8, category_id: '5',
        category: demoCategories[4],
        images: ['https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800'],
        sizes: ['46', '48', '50', '52', '54'], colors: ['Azul Marino'],
        is_featured: true, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '5', name: 'Zapatos Derby Cuero', slug: 'zapatos-derby-cuero',
        description: 'Zapatos Derby artesanales en cuero de becerro pulido. Suela de cuero cosida Goodyear. Un clásico atemporal para el hombre distinguido.',
        price: 15900, compare_at_price: 19900, stock: 12, category_id: '6',
        category: demoCategories[5],
        images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800'],
        sizes: ['39', '40', '41', '42', '43', '44'], colors: ['Marrón', 'Negro'],
        is_featured: true, is_flash_offer: true, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '6', name: 'Polo Premium Algodón', slug: 'polo-premium-algodon',
        description: 'Polo clásico en piqué de algodón premium. Cuello reforzado y logo bordado discreto. El básico imprescindible para tu armario.',
        price: 4500, compare_at_price: 5900, stock: 40, category_id: '3',
        category: demoCategories[2],
        images: ['https://images.unsplash.com/photo-1625910513413-5fc45e7fa9f4?w=800'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Blanco', 'Negro', 'Azul'],
        is_featured: false, is_flash_offer: true, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '7', name: 'Blazer Casual Gris', slug: 'blazer-casual-gris',
        description: 'Blazer desestructurado en mezcla de lana y algodón. Interior forrado a medias para mayor comodidad. Perfecto para smart casual.',
        price: 18900, compare_at_price: null, stock: 10, category_id: '5',
        category: demoCategories[4],
        images: ['https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=800'],
        sizes: ['46', '48', '50', '52'], colors: ['Gris', 'Azul'],
        is_featured: true, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '8', name: 'Sneakers Cuero Blanco', slug: 'sneakers-cuero-blanco',
        description: 'Sneakers minimalistas en cuero italiano premium. Suela de goma confortable. El toque moderno perfecto para cualquier outfit.',
        price: 12900, compare_at_price: null, stock: 20, category_id: '6',
        category: demoCategories[5],
        images: ['https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800'],
        sizes: ['40', '41', '42', '43', '44', '45'], colors: ['Blanco'],
        is_featured: false, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    // ========== PRODUCTOS MUJER ==========
    {
        id: '9', name: 'Vestido Midi Floral', slug: 'vestido-midi-floral',
        description: 'Vestido midi con estampado floral exclusivo. Tejido fluido que cae elegantemente. Escote en V y manga francesa. Perfecto para primavera-verano.',
        price: 8900, compare_at_price: 11900, stock: 18, category_id: '7',
        category: demoCategories[6],
        images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Floral Rosa', 'Floral Azul'],
        is_featured: true, is_flash_offer: true, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '10', name: 'Vestido Negro Elegante', slug: 'vestido-negro-elegante',
        description: 'El little black dress definitivo. Corte ajustado en crepe premium con detalles de encaje. Espalda descubierta con cierre invisible.',
        price: 12900, compare_at_price: null, stock: 15, category_id: '7',
        category: demoCategories[6],
        images: ['https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800'],
        sizes: ['XS', 'S', 'M', 'L'], colors: ['Negro'],
        is_featured: true, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '11', name: 'Blusa Satén Champagne', slug: 'blusa-saten-champagne',
        description: 'Blusa en satén de seda con acabado brillante sofisticado. Cuello con lazo desmontable. Elegancia pura para looks nocturnos o de oficina.',
        price: 6500, compare_at_price: 7900, stock: 22, category_id: '8',
        category: demoCategories[7],
        images: ['https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Champagne', 'Negro', 'Blanco'],
        is_featured: true, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '12', name: 'Blusa Romántica Blanca', slug: 'blusa-romantica-blanca',
        description: 'Blusa de algodón con encajes delicados y mangas abullonadas. Inspiración vintage con un toque contemporáneo. Cierre con botones forrados.',
        price: 5500, compare_at_price: null, stock: 25, category_id: '8',
        category: demoCategories[7],
        images: ['https://images.unsplash.com/photo-1604575396244-6f3e2d8a2be4?w=800'],
        sizes: ['XS', 'S', 'M', 'L'], colors: ['Blanco', 'Rosa Palo'],
        is_featured: false, is_flash_offer: true, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '13', name: 'Falda Plisada Midi', slug: 'falda-plisada-midi',
        description: 'Falda plisada satinada con movimiento fluido. Cintura elástica para máxima comodidad. Una pieza versátil que eleva cualquier look.',
        price: 5900, compare_at_price: 7500, stock: 20, category_id: '9',
        category: demoCategories[8],
        images: ['https://images.unsplash.com/photo-1577900232427-18219b9166a0?w=800'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Dorado', 'Verde', 'Negro'],
        is_featured: true, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '14', name: 'Stilettos Rojos Pasión', slug: 'stilettos-rojos',
        description: 'Stilettos en cuero italiano con tacón de 10cm. Puntera afilada y diseño atemporal. El accesorio perfecto para hacer una declaración de estilo.',
        price: 14900, compare_at_price: 18900, stock: 10, category_id: '10',
        category: demoCategories[9],
        images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800'],
        sizes: ['35', '36', '37', '38', '39', '40'], colors: ['Rojo', 'Negro', 'Nude'],
        is_featured: true, is_flash_offer: true, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '15', name: 'Sandalias Elegantes Doradas', slug: 'sandalias-doradas',
        description: 'Sandalias de tacón medio con tiras doradas. Perfectas para bodas, fiestas y eventos especiales. Plantilla acolchada para comfort.',
        price: 9900, compare_at_price: null, stock: 14, category_id: '10',
        category: demoCategories[9],
        images: ['https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800'],
        sizes: ['35', '36', '37', '38', '39', '40'], colors: ['Dorado', 'Plateado'],
        is_featured: false, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '16', name: 'Vestido Cóctel Rosa', slug: 'vestido-coctel-rosa',
        description: 'Vestido de cóctel en tul con bordados delicados. Escote corazón y falda con volumen. Ideal para eventos y celebraciones especiales.',
        price: 16900, compare_at_price: 21900, stock: 8, category_id: '7',
        category: demoCategories[6],
        images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800'],
        sizes: ['XS', 'S', 'M', 'L'], colors: ['Rosa', 'Azul Celeste'],
        is_featured: true, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '17', name: 'Chaqueta Piel Negra', slug: 'chaqueta-piel-negra',
        description: 'Chaqueta de piel sintética con forro interior suave. Corte corto y cierre central con cremallera. Ideal para looks urbanos.',
        price: 13900, compare_at_price: 17900, stock: 12, category_id: '7',
        category: demoCategories[6],
        images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800'],
        sizes: ['XS', 'S', 'M', 'L'], colors: ['Negro'],
        is_featured: true, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
    {
        id: '18', name: 'Bolso Tote Cuero', slug: 'bolso-tote-cuero',
        description: 'Bolso tote en cuero vegano con asas reforzadas. Espacioso, elegante y perfecto para el día a día.',
        price: 9900, compare_at_price: null, stock: 20, category_id: '11',
        category: demoCategories[10],
        images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800'],
        sizes: [], colors: ['Marrón', 'Negro'],
        is_featured: false, is_flash_offer: false, is_active: true,
        created_at: '', updated_at: ''
    },
];

// Helper functions
// Simple in-memory cache for categories
let categoriesCache: Category[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export async function getCategories(): Promise<Category[]> {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado (URL o Anon Key faltante)');
    }

    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function getProducts(options?: {
    categorySlug?: string;
    featured?: boolean;
    flashOffer?: boolean;
    limit?: number;
}): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado (URL o Anon Key faltante)');
    }

    let query = supabase
        .from('products')
        .select(`
            *,
            category:categories(*)
        `)
        .eq('is_active', true);

    if (options?.categorySlug) {
        const { data: category } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', options.categorySlug)
            .single();

        if (category) {
            query = query.eq('category_id', category.id);
        }
    }

    if (options?.featured) {
        query = query.eq('is_featured', true);
    }

    if (options?.flashOffer) {
        query = query.eq('is_flash_offer', true);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado');
    }

    const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

    if (error) {
        console.error(`Error buscando producto ${slug}:`, error.message);
        return null;
    }

    return data;
}

export async function getSiteSetting(key: string): Promise<any> {
    if (!isSupabaseConfigured()) {
        if (key === 'show_flash_offers') return true;
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) return null;
        return data?.value;
    } catch {
        return null;
    }
}

export async function getShowFlashOffers(): Promise<boolean> {
    const value = await getSiteSetting('show_flash_offers');
    return value === true || value === 'true';
}

export async function getOrders(token: string): Promise<Order[]> {
    if (!isSupabaseConfigured()) {
        return [];
    }

    try {
        const client = createServerClient(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data, error } = await client
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch {
        return [];
    }
}

export async function getCustomerProfile(token: string) {
    if (!isSupabaseConfigured()) {
        return null;
    }

    try {
        const client = createServerClient(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data, error } = await client
            .from('customer_profiles')
            .select('*')
            .single();

        if (error) throw error;
        return data;
    } catch {
        return null;
    }
}
// ADMIN HELPER FUNCTIONS (Service Role)
export async function getAdminProducts(): Promise<Product[]> {
    const supabaseAdmin = createServerClient();
    const { data, error } = await supabaseAdmin
        .from('products')
        .select('*, category:categories(*)')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getAdminOrders(): Promise<Order[]> {
    const supabaseAdmin = createServerClient();
    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}
