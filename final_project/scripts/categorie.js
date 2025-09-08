
// ===== Config partagée (mêmes normalisations que sur index) =====
const API_PRODUCTS = './public/data/products.json';
const CACHE_KEY    = 'cowema_products_cache_v1';
const CACHE_TTL_MS = 10*60*1000;
const MAX_PAGES_CAP = 150;
const RATE_LIMIT_MS = 1200;
const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1200;

const els = { status:document.getElementById('status'), grid:document.getElementById('grid'), bcCat:document.getElementById('bcCat'), pageTitle:document.getElementById('pageTitle') };

function escapeHtml(s){ return (s??'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function fmtCurrency(n){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XAF',maximumFractionDigits:0}).format(Number(n||0)); }

function percent(oldp, nowp){ const o=Number(oldp), n=Number(nowp); return (o && n && o>n) ? Math.round(((o-n)/o)*100) : 0; }

const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
function parseQS(){ const u=new URL(location.href); return Object.fromEntries(u.searchParams.entries()); }


function loadCache(){
    try{
        const raw = localStorage.getItem(CACHE_KEY); if(!raw) return null;
        const { at, data } = JSON.parse(raw);
        if(!Array.isArray(data)) return null;
        if(Date.now() - at > CACHE_TTL_MS) return null;
        return data;
    }catch{ return null; }
}
function saveCache(data){ try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); }catch{} }

async function fetchWithBackoff(url){
    let attempt = 0;
    while(true){
        const res = await fetch(url, { headers:{'Accept':'application/json'} });
        if(res.status===429){
            const ra = parseInt(res.headers.get('Retry-After')||'0',10);
            const wait = ra ? ra*1000 : Math.min(30000, Math.pow(2,attempt)*BACKOFF_BASE_MS + Math.random()*500);
            attempt++; if(attempt>MAX_RETRIES) throw new Error('Trop de requêtes (429)');
            await sleep(wait); continue;
        }
        if(!res.ok) throw new Error('HTTP '+res.status);
        return res.json();
    }
}

function normalizeProduct(p){
    const id       = p.id;
    const title    = p.title || `Produit ${id}`;
    const image    = p.thumbnail || '';
    const price    = Number(p.price || 0);
    const oldPrice = Number(p.regular_price || 0); // si promo, regular_price > price
    const stock    = Number(p.available_stock ?? 0);
    const categoryName = (p.category && String(p.category).trim())
                        || (p.sub_category && String(p.sub_category).trim())
                        || 'Autres';
    return { raw:p, id, title, image, categoryName, price, oldPrice, stock };
}

function productCard(p){
    const discount = percent(p.oldPrice, p.price);
    const stockText = p.stock>0 ? `${p.stock} en stock` : 'Rupture';
    const stockCls  = p.stock>0 ? 'in' : 'out';
    const titleClean = (p.title||'').trim();
    const img = p.image || '';
    return `<article class="card">
        <a href="detail.html?id=${encodeURIComponent(p.id)}" aria-label="${escapeHtml(titleClean)}">
            <div class="thumb">${img?`<img src="${img}" alt="${escapeHtml(titleClean)}" loading="lazy">`:`<div class="ph" style="aspect-ratio:1/1"></div>`}</div>
        </a>
        <div class="content">
            ${discount>0?`<div class="discount-badge" style="color:#f87171">-${discount}%</div>`:''}
            <div class="title">${escapeHtml(titleClean)}</div>
            <div class="meta"><span class="stock ${stockCls}">${escapeHtml(stockText)}</span> · <span>${escapeHtml(p.categoryName||'')}</span></div>
            <div class="price"><span class="now">${fmtCurrency(p.price||0)}</span>${p.oldPrice>p.price?` <span class="old" style="opacity:.7;text-decoration:line-through">${fmtCurrency(p.oldPrice)}</span>`:''}</div>
        </div>
    </article>`;
}

let ALL_PRODUCTS = [];

async function loadAll(){
  // cache
    const cached = loadCache();
    if(cached){ ALL_PRODUCTS = cached; return; }

    // fetch paginé
    const first = await fetchWithBackoff(`${API_PRODUCTS}?page=1`);
    const last  = Math.min(Number(first.last_page||1), MAX_PAGES_CAP);
    ALL_PRODUCTS = (first.data||[]).map(normalizeProduct);
    for(let p=2;p<=last;p++){
        const js = await fetchWithBackoff(`${API_PRODUCTS}?page=${p}`);
        ALL_PRODUCTS.push(...(js.data||[]).map(normalizeProduct));
        await sleep(RATE_LIMIT_MS);
    }
    // dédup + cache
    const seen = new Set();
    ALL_PRODUCTS = ALL_PRODUCTS.filter(x=>{ const k=String(x.id); if(seen.has(k)) return false; seen.add(k); return true; });
    saveCache(ALL_PRODUCTS);
}

(async function initCat(){
    try{
        els.status.textContent = 'Chargement…';
        const qs = parseQS();
        const cat = (qs.cat||'').toString();
        const sub = (qs.sub||'').toString();
        
        await loadAll();
        
        // filtre catégorie / sous-catégorie
        const list = ALL_PRODUCTS.filter(p=>{
            const okCat = cat ? ( (p.categoryName||'').toLowerCase() === cat.toLowerCase() ) : true;
            const okSub = sub ? ( (p.subCategory||'').toLowerCase() === sub.toLowerCase() ) : true;
            return okCat && okSub;
        });
        
        els.bcCat.textContent = sub ? `${sub} (${cat})` : (cat||'Catégorie');
        els.pageTitle.textContent = sub ? `${sub} — ${cat}` : (cat||'Catégorie');
        els.status.textContent = `${list.length} article${list.length>1?'s':''}`;
        
        els.grid.innerHTML = list.map(productCard).join('') || '<div>Aucun article trouvé.</div>';
    }catch(e){
        console.error(e);
        els.status.textContent = 'Erreur: '+(e?.message||e);
    }
})();