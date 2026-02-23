-- =============================================
-- FIX: Separar categorías por género (Hombre/Mujer)
-- =============================================
-- Problema: Las categorías originales (camisas, pantalones, accesorios)
-- son genéricas y no tienen parent_id, causando que los productos
-- de hombre aparezcan en mujer y viceversa.
-- =============================================

-- 1. Asegurarse de que existen las categorías padre
INSERT INTO public.categories (name, slug, description, image_url)
SELECT 'Hombre', 'hombre', 'Moda masculina elegante y sofisticada', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'hombre');

INSERT INTO public.categories (name, slug, description, image_url)
SELECT 'Mujer', 'mujer', 'Moda femenina exclusiva y trendy', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'mujer');

-- 2. Renombrar categorías genéricas existentes a Hombre (añadir sufijo)
-- Camisas → Camisas Hombre
UPDATE public.categories SET 
    name = 'Camisas Hombre', 
    slug = 'camisas-hombre', 
    description = 'Camisas elegantes para él',
    parent_id = (SELECT id FROM public.categories WHERE slug = 'hombre')
WHERE slug = 'camisas';

-- Pantalones → Pantalones Hombre
UPDATE public.categories SET 
    name = 'Pantalones Hombre', 
    slug = 'pantalones-hombre', 
    description = 'Pantalones de vestir y casual',
    parent_id = (SELECT id FROM public.categories WHERE slug = 'hombre')
WHERE slug = 'pantalones';

-- Camisetas (Hombre)
UPDATE public.categories SET 
    parent_id = (SELECT id FROM public.categories WHERE slug = 'hombre')
WHERE slug = 'camisetas';

-- Chalecos (Hombre)
UPDATE public.categories SET 
    parent_id = (SELECT id FROM public.categories WHERE slug = 'hombre')
WHERE slug = 'chalecos';

-- Trajes (Hombre)
UPDATE public.categories SET 
    parent_id = (SELECT id FROM public.categories WHERE slug = 'hombre')
WHERE slug = 'trajes';

-- Accesorios genéricos → Accesorios Mujer (renombrar slug)
-- Primero verificar si ya existe 'accesorios-mujer' para evitar conflicto
UPDATE public.categories SET 
    name = 'Accesorios Mujer',
    description = 'Bolsos, cinturones y complementos',
    parent_id = (SELECT id FROM public.categories WHERE slug = 'mujer')
WHERE slug = 'accesorios' 
AND NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'accesorios-mujer');

-- 3. Crear subcategorías de Hombre que no existan
INSERT INTO public.categories (name, slug, description, parent_id)
SELECT 'Calzado Hombre', 'calzado-hombre', 'Zapatos y sneakers', 
       (SELECT id FROM public.categories WHERE slug = 'hombre')
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'calzado-hombre');

-- 4. Crear subcategorías de Mujer que no existan
INSERT INTO public.categories (name, slug, description, parent_id)
SELECT 'Vestidos', 'vestidos', 'Vestidos para toda ocasión',
       (SELECT id FROM public.categories WHERE slug = 'mujer')
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'vestidos');

INSERT INTO public.categories (name, slug, description, parent_id)
SELECT 'Blusas', 'blusas', 'Blusas y tops elegantes',
       (SELECT id FROM public.categories WHERE slug = 'mujer')
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'blusas');

INSERT INTO public.categories (name, slug, description, parent_id)
SELECT 'Faldas', 'faldas', 'Faldas modernas y clásicas',
       (SELECT id FROM public.categories WHERE slug = 'mujer')
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'faldas');

INSERT INTO public.categories (name, slug, description, parent_id)
SELECT 'Calzado Mujer', 'calzado-mujer', 'Tacones, sandalias y más',
       (SELECT id FROM public.categories WHERE slug = 'mujer')
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'calzado-mujer');

-- 5. Actualizar parent_id de subcategorías existentes que no lo tengan
UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug = 'mujer')
WHERE slug IN ('vestidos', 'blusas', 'faldas', 'calzado-mujer') AND parent_id IS NULL;

UPDATE public.categories SET parent_id = (SELECT id FROM public.categories WHERE slug = 'mujer')
WHERE slug = 'accesorios' AND parent_id IS NULL;

-- 6. Asegurar que Hombre y Mujer NO tienen parent_id (son raíz)
UPDATE public.categories SET parent_id = NULL WHERE slug IN ('hombre', 'mujer');
