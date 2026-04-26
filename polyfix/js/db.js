/* ================================================================
   POLYFIX — Base de données simulée (localStorage) + Utilitaires
   En production : remplacer par appels API REST vers MySQL
   ================================================================ */

'use strict';

/* ── DONNÉES INITIALES ────────────────────────────────────────── */
const SEED = {
  clients: [
    { id:1, type:'particulier', prenom:'Marie-Claire', nom:'Nkounkou', telephone:'+242 06 523 4567', email:'marie@example.cg', ville:'Brazzaville', quartier:'Poto-Poto', notes:'Client fidèle depuis 2023' },
    { id:2, type:'entreprise',  raison_sociale:'SONAR SARL', nom:'Sonar',  telephone:'+242 05 678 9000', email:'sonar@sonar.cg', ville:'Pointe-Noire', quartier:'Centre-ville', notes:'Gros client B2B' },
    { id:3, type:'particulier', prenom:'Jean-Baptiste', nom:'Moukanda',   telephone:'+242 06 789 1234', email:'jb@gmail.cg', ville:'Brazzaville', quartier:'Bacongo', notes:'' },
  ],
  ouvriers: [
    { id:1, prenom:'Pierre',  nom:'Koulousso', telephone:'+242 06 111 2222', poste:'Maçon', niveau:'chef_equipe', specialites:['maçonnerie','toiture'], statut:'disponible', taux_journalier:25000, annees_experience:8, note_moyenne:4.7 },
    { id:2, prenom:'Arsène',  nom:'Bemba',     telephone:'+242 06 333 4444', poste:'Électricien', niveau:'technicien', specialites:['électricité','groupe_electrogene'], statut:'en_mission', taux_journalier:22000, annees_experience:5, note_moyenne:4.5 },
    { id:3, prenom:'Claudine',nom:'Loemba',    telephone:'+242 05 555 6666', poste:'Peintre',     niveau:'ouvrier',      specialites:['peinture','enduit'], statut:'disponible', taux_journalier:18000, annees_experience:3, note_moyenne:4.2 },
    { id:4, prenom:'Franck',  nom:'Nguie',     telephone:'+242 06 777 8888', poste:'Plombier',    niveau:'technicien',   specialites:['plomberie','sanitaire'], statut:'disponible', taux_journalier:20000, annees_experience:6, note_moyenne:4.6 },
    { id:5, prenom:'Roland',  nom:'Mboungou',  telephone:'+242 05 999 0000', poste:'Menuisier',   niveau:'ouvrier',      specialites:['menuiserie','métallerie'], statut:'disponible', taux_journalier:19000, annees_experience:4, note_moyenne:4.3 },
  ],
  devis: [
    { id:1, numero:'DEV-2025-0001', client_id:1, titre:'Rénovation complète villa', statut:'approuve', montant_ttc:4750000, montant_ht:4025424, date_emission:'2025-01-10', categorie:'renovation', score_ia:82, analyse_ia:'Projet faisable. Budget cohérent pour 180m². Délai recommandé : 8 semaines.' },
    { id:2, numero:'DEV-2025-0002', client_id:2, titre:'Construction bâtiment commercial R+2', statut:'envoye', montant_ttc:28500000, montant_ht:24152542, date_emission:'2025-01-20', categorie:'construction', score_ia:91, analyse_ia:'Excellent projet. Budget solide. Recommande 3 équipes simultanées.' },
    { id:3, numero:'DEV-2025-0003', client_id:3, titre:'Installation électrique complète', statut:'brouillon', montant_ttc:1200000, montant_ht:1016949, date_emission:'2025-02-01', categorie:'electricite', score_ia:0, analyse_ia:'' },
    { id:4, numero:'DEV-2025-0004', client_id:1, titre:'Pose carrelage 85m²', statut:'en_attente', montant_ttc:980000, montant_ht:830508, date_emission:'2025-02-10', categorie:'peinture', score_ia:75, analyse_ia:'Travaux standards. Délai 5 jours.' },
  ],
  projets: [
    { id:1, code:'PRJ-2025-0001', devis_id:1, client_id:1, titre:'Rénovation villa Nkounkou', statut:'actif', categorie:'renovation', ville:'Brazzaville', lieu:'Poto-Poto', budget_initial:4750000, depenses_reelles:2100000, montant_encaisse:2500000, pourcentage_avancement:45, date_debut_prevue:'2025-01-20', date_fin_prevue:'2025-03-17', nb_ouvriers_chantier:4, ouvriers:[1,3,5] },
    { id:2, code:'PRJ-2025-0002', devis_id:2, client_id:2, titre:'Bâtiment SONAR R+2', statut:'actif', categorie:'construction', ville:'Pointe-Noire', lieu:'Zone industrielle', budget_initial:28500000, depenses_reelles:9800000, montant_encaisse:15000000, pourcentage_avancement:30, date_debut_prevue:'2025-02-01', date_fin_prevue:'2025-08-31', nb_ouvriers_chantier:8, ouvriers:[1,2,4] },
    { id:3, code:'PRJ-2025-0003', devis_id:null, client_id:3, titre:'Électricité appartement Moukanda', statut:'en_attente', categorie:'electricite', ville:'Brazzaville', lieu:'Bacongo', budget_initial:1200000, depenses_reelles:0, montant_encaisse:0, pourcentage_avancement:0, date_debut_prevue:'2025-03-01', date_fin_prevue:'2025-03-10', nb_ouvriers_chantier:0, ouvriers:[] },
  ],
  transactions: [
    { id:1, type:'recette', libelle:'Acompte 50% — Villa Nkounkou', montant:2500000, date:'2025-01-20', projet_id:1, mode:'virement' },
    { id:2, type:'depense', libelle:'Matériaux — ciment, sable, acier', montant:850000, date:'2025-01-22', projet_id:1, mode:'especes' },
    { id:3, type:'depense', libelle:'Salaires semaine 1 — PRJ-0001', montant:420000, date:'2025-01-27', projet_id:1, mode:'mobile_money' },
    { id:4, type:'recette', libelle:'Paiement initial SONAR', montant:15000000, date:'2025-02-05', projet_id:2, mode:'virement' },
    { id:5, type:'depense', libelle:'Achat béton armé PRJ-0002', montant:4200000, date:'2025-02-08', projet_id:2, mode:'cheque' },
    { id:6, type:'depense', libelle:'Équipements électricité PRJ-0002', montant:1800000, date:'2025-02-15', projet_id:2, mode:'virement' },
    { id:7, type:'recette', libelle:'Avance mensuelle SONAR', montant:5000000, date:'2025-03-01', projet_id:2, mode:'virement' },
  ],
  promotions: [
    { id:1, titre:'Saison rénovation', description:'-20% sur tous les travaux de rénovation', type:'pourcentage', valeur:20, code_promo:'POLYPROMO', date_debut:'2025-01-01', date_fin:'2025-06-30', actif:1, usage_actuel:12, conditions:'Non cumulable avec d\'autres offres.' },
    { id:2, titre:'Pack complet construction', description:'Gros œuvre + finitions : -15% sur le total', type:'pourcentage', valeur:15, code_promo:'PACKBUILD', date_debut:'2025-03-01', date_fin:'2025-07-31', actif:1, usage_actuel:3, conditions:'Valable pour projets > 10M FCFA.' },
  ],
  visites: { total: 1248, ce_mois: 342, devis_generes: 28, taux_conversion: 22 },
  taches: [
    { id:1, projet_id:1, titre:'Démolition cloisons existantes', statut:'terminee', priorite:'haute', assignee_id:1, date_echeance:'2025-01-25' },
    { id:2, projet_id:1, titre:'Pose dalle béton RDC', statut:'terminee', priorite:'haute', assignee_id:1, date_echeance:'2025-02-01' },
    { id:3, projet_id:1, titre:'Installation électrique étage 1', statut:'en_cours', priorite:'normale', assignee_id:2, date_echeance:'2025-02-28' },
    { id:4, projet_id:1, titre:'Peinture salon et chambres', statut:'a_faire', priorite:'normale', assignee_id:3, date_echeance:'2025-03-10' },
    { id:5, projet_id:2, titre:'Terrassement et fondations', statut:'terminee', priorite:'urgente', assignee_id:1, date_echeance:'2025-02-15' },
    { id:6, projet_id:2, titre:'Élévation murs RDC', statut:'en_cours', priorite:'haute', assignee_id:1, date_echeance:'2025-03-15' },
  ],
};

/* ── DB CLASS ─────────────────────────────────────────────────── */
class PolyfixDB {
  constructor() {
    this._init();
  }

  _init() {
    if (!localStorage.getItem('polyfix_init')) {
      Object.keys(SEED).forEach(key => {
        if (!localStorage.getItem(`pf_${key}`)) {
          localStorage.setItem(`pf_${key}`, JSON.stringify(SEED[key]));
        }
      });
      localStorage.setItem('polyfix_init', '1');
    }
  }

  _get(key)        { return JSON.parse(localStorage.getItem(`pf_${key}`) || 'null'); }
  _set(key, val)   { localStorage.setItem(`pf_${key}`, JSON.stringify(val)); }

  // ── CRUD générique ────────────────────────────────────────────
  list(table)                      { return this._get(table) || []; }
  find(table, id)                  { return this.list(table).find(r => r.id === +id) || null; }
  where(table, pred)               { return this.list(table).filter(pred); }
  count(table, pred)               { return pred ? this.where(table, pred).length : this.list(table).length; }

  insert(table, data) {
    const rows = this.list(table);
    const maxId = rows.reduce((m, r) => Math.max(m, r.id || 0), 0);
    const record = { id: maxId + 1, created_at: new Date().toISOString(), ...data };
    rows.push(record);
    this._set(table, rows);
    return record;
  }

  update(table, id, data) {
    const rows = this.list(table);
    const idx  = rows.findIndex(r => r.id === +id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...data, updated_at: new Date().toISOString() };
    this._set(table, rows);
    return rows[idx];
  }

  delete(table, id) {
    const rows  = this.list(table);
    const after = rows.filter(r => r.id !== +id);
    this._set(table, after);
    return after.length < rows.length;
  }

  // ── DEVIS helpers ─────────────────────────────────────────────
  nextNumeroDevis() {
    const count = this.list('devis').length + 1;
    return `DEV-${new Date().getFullYear()}-${String(count).padStart(4,'0')}`;
  }

  nextCodeProjet() {
    const count = this.list('projets').length + 1;
    return `PRJ-${new Date().getFullYear()}-${String(count).padStart(4,'0')}`;
  }

  approuverDevis(devisId) {
    const devis = this.find('devis', devisId);
    if (!devis) return null;
    this.update('devis', devisId, { statut: 'approuve', date_approbation: new Date().toISOString() });
    // Créer automatiquement le projet associé
    const client = this.find('clients', devis.client_id);
    return this.insert('projets', {
      code: this.nextCodeProjet(),
      devis_id: devisId,
      client_id: devis.client_id,
      titre: devis.titre,
      statut: 'en_attente',
      categorie: devis.categorie,
      budget_initial: devis.montant_ttc,
      depenses_reelles: 0,
      montant_encaisse: 0,
      pourcentage_avancement: 0,
      nb_ouvriers_chantier: 0,
      ouvriers: [],
    });
  }

  // ── KPIs ──────────────────────────────────────────────────────
  getKPIs() {
    const devis   = this.list('devis');
    const projets = this.list('projets');
    const tx      = this.list('transactions');
    const visites = this._get('visites') || {};

    const recettes = tx.filter(t => t.type === 'recette').reduce((s,t) => s + t.montant, 0);
    const depenses = tx.filter(t => t.type === 'depense').reduce((s,t) => s + t.montant, 0);

    return {
      visiteurs:      visites.total || 0,
      visiteurs_mois: visites.ce_mois || 0,
      devis_total:    devis.length,
      devis_mois:     devis.filter(d => new Date(d.date_emission).getMonth() === new Date().getMonth()).length,
      ca:             recettes,
      ca_net:         recettes - depenses,
      projets_actifs: projets.filter(p => p.statut === 'actif').length,
      projets_attente:projets.filter(p => p.statut === 'en_attente').length,
      taux_conv:      visites.taux_conversion || 0,
    };
  }

  // ── Transactions par mois (pour graphiques) ───────────────────
  getTxByMonth() {
    const tx = this.list('transactions');
    const months = {};
    tx.forEach(t => {
      const key = t.date.slice(0,7);
      if (!months[key]) months[key] = { recettes: 0, depenses: 0 };
      if (t.type === 'recette') months[key].recettes += t.montant;
      else                      months[key].depenses  += t.montant;
    });
    return Object.entries(months).sort(([a],[b]) => a.localeCompare(b));
  }

  reset() {
    localStorage.removeItem('polyfix_init');
    Object.keys(SEED).forEach(k => localStorage.removeItem(`pf_${k}`));
    this._init();
  }
}

/* ── INSTANCE GLOBALE ─────────────────────────────────────────── */
window.DB = new PolyfixDB();

/* ── UTILITAIRES GLOBAUX ──────────────────────────────────────── */

/** Formatage monétaire FCFA */
function fmt(n, short = false) {
  if (n === undefined || n === null) return '—';
  if (short && n >= 1e6)  return (n/1e6).toFixed(1) + 'M';
  if (short && n >= 1e3)  return (n/1e3).toFixed(0) + 'k';
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

/** Formatage date */
function fmtDate(d, full = false) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return '—';
  return date.toLocaleDateString('fr-FR', full
    ? { day:'2-digit', month:'long', year:'numeric' }
    : { day:'2-digit', month:'2-digit', year:'numeric' }
  );
}

/** Jours depuis une date */
function daysSince(d) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

/** Badge statut projet/devis */
function statusBadge(statut) {
  const map = {
    actif:       ['success','Actif'],
    en_attente:  ['warning','En attente'],
    suspendu:    ['danger', 'Suspendu'],
    termine:     ['muted',  'Terminé'],
    annule:      ['danger', 'Annulé'],
    brouillon:   ['muted',  'Brouillon'],
    envoye:      ['info',   'Envoyé'],
    approuve:    ['success','Approuvé'],
    rejete:      ['danger', 'Rejeté'],
    expire:      ['muted',  'Expiré'],
  };
  const [cls, label] = map[statut] || ['muted', statut];
  return `<span class="badge badge-${cls}">${label}</span>`;
}

/** Échapper le HTML */
function esc(str) {
  return (str ?? '').toString()
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/** Toast notification */
function toast(msg, type = 'info') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; document.body.appendChild(stack); }
  const icons = {
    success: '<svg viewBox="0 0 24 24" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>',
    info:    '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${icons[type] || icons.info}<span>${esc(msg)}</span>`;
  stack.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

/** Confirm modal */
function confirm(title, message, onConfirm, danger = false) {
  const existing = document.getElementById('confirmModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'confirmModal';
  modal.className = 'modal-backdrop open';
  modal.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <div class="modal-title">${esc(title)}</div>
        <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">
          <svg viewBox="0 0 24 24" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body"><p style="color:var(--text-secondary);font-size:14px">${esc(message)}</p></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-backdrop').remove()">Annuler</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">Confirmer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#confirmOk').addEventListener('click', () => { modal.remove(); onConfirm(); });
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

window.fmt = fmt; window.fmtDate = fmtDate; window.daysSince = daysSince;
window.statusBadge = statusBadge; window.esc = esc; window.toast = toast;
window.confirm = confirm;

/* ── AUTH SIMULATION ──────────────────────────────────────────── */
const Auth = {
  users: [
    { id:1, email:'admin@polyfix.cg',    password:'admin123',  role:'admin',        prenom:'Admin',    nom:'POLYFIX'  },
    { id:2, email:'gest@polyfix.cg',     password:'gest123',   role:'gestionnaire', prenom:'Jean',     nom:'Mbemba'   },
    { id:3, email:'client@demo.cg',      password:'client123', role:'client',       prenom:'Marie',    nom:'Nkounkou' },
    { id:4, email:'ouvrier@demo.cg',     password:'ouvr123',   role:'ouvrier',      prenom:'Pierre',   nom:'Koulousso'},
  ],
  login(email, password) {
    const u = this.users.find(u => u.email === email && u.password === password);
    if (u) { sessionStorage.setItem('pf_user', JSON.stringify(u)); return u; }
    return null;
  },
  logout()  { sessionStorage.removeItem('pf_user'); },
  current() { return JSON.parse(sessionStorage.getItem('pf_user') || 'null'); },
  require(roles) {
    const u = this.current();
    if (!u) { window.location.href = '../login.html'; return null; }
    if (roles && !roles.includes(u.role)) { window.location.href = '../login.html'; return null; }
    return u;
  },
};
window.Auth = Auth;
