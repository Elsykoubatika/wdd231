/* ================================================================
   POLYFIX — Projets Logic
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  renderProjets();
});

function renderProjets() {
  const projets = DB.getAll('projets').reverse();
  const container = document.getElementById('projets-grid');
  
  if(projets.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:48px; background:#fff; border-radius:12px; color:#64748b;">Aucun projet en cours.</div>`;
    return;
  }
  
  container.innerHTML = projets.map(p => {
    // Calcul de la marge/rentabilité simple
    const reste = parseFloat(p.budget) - parseFloat(p.depenses);
    const avancement = p.avancement || 0;
    const isEnCours = p.statut === 'en_cours';
    
    return `
      <div class="card" style="position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:16px;">
          <div>
            <h3 style="margin:0 0 4px 0; font-size:18px; color:#1e293b;">${p.titre}</h3>
            <div style="font-size:13px; color:#64748b;">Client: ${p.client}</div>
          </div>
          <span class="badge ${p.statut}">${p.statut.replace('_', ' ').toUpperCase()}</span>
        </div>
        
        <div style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
            <span style="font-weight:600;">Avancement</span>
            <span>${avancement}%</span>
          </div>
          <div style="width:100%; height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden;">
            <div style="height:100%; width:${avancement}%; background:var(--c-brand); border-radius:4px;"></div>
          </div>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; font-size:14px;">
          <div style="background:#f8fafc; padding:12px; border-radius:8px;">
            <div style="color:#64748b; font-size:12px; margin-bottom:4px;">Budget Initial</div>
            <div style="font-weight:700;">${new Intl.NumberFormat('fr-FR').format(p.budget)} <span style="font-size:10px;">FCFA</span></div>
          </div>
          <div style="background:#f8fafc; padding:12px; border-radius:8px;">
            <div style="color:#64748b; font-size:12px; margin-bottom:4px;">Dépenses</div>
            <div style="font-weight:700; color:#ef4444;">${new Intl.NumberFormat('fr-FR').format(p.depenses)} <span style="font-size:10px;">FCFA</span></div>
          </div>
        </div>
        
        <div style="display:flex; gap:8px;">
          ${isEnCours ? `<button onclick="updateAvancement(${p.id})" class="btn-primary" style="flex:1; padding:8px; font-size:13px;">Mettre à jour</button>` : ''}
          ${p.statut === 'en_attente' ? `<button onclick="demarrerProjet(${p.id})" class="btn-primary" style="flex:1; padding:8px; font-size:13px; background:#10b981;">Démarrer</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function updateAvancement(id) {
  const newAvancement = prompt("Nouvel avancement en % (0-100) :");
  if (newAvancement !== null && !isNaN(newAvancement)) {
    let val = parseInt(newAvancement);
    if(val < 0) val = 0;
    if(val > 100) val = 100;
    
    const updates = { avancement: val };
    if (val === 100) {
      updates.statut = 'termine';
    }
    
    DB.update('projets', id, updates);
    renderProjets();
  }
}

function demarrerProjet(id) {
  if(confirm("Démarrer ce projet ?")) {
    DB.update('projets', id, { statut: 'en_cours' });
    renderProjets();
  }
}
