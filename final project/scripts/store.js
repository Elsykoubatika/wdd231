
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
    updateCart();
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
        card.style = "border:1px solid #ccc; margin:10px; padding:10px; max-width:250px";
        card.innerHTML = `
            <img src="${p.thumbnail}" alt="${p.title}" class="product-image" width="100%" data-id="${p.id}" loading="lazy">
            <h3>${p.title}</h3>
            <p><strong>${p.price} FCFA</strong></p>
            <button class="cart-btn" data-id="${p.id}"><i class="fas fa-shopping-cart"></i></button>
            <button class="buy-btn" data-id="${p.id}">Acheter</button>
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

// Afficher le produit dans le modal
function showProductModal(product) {
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');

    modalBody.innerHTML = `
    <img src="${product.thumbnail}" alt="${product.title}" style="width:100%; border-radius:8px;">
    <h2>${product.title}</h2>
    <p style="font-size: 18px; font-weight: bold; color: green;">${product.price.toLocaleString()} FCFA</p>
    <p>${product.description || "Pas de description disponible."}</p>

    <div class="modal-buttons">
        <button class="buy-btn" onclick="preparePurchase(${product.id})">Acheter</button>
        <button class="cart-btn" onclick="addToCart(${product.id})"><i class="fas fa-shopping-cart"></i></button>
    </div>
`;

modal.showModal();
}
