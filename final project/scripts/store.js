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
let cart = [];
let currentCategory = 'all';
let currentSearch = '';

const categoriesApiUrl = "https://eu.cowema.org/api/public/categories";
const productsApiUrl = "https://eu.cowema.org/api/public/products";

// Initialisation
document.addEventListener('DOMContentLoaded', async function() {
    await loadData(); // charge catégories et produits
    setupCategoryButtons(); // active les boutons
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

// Afficher les boutons de catégories
function displayCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    container.innerHTML = '';

    // Bouton "Tous"
    const allBtn = document.createElement('button');
    allBtn.className = 'category-btn active';
    allBtn.textContent = 'Tous les produits';
    allBtn.dataset.category = 'all';
    container.appendChild(allBtn);

    // Boutons pour chaque catégorie
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.category = cat.name;
        btn.textContent = cat.name;
        container.appendChild(btn);
    });
}

// Configurer les boutons pour filtrer
function setupCategoryButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('category-btn')) {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
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
            <p><strong>${p.price} FCFA</strong></p>
            <button class="cart-btn" data-id="${p.id}"><i class="fas fa-shopping-cart"></i></button>
            <button class="buy-btn" data-id="${p.id}">Acheter</button>
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
                <img src="${product.images[0]}" alt="${product.title}" class="main-image" id="mainProductImage">
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
                    <p><i class="fas fa-box"></i> Stock: ${product.stock || 'N/A'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${product.city || 'Localisation non précisée'}</p>
                </div>
                
                <div class="product-description">
                    <h3>Description</h3>
                    <p>${product.description || "Pas de description disponible."}</p>
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
    modal.style.display = 'flex';
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

document.addEventListener('DOMContentLoaded', () => {
    const productPreview = document.getElementById('selectedProductPreview');
    const selectedProduct = JSON.parse(localStorage.getItem("selectedProduct"));

    if (selectedProduct) {
        productPreview.innerHTML = `
            <div style="border:1px solid #ccc; padding:15px; margin-bottom:15px; display:flex; gap:15px; align-items:center;">
                <img src="${selectedProduct.image}" alt="${selectedProduct.title}" width="100" style="border-radius:8px;">
                <div>
                    <h3 style="margin:0;">${truncateText(selectedProduct.title, 35)}</h3>
                    <p style="font-weight:bold; color:green;">${selectedProduct.price.toLocaleString()} FCFA</p>
                </div>
            </div>
        `;
    }
});

function truncateText(text, maxLength = 35) {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}
