-- Schéma SQL pour migration future de POLYFIX
-- Pour le moment, l'application fonctionne avec le localStorage (db.js)

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'client', 'ouvrier') DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    nom VARCHAR(255) NOT NULL,
    telephone VARCHAR(50),
    adresse TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ouvriers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    nom VARCHAR(255) NOT NULL,
    specialite VARCHAR(100) NOT NULL,
    telephone VARCHAR(50),
    disponibilite ENUM('disponible', 'occupe', 'conge') DEFAULT 'disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS projets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    statut ENUM('en_attente', 'en_cours', 'termine', 'annule') DEFAULT 'en_attente',
    budget_initial DECIMAL(10, 2) NOT NULL,
    date_debut DATE NULL,
    date_fin_prevue DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS devis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    projet_id INT NULL,
    titre VARCHAR(255) NOT NULL,
    montant_total DECIMAL(10, 2) NOT NULL,
    statut ENUM('en_attente', 'approuve', 'refuse') DEFAULT 'en_attente',
    contenu_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS taches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projet_id INT NOT NULL,
    ouvrier_id INT NULL,
    titre VARCHAR(255) NOT NULL,
    statut ENUM('a_faire', 'en_cours', 'termine') DEFAULT 'a_faire',
    date_echeance DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (ouvrier_id) REFERENCES ouvriers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projet_id INT NULL,
    montant DECIMAL(10, 2) NOT NULL,
    type ENUM('entree', 'sortie') NOT NULL,
    description VARCHAR(255),
    date_transaction DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    pourcentage_remise INT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
