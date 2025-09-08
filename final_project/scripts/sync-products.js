// scripts/sync-products.js  (CommonJS)

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch'); // v2 (CommonJS)

const API = 'https://eu.cowema.org/api/public/products';

// ⇩ Choisis des sorties cohérentes (ici dans public/data)
const OUT_PRODUCTS   = path.resolve(__dirname, '../public/data/products.json');
const OUT_CATEGORIES = path.resolve(__dirname, '../public/data/categories.json');

const MAX_PAGES_CAP   = 150;
const MAX_RETRIES     = 5;
const BACKOFF_BASE_MS = 1200;
const RATE_LIMIT_MS   = 800;

const sleep = ms => new Promise(r=>setTimeout(r, ms));

function normalize(p){
    const id = p?.id;
    const price = Number(p?.price ?? 0);
    const regular_price = Number(p?.regular_price ?? price);

    return {
        id, // identique
        title: p?.title ?? `Produit ${id ?? ''}`,
        thumbnail: p?.thumbnail ?? '',
        price,                      // nombre
        regular_price,              // nombre
        on_sales: (typeof p?.on_sales === 'boolean')
        ? p.on_sales
        : (regular_price > price), // si non fourni, on déduit
        etat: p?.etat ?? null,
        brand: p?.brand ?? null,
        sub_category: p?.sub_category ?? null,
        category: p?.category ?? null, // on ne remplace PAS par "Autres"
        supplier: p?.supplier ?? null,
        supplier_city: p?.supplier_city ?? null,
        available_stock: Number(p?.available_stock ?? 0), // nombre
        published_at: p?.published_at ?? null
    };
}


async function fetchWithBackoff(url){
    let attempt = 0;
    while(true){
        const res = await fetch(url, { headers:{Accept:'application/json'} });
        if(res.status === 429){
            const ra = parseInt(res.headers.get('Retry-After')||'0',10);
            const wait = ra ? ra*1000 : Math.min(30000, Math.pow(2, attempt)*BACKOFF_BASE_MS + Math.random()*500);
            attempt++; if(attempt>MAX_RETRIES) throw new Error('429: trop de tentatives');
            await sleep(wait); continue;
        }
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }
}

function dedupById(list){
    const seen = new Set(); const out=[];
    for(const x of list){ const k=String(x.id); if(seen.has(k)) continue; seen.add(k); out.push(x); }
    return out;
}

async function ensureDirFor(filePath){
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive:true });
}

(async function run(){
    try{
        const first = await fetchWithBackoff(`${API}?page=1`);
        const last  = Math.min(Number(first.last_page || 1), MAX_PAGES_CAP);
        
        let items = (first.data||[]).map(normalize);
        
        for(let p=2; p<=last; p++){
            const js  = await fetchWithBackoff(`${API}?page=${p}`);
            items.push(...(js.data||[]).map(normalize));
            await sleep(RATE_LIMIT_MS);
        }
    
        items = dedupById(items);
    
        // Catégories
        const catMap = new Map();
        for(const it of items){ const key = it.category || 'Autres'; catMap.set(key, (catMap.get(key)||0)+1); }
        const categories = [...catMap.entries()].map(([name,count]) => ({ name, count }))
                            .sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    
        const payload = {
            version: 1,
            generatedAt: new Date().toISOString(),
            source: API,
            total: items.length,
            items
        };
    
        await ensureDirFor(OUT_PRODUCTS);
        await ensureDirFor(OUT_CATEGORIES);
    
        await fs.writeFile(OUT_PRODUCTS, JSON.stringify(payload, null, 2), 'utf8');
        await fs.writeFile(OUT_CATEGORIES, JSON.stringify({
            generatedAt: payload.generatedAt,
            total: categories.length,
            items: categories
        }, null, 2), 'utf8');
    
        console.log(`OK: ${items.length} produits → ${OUT_PRODUCTS}`);
    }catch(err){
        console.error(err);
        process.exit(1);
    }
})();
