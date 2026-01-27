-- Add parent_id to categories table for hierarchy (Men/Women/Kids/etc)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);

-- Optional: Insert 'Hombre' and 'Mujer' root categories if they don't exist
INSERT INTO public.categories (name, slug, description)
SELECT 'Hombre', 'hombre', 'Moda masculina'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'hombre');

INSERT INTO public.categories (name, slug, description)
SELECT 'Mujer', 'mujer', 'Moda femenina'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'mujer');
