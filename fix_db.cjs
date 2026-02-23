const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length >= 2) {
        envVars[parts[0]] = parts.slice(1).join('=');
    }
});

const supabase = createClient(envVars.PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function fixDB() {
    // 1. Get all categories
    const { data: cats } = await supabase.from('categories').select('*');
    const catBySlug = {};
    cats.forEach(c => { catBySlug[c.slug] = c; });

    const hombreId = catBySlug['hombre']?.id;
    const mujerId = catBySlug['mujer']?.id;

    if (!hombreId || !mujerId) {
        console.error('No se encontraron las categorías Hombre/Mujer');
        return;
    }
    console.log(`Hombre ID: ${hombreId}`);
    console.log(`Mujer ID: ${mujerId}`);

    // 2. Asignar parent_id a subcategorías de HOMBRE
    const hombreSubcats = ['camisas-hombre', 'pantalones-hombre', 'calzado-hombre', 'trajes', 'chalecos', 'camisetas'];
    for (const slug of hombreSubcats) {
        if (catBySlug[slug]) {
            const { error } = await supabase.from('categories').update({ parent_id: hombreId }).eq('id', catBySlug[slug].id);
            console.log(`  ${slug} -> Hombre: ${error ? 'ERROR: ' + error.message : 'OK'}`);
        }
    }

    // 3. Asignar parent_id a subcategorías de MUJER
    const mujerSubcats = ['vestidos', 'blusas', 'faldas', 'calzado-mujer', 'accesorios'];
    for (const slug of mujerSubcats) {
        if (catBySlug[slug]) {
            const { error } = await supabase.from('categories').update({ parent_id: mujerId }).eq('id', catBySlug[slug].id);
            console.log(`  ${slug} -> Mujer: ${error ? 'ERROR: ' + error.message : 'OK'}`);
        }
    }

    // 4. Mover productos de categorías genéricas (camisas, pantalones) a las de hombre
    // Productos en "camisas" (genérica) -> mover a "camisas-hombre"
    if (catBySlug['camisas'] && catBySlug['camisas-hombre']) {
        const { data: camisaProducts } = await supabase.from('products').select('id, name').eq('category_id', catBySlug['camisas'].id);
        if (camisaProducts && camisaProducts.length > 0) {
            for (const p of camisaProducts) {
                const { error } = await supabase.from('products').update({ category_id: catBySlug['camisas-hombre'].id }).eq('id', p.id);
                console.log(`  Producto "${p.name}": camisas -> camisas-hombre: ${error ? 'ERROR' : 'OK'}`);
            }
        }
        // Asignar parent_id a camisas genérica también (como hombre) o eliminarla
        await supabase.from('categories').update({ parent_id: hombreId }).eq('id', catBySlug['camisas'].id);
        console.log('  camisas (genérica) -> parent: Hombre');
    }

    // Productos en "pantalones" (genérica) -> mover a "pantalones-hombre"
    if (catBySlug['pantalones'] && catBySlug['pantalones-hombre']) {
        const { data: pantProducts } = await supabase.from('products').select('id, name').eq('category_id', catBySlug['pantalones'].id);
        if (pantProducts && pantProducts.length > 0) {
            for (const p of pantProducts) {
                const { error } = await supabase.from('products').update({ category_id: catBySlug['pantalones-hombre'].id }).eq('id', p.id);
                console.log(`  Producto "${p.name}": pantalones -> pantalones-hombre: ${error ? 'ERROR' : 'OK'}`);
            }
        }
        await supabase.from('categories').update({ parent_id: hombreId }).eq('id', catBySlug['pantalones'].id);
        console.log('  pantalones (genérica) -> parent: Hombre');
    }

    // 5. Actualizar imagen de la Falda Plisada Midi
    const { error: faldaErr } = await supabase.from('products')
        .update({ images: ['https://images.unsplash.com/photo-1583496661160-fb5886a0abe7?w=800'] })
        .eq('slug', 'falda-plisada-midi');
    console.log(`  Imagen falda actualizada: ${faldaErr ? 'ERROR: ' + faldaErr.message : 'OK'}`);

    // 6. Verificar resultado final
    console.log('\n=== RESULTADO FINAL ===');
    const { data: finalCats } = await supabase.from('categories').select('name, slug, parent_id').order('name');
    const parentMap = {};
    finalCats.forEach(c => { parentMap[c.slug] = c; });

    finalCats.forEach(c => {
        const parent = finalCats.find(p => p.parent_id === null && cats.find(cc => cc.id === c.parent_id)?.slug === p.slug);
        const parentName = c.parent_id ? (cats.find(cc => cc.id === c.parent_id)?.name || '?') : 'RAÍZ';
        console.log(`  ${c.name.padEnd(20)} | parent: ${parentName}`);
    });

    console.log('\nProductos:');
    const { data: finalProds } = await supabase.from('products').select('name, category_id').order('name');
    const { data: finalCatsAll } = await supabase.from('categories').select('id, name, slug, parent_id');
    const cMap = {};
    finalCatsAll.forEach(c => { cMap[c.id] = c; });
    finalProds.forEach(p => {
        const cat = cMap[p.category_id];
        const parentCat = cat?.parent_id ? cMap[cat.parent_id] : null;
        console.log(`  ${p.name.padEnd(30)} | ${parentCat?.name || '?'} > ${cat?.name || 'NONE'}`);
    });

    console.log('\n¡Base de datos corregida!');
}

fixDB().catch(console.error);
