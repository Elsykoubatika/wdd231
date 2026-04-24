/* ================================================================
   POLYFIX — AI Agent Logic (Simulation)
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    
    // Add User Message
    addMessage(query, 'user');
    input.value = '';
    
    // Simulate AI thinking and responding
    setTimeout(() => {
      const response = generateAIResponse(query);
      addMessage(response, 'ai');
    }, 600 + Math.random() * 800);
  });
});

function useChip(element) {
  const input = document.getElementById('chat-input');
  input.value = element.innerText;
  input.focus();
}

function addMessage(text, sender) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  
  if (sender === 'ai') {
    div.innerHTML = `<strong>Polyfix AI</strong><br><br>${text.replace(/\n/g, '<br>')}`;
  } else {
    div.textContent = text;
  }
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function generateAIResponse(query) {
  const q = query.toLowerCase();
  
  // 1. Estimation Ciment / Mur
  if (q.includes('ciment') && q.includes('mur')) {
    // Regex simple pour trouver des nombres (longueur, hauteur)
    const nums = query.match(/\d+/g);
    if (nums && nums.length >= 2) {
      const surface = parseInt(nums[0]) * parseInt(nums[1]);
      // Règle empirique : 15kg à 20kg de ciment par m2 pour un mur en parpaings de 15cm
      const sacs = Math.ceil((surface * 18) / 50); // sac de 50kg
      return `Pour un mur de ${nums[0]}m x ${nums[1]}m, soit une surface de **${surface} m²**, il vous faudra environ :\n\n- **${sacs} sacs** de ciment de 50kg (dosage standard pour montage de parpaings).\n- Environ ${surface * 10} parpaings standards (15x20x50).\n\nSouhaitez-vous que je génère un devis avec ces quantités ?`;
    }
    return "Pour calculer le ciment, j'ai besoin des dimensions. Par exemple : 'Combien de ciment pour un mur de 10m x 2m ?'";
  }
  
  // 2. Recherche d'Ouvrier
  if (q.includes('électricien') || q.includes('plombier') || q.includes('ouvrier')) {
    const ouvriers = DB.getAll('ouvriers');
    let spec = 'Électricité';
    if(q.includes('plomb')) spec = 'Plomberie';
    if(q.includes('maçon')) spec = 'Maçonnerie';
    
    const dispos = ouvriers.filter(o => o.specialite === spec && o.dispo === 'disponible');
    
    if (dispos.length > 0) {
      let res = `J'ai trouvé **${dispos.length} ouvrier(s)** spécialisé(s) en ${spec} actuellement disponible(s) :\n\n`;
      dispos.forEach(o => {
        res += `- **${o.nom}** (Note: ⭐ ${o.note})\n`;
      });
      return res + "\nVoulez-vous l'affecter à un de vos projets en cours ?";
    } else {
      return `Désolé, aucun ouvrier spécialisé en ${spec} n'est disponible pour le moment. Ils sont tous marqués 'Occupé' ou 'En Congé'.`;
    }
  }
  
  // 3. Estimation Rénovation
  if (q.includes('rénovation') && q.includes('salle de bain')) {
    return `L'estimation moyenne pour une rénovation de salle de bain au Congo varie selon les matériaux :\n\n- **Standard** : 800 000 FCFA à 1 500 000 FCFA\n- **Premium** : 1 500 000 FCFA à 3 500 000 FCFA\n\nCe coût inclut la démolition, la plomberie de base, la pose du carrelage et l'installation des sanitaires. \nPourriez-vous me préciser la superficie pour affiner ce calcul ?`;
  }
  
  // Default fallback
  return "Je ne suis pas sûr de bien comprendre votre demande. Pourriez-vous reformuler ? N'hésitez pas à me demander des estimations de matériaux (ex: mur, dalle), ou de rechercher des ouvriers disponibles.";
}
