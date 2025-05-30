##from flask import Flask, request, jsonify, render_template, redirect, url_for
#import qrcode
#import io
#import base64
#import datetime
#import os
#import csv
#
#app = Flask(__name__)
#app.config['UPLOAD_FOLDER'] = 'static/uploads'
#os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
#
#def enregistrer_donnees(nom, telephone, url, image_path):
#    with open("urls_log.csv", "a", encoding='utf-8') as f:
#        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#        f.write(f"{timestamp},{nom},{telephone},{url},{image_path}\n")
#
#@app.route('/')
#def index():
#    return render_template('index.html')
#
#@app.route('/formulaire')
#def formulaire():
#    return render_template('formulaire.html')
#
#@app.route('/submit_form', methods=['POST'])
#
#
#@app.route('/admin')
#def admin():
#    donnees = []
#    if os.path.exists("urls_log.csv"):
#        with open("urls_log.csv", "r", encoding='utf-8') as f:
#            reader = csv.reader(f)
#            for row in reader:
#                donnees.append(row)
#    return render_template("admin.html", donnees=donnees)
#
#def submit_form():
#    nom = request.form.get('nom')
#    telephone = request.form.get('telephone')
#    url = request.form.get('url')
#    image = request.files.get('image')
#
#    if not url or not nom or not telephone:
#        return "Veuillez remplir tous les champs", 400
#
#    image_path = ""
#    if image:
#        image_filename = f"{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{image.filename}"
#        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
#        image.save(image_path)
#
#    enregistrer_donnees(nom, telephone, url, image_path)
#
#    # Générer le QR Code avec les infos
#    contenu_qr = f"Nom: {nom}\nTéléphone: {telephone}\nURL: {url}"
#    img = qrcode.make(contenu_qr)
#    buffer = io.BytesIO()
#    img.save(buffer, format="PNG")
#    img_b64 = base64.b64encode(buffer.getvalue()).decode()
#
#    return render_template('formulaire.html', qr_code=f"data:image/png;base64,{img_b64}", nom=nom)
#
#if __name__ == '__main__':
#    app.run(debug=True)


# ── IMPORTS ───────────────────────────────────────────────────────────────────
from flask import Flask, render_template, request, url_for
from flask_sqlalchemy import SQLAlchemy
import qrcode
import io, base64, os, datetime
from datetime import datetime, timezone

# ── INITIALISATION DE L’APP ───────────────────────────────────────────────────
app = Flask(__name__)
# On pointe vers une base SQLite locale (fichier database.db)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Dossier pour stocker les uploads (images & QR codes)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ── INITIALISATION DE SQLALCHEMY ──────────────────────────────────────────────
db = SQLAlchemy(app)

# ── MODÈLE DE DONNÉES ─────────────────────────────────────────────────────────
class UserData(db.Model):
    """
    Table pour stocker :
    - id (clé primaire)
    - nom
    - téléphone
    - url
    - chemin de l’image uploadée
    - date de création
    """
    id            = db.Column(db.Integer, primary_key=True)
    nom           = db.Column(db.String(100), nullable=False)
    telephone     = db.Column(db.String(50),  nullable=False)
    url           = db.Column(db.String(255), nullable=False)
    image_path    = db.Column(db.String(255))
    date_creation = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

# Création des tables si pas déjà en base
with app.app_context():
    db.create_all()

# ── ROUTES ────────────────────────────────────────────────────────────────────
@app.route('/formulaire')
def formulaire():
    """Affiche la page du formulaire."""
    return render_template('index.html')


@app.route('/submit_form', methods=['POST'])
def submit_form():
    """Traite la soumission du formulaire, enregistre en DB, génère & renvoie le QR code."""
    # 🔍 Récup des champs
    nom       = request.form.get('nom')
    telephone = request.form.get('telephone')
    url       = request.form.get('url')
    image     = request.files.get('image')

    # ⚠️ Validation minimaliste
    if not (nom and telephone and url):
        return "Tous les champs obligatoires doivent être remplis !", 400

    # 📸 Gestion de l’image uploadée (optionnel)
    image_path = None
    if image:
        timestamp       = datetime.now().strftime('%Y%m%d%H%M%S')
        filename        = f"{timestamp}_{image.filename}"
        image_path      = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image.save(image_path)

    # 💾 Enregistrement en base
    entry = UserData(
        nom        = nom,
        telephone  = telephone,
        url        = url,
        image_path = image_path
    )
    db.session.add(entry)
    db.session.commit()  # 👍 maintenant, entry.id est dispo

    # 🧬 Création du contenu du QR code
    qr_content = f"Nom : {nom}\nTéléphone : {telephone}\nURL : {url}"

    # 📦 Génération du QR code
    img = qrcode.make(qr_content)

    # 🖼️ Encodage Base64 pour l’affichage en inline
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_b64 = base64.b64encode(buffer.getvalue()).decode()

    # 💾 Sauvegarde physique du QR code
    qr_filename = f"qr_{entry.id}.png"
    qr_path     = os.path.join(app.config['UPLOAD_FOLDER'], qr_filename)
    img.save(qr_path)

    # 🎉 On renvoie la même page avec le QR code + bouton download
    return render_template(
        'index.html',
        qr_code       = f"data:image/png;base64,{img_b64}",
        qr_code_file  = qr_path.replace('static/', ''),  # pour url_for
        nom_utilisateur = nom
    )


@app.route('/admin')
def admin():
    """Page admin qui liste toutes les entrées, triées par date décroissante."""
    all_entries = UserData.query.order_by(UserData.date_creation.desc()).all()
    return render_template('admin.html', donnees=all_entries)


# ── LANCEMENT DU SERVEUR ──────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True)
