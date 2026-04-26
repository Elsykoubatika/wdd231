-- ================================================================
-- POLYFIX — Schéma de base de données SQL complet
-- Moteur : MySQL 8.x / MariaDB 10.x
-- Auteur : Architecture POLYFIX Platform
-- Version : 1.0.0
-- ================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+01:00";
SET NAMES utf8mb4;

-- ----------------------------------------------------------------
-- 1. UTILISATEURS & AUTHENTIFICATION
-- ----------------------------------------------------------------

CREATE TABLE utilisateurs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid          CHAR(36) NOT NULL DEFAULT (UUID()),
  email         VARCHAR(180) NOT NULL UNIQUE,
  mot_de_passe  VARCHAR(255) NOT NULL,                   -- bcrypt hash
  role          ENUM('admin','gestionnaire','client','ouvrier') NOT NULL,
  prenom        VARCHAR(80),
  nom           VARCHAR(80),
  telephone     VARCHAR(30),
  photo_url     VARCHAR(500),
  actif         TINYINT(1) NOT NULL DEFAULT 1,
  derniere_connexion DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  token        VARCHAR(255) NOT NULL UNIQUE,             -- JWT ou token opaque
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  expires_at   DATETIME NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_token (token)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 2. CLIENTS (propriétaires / donneurs d'ordres)
-- ----------------------------------------------------------------

CREATE TABLE clients (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED UNIQUE,                     -- NULL si client sans compte
  type_client   ENUM('particulier','entreprise') NOT NULL DEFAULT 'particulier',
  -- Particulier
  civilite      ENUM('M.','Mme','Dr','Ing.'),
  prenom        VARCHAR(80),
  nom           VARCHAR(80) NOT NULL,
  -- Entreprise
  raison_sociale VARCHAR(200),
  ninea          VARCHAR(50),                            -- Numéro fiscal
  -- Contact
  email         VARCHAR(180),
  telephone     VARCHAR(30) NOT NULL,
  telephone2    VARCHAR(30),
  adresse       TEXT,
  ville         VARCHAR(80),
  quartier      VARCHAR(100),
  -- Méta
  notes         TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_nom (nom),
  INDEX idx_telephone (telephone)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 3. OUVRIERS / RESSOURCES HUMAINES
-- ----------------------------------------------------------------

CREATE TABLE ouvriers (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED UNIQUE,
  matricule       VARCHAR(20) UNIQUE,
  prenom          VARCHAR(80) NOT NULL,
  nom             VARCHAR(80) NOT NULL,
  date_naissance  DATE,
  sexe            ENUM('M','F'),
  telephone       VARCHAR(30) NOT NULL,
  email           VARCHAR(180),
  adresse         TEXT,
  ville           VARCHAR(80),
  -- Professionnel
  poste           VARCHAR(100) NOT NULL,                 -- maçon, électricien…
  specialites     JSON,                                  -- ["maçonnerie","toiture"]
  niveau_qualification ENUM('apprenti','ouvrier','technicien','chef_equipe','conducteur_travaux'),
  annees_experience TINYINT UNSIGNED DEFAULT 0,
  taux_journalier DECIMAL(10,2),                        -- en FCFA
  -- Documents
  cv_url          VARCHAR(500),
  piece_identite_url VARCHAR(500),
  -- Disponibilité
  statut          ENUM('disponible','en_mission','conge','inactif') DEFAULT 'disponible',
  date_embauche   DATE,
  -- Évaluation
  note_moyenne    DECIMAL(3,2) DEFAULT 0.00,
  total_evaluations INT UNSIGNED DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_statut (statut),
  INDEX idx_poste (poste)
) ENGINE=InnoDB;

CREATE TABLE evaluations_ouvrier (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ouvrier_id  INT UNSIGNED NOT NULL,
  projet_id   INT UNSIGNED,
  evaluateur_id INT UNSIGNED,
  note        TINYINT UNSIGNED NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ouvrier_id) REFERENCES ouvriers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 4. CATÉGORIES DE SERVICES
-- ----------------------------------------------------------------

CREATE TABLE categories_service (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(30) UNIQUE NOT NULL,               -- 'CONSTRUCTION','ELECTRICITE'…
  libelle     VARCHAR(100) NOT NULL,
  description TEXT,
  icone       VARCHAR(50),
  actif       TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO categories_service (code, libelle, description) VALUES
  ('CONSTRUCTION',  'Construction',             'Bâtiments neufs, gros œuvre'),
  ('RENOVATION',    'Rénovation',               'Réfection, réhabilitation'),
  ('ELECTRICITE',   'Électricité',              'Installation et dépannage électrique'),
  ('PLOMBERIE',     'Plomberie & Sanitaire',    'Réseaux eau, assainissement'),
  ('MENUISERIE',    'Menuiserie',               'Bois, métallerie, ouvertures'),
  ('PEINTURE',      'Peinture & Revêtements',   'Enduits, carrelage, parquet'),
  ('CLIMATISATION', 'Climatisation',            'Installation, entretien clim/ventilation'),
  ('TOITURE',       'Toiture & Étanchéité',     'Couverture, isolation, terrasse');

-- ----------------------------------------------------------------
-- 5. CATALOGUE ARTICLES / POSTES DE DEVIS
-- ----------------------------------------------------------------

CREATE TABLE articles (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categorie_id    INT UNSIGNED,
  reference       VARCHAR(50) UNIQUE,
  designation     VARCHAR(200) NOT NULL,
  unite           VARCHAR(20) NOT NULL DEFAULT 'U',   -- U, m², ml, h, forfait
  prix_unitaire   DECIMAL(12,2) NOT NULL DEFAULT 0,
  description     TEXT,
  actif           TINYINT(1) DEFAULT 1,
  FOREIGN KEY (categorie_id) REFERENCES categories_service(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 6. DEVIS
-- ----------------------------------------------------------------

CREATE TABLE devis (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero          VARCHAR(20) NOT NULL UNIQUE,           -- DEV-2025-0001
  client_id       INT UNSIGNED NOT NULL,
  categorie_id    INT UNSIGNED,
  createur_id     INT UNSIGNED,                          -- gestionnaire
  -- En-tête
  titre           VARCHAR(200) NOT NULL,
  description     TEXT,
  lieu_travaux    VARCHAR(200),
  ville           VARCHAR(80),
  -- Statut
  statut          ENUM('brouillon','envoye','en_attente','approuve','rejete','expire') DEFAULT 'brouillon',
  -- Dates
  date_emission   DATE NOT NULL DEFAULT (CURDATE()),
  date_validite   DATE,
  date_envoi      DATETIME,
  date_approbation DATETIME,
  -- Montants
  montant_ht      DECIMAL(14,2) NOT NULL DEFAULT 0,
  taux_tva        DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  montant_tva     DECIMAL(14,2) NOT NULL DEFAULT 0,
  montant_ttc     DECIMAL(14,2) NOT NULL DEFAULT 0,
  montant_remise  DECIMAL(14,2) DEFAULT 0,
  -- IA
  analyse_ia      JSON,                                  -- analyse générée par l'IA
  score_ia        TINYINT UNSIGNED,                     -- score de faisabilité (0-100)
  -- Notes
  notes_internes  TEXT,
  conditions      TEXT,
  -- Liens
  pdf_url         VARCHAR(500),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (categorie_id) REFERENCES categories_service(id),
  FOREIGN KEY (createur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_statut (statut),
  INDEX idx_client (client_id),
  INDEX idx_numero (numero)
) ENGINE=InnoDB;

CREATE TABLE devis_lignes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  devis_id        INT UNSIGNED NOT NULL,
  article_id      INT UNSIGNED,
  numero_ligne    TINYINT UNSIGNED NOT NULL,
  designation     VARCHAR(200) NOT NULL,
  description     TEXT,
  unite           VARCHAR(20) NOT NULL DEFAULT 'U',
  quantite        DECIMAL(10,3) NOT NULL DEFAULT 1,
  prix_unitaire   DECIMAL(12,2) NOT NULL,
  remise_pct      DECIMAL(5,2) DEFAULT 0,
  montant_ht      DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (devis_id) REFERENCES devis(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE devis_etude (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  devis_id        INT UNSIGNED NOT NULL UNIQUE,
  surface_m2      DECIMAL(10,2),
  nombre_niveaux  TINYINT UNSIGNED,
  type_sol        VARCHAR(100),
  contraintes     TEXT,
  materiaux_choisis JSON,
  duree_estimee_jours INT UNSIGNED,
  nb_ouvriers_estime TINYINT UNSIGNED,
  risques_identifies TEXT,
  recommandations_ia TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (devis_id) REFERENCES devis(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 7. PROJETS
-- ----------------------------------------------------------------

CREATE TABLE projets (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(20) NOT NULL UNIQUE,           -- PRJ-2025-0001
  devis_id        INT UNSIGNED,
  client_id       INT UNSIGNED NOT NULL,
  responsable_id  INT UNSIGNED,                          -- chef de projet
  -- Informations
  titre           VARCHAR(200) NOT NULL,
  description     TEXT,
  categorie_id    INT UNSIGNED,
  lieu_chantier   TEXT,
  ville           VARCHAR(80),
  -- Statut
  statut          ENUM('en_attente','actif','suspendu','termine','annule') DEFAULT 'en_attente',
  -- Dates
  date_debut_prevue DATE,
  date_fin_prevue   DATE,
  date_debut_reelle DATE,
  date_fin_reelle   DATE,
  -- Finances
  budget_initial    DECIMAL(14,2) NOT NULL DEFAULT 0,
  budget_revise     DECIMAL(14,2),
  depenses_reelles  DECIMAL(14,2) NOT NULL DEFAULT 0,
  montant_facture   DECIMAL(14,2) NOT NULL DEFAULT 0,
  montant_encaisse  DECIMAL(14,2) NOT NULL DEFAULT 0,
  -- Avancement
  pourcentage_avancement TINYINT UNSIGNED DEFAULT 0,    -- 0-100
  nb_ouvriers_chantier INT UNSIGNED DEFAULT 0,
  -- Évaluation finale
  note_qualite    TINYINT UNSIGNED,                     -- 1-5
  note_rentabilite TINYINT UNSIGNED,                   -- 1-5
  rapport_final_url VARCHAR(500),
  notes_internes  TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (devis_id) REFERENCES devis(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (responsable_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  FOREIGN KEY (categorie_id) REFERENCES categories_service(id),
  INDEX idx_statut (statut),
  INDEX idx_client (client_id)
) ENGINE=InnoDB;

CREATE TABLE projet_ouvriers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  projet_id   INT UNSIGNED NOT NULL,
  ouvrier_id  INT UNSIGNED NOT NULL,
  role_projet VARCHAR(100),
  date_debut  DATE,
  date_fin    DATE,
  taux_applique DECIMAL(10,2),
  actif       TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_projet_ouvrier (projet_id, ouvrier_id),
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
  FOREIGN KEY (ouvrier_id) REFERENCES ouvriers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 8. TÂCHES JOURNALIÈRES
-- ----------------------------------------------------------------

CREATE TABLE taches (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  projet_id       INT UNSIGNED NOT NULL,
  assignee_id     INT UNSIGNED,                          -- ouvrier
  titre           VARCHAR(200) NOT NULL,
  description     TEXT,
  statut          ENUM('a_faire','en_cours','terminee','bloquee') DEFAULT 'a_faire',
  priorite        ENUM('basse','normale','haute','urgente') DEFAULT 'normale',
  date_echeance   DATE,
  date_completion DATETIME,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES ouvriers(id) ON DELETE SET NULL,
  INDEX idx_projet (projet_id),
  INDEX idx_statut (statut)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 9. RAPPORTS JOURNALIERS / PHOTOS DE CHANTIER
-- ----------------------------------------------------------------

CREATE TABLE rapports_journaliers (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  projet_id       INT UNSIGNED NOT NULL,
  redacteur_id    INT UNSIGNED,
  date_rapport    DATE NOT NULL,
  nb_ouvriers     TINYINT UNSIGNED DEFAULT 0,
  meteo           VARCHAR(50),
  avancement_du_jour TEXT,
  problemes       TEXT,
  materiaux_utilises TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rapport_date (projet_id, date_rapport),
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE photos_chantier (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  projet_id       INT UNSIGNED NOT NULL,
  rapport_id      INT UNSIGNED,
  url             VARCHAR(500) NOT NULL,
  legende         VARCHAR(200),
  date_prise      DATE,
  uploaded_by     INT UNSIGNED,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
  FOREIGN KEY (rapport_id) REFERENCES rapports_journaliers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 10. FINANCES & TRANSACTIONS
-- ----------------------------------------------------------------

CREATE TABLE transactions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type_transaction ENUM('recette','depense') NOT NULL,
  categorie       VARCHAR(100),
  libelle         VARCHAR(200) NOT NULL,
  montant         DECIMAL(14,2) NOT NULL,
  date_transaction DATE NOT NULL,
  projet_id       INT UNSIGNED,                          -- NULL = transaction globale
  mode_paiement   ENUM('especes','virement','cheque','mobile_money','autre'),
  reference       VARCHAR(100),
  justificatif_url VARCHAR(500),
  enregistre_par  INT UNSIGNED,
  notes           TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE SET NULL,
  FOREIGN KEY (enregistre_par) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_type (type_transaction),
  INDEX idx_date (date_transaction),
  INDEX idx_projet (projet_id)
) ENGINE=InnoDB;

CREATE TABLE factures (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero          VARCHAR(20) NOT NULL UNIQUE,           -- FAC-2025-0001
  projet_id       INT UNSIGNED NOT NULL,
  client_id       INT UNSIGNED NOT NULL,
  montant_ht      DECIMAL(14,2) NOT NULL,
  montant_ttc     DECIMAL(14,2) NOT NULL,
  statut_paiement ENUM('impayee','partiellement_payee','payee') DEFAULT 'impayee',
  date_emission   DATE NOT NULL,
  date_echeance   DATE,
  date_paiement   DATE,
  pdf_url         VARCHAR(500),
  FOREIGN KEY (projet_id) REFERENCES projets(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 11. MESSAGES & NOTIFICATIONS
-- ----------------------------------------------------------------

CREATE TABLE messages (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expediteur_id   INT UNSIGNED,
  destinataire_id INT UNSIGNED,
  projet_id       INT UNSIGNED,
  sujet           VARCHAR(200),
  contenu         TEXT NOT NULL,
  lu              TINYINT(1) DEFAULT 0,
  type_message    ENUM('direct','notification','systeme') DEFAULT 'direct',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expediteur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  FOREIGN KEY (destinataire_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE SET NULL,
  INDEX idx_destinataire (destinataire_id),
  INDEX idx_lu (lu)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  type        VARCHAR(50) NOT NULL,                      -- 'devis_approuve','tache_assigned'…
  titre       VARCHAR(200) NOT NULL,
  message     TEXT,
  lien        VARCHAR(500),
  lu          TINYINT(1) DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_user_lu (user_id, lu)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 12. PROMOTIONS & MARKETING
-- ----------------------------------------------------------------

CREATE TABLE promotions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre           VARCHAR(200) NOT NULL,
  description     TEXT,
  type_promo      ENUM('pourcentage','montant_fixe','service_offert') NOT NULL,
  valeur          DECIMAL(10,2) NOT NULL,
  categorie_id    INT UNSIGNED,
  code_promo      VARCHAR(30) UNIQUE,
  date_debut      DATE NOT NULL,
  date_fin        DATE NOT NULL,
  actif           TINYINT(1) DEFAULT 1,
  usage_max       INT UNSIGNED,
  usage_actuel    INT UNSIGNED DEFAULT 0,
  conditions      TEXT,
  image_url       VARCHAR(500),
  visible_public  TINYINT(1) DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categorie_id) REFERENCES categories_service(id) ON DELETE SET NULL,
  INDEX idx_actif (actif),
  INDEX idx_dates (date_debut, date_fin)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 13. ANALYTICS / VISITEURS
-- ----------------------------------------------------------------

CREATE TABLE visites (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  page        VARCHAR(200),
  ip_hash     VARCHAR(64),
  user_agent  VARCHAR(300),
  referrer    VARCHAR(500),
  date_visite DATE NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date_visite)
) ENGINE=InnoDB;

CREATE TABLE soumissions_formulaire (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type_form   ENUM('devis','construction','contact') NOT NULL,
  donnees     JSON NOT NULL,
  ip          VARCHAR(45),
  traite      TINYINT(1) DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_traite (traite)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- 14. VUES UTILES
-- ----------------------------------------------------------------

CREATE VIEW v_projets_actifs AS
SELECT
  p.id, p.code, p.titre, p.statut,
  p.pourcentage_avancement,
  p.budget_initial, p.depenses_reelles,
  p.date_fin_prevue,
  CONCAT(c.prenom, ' ', c.nom) AS client_nom,
  c.telephone AS client_tel,
  COUNT(po.ouvrier_id) AS nb_ouvriers,
  DATEDIFF(p.date_fin_prevue, CURDATE()) AS jours_restants
FROM projets p
JOIN clients c ON c.id = p.client_id
LEFT JOIN projet_ouvriers po ON po.projet_id = p.id AND po.actif = 1
WHERE p.statut IN ('actif','en_attente')
GROUP BY p.id;

CREATE VIEW v_kpi_financier AS
SELECT
  COALESCE(SUM(CASE WHEN type_transaction='recette' THEN montant ELSE 0 END),0) AS total_recettes,
  COALESCE(SUM(CASE WHEN type_transaction='depense' THEN montant ELSE 0 END),0) AS total_depenses,
  COALESCE(SUM(CASE WHEN type_transaction='recette' THEN montant ELSE 0 END),0)
  - COALESCE(SUM(CASE WHEN type_transaction='depense' THEN montant ELSE 0 END),0) AS marge_brute,
  MONTH(date_transaction) AS mois,
  YEAR(date_transaction) AS annee
FROM transactions
GROUP BY YEAR(date_transaction), MONTH(date_transaction);

-- ----------------------------------------------------------------
-- 15. INDEX SUPPLÉMENTAIRES DE PERFORMANCE
-- ----------------------------------------------------------------

CREATE INDEX idx_devis_client_statut ON devis(client_id, statut);
CREATE INDEX idx_projets_statut_date ON projets(statut, date_fin_prevue);
CREATE INDEX idx_transactions_date_type ON transactions(date_transaction, type_transaction);
CREATE INDEX idx_taches_projet_statut ON taches(projet_id, statut);

-- ----------------------------------------------------------------
-- 16. DONNÉES INITIALES (seed)
-- ----------------------------------------------------------------

INSERT INTO utilisateurs (email, mot_de_passe, role, prenom, nom, telephone) VALUES
  ('admin@polyfix.cg',    '$2b$12$hashed_password_here', 'admin',        'Admin',   'POLYFIX',   '+242065000000'),
  ('gestionnaire@polyfix.cg','$2b$12$hashed_password_here','gestionnaire','Jean',    'Mbemba',    '+242066000001'),
  ('client@demo.cg',      '$2b$12$hashed_password_here', 'client',       'Marie',   'Nkounkou',  '+242067000002'),
  ('ouvrier@demo.cg',     '$2b$12$hashed_password_here', 'ouvrier',      'Pierre',  'Moukanda',  '+242068000003');
