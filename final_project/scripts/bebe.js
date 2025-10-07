
    // --- Config
    const API_PRODUCTS = './public/data/products.json';
    const WA_DEFAULT = { phone:'+242065086382',
      template:'Bonjour 👶, je cherche des articles pour bébé/maternité.' };

    // --- Utils
    const escapeHtml=s=>(s??'').toString().replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
    const fmt = n=> new Intl.NumberFormat('fr-FR',{ style:'currency', currency:'XAF', maximumFractionDigits:0 }).format(Number(n||0));
    const percent=(o,n)=>{ o=+o||0; n=+n||0; return (o&&n&&o>n)?Math.round(((o-n)/o)*100):0; };
    const trunc=(t,m=42)=> (t??'').toString().length>m ? (t+'').slice(0,m)+'…' : t;
    const buildWA = (text)=>`https://wa.me/${(WA_DEFAULT.phone||'').replace(/\\D/g,'')}?text=${encodeURIComponent(text||'')}`;

    function firstArray(payload){
      if(Array.isArray(payload?.items)) return payload.items; // bundle local
      if(Array.isArray(payload?.data))  return payload.data;  // API paginée (au cas où)
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

    // --- Chargement produits (local JSON)
    async function loadProducts(){
      const res = await fetch(API_PRODUCTS, { headers:{Accept:'application/json'} });
      if(!res.ok) throw new Error('HTTP '+res.status);
      return firstArray(await res.json()).map(normalize);
    }

    // --- Sélecteurs & helpers Bébé/Maternité
    const K = ['bébé','bebes','maternité','maternite','grossesse','naissance','nouveau-né','enfants','nourrisson','lait','biberon','couche','poussette','landau','berceau','siège','siege','chaise haute','thermomètre','thermometre','linge','body','gigoteuse','bain'];
    const inBaby = (p)=>{
      const cat = (p.title||'').toLowerCase();
      const sub = (p.raw?.sub_category||'').toLowerCase();
      return K.some(k=>cat.includes(k)||sub.includes(k));
    };

    // --- Cards
    function card(p){
      const d = percent(p.oldPrice, p.price);
      return `
      <article class="card">
        <div class="thumb" style="position:relative">
          ${d>0?`<div class="discount-badge">-${d}%</div>`:''}
          ${p.image?`<img src="${p.image}" alt="${escapeHtml(p.title)}">`:`<div class="ph">🛍️</div>`}
        </div>
        <div class="content">
          <div class="title" title="${escapeHtml(p.title)}">${escapeHtml(trunc(p.title,20))}</div>
          <div class="price"><span class="now">${fmt(p.price)}</span>${p.oldPrice>p.price?` <span class="old">${fmt(p.oldPrice)}</span>`:''}</div>
          <div style="margin-top:8px;display:flex;gap:8px">
            <a href="detail.html?id=${encodeURIComponent(p.id)}" class="cta" style="text-decoration:none;background:#334155;color:white;padding:8px 10px;border-radius:8px">Détails</a>
            <a href="${buildWA}(\`Je veux \${p.title} (ID \${p.id}) à \${p.price} FCFA\`)" target="_blank" rel="noopener" class="cta" style="text-decoration:none;background:var(--brand);color:#052e16;padding:8px 10px;border-radius:8px">WhatsApp</a>
          </div>
        </div>
      </article>`;
    }

    // --- UI ciblée page
    const elHero = document.getElementById('hero');
    const elCir  = document.getElementById('circles');
    const elEss  = document.getElementById('gridEss');
    const elPro  = document.getElementById('gridPromo');
    const elRow  = document.getElementById('rowTrend');
    const waBtn  = document.getElementById('waBtn');

    (async function init(){
      const all = await loadProducts();
      const bb  = all.filter(inBaby);

      // Hero: image depuis banner.json (si fournie) OU 1re image bébé
      try{
        const br = await fetch('./public/data/banner.json').then(r=>r.ok?r.json():[]);
        const bebe = Array.isArray(br)? br.find(x=>x.id==='bebe') : null;
        const src = bebe?.image || (bb.find(p=>p.image)?.image || '');
        if(src){
          const img = document.createElement('img'); img.src = src; img.alt = 'Bébé & Maternité'; elHero.appendChild(img);
        }
        if(bebe){
          elHero.querySelector('.copy .kicker').textContent = bebe.kicker || 'Bébé & Maternité';
          elHero.querySelector('.copy h1').textContent = bebe.title || 'Tout pour bébé';
          elHero.querySelector('.copy p').textContent = bebe.sub || '';
        }
      }catch{}

      // WA bouton
      waBtn.href = buildWA(WA_DEFAULT.template);

      // Rondelles de sous-cat (top 12)
      const bySub = new Map();
      for(const p of bb){
        const sub = (p.raw?.sub_category || p.categoryName || 'Autres').toString();
        if(!bySub.has(sub)) bySub.set(sub, {label:sub, img:p.image });
      }
      const circles = [...bySub.values()].slice(0,21).map(s=>{
        const href = `categorie.html?cat=${encodeURIComponent('Bébé')}&sub=${encodeURIComponent(s.label)}`;
        return `<a class="circle" href="${href}">
          ${s.img?`<img src="${s.img}" alt="${escapeHtml(s.label)}">`:`<div class="ph"></div>`}
          <span>${escapeHtml(s.label)}</span></a>`;
      }).join('');
      elCir.innerHTML = circles || `<div class="muted">Aucune sous-catégorie trouvée.</div>`;

      // Essentiels nouveau-nés (mots clés très usuels)
      const ESS_KEYS = ['biberon','tétine','tetine','linge','enfants','gigoteuse','gourde','thermale','transat','berceau','thermomètre','thermometre','bouteille','linge','siège','poussette','landau'];
      const ess = bb.filter(p => {
        const t = (p.title||p.categoryName||'').toLowerCase();
        const s = (p.raw?.sub_category||'').toLowerCase();
        return ESS_KEYS.some(k => t.includes(k)||s.includes(k));
      }).slice(0,40);
      elEss.innerHTML = ess.map(card).join('') || `<div class="muted">Pas de sélection pour l’instant.</div>`;

      // Promotions
      const promos = bb.filter(p => Number(p.oldPrice)>Number(p.price))
                      .sort((a,b)=> percent(b.oldPrice,b.price) - percent(a.oldPrice,a.price))
                      .slice(0,18);
      elPro.innerHTML = promos.map(card).join('') || `<div class="muted">Aucune promo.</div>`;

      // Tendances (simple: 20 premiers)
      elRow.innerHTML = bb.slice(0,20).map(card).join('');
    })();