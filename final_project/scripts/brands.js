
  // ---------- Config compatibles avec votre projet ----------
const API_PRODUCTS = '/public/data/products.json';
const API_BRANDS   = '/public/data/brands.json';

// utilitaires légers (reprennent vos patterns)
function escapeHtml(s){ return (s??'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtCurrency(n){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XAF',maximumFractionDigits:0}).format(Number(n||0)); }
function percent(o,n){ o=+o||0; n=+n||0; return (o>n&&n>0) ? Math.round(((o-n)/o)*100):0; }
function parseQS(){ const u=new URL(location.href); return Object.fromEntries(u.searchParams.entries()); }

  // votre normalisation allégée (identique aux noms déjà utilisés)
function normalizeProduct(p){
    const id    = p.id;
    const title = p.title || `Produit ${id}`;
    const image = p.thumbnail || '';
    const price = Number(p.price || 0);
    const oldPrice = Number(p.regular_price || 0);
    const stock = Number(p.available_stock ?? 0);
    const categoryName = (p.category && String(p.category).trim()) || (p.sub_category && String(p.sub_category).trim()) || 'Autres';
    // sans changer la structure existante :
    const brand = p.brand || p.raw?.brand || null;
    return { raw:p, id, title, image, categoryName, price, oldPrice, stock, brand };
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
            ${discount>0?`<div class="discount-badge">-${discount}%</div>`:''}
            <div class="title">${escapeHtml(titleClean)}</div>
            <div class="meta"><span class="stock ${stockCls}">${escapeHtml(stockText)}</span> · <span>${escapeHtml(p.categoryName||'')}</span></div>
            <div class="price"><span class="now">${fmtCurrency(p.price||0)}</span>${p.oldPrice>p.price?` <span class="old" style="opacity:.7;text-decoration:line-through">${fmtCurrency(p.oldPrice)}</span>`:''}</div>
        </div>
    </article>`;
}

async function loadJSON(url){
    const r = await fetch(url, {headers:{Accept:'application/json'}});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
}

(async function initBrand(){
    const { brand, slug } = parseQS();
    const label = brand || (slug ? slug.replace(/-/g,' ') : 'Marque');

    const statusEl = document.getElementById('brandStatus');
    const gridEl   = document.getElementById('brandGrid');
    const titleEl  = document.getElementById('brandTitle');
    const crumbEl  = document.getElementById('crumbBrand');
    const logoEl   = document.getElementById('brandLogo');

    titleEl.textContent = `Produits — ${label}`;
    crumbEl.textContent = label;

    try{
      // essaye de retrouver un visuel de la marque pour le logo
        try{
            const bdata = await loadJSON(API_BRANDS);
            const brands = Array.isArray(bdata)? bdata : (bdata.items||[]);
            const hit = brands.find(b => (b.name||'').toLowerCase() === (label||'').toLowerCase());
            if(hit?.image){
                logoEl.innerHTML = `<img src="${hit.image}" alt="${escapeHtml(label)}">`;
            }
        }catch{}

        statusEl.textContent = 'Chargement des produits…';

        const pdata = await loadJSON(API_PRODUCTS);
        const arr = Array.isArray(pdata) ? pdata : (pdata.items || pdata.data || []);
        const products = arr.map(normalizeProduct);

        const list = products.filter(p => {
            const b = (p.brand || p.raw?.brand || '').toString().trim().toLowerCase();
            return b && (b === (label||'').toString().trim().toLowerCase());
        });

        statusEl.textContent = `${list.length} article${list.length>1?'s':''}`;
        gridEl.innerHTML = list.map(productCard).join('') || '<div class="muted">Aucun article pour cette marque.</div>';
    }catch(e){
        console.error(e);
        statusEl.textContent = 'Erreur : '+(e?.message||e);
    }
})();