from flask import Flask, request, jsonify, render_template, redirect, url_for

app = Flask(__name__)

# Exemple de questions
questions = {
    "Section 1: Capacité à Convaincre": [
        {
            "question": "Si un client hésite entre deux produits similaires, que faites-vous ?",
            "choices": {
                "Je lui présente les avantages spécifiques de chaque produit": 3,
                "Je lui propose le produit le plus cher pour augmenter mes ventes": 1,
                "Je lui conseille de réfléchir avant de prendre une décision": 0,
                "Je laisse le client décider seul": 0
            }
        }
    ],
    "Section 2: Relation Client": [
        {
            "question": "Comment gérez-vous un client mécontent ?",
            "choices": {
                "Je reste calme et propose une solution adaptée": 3,
                "Je transfère la demande au service client": 1,
                "Je lui dis que ce n’est pas de ma responsabilité": 0,
                "J’évite la conversation pour ne pas créer de conflit": 0
            }
        }
    ]
}
# Route principale pour afficher le formulaire
@app.route('/')
def index():
    return render_template('mon project/index.html')

# Route pour servir les questions JSON
@app.route('/questions.json')
def get_questions():
    return jsonify(questions)

# Route pour traiter les réponses du formulaire
@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json  # Récupérer les réponses envoyées par le frontend
    total_score = 0
    unanswered = []

    # Parcourir les réponses pour calculer le score
    for section, items in questions.items():
        for idx, item in enumerate(items):
            question_key = f"{section}_{idx}"
            answer = data.get(question_key) # Récupérer la réponse choisie
            if answer is not None:
                total_score += int(answer)  # Ajouter le score de la réponse choisie
            else:
                unanswered.append(question_key)  # Ajouter à la liste des questions non répondues

    if unanswered:
        return jsonify({
            "success": False,
            "message": f"Veuillez répondre à toutes les questions : {', '.join(unanswered)}"
        })

#Rediriger vers la page des résultats
    return jsonify({
        "success": True,
        "redirect": url_for('results', score=total_score)
    })

@app.route('/results')
def results():
    score = int(request.args.get('score', 0))
    
    # Déterminer le niveau de compétence en fonction du score
    if score >= 6:
        level = "avancer"
    elif score <= 2:
        level = "débutant"
    else:
        level = "intermédiaire"
        
    return render_template('results.html', score=score, level=level)


if __name__ == '__main__':
    app.run(debug=True)