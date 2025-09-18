/* ==== CONFIG ==== */
    const API_PRODUCTS = './public/data/products.json';
    const BANNERS_JSON = './public/data/banner.json';

    /* ==== HELPERS ==== */
    const escapeHtml = s => (s??'').toString().replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    const fmt = n => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XAF',maximumFractionDigits:0}).format(+n||0);
    const percent = (o,n)=>{o=+o||0; n=+n||0; return (o&&n&&o>n)?Math.round(((o-n)/o)*100):0;};
    const trunc = (t,m=56)=> (t??'').toString().length>m ? (t+'').slice(0,m)+'…' : t;

    function firstArray(payload){
        if(Array.isArray(payload?.items)) return payload.items; // bundle local
        if(Array.isArray(payload?.data))  return payload.data;  // API paginée
        if(Array.isArray(payload))        return payload;
        return [];
    }
    function normalize(p){
        const id=p.id, title=p.title||`Produit ${id}`, image=p.thumbnail||'';
        const price=Number(p.price||0), oldPrice=Number(p.regular_price||0);
        const stock=Number(p.available_stock??0);
        const categoryName=(p.category && String(p.category).trim())||(p.sub_category && String(p.sub_category).trim())||'Autres';
        return { raw:p, id, title, image, price, oldPrice, stock, categoryName };
    }

    /* ==== LOAD ==== */
    async function loadProducts(){
        const r = await fetch(API_PRODUCTS,{headers:{Accept:'application/json'}});
        if(!r.ok) throw new Error('HTTP '+r.status);
        return firstArray(await r.json()).map(normalize);
    }
    async function loadBanner(){
        try{
            const r = await fetch(BANNERS_JSON);
            if(!r.ok) return null;
            const js = await r.json();
            if(Array.isArray(js)) return js.find(x=>x.id==='explore')||null;
            return null;
        }catch{ return null; }
    }   

    /* ==== RENDER ==== */
    const elHero = document.getElementById('hero');
    const elCats = document.getElementById('cats');
    const elBest = document.getElementById('best');
    const elPromo= document.getElementById('promo');
    const hk = document.getElementById('hk'), ht=document.getElementById('ht'), hs=document.getElementById('hs');

    function pickCatImage(cat, list){
        const hit = list.find(p=> (p.categoryName||'')===cat && p.image);
        return hit?.image || '';
    }

    function catCard({name, img, subsCount}){
        const href = `categorie.html?cat=${encodeURIComponent(name)}`;
        return `<a class="cat-card" href="${href}" aria-label="Voir ${escapeHtml(name)}">
            ${img?`<img src="${img}" alt="${escapeHtml(name)}">`:''}
            <div class="shade"></div>
            <div class="subs">${subsCount||0} sous-catég.</div>
            <div class="label">${escapeHtml(name)}</div>
        </a>`;
    }

    function productCard(p){
        const d = percent(p.oldPrice, p.price);
        return `<article class="card">
            <div class="thumb">
                ${d>0?`<div class="discount">-${d}%</div>`:''}
                ${p.image?`<img src="${p.image}" alt="${escapeHtml(p.title)}">`:`<div>🛍️</div>`}
            </div>
            <div class="content">
                <div class="title" title="${escapeHtml(p.title)}">${escapeHtml(trunc(p.title))}</div>
                <div class="price"><span class="now">${fmt(p.price)}</span>${p.oldPrice>p.price?` <span class="old">${fmt(p.oldPrice)}</span>`:''}</div>
                <div style="margin-top:8px;display:flex;gap:8px">
                    <a href="detail.html?id=${encodeURIComponent(p.id)}" class="btn" style="padding:8px 10px;background:#334155;border-radius:8px;text-decoration:none">Détails</a>
                    <a href="categorie.html?cat=${encodeURIComponent(p.categoryName||'')}" class="btn ghost" style="padding:8px 10px;border-radius:8px;text-decoration:none">Catégorie</a>
                </div>
            </div>
        </article>`;
    }

    (async function init(){
        const [banner, all] = await Promise.all([loadBanner(), loadProducts()]);

        // Hero
        if(banner){
            if(banner.bg)   elHero.style.background = banner.bg;
            if(banner.kicker) hk.textContent = banner.kicker;
            if(banner.title)  ht.textContent = banner.title;
            if(banner.sub)    hs.textContent = banner.sub;
            if(banner.image){
                const img = document.createElement('img');
                img.src = banner.image; img.alt = banner.title || 'Explorez davantage';
                elHero.appendChild(img);
            }else{
                const any = all.find(p=>p.image)?.image;
                if(any){ const img = document.createElement('img'); img.src=any; img.alt='Explorez davantage'; elHero.appendChild(img); }
            }
        }

        // Catégories (top 8)
        const map = new Map();
        for(const p of all){
            const cat = p.categoryName || 'Autres';
            if(!map.has(cat)) map.set(cat, {name:cat, count:0, subs:new Set(), img:''});
            const g = map.get(cat);
            g.count++; g.subs.add((p.raw?.sub_category||'').toString().trim());
            if(!g.img && p.image) g.img = p.image;
        }
        const cats = [...map.values()]
            .sort((a,b)=> b.count - a.count)
            .slice(0,8)
            .map(c => catCard({name:c.name, img:c.img||pickCatImage(c.name, all), subsCount:[...c.subs].filter(Boolean).length}))
            .join('');
        elCats.innerHTML = cats || '<div class="muted">Aucune catégorie trouvée.</div>';

        // Meilleures ventes (proxy simple : les 20 premiers)
        elBest.innerHTML = all.slice(0,20).map(productCard).join('');

        // Offres du moment
        const promos = all
            .filter(p => Number(p.oldPrice)>Number(p.price))
            .sort((a,b)=> percent(b.oldPrice,b.price)-percent(a.oldPrice,a.price))
            .slice(0,12);
        elPromo.innerHTML = promos.map(productCard).join('') || '<div class="muted">Pas d’offres pour l’instant.</div>';
    })();