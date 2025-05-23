
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

async function displayBusiness() {
    const members = await getBusiness();

    //Crée le HTML pour chaque membre
    const businessHTML = members.map(member =>
        `
        <div class="business-card">
            <h4>${member.nom}</h4>
            <h5 class="tagline">${member.niveauAdhesion}</h5>
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
}

displayBusiness();

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