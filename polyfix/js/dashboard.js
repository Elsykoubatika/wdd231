/* ================================================================
   POLYFIX — Dashboard Logic
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!window.DB) {
    console.error("Database not initialized");
    return;
  }

  // 1. Charger les données depuis DB
  const projets = DB.getAll('projets');
  const devis = DB.getAll('devis');
  const transactions = DB.getAll('transactions');
  const ouvriers = DB.getAll('ouvriers');

  // 2. Calculer les KPIs
  const projetsEnCours = projets.filter(p => p.statut === 'en_cours').length;
  const devisEnAttente = devis.filter(d => d.statut === 'en_attente').length;
  const ouvriersActifs = ouvriers.filter(o => o.dispo === 'occupe').length;
  
  // Calcul CA (somme des entrées)
  const caTotal = transactions
    .filter(t => t.type === 'entree')
    .reduce((sum, t) => sum + parseFloat(t.montant), 0);

  // Mettre à jour le DOM
  document.getElementById('kpi-projets').textContent = projetsEnCours;
  document.getElementById('kpi-devis').textContent = devisEnAttente;
  document.getElementById('kpi-ouvriers').textContent = `${ouvriersActifs} / ${ouvriers.length}`;
  document.getElementById('kpi-ca').textContent = new Intl.NumberFormat('fr-FR').format(caTotal) + ' FCFA';

  // 3. Remplir le tableau des projets récents
  const tbody = document.getElementById('table-projets');
  const projetsRecents = projets.slice(-5).reverse();
  
  tbody.innerHTML = projetsRecents.map(p => {
    let badgeClass = p.statut;
    let text = p.statut.replace('_', ' ').toUpperCase();
    return `
      <tr>
        <td style="font-weight: 500; color: #1e293b;">${p.titre}</td>
        <td><span class="badge ${badgeClass}">${text}</span></td>
      </tr>
    `;
  }).join('');

  if(projetsRecents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:24px; color:#64748b;">Aucun projet enregistré</td></tr>`;
  }

  // 4. Initialiser le graphique (Chart.js)
  const ctx = document.getElementById('caChart');
  if (ctx) {
    new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
        datasets: [{
          label: 'Chiffre d\'Affaires',
          data: [1200000, 2500000, 1800000, caTotal, 0, 0],
          backgroundColor: '#E85A00',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (value >= 1000000) return (value / 1000000) + 'M';
                if (value >= 1000) return (value / 1000) + 'k';
                return value;
              }
            }
          }
        }
      }
    });
  }
});
