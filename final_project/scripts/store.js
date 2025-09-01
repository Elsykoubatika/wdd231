
window.addEventListener("DOMContentLoaded", () => {
    const now = new Date();
//const option = now.toLocaleDateString('fr-FR', {weekday: 'long',year: 'numeric', month: 'long', day: 'numeric'});
    const timeFR = now.toLocaleDateString('fr-FR', {hour: '2-digit', minute: '2-digit'});
    const formated = ` ${timeFR}`;
    document.getElementById("timestamp").value = formated;
});


window.addEventListener("DOMContentLoaded", () => {
    try {
        const params = new URLSearchParams(window.location.search);
        const target = document.querySelector("#tout");
        if (!target) throw new Error("L'élément avec l'ID #tout est introuvable.");

        // Fonction pour afficher une valeur ou "Non renseigné"
        const safe = (val) => val ? val : "Non renseigné";

        target.innerHTML = `
            <h2>Merci ${safe(params.get('first'))} ${safe(params.get('last'))} 🎉</h2>
            <p>Votre commande a Bien été enregistre</p>
            <h3>Information de Livraison</h3>
            <p><strong>ville :</strong> ${safe(params.get('organization-title'))}</p>
            <p><strong>Email :</strong> ${safe(params.get('email'))}</p>
            <p><strong>Téléphone :</strong> ${safe(decodeURIComponent(params.get('phone')))}</p>
            <p><strong>arrondissement :</strong> ${safe(params.get('business'))}</p>
            <p><strong>Adresse détaillée:</strong> ${safe(params.get('adress'))}</p>
            <p><strong>Notes supplémentaires :</strong> ${safe(params.get('description'))}</p>
            <p><strong>Date :</strong> ${safe(params.get('timestamp'))}</p>
        `;
    } catch (e) {
        console.error("Erreur dans le script d'affichage :", e);
    }
});

// Store the selected elements that we are going to use. This is not required but a good practice with larger programs where the variable will be referenced more than once.
const navlinks = document.querySelector('#navlinks');
const hamburgerBtn = document.querySelector('#menu');

hamburgerBtn.addEventListener('click', () => {
  navlinks.classList.toggle('show');         // on affiche/masque les liens
  hamburgerBtn.classList.toggle('active');   // on change l'icône du bouton (optionnel)
});


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
// Variables globales
let products = [];
let categories = [];
let currentCategory = 'all';
let currentSearch = '';

const categoriesApiUrl = "https://eu.cowema.org/api/public/categories";
const productsApiUrl = "https://eu.cowema.org/api/public/products";

// Banners + priorité par catégorie (mots-clés dans le nom)
const BANNERS = [
    { id:'packs', kicker:'OFFRE SPÉCIALE', emoji:'🎁',
        title:'3 articles = 1 prix',
        sub:'Économisez avec nos Packs',
        bg:'linear-gradient(135deg,#0ea5e9,#22c55e)',
        ctas:[{label:'Voir les Packs', type:'link', href:'/packs'}]
    },
    { id:'whatsapp', kicker:'BESOIN D\'AIDE ?', emoji:'💬',
        title:'Parlez à un conseiller',
        sub:'Réponse rapide sur WhatsApp',
        bg:'linear-gradient(135deg,#22c55e,#16a34a)',
        ctas:[{label:'WhatsApp', type:'whatsapp', prefill:'Bonjour 👋, je veux en savoir plus sur vos packs.'}]
    },
    { id:'livraison', kicker:'LIVRAISON RAPIDE', emoji:'🚚',
        title:'Brazzaville & Pointe-Noire',
        sub:'Commandez, on s\'occupe du reste',
        bg:'linear-gradient(135deg,#f59e0b,#ef4444)',
        ctas:[{label:'Commander via WhatsApp', type:'whatsapp', prefill:'Bonjour, je souhaite commander un pack avec livraison.'}]
    },
];
const BANNER_PRIORITY_BY_CATEGORY = {
    'électronique':'packs','electronique':'packs',
    'téléphone':'whatsapp','telephone':'whatsapp',
    'maison':'livraison','mode':'whatsapp'
};



// WhatsApp settings
const DEFAULT_SETTINGS = {
    phone: '+242061234567',
    template: 'Bonjour Cowema 👋, je souhaite commander: {title} (ID {id}) au prix de {price} FCFA.'
};

// Initialisation
document.addEventListener('DOMContentLoaded', async function() {
        await loadData();
        setupCategoryButtons();
});

// Charger catégories et produits
async function loadData() {
    const container = document.getElementById("productsByCategory");
    container.innerHTML = "Chargement...";

    try {
        // Fetch catégories
        const catRes = await fetch(categoriesApiUrl);
        categories = await catRes.json();
        displayCategories();

        // Fetch produits
        const prodRes = await fetch(productsApiUrl);
        const prodJson = await prodRes.json();
        products = prodJson.data;

        // Afficher tous les produits
        displayProductsByCategory();

    } catch (error) {
        container.innerHTML = "<p>Erreur lors du chargement des données.</p>";
        console.error("Erreur:", error);
    }
}

function displayCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    container.innerHTML = '';

    const maxVisible = 6;

    // Bouton "Tous"
    const allBtn = document.createElement('button');
    allBtn.className = 'category-btn active';
    allBtn.textContent = 'Tous les produits';
    allBtn.dataset.category = 'all';
    container.appendChild(allBtn);

    // Afficher les 6 premières catégories
    categories.slice(0, maxVisible).forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.category = cat.name;
        btn.textContent = cat.name;
        container.appendChild(btn);
    });

    // Si plus de 6, ajouter un bouton "Voir plus"
    if (categories.length > maxVisible) {
        const seeMoreBtn = document.createElement('button');
        seeMoreBtn.textContent = 'Voir plus';
        seeMoreBtn.className = 'see-more-btn';
        container.appendChild(seeMoreBtn);

        seeMoreBtn.addEventListener('click', () => {
            // Ajouter les catégories restantes
            categories.slice(maxVisible).forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'category-btn';
                btn.dataset.category = cat.name;
                btn.textContent = cat.name;
                container.insertBefore(btn, seeMoreBtn);
            });

            seeMoreBtn.remove(); // Supprimer le bouton après affichage
        });
    }
}

function setupCategoryButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('category-btn')) {
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            displayProductsByCategory();
        }
    });
}

// Afficher les produits selon catégorie sélectionnée
function displayProductsByCategory() {
    const container = document.getElementById('productsByCategory');
    container.innerHTML = '';

    let filtered = [...products];

    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    if (filtered.length === 0) {
        container.innerHTML = "<p>Aucun produit trouvé.</p>";
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.style = "";
        card.innerHTML = `
            <div class="product-labels">
            <img src="${p.thumbnail}" alt="${p.title}" class="product-image" data-id="${p.id}" loading="lazy">
            <h3>${truncateText(p.title)}</h3>
            <p class="product-stock"><i class="fas fa-box"></i> ${p.available_stock} en stock</p>
            <p class="product-city"><i class="fas fa-map-marker-alt"></i> ${p.supplier_city || 'Localisation non précisée'}</p>
            <p class="product-category"><i class="fas fa-tags"></i> ${p.category}</p>
            <p class="product-price"><strong>${p.price} FCFA</strong></p>
            <button class="cart-btn" data-id="${p.id}"><i class="fas fa-shopping-cart"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

let currentPage = 1;
let lastPage = 1;

async function loadProductsPage(page = 1) {
    const res = await fetch(`${productsApiUrl}?page=${page}`);
    const json = await res.json();
    products = json.data;
    currentPage = json.page;
    lastPage = json.last_page;

    displayProductsByCategory(); // ou une fonction adaptée

    renderPaginationControls();
}

function renderPaginationControls() {
    const container = document.getElementById('paginationControls');
    container.innerHTML = '';

    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '⬅ Précédent';
        prevBtn.onclick = () => loadProductsPage(currentPage - 1);
        container.appendChild(prevBtn);
    }

    if (currentPage < lastPage) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Suivant ➡';
        nextBtn.onclick = () => loadProductsPage(currentPage + 1);
        container.appendChild(nextBtn);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProductsPage(1);
    
});

// Ouvrir le modal quand on clique sur une image de produit
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('product-image')) {
    const productId = parseInt(e.target.dataset.id);
    const product = products.find(p => p.id === productId);
    if (product) {
        showProductModal(product);
    }
    }

    // Fermer le modal
    if (e.target.id === 'closeModalBtn') {
        document.getElementById('productModal').close();
    }
});

// Afficher le produit dans le modal avec toutes ses images
function showProductModal(product) {
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');

    // Créer le HTML pour la galerie d'images
    let galleryHTML = '';
    if (product.images && product.images.length > 0) {
        // Image principale (première image par défaut)
        galleryHTML += `
            <div class="main-image-container">
                <img src="${product.thumbnail[0]}" alt="${product.title}" class="main-image" id="mainProductImage">
            </div>
        `;
        
        // Miniatures pour la galerie
        if (product.images.length > 1) {
            galleryHTML += `<div class="thumbnail-gallery">`;
            product.images.forEach((img, index) => {
                galleryHTML += `
                    <img src="${img}" class="thumbnail ${index === 0 ? 'active' : ''}" 
                            onclick="changeProductImage(this, '${img}')" 
                            alt="Miniature ${index + 1}">
                `;
            });
            galleryHTML += `</div>`;
        }
    } else {
        // Fallback si pas d'images
        galleryHTML += `
            <div class="main-image-container">
                <img src="${product.thumbnail || 'https://via.placeholder.com/500'}" 
                    alt="${product.title}" class="main-image">
            </div>
        `;
    }

    // Prix avec promotion si disponible
    const priceHTML = product.promoPrice 
        ? `<p class="product-price">
                <span class="old-price">${product.price.toLocaleString()} FCFA</span>
                <span class="current-price">${product.promoPrice.toLocaleString()} FCFA</span>
            </p>`
        : `<p class="product-price">${product.price.toLocaleString()} FCFA</p>`;

    modalBody.innerHTML = `
        <div class="product-modal-content">
            <div class="product-gallery">
                ${galleryHTML}
            </div>
            
            <div class="product-details">
                <h2>${product.title}</h2>
                ${priceHTML}
                
                <div class="product-meta">
                    <p><i class="fas fa-box"></i> Stock: ${product.available_stock || 'N/A'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${product.supplier_city || 'Localisation non précisée'}</p>
                </div>

                <div class="modal-actions">
                    <button class="btn buy-btn" onclick="preparePurchase(${product.id})">
                        <i class="fas fa-shopping-bag"></i> Acheter maintenant
                    </button>
                    <button class="btn cart-btn" onclick="addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> Ajouter au panier
                    </button>
                </div>
            </div>
        </div>
    `;

    // Afficher le modal
    modal.showModal();
}

// Fonction pour changer l'image principale
function changeProductImage(element, newSrc) {
    // Mettre à jour l'image principale
    const mainImage = document.getElementById('mainProductImage');
    if (mainImage) mainImage.src = newSrc;
    
    // Mettre à jour les miniatures actives
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    element.classList.add('active');
}


function preparePurchase(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Sauvegarde dans localStorage
    localStorage.setItem("selectedProduct", JSON.stringify({
        id: product.id,
        title: product.title,
        image: product.thumbnail,
        price: product.price
    }));

  // Redirection vers la page commande
    window.location.href = "order.html";
}

// Gestion du panier

let cart = [];

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.thumbnail,
            quantity: 1
        });
    }

    updateCart();
}


function updateCart() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");
    const cartCount = document.getElementById("cartCount");

    cartItems.innerHTML = "";
    let total = 0;
    let count = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        count += item.quantity;

        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <img src="${item.image}" alt="${item.title}" width="50">
            <div class="item-info">
                <p>${item.title}</p>
                <p>${item.price} FCFA x ${item.quantity}</p>
            </div>
        `;
        cartItems.appendChild(div);
    });

    cartTotal.textContent = total.toLocaleString();
    cartCount.textContent = count;
}

document.addEventListener("click", function(e) {
    if (e.target.closest('.cart-btn')) {
        const id = parseInt(e.target.closest('.cart-btn').dataset.id);
        addToCart(id);
    }
});

const cartModal = document.getElementById("cartModal");
const cartBtn = document.getElementById("cartBtn");
const closeCartModal = document.getElementById("closeCartModal");

cartBtn.addEventListener("click", () => {
    if (cartModal.open) {
        cartModal.close();
    } else {
        cartModal.showModal();
    }
});


// Gestion du modal produit
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('productModal');
    const closeBtn = document.querySelector('#productModal .close-modal');

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.close();
        });
    }
});

closeCartModal.addEventListener("click", () => {
    cartModal.close();
});

document.addEventListener('DOMContentLoaded', () => {
    const productPreview = document.getElementById('selectedProductPreview');
    const selectedProduct = JSON.parse(localStorage.getItem("selectedProduct"));

    if (selectedProduct) {
        productPreview.innerHTML = `
            <div class="product-preview" style="display: flex; align-items: center; gap: 16px; border-radius: 10px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">
            <img src="${selectedProduct.image}" alt="${selectedProduct.title}" width="90" height="90" style="border-radius: 8px; object-fit: cover; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
            <div style="flex:1;">
                <h3 style="margin:0 0 6px 0; font-size: 1.1rem; color: #222; font-weight: 600;">${truncateText(selectedProduct.title, 30)}</h3>
                <p style="margin:0 0 4px 0; color: #555; font-size: 0.9rem;">Produit sélectionné pour achat</p>
                <p style="margin:0; color: #888; font-size: 0.85rem;">ID: ${selectedProduct.id}</p>
                <p style="margin:0; color: #888; font-size: 0.85rem;">Quantité: 1</p>
                <p style="font-weight: bold; color: #1a8917; font-size: 1.05rem; margin: 0;">${selectedProduct.price.toLocaleString()} FCFA</p>
            </div>
            </div>
        `;
    }
});

function clearCart() {
    cart = [];
    updateCart();
    console.log("🧹 Panier vidé !");
}

document.getElementById("clearCartBtn").addEventListener("click", clearCart);

document.getElementById("checkoutBtn").addEventListener("click", function () {
    if (cart.length === 0) {
        alert("Votre panier est vide !");
        return;
    }

    // Stocker les infos du panier dans localStorage
    localStorage.setItem("cart", JSON.stringify(cart));

    // Stocker le total
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    localStorage.setItem("cartTotal", total);

    // Redirection
    window.location.href = "order.html";
});

document.addEventListener("DOMContentLoaded", function () {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const total = parseInt(localStorage.getItem("cartTotal")) || 0;
    const container = document.getElementById("selectedProductPreview");

    if (cart.length === 0) {
        container.innerHTML = "<p>Votre panier est vide.</p>";
        return;
    }

    container.innerHTML = cart.map(item => `
        <div  style="border:1px solid #ccc; padding:10px; margin-bottom:10px; display:flex; gap:10px;">
            <img src="${item.image}" alt="${item.title}" width="80" style="border-radius:5px;">
            <div>
                <h3 style="margin:0;">${truncateText(item.title, 30)}</h3>
                <p  style="font-weight: bold; color: #1a8917; font-size: 1.05rem; margin: 0;">${item.quantity} x ${item.price.toLocaleString()} FCFA</p>
            </div>
        </div>
    `).join("");

    const totalDiv = document.createElement("div");
    totalDiv.innerHTML = `<h4 style="text-align:right;">Total: ${total.toLocaleString()} FCFA</h4>`;
    container.appendChild(totalDiv);
});


document.addEventListener('DOMContentLoaded', () => {
    const productPreview = document.getElementById('selectedProductPreview');
    const selectedProduct = JSON.parse(localStorage.getItem("selectedProduct"));

    if (selectedProduct) {
        productPreview.innerHTML = `
            <div class="product-preview" style="display: flex; align-items: center; gap: 16px; border-radius: 10px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">
            <img src="${selectedProduct.image}" alt="${selectedProduct.title}" width="90" height="90" style="border-radius: 8px; object-fit: cover; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
            <div style="flex:1;">
                <h3 style="margin:0 0 6px 0; font-size: 1.1rem; color: #222; font-weight: 600;">${truncateText(selectedProduct.title, 30)}</h3>
                <p style="margin:0 0 4px 0; color: #555; font-size: 0.9rem;">Produit sélectionné pour achat</p>
                <p style="margin:0; color: #888; font-size: 0.85rem;">ID: ${selectedProduct.id}</p>
                <p style="margin:0; color: #888; font-size: 0.85rem;">Quantité: 1</p>
                <p style="font-weight: bold; color: #1a8917; font-size: 1.05rem; margin: 0;">${selectedProduct.price.toLocaleString()} FCFA</p>
            </div>
            </div>
        `;
    }
});

function truncateText(text, maxLength = 32) {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}


