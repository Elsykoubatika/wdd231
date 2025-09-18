
// date et heure de modification
// Get the current year
const currentYear = new Date().getFullYear();
// Get the last modified date of the document
const lastModified = new Date(document.lastModified);
// Format the last modified date
const formattedLastModified = lastModified.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
});

// Insert the current year into the first paragraph of the footer
document.getElementById('currentyear').textContent = `${currentYear}`;

// Insert the last modified date into the second paragraph of the footer
document.getElementById("lastModified").textContent = `Last modified: ${formattedLastModified}`;

// ===== CONFIG =====
const API_PRODUCTS   = './public/data/products.json';
// On n'utilise plus API_CATEGORIES, on génère la liste depuis les produits pour coller aux noms réels.

// UI
const PER_PAGE = 18;
const MAX_PAGES_DISPLAY = 5;

// Bannières + priorité par catégorie (mots-clés dans le nom)
const BANNERS = './public/data/banner.json';
const BANNER_PRIORITY_BY_CATEGORY = {
    'électronique':'packs','electronique':'packs',
    'téléphone':'whatsapp','telephone':'whatsapp',
    'maison':'livraison','mode':'whatsapp'
};

// WhatsApp settings
const DEFAULT_SETTINGS = {
    phone: '+242065086382',
    template: 'Bonjour Cowema 👋, je souhaite commander: {title} (ID {id}) au prix de {price} FCFA.'
};
let WA_SETTINGS = loadSettings();

// Cat showcase
const CATEGORY_SHOWCASE_INITIAL = 12;
const CATEGORY_SHOWCASE_STEP    = 18;
const catShowcaseState = new Map();

// ===== STATE =====
let ALL_PRODUCTS = [];
let CURRENT = { category: 'all', sort: 'none', page: 1 };

// ===== DOM =====
const els = {
    q: document.getElementById('q'),
    stockOnly: document.getElementById('stockOnly'),
    category: document.getElementById('categorySelect'),
    sort: document.getElementById('sortSelect'),
    grid: document.getElementById('grid'),
    pagination: document.getElementById('pagination'),
    year: document.getElementById('year'),
    waPhone: document.getElementById('waPhone'),
    waTemplate: document.getElementById('waTemplate'),
    saveSettings: document.getElementById('saveSettings'),
};
const gridEl = els.grid;
const paginationEl = els.pagination;
if (els.year) els.year.textContent = new Date().getFullYear();

// ===== UTIL =====
function loadSettings(){
    try{ const raw = localStorage.getItem('cowema_wa'); if(raw) return JSON.parse(raw);}catch(e){}
    return {...DEFAULT_SETTINGS};
}
function saveSettings(){ localStorage.setItem('cowema_wa', JSON.stringify(WA_SETTINGS)); }

function escapeHtml(val){ return ((val ?? '')+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function fmtCurrency(n){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XAF',maximumFractionDigits:0}).format(Number(n||0)); }

function percent(oldp, nowp){ const o=Number(oldp), n=Number(nowp); return (o && n && o>n) ? Math.round(((o-n)/o)*100) : 0; }

function truncateText(text, maxLength = 32){ return text.length > maxLength ? text.slice(0, maxLength) + "..." : text; }


function buildWhatsAppHref(text){
    const phone = (WA_SETTINGS.phone || '').replace(/\D/g,'');
    const msg = encodeURIComponent(text || '');
    return `https://wa.me/${phone}?text=${msg}`;
}

function pickPriorityBannerId(catLabel){
    if(!catLabel) return null;
    const key = catLabel.toLowerCase();
    for(const k in BANNER_PRIORITY_BY_CATEGORY){ if(key.includes(k)) return BANNER_PRIORITY_BY_CATEGORY[k]; }
    return null;
}

function getCurrentCategoryLabel(){ return CURRENT.category==='all' ? '' : String(CURRENT.category); }

// ===== SKELETON =====
function skeletonCards(count=PER_PAGE){
    gridEl.innerHTML = '';
    for(let i=0;i<count;i++){
        const card = document.createElement('div');
        card.className = 'card skeleton';
        card.innerHTML = `
            <div class="thumb" ></div>
            <div class="content">
                <div class="title" style="height:34px;background:#1b1f28;border-radius:8px"></div>
                <div class="meta"  style="height:18px;background:#1b1f28;border-radius:8px"></div>
                <div style="height:36px;background:#1b1f28;border-radius:8px"></div>
            </div>`;
        gridEl.appendChild(card);
    }
}

// ===== FETCH (avec anti-429 + cache) =====
const MAX_PAGES_CAP   = 100;
const RATE_LIMIT_MS   = 1200;
const MAX_RETRIES     = 5;
const BACKOFF_BASE_MS = 1200;
const CACHE_KEY       = 'cowema_products_cache_v1';
const CACHE_TTL_MS    = 10 * 60 * 1000;

const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
function loadCache(){
    try{
        const raw = localStorage.getItem(CACHE_KEY);
        if(!raw) return null;
        const { at, data } = JSON.parse(raw);
        if(!Array.isArray(data)) return null;
        if(Date.now() - at > CACHE_TTL_MS) return null;
        return data;
    }catch(e){ return null; }
}
function saveCache(data){
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); }catch(e){}
}
async function fetchWithBackoff(url){
    let attempt = 0;
    while(true){
        const res = await fetch(url, { headers: { 'Accept':'application/json' } });
        if(res.status === 429){
            const ra = parseInt(res.headers.get('Retry-After') || '0', 10);
            const wait = ra ? ra*1000
                            : Math.min(30000, Math.pow(2, attempt) * BACKOFF_BASE_MS + Math.random()*500);
            attempt++;
            if(attempt > MAX_RETRIES) throw new Error('Trop de requêtes (429) après plusieurs tentatives');
            await sleep(wait);
            continue;
        }
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }
}

// Normalisation EXACTE selon ta réponse API
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

// Construit/remplit le <select> Catégorie depuis ALL_PRODUCTS
function ensureCategoryOptions(forceRefresh=false){
    const catSel = els.category;
    if (!catSel) return;

    if (forceRefresh) {
        [...catSel.querySelectorAll('option:not([value="all"])')].forEach(o=>o.remove());
    }

    const existing = new Set([...catSel.options].map(o=>o.value));
    const names = [...new Set(ALL_PRODUCTS.map(p=>p.categoryName).filter(Boolean))]
                .sort((a,b)=>a.localeCompare(b,'fr'));

    names.forEach(name=>{
        if(!existing.has(name)){
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            catSel.appendChild(opt);
        }
    });
}

// cette fonction permet d'extraire un tableau depuis différentes structures
function firstArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items; // bundle local
    if (Array.isArray(payload?.data))  return payload.data;  // API paginée
    return [];
}

// Agrégateur "safe" : charge depuis le JSON local ou pagine l'API
async function loadAllProductsSafe() {
    // 1. lire le cache pour un rendu rapide
    const cached = loadCache();
    if (cached && Array.isArray(cached)) {
        ALL_PRODUCTS = cached;
        ensureCategoryOptions(true);
        render();
        if (typeof renderHomeBlocks === 'function') renderHomeBlocks();
    }

    // 2. déterminer si on charge un fichier JSON local
    const isBundleJson = /\.json(\?|$)/i.test(API_PRODUCTS);
    const firstUrl     = isBundleJson ? API_PRODUCTS : `${API_PRODUCTS}?page=1`;

    // 3. récupérer la première "page" (ou le bundle complet)
    const firstPayload = await fetchWithBackoff(firstUrl);
    let all = firstArray(firstPayload).map(normalizeProduct);

    // affichage rapide
    ALL_PRODUCTS = dedupById(all);
    ensureCategoryOptions(true);
    render();

    // 4. si c’est un bundle local : arrêter ici et rendre les blocs d’accueil
    if (isBundleJson) {
        saveCache(ALL_PRODUCTS);  // facultatif
        if (typeof renderHomeBlocks === 'function') renderHomeBlocks();
        return;
    }

    // 5. sinon : API paginée
    const last = Math.min(Number(firstPayload.last_page || 1), MAX_PAGES_CAP);
    for (let p = 2; p <= last; p++) {
        const js  = await fetchWithBackoff(`${API_PRODUCTS}?page=${p}`);
        const arr = firstArray(js).map(normalizeProduct);
        all.push(...arr);

        // rafraîchit périodiquement l'écran
        if (p % 30 === 0) {
            ALL_PRODUCTS = dedupById(all);
            ensureCategoryOptions(true);
            render();
        }
        await sleep(RATE_LIMIT_MS);
    }

    // 6. final : dé-doublonnage, cache et rendu complet
    ALL_PRODUCTS = dedupById(all);
    saveCache(ALL_PRODUCTS);
    ensureCategoryOptions(true);
    render();
    if (typeof renderHomeBlocks === 'function') renderHomeBlocks();
}



function dedupById(list){
    const seen = new Set();
    return list.filter(x => { const k = String(x.id); if(seen.has(k)) return false; seen.add(k); return true; });
}

// ===== RECHERCHE (helpers) =====
function normalizeText(s){
    return (s ?? '')
        .toString()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-z0-9]+/g,' ')
        .trim();
}
function parseQuery(raw){
    const phrases = [];
    raw = (raw ?? '').toString();
    raw = raw.replace(/"([^"]+)"/g, (_, ph) => { phrases.push(normalizeText(ph)); return ' '; });
    const pos = [], neg = [];
    normalizeText(raw).split(/\s+/).forEach(tok=>{
        if(!tok) return;
        if(tok[0]==='-' && tok.length>1) neg.push(tok.slice(1));
        else pos.push(tok);
    });
    return { phrases, pos, neg };
}

function searchProductsBase(products, { q='', stockOnly=false } = {}){
    const { phrases, pos, neg } = parseQuery(q);
    return products.filter(p=>{
        if (stockOnly){
            const stockNum = Number(p.stock ?? p.stockNum ?? p.available_stock ?? (p.inStock?1:0) ?? 0);
            if (!(p.inStock || stockNum>0)) return false;
        }
        const hay = normalizeText([
            p.title || p.name || '',
            p.categoryName || p.categoryLabel || p.category || '',
            p.raw?.sku || p.raw?.ref || p.sku || '',
            p.brand || p.raw?.brand || '',
            p.supplier || p.raw?.supplier || '',
            p.supplier_city || p.raw?.supplier_city || ''
        ].join(' '));

        for(const ph of phrases){ if(!hay.includes(ph)) return false; }
        for(const t of pos){ if(!hay.includes(t)) return false; }
        for(const t of neg){ if(hay.includes(t)) return false; }
        return true;
    });
}

// ===== RENDER =====
function productCard(p){
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = p.id;

    const discount = percent(p.oldPrice, p.price);
    const titleClean = truncateText(p.title ?? '').toString().trim().slice(0,140);
    const img = (p.image ?? '').toString().trim();

    const waText = (WA_SETTINGS.template || '')
        .replace('{title}', titleClean)
        .replace('{id}', p.id)
        .replace('{price}', (p.price||0).toString());
    const waHref = buildWhatsAppHref(waText);

    const stockText = Number(p.stock)>0 ? `${p.stock} en stock` : 'Rupture';
    const stockCls  = Number(p.stock)>0 ? 'in' : 'out';

    card.innerHTML = `
    ${discount>0?`<div class="discount-badge">-${discount}%</div>`:''}
    <div class="thumb">
        <a href="detail.html?id=${encodeURIComponent(p.id)}" aria-label="Voir le détail">
            ${img?`<img src="${img}" alt="${escapeHtml(titleClean)}" loading="lazy" width="200" height="200" />`:`<div class="ph">🛍️</div>`}
        </a>
    </div>
        <div class="content">
            <div class="title" title="${escapeHtml(titleClean)}">${escapeHtml(titleClean)}</div>

            <div class="price">
                <span class="now">${fmtCurrency(p.price||0)}</span>
                ${p.oldPrice>p.price?`<span class="old">${fmtCurrency(p.oldPrice)}</span>`:''}
            </div>
            <div class="cta-row">
                <a class="cta wa" href="${waHref}" target="_blank" rel="noopener">Commander</a>
                <button class="cart-btn" data-id="${p.id}"><i class="fas fa-shopping-cart"></i></button>
            </div>
            
        </div>
    `;
    return card;
}

function bannerEl(b){
    const wrap = document.createElement('div');
    wrap.className = 'banner';
    wrap.style.background = b.bg || 'linear-gradient(135deg,var(--accent),var(--brand))';

    // ✅ supporte "ctas" (pluriel) et "cta" (singulier)
    const rawCtas = Array.isArray(b.ctas) ? b.ctas : (Array.isArray(b.cta) ? b.cta : []);
    const ctas = rawCtas.map(cta => {
        const type  = (cta.type || 'link').toLowerCase();
        const label = escapeHtml(cta.label || (type === 'whatsapp' ? 'WhatsApp' : 'Découvrir'));
        
        if (type === 'whatsapp') {
            const href = buildWhatsAppHref(cta.prefill || 'Bonjour 👋');
            return `<a class="cta-btn" href="${href}" target="_blank" rel="noopener">${label}</a>`;
        }
        // défaut: lien simple
        const href = escapeHtml(cta.href || '#');
        return `<a class="cta-btn" href="${href}">${label}</a>`;
    }).join('');

    wrap.innerHTML = `
        <div class="left">
            ${b.kicker ? `<div class="kicker">${escapeHtml(b.kicker)}</div>` : ''}
            <div class="headline">${escapeHtml(b.title || 'Offre spéciale')}</div>
            ${b.sub ? `<div class="sub">${escapeHtml(b.sub)}</div>` : ''}
            <div class="cta-wrap">${ctas}</div>
        </div>
        <div class="emoji" aria-hidden="true">${b.emoji || '✨'}</div>
    `;
    return wrap;
}


function selectBanner(priorityId, rotationIndex){
    if(priorityId && rotationIndex===0){ const hit = BANNERS.find(x=>x.id===priorityId); if(hit) return hit; }
    return BANNERS[rotationIndex % BANNERS.length];
}

function renderPagination(total){
    paginationEl.innerHTML = '';
    const prev = document.createElement('button');
    prev.className='page-btn'; prev.textContent='Préc.'; prev.disabled = CURRENT.page<=1;
    prev.onclick = ()=>{ CURRENT.page = Math.max(1, CURRENT.page-1); render(); };
    paginationEl.appendChild(prev);

    const show = Math.min(total, MAX_PAGES_DISPLAY);
    const start = Math.max(1, Math.min(CURRENT.page-3, Math.max(1, total- show + 1)));
    const end   = Math.min(total, start + show -1);
    for(let i=start;i<=end;i++){
        const btn = document.createElement('button');
        btn.className = 'page-btn'+(i===CURRENT.page?' active':''); btn.textContent = i; btn.disabled = i===CURRENT.page;
        btn.onclick = ()=>{ CURRENT.page = i; render(); };
        paginationEl.appendChild(btn);
        if(i-start>99) break;
    }

    const next = document.createElement('button');
    next.className='page-btn'; next.textContent='Suiv.'; next.disabled = CURRENT.page>=total;
    next.onclick = ()=>{ CURRENT.page = Math.min(total, CURRENT.page+1); render(); };
    paginationEl.appendChild(next);

    const jumpWrap = document.createElement('div');
    jumpWrap.className='page-jump';
    jumpWrap.innerHTML = `Aller à la page <input id="jumpIn" type="number" min="1" max="${total}" style="width:80px;background:transparent;border:1px solid rgba(255,255,255,.18);border-radius:8px;color:var(--text);padding:6px 8px"> <button class="page-btn" id="jumpBtn">OK</button>`;
    paginationEl.appendChild(jumpWrap);
    jumpWrap.querySelector('#jumpBtn').onclick = ()=>{
        const v = Number(jumpWrap.querySelector('#jumpIn').value||1);
        if(v>=1 && v<=total){ CURRENT.page=v; render(); }
    };
}

function groupProductsByCategory(list){
    const map = new Map();
    list.forEach(p=>{
        const key = String(p.categoryName || 'Autres');
        const label = p.categoryName || 'Autres';
        if(!map.has(key)) map.set(key, {key, label, items:[]});
        map.get(key).items.push(p);
    });
    return [...map.values()];
}


function makeCatCard(p){ return productCard(p); }

function renderCategoryShowcase(sourceProducts){
    gridEl.querySelectorAll('.cat-section').forEach(n=>n.remove());
    const groups = groupProductsByCategory(sourceProducts).filter(g=>g.items.length>0);
    if(groups.length===0) return;

    let toShow;
    if(CURRENT.category==='all'){
        toShow = groups.sort((a,b)=>b.items.length - a.items.length).slice(0,10);
    }else{
        toShow = groups.filter(g=> g.label.toLowerCase() === String(CURRENT.category).toLowerCase());
        if(toShow.length===0) toShow = groups.slice(0,10);
    }

    toShow.forEach(group=>{
        const sec = document.createElement('section');
        sec.className = 'cat-section';

        const stateKey = String(group.key);
        const currentCount = catShowcaseState.get(stateKey) || CATEGORY_SHOWCASE_INITIAL;
        const count = Math.min(currentCount, group.items.length);

        const header = document.createElement('div');
        header.className = 'cat-header';
        header.innerHTML = `
            <h3>${escapeHtml(group.label || 'Catégorie')}</h3>
            <div class="cat-actions">
                <button class="cat-btn ghost" data-action="see-category" data-cat="${escapeHtml(stateKey)}">Voir la catégorie</button>
            </div>
        `;

        const grid = document.createElement('div'); grid.className = 'cat-grid';
        group.items.slice(0, count).forEach(p=> grid.appendChild(makeCatCard(p)));

        const footer = document.createElement('div'); footer.className = 'cat-footer';
        const hasMore = count < group.items.length;
        if(hasMore){
            const moreBtn = document.createElement('button');
            moreBtn.className = 'cat-btn';
            moreBtn.textContent = 'Voir plus';
            moreBtn.dataset.action = 'see-more';
            moreBtn.dataset.cat = stateKey;
            footer.appendChild(moreBtn);
        }

        sec.appendChild(header); sec.appendChild(grid); if(hasMore) sec.appendChild(footer);
        gridEl.appendChild(sec);
    });
}

// ===== MAIN RENDER =====
function render(){
    const base = searchProductsBase(ALL_PRODUCTS, {
        q: els.q?.value || '',
        stockOnly: !!els.stockOnly?.checked
    });

    const filtered = (CURRENT.category==='all')
        ? base
        : base.filter(p => (p.categoryName||'').toLowerCase() === String(CURRENT.category).toLowerCase());

    let sorted = filtered.slice(); // copie
        if (CURRENT.sort === 'price-asc') {
            sorted.sort((a,b) => (a.price||0) - (b.price||0));
        } else if (CURRENT.sort === 'price-desc') {
            sorted.sort((a,b) => (b.price||0) - (a.price||0));
        }
// si CURRENT.sort vaut 'none', on ne trie pas et on conserve l'ordre d'origine


    const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
    const clampedPage = Math.min(Math.max(1, CURRENT.page), totalPages);
    if(clampedPage!==CURRENT.page){ CURRENT.page = clampedPage; }
    const start = (CURRENT.page-1)*PER_PAGE;
    const pageItems = sorted.slice(start, start+PER_PAGE);

    gridEl.innerHTML = '';

    const catLabel = getCurrentCategoryLabel();
    const priorityId = pickPriorityBannerId(catLabel);
    let bannerRotationIndex = 0;

    pageItems.forEach((p,idx)=>{
        gridEl.appendChild(productCard(p));
        const shouldInsertBanner = ((idx+1)%6===0);
        if(shouldInsertBanner){
            const b = selectBanner(priorityId, bannerRotationIndex++);
            gridEl.appendChild(bannerEl(b));
        }
    });

    renderCategoryShowcase(sorted);
    renderPagination(totalPages);
    renderHomeCategories();
}

// ===== EVENTS (une seule fois, après définition de render) =====
const debounce = (fn, ms=200) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

els.q?.addEventListener('input', debounce(()=>{ CURRENT.page=1; render(); }, 300));
els.stockOnly?.addEventListener('change', ()=>{ CURRENT.page=1; render(); });
els.category?.addEventListener('change', (e)=>{ CURRENT.category = e.target.value; CURRENT.page=1; render(); });
els.sort?.addEventListener('change', (e)=>{ CURRENT.sort = e.target.value; CURRENT.page=1; render(); });

// click délégué (voir plus / voir catégorie)
gridEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const action = btn.dataset.action, cat = btn.dataset.cat;
    if(!action || !cat) return;
    if(action==='see-more'){
        const prev = catShowcaseState.get(cat) || CATEGORY_SHOWCASE_INITIAL;
        catShowcaseState.set(cat, prev + CATEGORY_SHOWCASE_STEP);
        render();
    }
    if(action==='see-category'){
        CURRENT.category = cat;
        CURRENT.page = 1;
        if(els.category && [...els.category.options].some(o=>o.value===cat)) els.category.value = cat;
        render();
        window.scrollTo({top:0, behavior:'smooth'});
    }
});


// Paramètres WhatsApp (optionnels)
if (els.waPhone) els.waPhone.value = WA_SETTINGS.phone;
if (els.waTemplate) els.waTemplate.value = WA_SETTINGS.template;
els.saveSettings?.addEventListener('click', ()=>{
    const phone = els.waPhone?.value.trim() || WA_SETTINGS.phone;
    const template = els.waTemplate?.value.trim() || WA_SETTINGS.template;
    WA_SETTINGS = {phone, template}; saveSettings();
    alert('Paramètres WhatsApp enregistrés.');
});

// -------- Catégories -> landing (style tuiles) --------
const homeCatsEl = document.getElementById('homeCats');

function buildCategoryIndex(list){
  // Regroupe par catégorie, puis collecte les sous-catégories et une image de représentation
    const map = new Map();
    list.forEach(p=>{
        const cat = p.categoryName || 'Autres';
        const sub = (p.raw?.sub_category || p.sub_category || '').toString().trim();
        if(!map.has(cat)) map.set(cat, { name:cat, subs:new Map(), products:[] });
        const group = map.get(cat);
        group.products.push(p);
        if(sub){
            if(!group.subs.has(sub)) group.subs.set(sub, p.image || p.thumbnail || '');
        }
    });
    return [...map.values()];
}

function tileHTML(label, img, href){
    const safeImg = img
        ? `<img src="${img}" alt="${escapeHtml(label)}" loading="lazy">`
        : `<div class="ph"></div>`;
    return `<a class="tile" href="${href}">
        ${safeImg}
        <span>${escapeHtml(label)}</span>
    </a>`;
}

function renderHomeCategories(){
    if(!homeCatsEl || !Array.isArray(ALL_PRODUCTS) || !ALL_PRODUCTS.length) return;

    const groups = buildCategoryIndex(ALL_PRODUCTS)
        .sort((a,b)=> b.products.length - a.products.length);

    const top = groups.slice(0, 8); // montre 8 blocs “catégories”
    homeCatsEl.innerHTML = top.map(g=>{
      // jusqu’à 4 sous-catégories ; si moins, on complète avec des produits de la catégorie
        const subEntries = [...g.subs.entries()].slice(0,4);
        let tiles = subEntries.map(([label,img]) =>
            tileHTML(label, img, `categorie.html?cat=${encodeURIComponent(g.name)}&sub=${encodeURIComponent(label)}`)
        ).join('');

        if(subEntries.length < 4){
            const need = 4 - subEntries.length;
            const extras = g.products.slice(0, need).map(p =>
                tileHTML(truncateText(p.title||'Article', 28), p.image, `categorie.html?cat=${encodeURIComponent(g.name)}`)
            ).join('');
            tiles += extras;
        }

        return `<div class="cat-box">
            <h3>${escapeHtml(g.name)}</h3>
            <div class="tiles">${tiles}</div>
            <a class="more" href="categorie.html?cat=${encodeURIComponent(g.name)}">Voir plus</a>
        </div>`;
    }).join('');
}


/* ===== RENDER HUB / PROMOS / LIGNES ===== */

// image d’une catégorie = première image d’un produit de la catégorie
function pickImageForCategory(cat){
    const hit = ALL_PRODUCTS.find(p => (p.categoryName||'') === cat && p.image);
    return hit?.image || '';
}

function groupByCategory(){
    const map = new Map();
    for(const p of ALL_PRODUCTS){
        const cat = p.categoryName || 'Autres';
        if(!map.has(cat)) map.set(cat, []);
        map.get(cat).push(p);
    }
    return [...map.entries()] // [cat, items[]]
            .sort((a,b)=> b[1].length - a[1].length);
}

function renderCatHub(){
    const host = document.getElementById('catHub');
    if(!host) return;

    const pairs = groupByCategory();
    const top  = pairs.slice(0,7); // 1 hero + 6 tuiles

    const [heroCat, heroItems] = top[0] || ['Tous', ALL_PRODUCTS];
    const heroImg = pickImageForCategory(heroCat);

    const heroHTML = `
        <article class="cat-hero">
            <div>
                <div class="kicker">Viva</div>
                <h3 style="margin:.25rem 0 0">${escapeHtml(heroCat)}</h3>
                <a class="btn" href="categorie.html?cat=${encodeURIComponent(heroCat)}">Profitez-en maintenant</a>
            </div>
            ${heroImg ? `<img src="${heroImg}" alt="${escapeHtml(heroCat)}" style="position:absolute;right:8px;bottom:0;width:60%;border-radius:12px">` : ''}
        </article>`;

    const tilesHTML = top.slice(1).map(([cat, items])=>{
        const img = pickImageForCategory(cat);
        // propose 2 sous-catégories (si disponibles dans raw)
        const subs = [...new Set(items.map(x => x.raw?.sub_category).filter(Boolean))].slice(0,2);
        return `
            <a class="cat-tile" href="categorie.html?cat=${encodeURIComponent(cat)}" aria-label="Voir ${escapeHtml(cat)}">
                ${img ? `<img src="${img}" alt="${escapeHtml(cat)}">` : `<div class="ph" style="width:96px;height:96px;border-radius:12px;background:#1b1f28"></div>`}
                <div>
                    <div class="t">${escapeHtml(cat)}</div>
                    ${subs.length ? `<div class="sous">${escapeHtml(subs.join(' • '))}</div>` : ``}
                </div>
            </a>`;
    }).join('');

    host.innerHTML = heroHTML + tilesHTML;
}

function productMini(p){
    const discount = percent(p.oldPrice, p.price);
    return `
    <article class="card mini-card">
        <a href="detail.html?id=${encodeURIComponent(p.id)}" aria-label="${escapeHtml(p.title)}">
            <div class="thumb" style="position:relative">
                ${discount>0?`<div class="discount-badge">-${discount}%</div>`:''}
                ${p.image?`<img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy">`:`<div class="ph">🛍️</div>`}
            </div>
            <div class="content">
                <div class="title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</div>
                <div class="price"><span class="now">${fmtCurrency(p.price||0)}</span>
                    ${p.oldPrice>p.price?` <span class="old">${fmtCurrency(p.oldPrice)}</span>`:''}
                </div>
            </div>
        </a>
    </article>`;
}

// --- Explore Banner (robuste: banners.json OU banner.json) ---
// Essaie plusieurs chemins (selon ton projet, certains utilisent banner.json, d'autres banners.json)
async function loadExploreConfig() {
    const candidates = './public/data/banner.json';
    for (const url of candidates) {
        try {
            const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!r.ok) continue;
            const json = await r.json();
            if (Array.isArray(json)) return json;
        } catch (e) { /* on essaie le suivant */ }
    }
    return []; // rien trouvé → tableau vide
}

function renderExploreSection(host, b) {
  // Fallback si champs absents
    const bg     = b?.bg     || '';
    const kicker = b?.kicker || 'Découvrez plus';
    const title  = b?.title  || 'Explorez davantage.';
    const sub    = b?.sub    || '';
    const image  = b?.image  || '';

    // Utilise escapeHtml déjà présent dans ton projet
    host.innerHTML = `
        <section class="hero" style="margin:12px 16px; ${bg ? `background:${escapeHtml(bg)};` : ''}">
            <div>
                <div class="kicker">${escapeHtml(kicker)}</div>
                <h1>${escapeHtml(title)}</h1>
                ${sub ? `<p>${escapeHtml(sub)}</p>` : ''}
                <div class="cta">
                    <a class="btn primary" href="explore.html">Voir les catégories</a>
                    <a class="btn ghost" href="index.html">Accueil</a>
                </div>
            </div>
            ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">` : ''}
        </section>
    `;
}

async function mountExploreBanner() {
    const host = document.getElementById('homeExplore');
    if (!host) return; // rien à faire si le conteneur n'est pas présent sur cette page

    try {
        const list = await loadExploreConfig();
        
        // Cherche un bloc id: "explore"
        const b = list.find(x => (x?.id || '').toLowerCase() === 'explore');
        
        // Si pas de "explore" dans le JSON, on met un fallback doux
        const fallback = {
            kicker: 'Découvrez plus',
            title : 'Explorez davantage.',
            sub   : 'Parcourez nos catégories et trouvez ce qui vous plaît.',
            bg    : 'linear-gradient(135deg,#0ea5e9,#6366f1)',
            image : '' // facultatif
        };
    
        renderExploreSection(host, b || fallback);
    } catch (e) {
        console.error('Explore banner error:', e);
      // Optionnel : fallback silencieux
    }
}

// -------- Shop by Brand (accueil) --------
const API_BRANDS = './public/data/brands.json';

// sécure & réutilise vos helpers existants
function slugifyBrand(s){
    return (s||'')
        .toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-zA-Z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'')
        .toLowerCase();
}

async function loadBrands(){
    const host = document.getElementById('brandBanner');
    if(!host) return;

    // squelettes visuels
    host.innerHTML = Array.from({length:8}).map(()=>`
        <div class="brand-skel">
            <div class="img"></div>
            <div class="label"></div>
        </div>`).join('');

    // charge le JSON
    const res = await fetch(API_BRANDS, { headers:{Accept:'application/json'} });
    if(!res.ok){ host.innerHTML = `<div class="muted">Impossible de charger les marques.</div>`; return; }
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items||[]);

    // rendu
    host.innerHTML = items.map(b=>{
        const label = (b.name||'Marque').toString().trim();
        const img = (b.image||'').toString().trim();
        const href = b.href || `brand.html?brand=${encodeURIComponent(label)}&slug=${encodeURIComponent(slugifyBrand(label))}`;
        return `
            <a class="brand-card" href="${href}" aria-label="Voir ${escapeHtml(label)}">
                <span class="img">${img?`<img src="${img}" alt="${escapeHtml(label)}" loading="lazy">`:''}</span>
                <span class="label">${escapeHtml(label)}</span>
            </a>`;
    }).join('');
}

// appelez loadBrands() dans votre init existant, une fois le DOM prêt
document.addEventListener('DOMContentLoaded', () => {
  loadBrands(); // indépendant du chargement des produits
});

function escapeHtml(s){ 
    return (s??'').toString().replace(/[&<>"']/g, c => (
        {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
    ));
    }

    document.addEventListener('DOMContentLoaded', (async function(){
    const host = document.getElementById('homeBebe');
    if(!host) return;

    try{
      // ⚠️ Assure-toi que le fichier s’appelle bien banners.json (pluriel)
        const res = await fetch('./public/data/banner.json', { headers:{ 'Accept':'application/json' }});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const list = await res.json();

      // Cherche l’entrée "bebe"
        const b = (Array.isArray(list) ? list : []).find(x => (x?.id||'').toLowerCase() === 'bebe') || null;

        // Si pas d’entrée "bebe", on affiche un fallback soft (ça évite un écran vide)
        const data = b || {
            kicker: 'Bébé & Maternité',
            title: 'Tout pour bébé',
            sub: 'Poussettes, gigoteuses, biberons, et plus…',
            emoji: '👶',
            bg: 'linear-gradient(135deg,#f472b6,#60a5fa)',
            image: '' // facultatif
        };

        // récupère une image si fournie (image / img / photo)
        const heroImg = data.image || data.img || data.photo || '';

        // utilise TA fonction WhatsApp si elle existe, sinon lien neutre
        const waHref = (typeof buildWhatsAppHref === 'function')
            ? buildWhatsAppHref('Bonjour 👶, je cherche des articles pour bébé/maternité.')
            : '#';

        host.innerHTML = `
            <section class="kube" style="margin:12px 16px; background:${escapeHtml(data.bg||'linear-gradient(135deg,#f472b6,#60a5fa)')}; border-radius:16px; padding:20px; display:grid; grid-template-columns:1fr auto; gap:16px; align-items:center;">
                <div class="copy">
                    <div class="kicker" style="opacity:.85;font-weight:600">${escapeHtml(data.kicker||'Bébé & Maternité')}</div>
                    <h1 style="margin:.25rem 0 0">${escapeHtml(data.title||'Tout pour bébé')}</h1>
                    ${data.sub ? `<p style="margin:.25rem 0 1rem">${escapeHtml(data.sub)}</p>` : ''}
                    <div class="cta" style="display:flex;gap:8px;flex-wrap:wrap">
                        <a class="btn" href="bebe.html" style="background:#fff;color:#111;padding:.6rem 1rem;border-radius:10px;text-decoration:none">Voir la boutique</a>
                        <a class="btn ghost" href="${waHref}" target="_blank" rel="noopener" style="border:1px solid rgba(255,255,255,.6);padding:.6rem 1rem;border-radius:10px;text-decoration:none">WhatsApp</a>
                    </div>
                </div>
                ${heroImg ? `<img src="${heroImg}" alt="Bébé & Maternité" style="max-height:220px;border-radius:12px">` : ''}
        </section>`;
    }catch(e){
        console.error('Bébé & Maternité banner error:', e);
    }
}));

function renderPromos(){
    const host = document.getElementById('promoGrid');
    if(!host) return;
    const promos = ALL_PRODUCTS.filter(p => Number(p.oldPrice)>Number(p.price))
                            .sort((a,b)=> percent(b.oldPrice,b.price)-percent(a.oldPrice,a.price))
                            .slice(0,12);
    host.innerHTML = promos.map(productMini).join('');
}

function renderScrollRow(){
    const host = document.getElementById('rowTrack');
    if(!host) return;
        const picks = ALL_PRODUCTS.slice(0,24); // simple : les 24 premiers (tu peux filtrer par popularité si dispo)
    host.innerHTML = picks.map(productMini).join('');
}

// appelle ces 3 rendus quand tes produits sont disponibles
function renderHomeBlocks(){
    renderCatHub();
    renderPromos();
    renderScrollRow();
}

/* ===================== PANIER (corrigé) ===================== */

// État + persistance
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
function saveCart(){ localStorage.setItem('cart', JSON.stringify(cart)); }

// Raccourcis DOM (existent déjà dans ton HTML)
const cartModal = document.getElementById("cartModal");
const cartBtn = document.getElementById("cartBtn");
const closeCartModal = document.getElementById("closeCartModal");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");

// Trouver un produit dans tes données normalisées (ALL_PRODUCTS)
function getProductById(id){
    return (Array.isArray(ALL_PRODUCTS) ? ALL_PRODUCTS : []).find(p => String(p.id) === String(id));
}

// Ajouter au panier depuis le bouton .cart-btn
function addToCart(productId){
    const p = getProductById(productId);
    if(!p) return;

    const existing = cart.find(it => String(it.id) === String(productId));
    if (existing){
        existing.quantity += 1;
    } else {
        cart.push({
            id: p.id,
            title: p.title,
            price: Number(p.price || 0),
            image: p.image || p.thumbnail || '', // p.image est défini par normalizeProduct
            quantity: 1
        });
    }
    saveCart();
    updateCartUI();
}

// Mettre à jour l’UI du panier
function updateCartUI(){
    if (!cartItems || !cartTotal || !cartCount) return;

    cartItems.innerHTML = "";
    let total = 0, count = 0;

    cart.forEach(item => {
      total += (Number(item.price)||0) * (Number(item.quantity)||0);
        count += Number(item.quantity)||0;
        
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
            <img src="${item.image || ''}" alt="${item.title}" width="50" height="50" style="object-fit:cover;border-radius:6px">
            <div class="item-info">
                <p>${item.title}</p>
                <p>${(Number(item.price)||0).toLocaleString()} FCFA × ${item.quantity}</p>
            </div>
        `;
        cartItems.appendChild(row);
    });

    // Si tu as déjà fmtCurrency, tu peux l’utiliser ici à la place
    cartTotal.textContent = total.toLocaleString();
    cartCount.textContent = count;
}

// Écouteur global: clic sur les boutons "Ajouter au panier" des cartes produit
document.addEventListener("click", (e) => {
    const btn = e.target.closest('.cart-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    addToCart(id);
});

// Ouvrir/fermer le dialog du panier
cartBtn?.addEventListener("click", () => {
  // Affiche/actualise avant d’ouvrir pour avoir les données à jour
    updateCartUI();
    cartModal?.showModal();
});
closeCartModal?.addEventListener("click", () => cartModal?.close());

// Actions “vider” et “commander”
document.getElementById("clearCartBtn")?.addEventListener("click", () => {
    cart = [];
    saveCart();
    updateCartUI();
});

document.getElementById("checkoutBtn")?.addEventListener("click", () => {
    if (cart.length === 0){
        alert("Votre panier est vide !");
        return;
    }
    // Tu as déjà un flux vers order.html dans ton projet
    const total = cart.reduce((sum, it) => sum + (Number(it.price)||0) * (Number(it.quantity)||0), 0);
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartTotal", String(total));
    window.location.href = "order.html";
});

// Initialiser l’UI au chargement
document.addEventListener("DOMContentLoaded", updateCartUI);

/* =================== FIN PANIER (corrigé) =================== */


 // ===== STARTUP =====
(async function init(){
    skeletonCards(12);
    try{
        await loadAllProductsSafe();
        await mountExploreBanner();
    }catch(err){
        console.error(err);
        gridEl.innerHTML = `<div style="grid-column:1/-1;background:#190e0f;border:1px solid rgba(255,255,255,.08);padding:20px;border-radius:12px">
            <p>Échec de chargement.</p>
            <small style="opacity:.7">Erreur: ${escapeHtml(err.message)} — L’API limite peut-être la fréquence (HTTP 429). Réessaie ou augmente RATE_LIMIT_MS.</small>
        </div>`;
    }
})();