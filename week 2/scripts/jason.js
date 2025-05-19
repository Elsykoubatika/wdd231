const container = document.querySelector("main");
const teamSection = document.querySelector("#team-info");

async function popular() {
    const response = await fetch("https://raw.githubusercontent.com/Elsykoubatika/wdd231/main/week%202/scripts/response.json");
    const data = await response.json();
    return data; // le tableau à afficher
}

async function displayPopular() {
    const data = await popular();
    container.innerHTML = ""; 
    // Clear the container before displaying new data  
    data.members.forEach((item) => {
    const card = document.createElement("div");
    card.classList.add("card");
    // Add a class to style the card
    card.innerHTML = `
        <h2>${item.name}</h2>
        <p><strong>Identité secrète :</strong> ${item.secretIdentity}</p>
        <p><strong>Âge :</strong> ${item.age}</p>
        <p><strong>Pouvoirs :</strong> ${item.powers.join(", ")}</p>
    `;
        container.appendChild(card);
    });

    teamSection.innerHTML = `
    <h1>${data.squadName}</h1>
    <p><strong>Ville :</strong> ${data.homeTown}</p>
    <p><strong>Année de formation :</strong> ${data.formed}</p>
    <p><strong>Base secrète :</strong> ${data.secretBase}</p>
    <p><strong>Actif :</strong> ${data.active}</p>
    <hr>`;

}

displayPopular();

// Ou encore
const fechData = async () => {
    try {
        const reponse = await fetch("https://raw.githubusercontent.com/Elsykoubatika/wdd231/main/week%202/scripts/response.json");
        const data = await reponse.json();
        console.log(data);
    }
    catch (error) {
        console.log("Erreur de chargement des données", error);
    }
};