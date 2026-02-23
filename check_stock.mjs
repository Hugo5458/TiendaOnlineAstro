import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

let envVars = {};
if (existsSync('.env')) {
    const envContent = readFileSync('.env', 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...vals] = line.trim().split('=');
        if (key && vals.length) envVars[key.trim()] = vals.join('=').trim();
    });
}

const supabaseUrl = envVars.PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
    console.log('\n=== STOCK ACTUAL DE PRODUCTOS ===');
    const { data: prods } = await supabase
        .from('products')
        .select('id, name, stock')
        .order('name');
    console.table(prods);
}

checkStock().catch(console.error);
