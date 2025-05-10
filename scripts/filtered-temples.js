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
const mainnav = document.querySelector('.filterButton')
const hambutton = document.querySelector('#menu');

// Add a click event listender to the hamburger button and use a callback function that toggles the list element's list of classes.
hambutton.addEventListener('click', () => {
	mainnav.classList.toggle('show');
	hambutton.classList.toggle('show');
});


const temples = [
	{
		templeName: "Aba Nigeria",
		location: "Aba, Nigeria",
		dedicated: "2005, August, 7",
		area: 11500,
		imageUrl: "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/aba-nigeria/400x250/aba-nigeria-temple-lds-273999-wallpaper.jpg"
	},
	{
		templeName: "Manti Utah",
		location: "Manti, Utah, United States",
		dedicated: "1888, May, 21",
		area: 74792,
		imageUrl: "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/manti-utah/400x250/manti-temple-768192-wallpaper.jpg"
	},
	{
		templeName: "Payson Utah",
		location: "Payson, Utah, United States",
		dedicated: "2015, June, 7",
		area: 96630,
		imageUrl: "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/payson-utah/400x225/payson-utah-temple-exterior-1416671-wallpaper.jpg"
	},
	{
		templeName: "Yigo Guam",
		location: "Yigo, Guam",
		dedicated: "2020, May, 2",
		area: 6861,
		imageUrl: "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/yigo-guam/400x250/yigo_guam_temple_2.jpg"
	},
	{
		templeName: "Washington D.C.",
		location: "Kensington, Maryland, United States",
		dedicated: "1974, November, 19",
		area: 156558,
		imageUrl: "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/washington-dc/400x250/washington_dc_temple-exterior-2.jpeg"
	},
	{
		templeName: "Lima Perú",
		location: "Lima, Perú",
		dedicated: "1986, January, 10",
		area: 9600,
		imageUrl: "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/lima-peru/400x250/lima-peru-temple-evening-1075606-wallpaper.jpg"
	},
	{
		templeName: "Mexico City Mexico",
		location: "Mexico City, Mexico",
		dedicated: "1983, December, 2",
		area: 116642,
		imageUrl: "https://content.churchofjesuschrist.org/templesldsorg/bc/Temples/photo-galleries/mexico-city-mexico/400x250/mexico-city-temple-exterior-1518361-wallpaper.jpg"
	},

	{
		templeName: "Barranquilla Colombia",
		location: "Barranquilla, Colombia",
		dedicated: "2018, December, 9",
		area: 11500,
		imageUrl: "https://www.churchofjesuschrist.org/imgs/7e68e3b2ed30f817f91392968737f45a07e17e79/full/500%2C/0/default"
	},

	{
		templeName: " Argentina",
		location: "Ciudad Evita, Buenos Aires, Argentina",
		dedicated: "1986, January, 17",
		area: 11500,
		imageUrl: "https://www.churchofjesuschrist.org/imgs/a3454a8b72b4cc972b3898805ec69cc901a89170/full/500%2C/0/default"
	},

	{
		templeName: "Seoul Korea Temple",
		location: "Seoul, Seoul-teukbyeolsi, South Korea",
		dedicated: "1985, December, 14 ",
		area: 11500,
		imageUrl: "https://www.churchofjesuschrist.org/imgs/57efcc4b6a1c664c934aa672b0f8de38a8f539c4/full/500%2C/0/default"
	},
	// Add more temple objects here...
];


const container = document.getElementById("container");

// Récupère et supprime le modèle initial (il sera cloné)
const template = document.querySelector(".temple-card");
template.remove();

temples.forEach(temple => {
  // Clone le modèle
  const card = template.cloneNode(true);

  // Remplit les infos
  card.querySelector(".temple-image").src = temple.imageUrl;
  card.querySelector(".temple-image").alt = temple.templeName;

  card.querySelector(".temple-name").textContent = temple.templeName;
  card.querySelector(".temple-location").innerHTML = `<strong>Location:</strong> ${temple.location}`;
  card.querySelector(".temple-dedicated").innerHTML = `<strong>Dedicated:</strong> ${temple.dedicated}`;
  card.querySelector(".temple-area").innerHTML = `<strong>Area:</strong> ${temple.area.toLocaleString()} sq ft`;

  // Ajoute dans le container
  container.appendChild(card);
});

// Filter temples built after 2000
const homeButton = document.getElementById("home");
const oldButton = document.getElementById("old");
const newButton = document.getElementById("new");
const largeButton = document.getElementById("large");
const smallButton = document.getElementById("small");

// Function to display temples based on a filter
const displayTemples = (filterFn) => {
	// Clear the container
	container.innerHTML = "";

	// Filter and display temples based on the filter function
	const filteredTemples = temples.filter(filterFn);

	// Clone the template for each filtered temple
	filteredTemples.forEach(temple => {
		const card = template.cloneNode(true);

		card.querySelector(".temple-image").src = temple.imageUrl;
		card.querySelector(".temple-image").alt = temple.templeName;

		card.querySelector(".temple-name").textContent = temple.templeName;
		card.querySelector(".temple-location").innerHTML = `<strong>Location:</strong> ${temple.location}`;
		card.querySelector(".temple-dedicated").innerHTML = `<strong>Dedicated:</strong> ${temple.dedicated}`;
		card.querySelector(".temple-area").innerHTML = `<strong>Area:</strong> ${temple.area.toLocaleString()} sq ft`;

		container.appendChild(card);
	});
};

const updateHeader = (text) => {
	const header = document.querySelector("h2");
	header.textContent = text;
};

// Event listeners for buttons
homeButton.addEventListener("click", () => {
	displayTemples(() => true);
	updateHeader("Home");
}); // Show all temples

oldButton.addEventListener("click", () => displayTemples(temple => {
	const year = parseInt(temple.dedicated.split(",")[0]);
	updateHeader("Olde");
	return year < 1900;
}));
newButton.addEventListener("click", () => displayTemples(temple => {
	const year = parseInt(temple.dedicated.split(",")[0]);
	updateHeader("New");
	return year > 2000;
}));
largeButton.addEventListener("click", () => {
	displayTemples(temple => temple.area > 90000);
	updateHeader("Large");
});
smallButton.addEventListener("click", () => {
	displayTemples(temple => temple.area < 10000);
	updateHeader("Small");});


//autre façon de faire

//temples.forEach(temple => {
	//const card = document.createElement("div");
	//card.classList.add("temple-card");

	//card.innerHTML = `
    
    //<div class="temple-info">
		//<h3>${temple.templeName}</h3>
		//<p><strong>Location:</strong> ${temple.location}</p>
		//<p><strong>Dedicated:</strong> ${temple.dedicated}</p>
		//<p><strong>Area:</strong> ${temple.area.toLocaleString()} sq ft</p>
   // </div>
	//<img src="${temple.imageUrl}" alt="${temple.templeName}" laoding="lazy">`;

	//container.appendChild(card);
//});