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
        subject: 'CSE',
        number: 110,
        title: 'Introduction to Programming',
        credits: 2,
        certificate: 'Web and Computer Programming',
        description: 'This course will introduce students to programming. It will introduce the building blocks of programming languages (variables, decisions, calculations, loops, array, and input/output) and use them to solve problems.',
        technology: [
            'Python'
        ],
        completed: true
    },
    {
        subject: 'WDD',
        number: 130,
        title: 'Web Fundamentals',
        credits: 2,
        certificate: 'Web and Computer Programming',
        description: 'This course introduces students to the World Wide Web and to careers in web site design and development. The course is hands on with students actually participating in simple web designs and programming. It is anticipated that students who complete this course will understand the fields of web design and development and will have a good idea if they want to pursue this degree as a major.',
        technology: [
            'HTML',
            'CSS'
        ],
        completed: true
    },
	{
        subject: 'ITM',
        number: 111,
        title: 'Introduction to Databases',
        credits: 3,
        certificate: 'Web and Computer Programming',
        description: 'Each student will develop fundamental knowledge and skills in using, designing, and building relational databases by doing the following: Explain how data and databases are used in business systems. Demonstrate design and creation of relational databases. Use a DBMS (Database Management System) and CASE (Computer-Aided Software Engineering) tool. Construct Create, Insert, Update, and Delete statements. Query a database using single and multiple tables, including built-in aggregate functions and WHERE clause filtering.',
        technology: [
            'SQL',
            'MySQL WorkBench '
        ],
        completed: true
    },
    {
        subject: 'CSE',
        number: 111,
        title: 'Programming with Functions',
        credits: 2,
        certificate: 'Web and Computer Programming',
        description: 'CSE 111 students become more organized, efficient, and powerful computer programmers by learning to research and call functions written by others; to write, call , debug, and test their own functions; and to handle errors within functions. CSE 111 students write programs with functions to solve problems in many disciplines, including business, physical science, human performance, and humanities.',
        technology: [
            'Python'
        ],
        completed: true
    },
    {
        subject: 'CSE',
        number: 210,
        title: 'Programming with Classes',
        credits: 2,
        certificate: 'Web and Computer Programming',
        description: 'This course will introduce the notion of classes and objects. It will present encapsulation at a conceptual level. It will also work with inheritance and polymorphism.',
        technology: [
            'C#'
        ],
        completed: true
    },
    {
        subject: 'WDD',
        number: 131,
        title: 'Dynamic Web Fundamentals',
        credits: 2,
        certificate: 'Web and Computer Programming',
        description: 'This course builds on prior experience in Web Fundamentals and programming. Students will learn to create dynamic websites that use JavaScript to respond to events, update content, and create responsive user experiences.',
        technology: [
            'HTML',
            'CSS',
            'JavaScript'
        ],
        completed: true
    },
    {
        subject: 'WDD',
        number: 231,
        title: 'Frontend Web Development I',
        credits: 2,
        certificate: 'Web and Computer Programming',
        description: 'This course builds on prior experience with Dynamic Web Fundamentals and programming. Students will focus on user experience, accessibility, compliance, performance optimization, and basic API usage.',
        technology: [
            'HTML',
            'CSS',
            'JavaScript'
        ],
        completed: false
    }
];


const container = document.getElementById("container");

// Récupère et supprime le modèle initial (il sera cloné)
const template = document.querySelector(".temple-card");
template.remove();

temples.forEach(temple => {
  // Clone le modèle
    const card = template.cloneNode(true);
    card.querySelector(".course").innerHTML = `<strong></strong> ${temple.subject} ${temple.number}`;
	
    container.appendChild(card);
});

const content = document.getElementById("contenter");
const cours  = document.querySelector(".resource-card");
cours.remove();

temples.forEach(temple => {
  // Clone le modèle
    const card = cours.cloneNode(true);
    card.querySelector(".title").innerHTML = `<strong></strong> ${temple.subject} ${temple.number} - ${temple.title}`;

	//card.querySelector(".credits").innerHTML = `<strong>Credits:</strong> ${temple.credits}`;
    content.appendChild(card);
});


// Filter temples built after 2000
const allButton = document.getElementById("all");
const cseButton = document.getElementById("cse");
const wddButton = document.getElementById("WDD");
const itmButton = document.getElementById("ITM")

// Function to display temples based on a filter
const displayTemples = (filterFn) => {
	// Clear the container
	container.innerHTML = "";

	// Filter and display temples based on the filter function
	const filteredTemples = temples.filter(filterFn);

	// Clone the template for each filtered temple
	filteredTemples.forEach(temple => {
		const card = template.cloneNode(true);
		card.querySelector(".course").innerHTML = `<strong></strong>${temple.subject} ${temple.number}`;
		const courseText = card.querySelector(".course")?.textContent || "";
		const found = temples.find(temple => courseText.includes(`${temple.subject} ${temple.number}`));
		if (found && found.completed) {
			card.style.backgroundColor = "#A7A89E";
			card.style.color = "black";
			card.style.border = "3px solid #0000003c";
			card.style.borderRadius = "8px";
		}
		else {
			card.style.backgroundColor = "#506A4D";
			card.style.color = "#000";
			card.style.border = "1px solid #000";
			card.style.borderRadius = "8px";
		}
		// Clone the template for each filtered temple
		container.appendChild(card);
	});
};

const buttons = document.querySelectorAll("#course1");
// Change background to green for completed courses
document.querySelectorAll(".temple-card").forEach(card => {
	const courseText = card.querySelector(".course")?.textContent || "";
	const found = temples.find(temple => courseText.includes(`${temple.subject} ${temple.number}`));
		if (found && found.completed) {
			card.style.backgroundColor = "#A7A89E";
			card.style.color = "black";
			card.style.border = "3px solid #0000003c";
			card.style.borderRadius = "8px";
		}
		else {
			card.style.backgroundColor = "#506A4D";
			card.style.color = "#000";
			card.style.border = "1px solid #000";
			card.style.borderRadius = "8px";
		}
});

// Event listeners for buttons
allButton.addEventListener("click", () => {
	displayTemples(() => true);
}); // Show all temples

cseButton.addEventListener("click", () => {
	displayTemples(temple => {
		return temple.subject.startsWith("CSE");
	});
});

wddButton.addEventListener("click", () => {
	displayTemples(temple => {		
	return temple.subject.startsWith("WDD");
	});
});

itmButton.addEventListener("click", () => {
	displayTemples(temple => {		
	return temple.subject.startsWith("ITM");
	});
});

document.addEventListener("DOMContentLoaded", () => {
    const dialog = document.getElementById("conteneur");
    const closeBtn = document.getElementById("close");

    // Sélectionne tous les boutons de cours
    const courseButtons = document.querySelectorAll(".course");

    courseButtons.forEach((btn, index) => {
        btn.addEventListener("click", () => {
            const temple = temples[index];
            const card = dialog.querySelector("h3");
            const listItems = dialog.querySelectorAll("li");
            card.innerHTML = `Course Name: ${temple.subject} ${temple.number}`;
            listItems[0].innerHTML = `<strong>Title:</strong> ${temple.title}`;
            listItems[1].innerHTML = `<strong>Technology:</strong> ${temple.technology.join(', ')}`;
            listItems[2].innerHTML = `<strong>Description:</strong> ${temple.description}`;
            listItems[3].innerHTML = `<strong>Credits:</strong> ${temple.credits}`;

            dialog.showModal();
        });
    });

    closeBtn.addEventListener("click", () => {
        dialog.close();
    });
});
