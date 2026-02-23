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

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
    console.log('\n=== PEDIDOS (últimos 10) ===');
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_email, total, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching orders:', error);
    } else {
        console.table(orders);
    }

    console.log('\n=== ARTÍCULOS DE PEDIDO ===');
    const { data: items } = await supabase
        .from('order_items')
        .select('order_id, product_name, quantity, unit_price')
        .limit(10);
    console.table(items);
}

checkDB().catch(console.error);
