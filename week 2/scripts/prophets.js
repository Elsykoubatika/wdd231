const cards = document.querySelector("main");
const container = document.querySelector("main");

async function getData() {
    const response = await fetch("https://byui-cse.github.io/cse-ww-program/data/latter-day-prophets.json");
    const data = await response.json();
    return data;
}

async function displayProphets() {
    const data = await getData();
    cards.innerHTML = ""; // Clear the container before displaying new data

    data.prophets.forEach((items) => {
        const card = document.createElement("div");
        card.classList.add("card");
        // Add a class to style the card
        const image = document.createElement("img");
        
        card.innerHTML = `
        <h2>${items.name} ${items.lastname}</h2>
        <p><strong>birthdate:</strong> ${items.birthdate}</p>
        <p><strong>Âge :</strong> ${items.birthplace}</p> `;

        image.setAttribute("src", items.imageurl);
        image.setAttribute("alt", `Portrait of ${items.name} ${items.lastname}`);
        image.setAttribute("loading", "lazy");
        image.setAttribute("width", "340");
        image.setAttribute("height", "440");
        card.appendChild(image);
        cards.appendChild(card);
    });
}

displayProphets();