window.addEventListener("DOMContentLoaded", () => {
    const now = new Date();
//const option = now.toLocaleDateString('fr-FR', {weekday: 'long',year: 'numeric', month: 'long', day: 'numeric'});
    const timeFR = now.toLocaleDateString('fr-FR', {hour: '2-digit', minute: '2-digit'});
    const formated = ` ${timeFR}`;
    document.getElementById("timestamp").value = formated;
});

window.addEventListener("DOMContentLoaded", () => {
try {
    const getString = window.location.search;
    const myInfo = new URLSearchParams(getString);

    const target = document.querySelector('#tout');
    if (!target) throw new Error("Element #tout not found!");

    target.innerHTML = `
        <h2>Thank you ${myInfo.get('first')} ${myInfo.get('last')}</h2>
        <p><strong>Organizational Title:</strong> ${myInfo.get('organization-title')}</p>
        <p><strong>Email:</strong> ${myInfo.get('email')}</p>
        <p><strong>Phone:</strong> ${myInfo.get('phone')}</p>
        <p><strong>Business:</strong> ${myInfo.get('business')}</p>
        <p><strong>Membership:</strong> ${myInfo.get('membership')}</p>
        <p><strong>Description:</strong> ${myInfo.get('description')}</p>
        <p><strong>Date:</strong> ${myInfo.get('timestamp')}</p>
    `;
    } catch (e) {
        console.error("Erreur dans le script :", e.message);
    }
});

// dark mode
const toggleBtn = document.getElementById('toggle-theme');

toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

//

document.addEventListener("DOMContentLoaded", () => {
function toggleDialog(openBtnId, dialogId, closeBtnId) {
    const openBtn = document.getElementById(openBtnId);
    const dialog = document.getElementById(dialogId);
    const closeBtn = document.getElementById(closeBtnId);

    if (openBtn && dialog && closeBtn) {
        openBtn.addEventListener("click", () => {
            dialog.showModal();
        });

        closeBtn.addEventListener("click", () => {
            dialog.close();
        });
    } else {
        console.warn(`⛔ Élément(s) manquant(s) pour le dialogue :`, {
            openBtnId,
            dialogId,
            closeBtnId
        });
    }
}

  // Initialise les boîtes de dialogue
  toggleDialog("openButton2", "dialogBox2", "closeButton2"); // NP
  toggleDialog("openButton3", "dialogBox3", "closeButton3"); // Bronze
  toggleDialog("openButton4", "dialogBox4", "closeButton4"); // Silver
  toggleDialog("openButton",  "dialogBox",  "closeButton");  // Gold

  // 👇 Tes autres fonctions ici : elles seront sûres de s’exécuter !
    console.log("✅ Tout le JS est chargé sans erreur !");
});


const url = `https://api.openweathermap.org/data/2.5/weather?q=Brazzaville&appid=d93a8fa684d60808fdd71ed4aa5189be&units=imperial&lang=fr`;
const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=Brazzaville&appid=d93a8fa684d60808fdd71ed4aa5189be&units=imperial&lang=fr`;

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    let hours = date.getHours();
    let minutes = "0" + date.getMinutes();
    return `${hours}:${minutes.substr(-2)}`;
}

async function getData() {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function displayProphets() {
    const weather = await getData();
    
    document.getElementById("current-weather").innerHTML = `
        <strong>${Math.round(weather.main.temp)}°F</strong><br>
        ${weather.weather[0].description}<br>
        High: ${Math.round(weather.main.temp_max)}°<br>
        Low: ${Math.round(weather.main.temp_min)}°<br>
        Humidité: ${weather.main.humidity}%<br>
        Lever du soleil: ${formatTime(weather.sys.sunrise)}<br>
        Coucher du soleil: ${formatTime(weather.sys.sunset)}
    `;

    document.getElementById("description").innerHTML = `<p id="description">${weather.weather[0].description}</p>`;
}

displayProphets();

async function getWeather() {
    const response = await fetch(forecastUrl);
    const data = await response.json();
    return data;
}

async function displayWeather() {
    const weather = await getWeather();
    const forecasts = {};

    weather.list.forEach((item) => {
        const date = new Date(item.dt_txt);
        if (date.getHours() === 12) {
            const jour = date.toLocaleDateString('fr-FR', { weekday: 'long' });
            if (!forecasts[jour]) {
                forecasts[jour] = Math.round(item.main.temp);
            }
        }
    });

    const days = Object.keys(forecasts).slice(0, 3);
    const forecastHtml = days.map((day, index) => {
        const label = index === 0 ? "Aujourd'hui" : day;
        return `${label} : <strong>${forecasts[day]}°F</strong>`;
    }).join("<br>");

    document.getElementById("weather-forecast").innerHTML = forecastHtml;
}

displayWeather();

const business = "scripts/members.json";

async function getBusiness() {
    const response = await fetch(business);
    const data = await response.json();
    return data;
}


function shuffleAndDisplayBusiness(limit = 3) {
    getBusiness().then(members => {
        // Shuffle array
        for (let i = members.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [members[i], members[j]] = [members[j], members[i]];
        }
        // Limit to 'limit' cards
        const selected = members.slice(0, limit);
        const businessHTML = selected.map(member =>
            `
            <div class="business-card" data-niveau="${member.niveauAdhesion}">
                <h4>${member.nom}</h4>
                <div class="infos">
                    <img src="${member.image}" alt="Logo de ${member.nom}" />
                    <p>
                        <strong>Adresse:</strong> ${member.adresse}<br>
                        <strong>Téléphone:</strong> ${member.telephone}<br>
                        <strong>Site:</strong> <a href="${member.url}" target="_blank">${member.url}</a>
                    </p>
                </div>
            </div>
        ` ).join("");
        document.getElementById("businesses").innerHTML = businessHTML;

        // Change background color based on niveauAdhesion
        const cards = document.querySelectorAll("#businesses .business-card");
        selected.forEach((member, idx) => {
            const card = cards[idx];
            if (String(member.niveauAdhesion) === "2") {
                card.style.backgroundColor = 'gold';
            } else if (String(member.niveauAdhesion) === "3") {
                card.style.backgroundColor = 'silver';
            }
        });
    });
}

// Exemple d'utilisation : afficher 4 cartes aléatoires
shuffleAndDisplayBusiness(3);

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

// Store the selected elements that we are going to use. This is not required but a good practice with larger programs where the variable will be referenced more than once.
const navlinks = document.querySelector('#navlinks');
const hamburgerBtn = document.querySelector('#menu');

hamburgerBtn.addEventListener('click', () => {
  navlinks.classList.toggle('show');         // on affiche/masque les liens
  hamburgerBtn.classList.toggle('active');   // on change l'icône du bouton (optionnel)
});


const gridbutton = document.querySelector("#grid");
const listbutton = document.querySelector("#list");
const display = document.querySelector("article");

// The following code could be written cleaner. How? We may have to simplfiy our HTMl and think about a default view.

gridbutton.addEventListener("click", () => {
	// example using arrow function
	display.classList.add("grid");
	display.classList.remove("list");
});

listbutton.addEventListener("click", showList); // example using defined function

function showList() {
	display.classList.add("list");
	display.classList.remove("grid");
}


