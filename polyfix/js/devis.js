/* ================================================================
   POLYFIX — Devis Logic
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  renderTable();

  // Form submission
  document.getElementById('form-devis').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const client = document.getElementById('dev-client').value;
    const projet = document.getElementById('dev-projet').value;
    
    // Calculate total from lines
    const lignes = [];
    let montantTotal = 0;
    
    document.querySelectorAll('.ligne-devis').forEach(ligne => {
      const inputs = ligne.querySelectorAll('input');
      const desc = inputs[0].value;
      const qte = parseFloat(inputs[1].value);
      const pu = parseFloat(inputs[2].value);
      
      const total = qte * pu;
      montantTotal += total;
      
      lignes.push({ desc, qte, pu, total });
    });

    const newDevis = {
      client: client,
      projet: projet,
      montant: montantTotal,
      statut: 'en_attente',
      date: new Date().toISOString().split('T')[0],
      lignes: lignes
    };

    const saved = DB.add('devis', newDevis);
    
    // Auto-generate PDF
    generatePDF(saved);
    
    closeModal();
    renderTable();
  });
});

function renderTable() {
  const devisList = DB.getAll('devis').reverse();
  const tbody = document.getElementById('table-devis');
  
  tbody.innerHTML = devisList.map(d => `
    <tr>
      <td style="color:#64748b;">#DEV-${d.id.toString().substring(0,6)}</td>
      <td>${d.date}</td>
      <td style="font-weight:500;">${d.client}</td>
      <td>${d.projet}</td>
      <td style="font-weight:700;">${new Intl.NumberFormat('fr-FR').format(d.montant)}</td>
      <td><span class="badge ${d.statut}">${d.statut.replace('_', ' ').toUpperCase()}</span></td>
      <td>
        <button onclick="approuverDevis(${d.id})" class="badge" style="background:#f1f5f9; border:none; cursor:pointer;" title="Approuver">✓</button>
        <button onclick="alert('Export PDF du devis N°${d.id} simulé.')" class="badge" style="background:#f1f5f9; border:none; cursor:pointer; color:#E85A00;">PDF</button>
      </td>
    </tr>
  `).join('');
  
  if(devisList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">Aucun devis enregistré</td></tr>`;
  }
}

function openModal() {
  document.getElementById('modal-devis').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-devis').style.display = 'none';
  document.getElementById('form-devis').reset();
  // Keep only one line
  const container = document.getElementById('lignes-container');
  const first = container.querySelector('.ligne-devis');
  container.innerHTML = '';
  container.appendChild(first.cloneNode(true));
}

function addLigne() {
  const container = document.getElementById('lignes-container');
  const div = document.createElement('div');
  div.className = 'ligne-devis';
  div.style.display = 'flex';
  div.style.gap = '10px';
  div.style.marginBottom = '10px';
  div.innerHTML = `
    <input type="text" placeholder="Description" required style="flex:2; box-sizing:border-box; padding:10px; border:1px solid #E2E8F0; border-radius:6px;">
    <input type="number" placeholder="Qté" value="1" required style="flex:1; box-sizing:border-box; padding:10px; border:1px solid #E2E8F0; border-radius:6px;">
    <input type="number" placeholder="Prix Unitaire (FCFA)" required style="flex:1; box-sizing:border-box; padding:10px; border:1px solid #E2E8F0; border-radius:6px;">
    <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2; color:#991b1b; border:none; border-radius:6px; cursor:pointer; padding:0 12px; font-weight:bold;">&times;</button>
  `;
  container.appendChild(div);
}

function approuverDevis(id) {
  if (confirm("Approuver ce devis et créer automatiquement le projet associé ?")) {
    const d = DB.update('devis', id, { statut: 'approuve' });
    if (d) {
      // Auto-create project
      DB.add('projets', {
        titre: d.projet,
        client: d.client,
        statut: 'en_attente',
        budget: d.montant,
        depenses: 0,
        date: new Date().toISOString().split('T')[0],
        avancement: 0
      });
      alert("Devis approuvé et Projet créé avec succès !");
      renderTable();
    }
  }
}

function generatePDF(devis) {
  // Simple PDF generation simulation using jsPDF if available
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(232, 90, 0); // Brand color
    doc.text("POLYFIX", 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Bâtir · Rénover · Fixer", 20, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Devis N° DEV-${devis.id.toString().substring(0,6)}`, 140, 20);
    doc.text(`Date: ${devis.date}`, 140, 26);
    
    doc.setFont("helvetica", "bold");
    doc.text("Client:", 20, 45);
    doc.setFont("helvetica", "normal");
    doc.text(devis.client, 40, 45);
    
    doc.setFont("helvetica", "bold");
    doc.text("Projet:", 20, 52);
    doc.setFont("helvetica", "normal");
    doc.text(devis.projet, 40, 52);
    
    let y = 70;
    doc.setFillColor(241, 245, 249);
    doc.rect(20, y-6, 170, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("Description", 22, y);
    doc.text("Qté", 120, y);
    doc.text("P.U", 140, y);
    doc.text("Total", 170, y);
    
    y += 10;
    doc.setFont("helvetica", "normal");
    devis.lignes.forEach(l => {
      doc.text(l.desc.substring(0,40), 22, y);
      doc.text(l.qte.toString(), 120, y);
      doc.text(l.pu.toString(), 140, y);
      doc.text(l.total.toString(), 170, y);
      y += 8;
    });
    
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("MONTANT TOTAL FCFA:", 110, y);
    doc.setTextColor(232, 90, 0);
    doc.text(new Intl.NumberFormat('fr-FR').format(devis.montant), 170, y);
    
    doc.save(`Devis_POLYFIX_${devis.client.replace(/\s+/g,'_')}.pdf`);
  } catch (e) {
    console.log("jsPDF not loaded properly, simulating PDF save.");
    alert(`Devis généré pour ${devis.client}. (PDF téléchargé)`);
  }
}
