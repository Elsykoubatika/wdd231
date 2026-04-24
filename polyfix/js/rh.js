/* ================================================================
   POLYFIX — RH Logic
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  renderOuvriers();

  // Form submission
  document.getElementById('form-ouvrier').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nom = document.getElementById('ouv-nom').value;
    const specialite = document.getElementById('ouv-spec').value;
    const tel = document.getElementById('ouv-tel').value;
    
    const newOuvrier = {
      nom: nom,
      specialite: specialite,
      tel: tel,
      dispo: 'disponible',
      note: 5.0
    };

    DB.add('ouvriers', newOuvrier);
    
    closeModal();
    renderOuvriers();
  });
});

function renderOuvriers() {
  const ouvriers = DB.getAll('ouvriers').reverse();
  const tbody = document.getElementById('table-ouvriers');
  
  tbody.innerHTML = ouvriers.map(o => {
    return `
      <tr>
        <td style="color:#64748b;">#OUV-${o.id.toString().substring(0,4)}</td>
        <td style="font-weight:500;">${o.nom}</td>
        <td>${o.specialite}</td>
        <td>${o.tel}</td>
        <td>
          <select onchange="updateDispo(${o.id}, this.value)" style="padding:4px 8px; border:1px solid #e2e8f0; border-radius:4px; outline:none; background:#f8fafc; cursor:pointer;">
            <option value="disponible" ${o.dispo === 'disponible' ? 'selected' : ''}>Disponible</option>
            <option value="occupe" ${o.dispo === 'occupe' ? 'selected' : ''}>Occupé</option>
            <option value="conge" ${o.dispo === 'conge' ? 'selected' : ''}>En Congé</option>
          </select>
        </td>
        <td style="color:#eab308; font-weight:600;">⭐ ${o.note || 'N/A'}</td>
        <td>
          <button onclick="supprimerOuvrier(${o.id})" class="badge" style="background:#fee2e2; color:#991b1b; border:none; cursor:pointer;" title="Supprimer">Supprimer</button>
        </td>
      </tr>
    `;
  }).join('');
  
  if(ouvriers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">Aucun ouvrier enregistré</td></tr>`;
  }
}

function openModal() {
  document.getElementById('modal-ouvrier').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-ouvrier').style.display = 'none';
  document.getElementById('form-ouvrier').reset();
}

function updateDispo(id, status) {
  DB.update('ouvriers', id, { dispo: status });
}

function supprimerOuvrier(id) {
  if (confirm("Êtes-vous sûr de vouloir supprimer cet ouvrier de l'annuaire ?")) {
    DB.remove('ouvriers', id);
    renderOuvriers();
  }
}
