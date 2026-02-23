const { createClient } = require('@supabase/supabase-js');
const { readFileSync, writeFileSync } = require('fs');

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length >= 2) envVars[parts[0]] = parts.slice(1).join('=');
});

const supabase = createClient(envVars.PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkFalda() {
    const { data } = await supabase.from('products').select('name, slug, images').eq('slug', 'falda-plisada-midi').single();
    console.log('Falda:', JSON.stringify(data, null, 2));
}

checkFalda().catch(console.error);
