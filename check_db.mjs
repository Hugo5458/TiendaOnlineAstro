import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Read .env manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.trim().split('=');
    if (key && vals.length) envVars[key] = vals.join('=');
});

const supabase = createClient(envVars.PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkDB() {
    console.log('=== CATEGORÍAS ===');
    const { data: cats } = await supabase.from('categories').select('id, name, slug, parent_id').order('name');
    console.table(cats);

    console.log('\n=== PRODUCTOS (nombre + categoría) ===');
    const { data: prods } = await supabase.from('products').select('id, name, category_id, is_active').order('name');

    // Map category names
    const catMap = {};
    cats?.forEach(c => catMap[c.id] = c.name);

    const mapped = prods?.map(p => ({
        name: p.name,
        category: catMap[p.category_id] || 'SIN CATEGORÍA',
        active: p.is_active
    }));
    console.table(mapped);
}

checkDB().catch(console.error);
