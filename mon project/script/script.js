// Charger le fichier JSON et afficher les questions
async function loadQuestions() {
    try {
        // Charger les données JSON depuis le backend
        const response = await fetch('/questions.json'); // Chemin vers le fichier JSON
        const questions = await response.json();

        // Référence au formulaire HTML
        const form = document.getElementById("questionnaire");

        // Ajouter les questions
        for (const [section, items] of Object.entries(questions)) {
            // Créer un titre pour chaque section
            const sectionTitle = document.createElement("h2");
            sectionTitle.textContent = section;
            form.appendChild(sectionTitle);

            // Ajouter chaque question et ses choix
            items.forEach((item, idx) => {
                const question = document.createElement("p");
                question.textContent = `${idx + 1}. ${item.question}`;
                form.appendChild(question);

                for (const [choice, value] of Object.entries(item.choices)) {
                    const label = document.createElement("label");
                    const radio = document.createElement("input");
                    radio.type = "radio";
                    radio.name = `${section}_${idx}`; // Nom unique pour chaque question
                    radio.value = value;
                    label.appendChild(radio);
                    label.appendChild(document.createTextNode(choice));
                    form.appendChild(label);
                    form.appendChild(document.createElement("br"));
                }
            });
        }

        // Ajouter un bouton de soumission
        const submitButton = document.createElement("button");
        submitButton.type = "button";
        submitButton.textContent = "Envoyer";
        submitButton.addEventListener("click", submitAnswers); // Gestion de la soumission
        form.appendChild(submitButton);
    } catch (error) {
        console.error("Erreur lors du chargement des questions :", error);
    }
}

// Soumettre les réponses au backend
async function submitAnswers() {
    const form = document.getElementById("questionnaire");
    const formData = new FormData(form);
    const answers = {};

    // Récupérer toutes les réponses
    formData.forEach((value, key) => {
        answers[key] = value;
    });

    // Envoyer les réponses au backend
    const response = await fetch('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers)
    });

    const result = await response.json();
    if (result.success) {
        alert(`Votre score total est : ${result.total_score}`);
        window.location.href = result.redirect
    } else {
        alert(result.message);
    }
}

// Charger les questions une fois le DOM prêt
document.addEventListener("DOMContentLoaded", loadQuestions);

    let button = document.getElementById("submit");
    button.addEventListener('click', function() {
        console.log('button');
        let form = document.getElementById('questionnaire');
        let input = document.createElement('input');
        input.type = 'text';
        input.name = 'question';
        form.appendChild(input);
    });