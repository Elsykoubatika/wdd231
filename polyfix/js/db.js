/* ================================================================
   POLYFIX — Database Simulation (localStorage)
   ================================================================ */

const DB_PREFIX = 'polyfix_';

const DB = {
  // Helper functions
  _get: (key) => JSON.parse(localStorage.getItem(DB_PREFIX + key) || '[]'),
  _set: (key, data) => localStorage.setItem(DB_PREFIX + key, JSON.stringify(data)),

  // Initialization with default data for demo
  init: () => {
    if (!localStorage.getItem(DB_PREFIX + 'initialized')) {
      DB._set('projets', [
        { id: 1, titre: "Villa Brazzaville R+1", client: "Marie K.", statut: "en_cours", budget: 15000000, depenses: 4500000, date: "2026-04-10", avancement: 30 },
        { id: 2, titre: "Rénovation Appartement P-N", client: "Jean M.", statut: "en_attente", budget: 3500000, depenses: 0, date: "2026-04-20", avancement: 0 },
        { id: 3, titre: "Installation Électrique Bureau", client: "Entreprise XYZ", statut: "termine", budget: 1200000, depenses: 950000, date: "2026-03-05", avancement: 100 }
      ]);

      DB._set('devis', [
        { id: 1, client: "Paul Dupont", projet: "Aménagement Jardin", montant: 850000, statut: "en_attente", date: "2026-04-22" }
      ]);

      DB._set('ouvriers', [
        { id: 1, nom: "Marc T.", specialite: "Maçonnerie", tel: "065112233", dispo: "disponible", note: 4.8 },
        { id: 2, nom: "Luc E.", specialite: "Électricité", tel: "065445566", dispo: "occupe", note: 4.9 },
        { id: 3, nom: "Sylvain P.", specialite: "Plomberie", tel: "065778899", dispo: "disponible", note: 4.5 },
        { id: 4, nom: "Antoine J.", specialite: "Jardinage", tel: "065001122", dispo: "conge", note: 4.7 }
      ]);

      DB._set('transactions', [
        { id: 1, date: "2026-04-12", montant: 5000000, type: "entree", description: "Acompte Villa Brazzaville", projet_id: 1 },
        { id: 2, date: "2026-04-15", montant: 1200000, type: "sortie", description: "Achat Ciment & Fer", projet_id: 1 }
      ]);

      DB._set('promotions', [
        { id: 1, titre: "Saison Rénovation", remise: 20, description: "Sur tous les travaux de rénovation intérieure", actif: true }
      ]);

      localStorage.setItem(DB_PREFIX + 'initialized', 'true');
    }
  },

  // Generic CRUD
  getAll: (collection) => DB._get(collection),

  getById: (collection, id) => DB._get(collection).find(item => item.id == id),

  add: (collection, item) => {
    const data = DB._get(collection);
    item.id = Date.now();
    item.created_at = new Date().toISOString();
    data.push(item);
    DB._set(collection, data);
    return item;
  },

  update: (collection, id, updates) => {
    const data = DB._get(collection);
    const index = data.findIndex(item => item.id == id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      DB._set(collection, data);
      return data[index];
    }
    return null;
  },

  remove: (collection, id) => {
    const data = DB._get(collection);
    DB._set(collection, data.filter(item => item.id != id));
  }
};

// Initialize on load
DB.init();
window.DB = DB;
