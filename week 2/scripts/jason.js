//const container = document.querySelector("main");
//const teamSection = document.querySelector("#team-info");
//
//async function popular() {
//    const response = await fetch("https://raw.githubusercontent.com/Elsykoubatika/wdd231/main/week%202/scripts/response.json");
//    const data = await response.json();
//    return data; // le tableau à afficher
//}

//async function displayPopular() {
//  const data = await popular();
//  container.innerHTML = ""; 
 // Clear the container before displaying new data  
//  data.members.forEach((item) => {
//  const card = document.createElement("div");
//  card.classList.add("card");
 // Add a class to style the card
//  card.innerHTML = `
//      <h2>${item.name}</h2>
//      <p><strong>Identité secrète :</strong> ${item.secretIdentity}</p>
//      <p><strong>Âge :</strong> ${item.age}</p>
//      <p><strong>Pouvoirs :</strong> ${item.powers.join(", ")}</p>
//  `;
//      container.appendChild(card);
//  });
//
//  teamSection.innerHTML = `
//  <h1>${data.squadName}</h1>
//  <p><strong>Ville :</strong> ${data.homeTown}</p>
//  <p><strong>Année de formation :</strong> ${data.formed}</p>
//  <p><strong>Base secrète :</strong> ${data.secretBase}</p>
//  <p><strong>Actif :</strong> ${data.active}</p>
//  <hr>`;
//
//
//
//splayPopular();
//
// Ou encore
//nst fechData = async () => {
//  try {
//      const reponse = await fetch("https://raw.githubusercontent.com/Elsykoubatika/wdd231/main/week%202/scripts/response.json");
//      const data = await reponse.json();
//      console.log(data);
//  }
//  catch (error) {
//      console.log("Erreur de chargement des données", error);
//  }
//

async function getProducts() {
try {
    const response = await fetch("https://eu.cowema.org/api/public/products");
    if (!response.ok) throw new Error(`Erreur ${response.status}`);

    const result = await response.json();
    const products = result.data;

    // Affichage dans la console (tu peux le remplacer par du HTML)
    products.forEach(product => {
        console.log(`🛒 ${product.title}`);
        console.log(`💰 Prix: ${product.price} FCFA`);
        console.log(`🏷️ Promo: ${product.on_sales ? 'Oui' : 'Non'}`);
        console.log(`📦 Stock: ${product.available_stock}`);
        console.log(`🏢 Fournisseur: ${product.supplier} - ${product.supplier_city}`);
        console.log(`🖼️ Image: ${product.thumbnail}`);
        console.log('--------------------');
    });

    return products;
} catch (error) {
    console.error("Erreur lors de la récupération des produits :", error);
    return [];
    }
}

async function getAllProducts() {
    let currentPage = 1;
    let allProducts = [];
    let hasNextPage = true; 

    while (hasNextPage) {
    try {
        const response = await fetch(`https://eu.cowema.org/api/public/products?page=${currentPage}`);
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const result = await response.json();
        allProducts = allProducts.concat(result.data);

      // Vérifie s'il y a une page suivante
        hasNextPage = result.link && result.link.next !== null;
        currentPage++;
        } catch (error) {
            console.error(`Erreur lors de la récupération de la page ${currentPage}:`, error);
            hasNextPage = false;
        }
    }

    console.log(`✅ Total produits récupérés: ${allProducts.length}`);
    return allProducts;
}

async function displayProducts() {
    const products = await getProducts();
    const container = document.getElementById("product-list");

    container.innerHTML = products.map(product => `
    <div class="product-card">
        <img src="${product.thumbnail}" alt="${product.title}" />
        <h4>${shortenTitle(product.title)}</h4>
        <p>Prix: <strong>${product.price} FCFA</strong></p>
        <!--<p>${product.on_sales ? '<span class="promo">En promo 🔥</span>' : ''}</p>-->
        <p>Stock: ${product.available_stock}</p>
    </div>
    `).join('');

}

displayProducts();

function shortenTitle(title, maxLength = 35) {
    return title.length > maxLength ? title.slice(0, maxLength) + '...' : title;
}