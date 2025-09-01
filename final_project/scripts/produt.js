;(() => {
    const API_PRODUCTS = "https://eu.cowema.org/api/public/products";
    const API_CATEGORIES = "https://eu.cowema.org/api/public/categories";

    const els = {
      q: document.getElementById('q'),
      category: document.getElementById('category'),
      stockOnly: document.getElementById('stockOnly'),
      refresh: document.getElementById('refresh'),
      loader: document.getElementById('loader'),
      grid: document.getElementById('grid'),
      error: document.getElementById('error'),
      count: document.getElementById('count'),
      activeCat: document.getElementById('activeCat'),
      status: document.getElementById('status'),
    };

    const state = {
      categories: [],
      products: [],
      filtered: [],
      mapCatById: new Map(),
      mapCatBySlug: new Map(),
    };

    const fmt = new Intl.NumberFormat('fr-FR');
    document.getElementById('year').textContent = new Date().getFullYear();

    function setLoading(on){ els.loader.classList.toggle('on', !!on); els.grid.setAttribute('aria-busy', on? 'true':'false'); }
    function setError(msg){ if(!msg){ els.error.classList.remove('on'); els.error.textContent=''; return } els.error.classList.add('on'); els.error.textContent = msg }
    function setStatus(text){ els.status.textContent = text }

    function pick(obj, paths, fallback=null){
      for(const p of paths){
        try{
          const val = p.split('.').reduce((o,k)=> o?.[k], obj);
          if(val !== undefined && val !== null) return val;
        }catch{ /* ignore */ }
      }
      return fallback;
    }

    function normalizeCategory(c){
      return {
        id: pick(c, ['id','_id','uuid','categoryId','slug'], null),
        name: pick(c, ['name','title','label'], 'Sans nom'),
        slug: (pick(c, ['slug','name','title'], 'autres') + '').toString().trim().toLowerCase().replace(/\s+/g,'-')
      }
    }

    function normalizeProduct(p){
      const images = pick(p, ['images','gallery'], []);
      const firstImage = Array.isArray(images) && images.length ? (images[0]?.url || images[0]?.src || images[0]) : null;
      const cover = pick(p, ['image','image_url','cover','thumbnail','thumb','media.url'], firstImage);

      const rawStock = pick(p, ['stock','quantity','stock_qty','inventory','stockQuantity','availableQuantity','qty'], null);
      const inStockFlag = pick(p, ['in_stock','available','isAvailable','availability'], null);
      let stockNum = Number.isFinite(rawStock) ? rawStock : (typeof rawStock === 'string' && !isNaN(+rawStock) ? +rawStock : null);
      let inStock = typeof inStockFlag === 'boolean' ? inStockFlag : null;
      if(inStock === null){ inStock = stockNum === null ? null : stockNum > 0 }
      if(stockNum === null){ stockNum = inStock === null ? 0 : (inStock ? 1 : 0) }

      const catId = pick(p, ['categoryId','category_id','category','category.id','category.uuid'], null);
      const catName = pick(p, ['category.name','category.title','categoryLabel','categoryName'], null);
      const catsArr = pick(p, ['categories'], []);

      let categoryLabel = catName || null;
      if(!categoryLabel && catsArr && Array.isArray(catsArr) && catsArr.length){
        const c0 = catsArr[0];
        categoryLabel = pick(c0, ['name','title','label'], c0);
      }
      if(!categoryLabel && catId && state.mapCatById.has(catId)){
        categoryLabel = state.mapCatById.get(catId)?.name;
      }

      return {
        id: pick(p, ['id','_id','uuid','sku','ref','reference'], Math.random().toString(36).slice(2)),
        name: pick(p, ['name','title'], 'Produit sans nom'),
        price: pick(p, ['price','price.value','sellingPrice'], null),
        cover,
        stockNum,
        inStock,
        categoryId: catId,
        categoryLabel: categoryLabel || 'Autres',
        raw: p,
      }
    }

    function buildCategorySelect(){
      const sel = els.category; sel.innerHTML='';
      const optAll = document.createElement('option'); optAll.value=''; optAll.textContent='Toutes les catégories'; sel.appendChild(optAll);
      for(const c of state.categories){
        const opt = document.createElement('option'); opt.value = c.name; opt.textContent = c.name; sel.appendChild(opt);
      }
    }

    function placeholderSVG(text='Aperçu indisponible'){
      const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'>
        <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='%2316a34a'/><stop offset='100%' stop-color='%2322c55e'/></linearGradient></defs>
        <rect width='100%' height='100%' fill='%23101826'/>
        <rect x='20' y='20' width='560' height='410' rx='14' fill='url(%23g)' fill-opacity='.12' stroke='white' stroke-opacity='.06'/>
        <g font-family='system-ui,Segoe UI,Roboto' font-size='20' fill='%2394a3b8' text-anchor='middle'>
          <text x='300' y='230'>${text}</text>
        </g>
      </svg>`);
      return `data:image/svg+xml;charset=utf-8,${svg}`;
    }

    function stockBadgeClass(n){
      if(n === 0) return 'stock-out';
      if(n <= 3) return 'stock-low';
      return 'stock-ok';
    }

    function render(){
      const q = els.q.value.trim().toLowerCase();
      const cat = els.category.value;
      const stockOnly = els.stockOnly.checked;

      const list = state.products.filter(p => {
        if(cat && (p.categoryLabel || '').toLowerCase() !== cat.toLowerCase()) return false;
        if(stockOnly && !(p.inStock || p.stockNum > 0)) return false;
        if(q){
          const hay = `${p.name} ${p.categoryLabel} ${p.raw?.sku || ''} ${p.raw?.ref || ''}`.toLowerCase();
          if(!hay.includes(q)) return false;
        }
        return true;
      });
      state.filtered = list;

      els.activeCat.textContent = cat ? cat : 'Toutes catégories';
      els.count.textContent = `${fmt.format(list.length)} ${list.length>1?'articles':'article'}`;

      els.grid.innerHTML = list.map(p => {
        const img = p.cover || placeholderSVG('Image indisponible');
        const stockTxt = p.stockNum === 0 ? 'Rupture' : `Stock: ${fmt.format(p.stockNum)}`;
        const badgeClass = stockBadgeClass(p.stockNum);
        const priceHtml = p.price != null ? `<div class="meta">Prix: <strong>${fmt.format(p.price)} FCFA</strong></div>` : '';
        return `<article class="card" aria-label="${escapeHtml(p.name)}">
          <div class="thumb">
            <img src="${img}" alt="${escapeHtml(p.name)}" onerror="this.src='${placeholderSVG('Aperçu indisponible')}'"/>
            <span class="badge ${badgeClass}">${stockTxt}</span>
          </div>
          <div class="content">
            <div class="title">${escapeHtml(p.name)}</div>
            <div class="meta">Catégorie: ${escapeHtml(p.categoryLabel)}</div>
            ${priceHtml}
          </div>
        </article>`
      }).join('');
    }

    function escapeHtml(str){
      return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
    }

    async function fetchJSON(url){
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    }

    async function load(){
      setError(''); setLoading(true); setStatus('Chargement…');
      try{
        // 1) Catégories
        const catsRaw = await fetchJSON(API_CATEGORIES);
        // Supporte soit un array direct, soit un objet {data:[...]}
        const catsList = Array.isArray(catsRaw) ? catsRaw : (catsRaw?.data || []);
        state.categories = catsList.map(normalizeCategory).sort((a,b)=> a.name.localeCompare(b.name,'fr'));
        state.mapCatById.clear(); state.mapCatBySlug.clear();
        for(const c of state.categories){ state.mapCatById.set(c.id, c); state.mapCatBySlug.set(c.slug, c); }
        buildCategorySelect();

        // 2) Produits
        const prodsRaw = await fetchJSON(API_PRODUCTS);
        const prodsList = Array.isArray(prodsRaw) ? prodsRaw : (prodsRaw?.data || []);
        state.products = prodsList.map(normalizeProduct);

        setStatus('Données chargées'); render();
      }catch(err){
        console.error(err);
        setError('Impossible de charger les données. Vérifiez l\'API ou les règles CORS. Détail: ' + (err?.message || err));
        setStatus('Erreur');
      }finally{
        setLoading(false);
      }
    }

    // Écouteurs
    els.q.addEventListener('input', () => { render() });
    els.category.addEventListener('change', () => { render() });
    els.stockOnly.addEventListener('change', () => { render() });
    els.refresh.addEventListener('click', () => { load() });

    // Auto-load au démarrage
    load();
  })();