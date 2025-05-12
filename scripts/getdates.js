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
const mainnav = document.querySelector('.menu')
const hambutton = document.querySelector('#menu');

// Add a click event listender to the hamburger button and use a callback function that toggles the list element's list of classes.
hambutton.addEventListener('click', () => {
	mainnav.classList.toggle('show');
	hambutton.classList.toggle('show');
});


const temples = [
	{
		Cours: "CSE 110",
	},

    {
		Cours:"WDD 130"
	},

    {
		Cours: "CSE 111"
	},

    {
		Cours: "CSE 210"
	},

    {
		Cours: "WDD 131"
	},
    
    {
		Cours: "WDD 232"
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
    card.querySelector(".course").innerHTML = `<strong></strong> ${temple.Cours}`;
    // Set background color based on course type
    // Ajoute dans le container
    container.appendChild(card);
});

// Filter temples built after 2000
const allButton = document.getElementById("all");
const cseButton = document.getElementById("cse");
const wddButton = document.getElementById("WDD");

// Function to display temples based on a filter
const displayTemples = (filterFn) => {
	// Clear the container
	container.innerHTML = "";

	// Filter and display temples based on the filter function
	const filteredTemples = temples.filter(filterFn);

	// Clone the template for each filtered temple
	filteredTemples.forEach(temple => {
		const card = template.cloneNode(true);
		card.querySelector(".course").innerHTML = `<strong></strong>${temple.Cours}`;
		container.appendChild(card);
	});
};

const updateHeader = (text) => {
	const header = document.querySelector("h2");
	header.textContent = text;
};

// Event listeners for buttons
allButton.addEventListener("click", () => {
	displayTemples(() => true);
}); // Show all temples

cseButton.addEventListener("click", () => {
    displayTemples(temple => {
        return temple.Cours.startsWith("CSE");
    });
});

wddButton.addEventListener("click", () => {
    displayTemples(temple => {
        return temple.Cours.startsWith("WDD");
    });
});
