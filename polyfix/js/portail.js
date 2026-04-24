/* ================================================================
   POLYFIX — Portails (Client & Ouvrier)
   ================================================================ */

function initPortail(type) {
  const container = document.getElementById('portal-app');
  
  // Vérifier si connecté
  const user = sessionStorage.getItem(`polyfix_auth_${type}`);
  
  if (!user) {
    renderLoginForm(container, type);
  } else {
    if (type === 'client') {
      renderClientDashboard(container, JSON.parse(user));
    } else {
      renderOuvrierDashboard(container, JSON.parse(user));
    }
  }
}

function renderLoginForm(container, type) {
  const title = type === 'client' ? 'Espace Client' : 'Espace Ouvrier';
  const labelID = type === 'client' ? 'Email ou Numéro de Client' : 'Identifiant Ouvrier';
  
  container.innerHTML = `
    <div class="portal-card auth-section fade-up">
      <h1 class="display-md" style="margin-bottom:8px">${title}</h1>
      <p style="color:var(--c-muted); margin-bottom:32px;">Connectez-vous pour accéder à votre espace personnel.</p>
      
      <form id="login-form">
        <div style="margin-bottom:16px; text-align:left;">
          <label style="font-size:13px; color:var(--c-muted); margin-bottom:6px; display:block;">${labelID}</label>
          <input type="text" id="auth-id" required style="width:100%; box-sizing:border-box; padding:12px; border:1px solid var(--c-border); border-radius:6px; background:transparent; color:var(--c-text);">
        </div>
        <div style="margin-bottom:24px; text-align:left;">
          <label style="font-size:13px; color:var(--c-muted); margin-bottom:6px; display:block;">Mot de passe</label>
          <input type="password" id="auth-pwd" required style="width:100%; box-sizing:border-box; padding:12px; border:1px solid var(--c-border); border-radius:6px; background:transparent; color:var(--c-text);">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">Se connecter</button>
      </form>
      
      <div style="margin-top:24px; font-size:13px; color:var(--c-muted);">
        (Demo : Entrez n'importe quel identifiant et mot de passe pour tester)
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('auth-id').value;
    // Simulation
    sessionStorage.setItem(`polyfix_auth_${type}`, JSON.stringify({ name: val, role: type }));
    initPortail(type);
  });
}

function logout(type) {
  sessionStorage.removeItem(`polyfix_auth_${type}`);
  initPortail(type);
}

// --- CLIENT ---
function renderClientDashboard(container, user) {
  // Récupérer les projets du client (Simulé)
  const projets = DB.getAll('projets').slice(0, 2); // on prend 2 projets au hasard
  
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
      <h1 class="display-md">Bienvenue, ${user.name}</h1>
      <button onclick="logout('client')" class="btn btn-outline btn-sm">Déconnexion</button>
    </div>
    
    <div class="portal-card">
      <h2 style="margin-bottom:24px; font-size:20px;">Vos Projets en Cours</h2>
  `;
  
  if (projets.length === 0) {
    html += `<p style="color:var(--c-muted);">Aucun projet en cours.</p>`;
  } else {
    projets.forEach(p => {
      const av = p.avancement || 0;
      html += `
        <div class="project-card">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <h3 style="margin:0; font-size:16px;">${p.titre}</h3>
            <span style="font-weight:600; color:var(--c-brand);">${av}%</span>
          </div>
          <p style="font-size:13px; color:var(--c-muted); margin-bottom:0;">Date de début prévue: ${p.date}</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${av}%"></div>
          </div>
        </div>
      `;
    });
  }
  
  html += `
      <div style="margin-top:32px; padding-top:24px; border-top:1px solid var(--c-border);">
        <h2 style="margin-bottom:16px; font-size:20px;">Vos Devis</h2>
        <p style="color:var(--c-muted);">Vous n'avez pas de nouveaux devis en attente de validation.</p>
        <a href="estimation_form.html" class="btn btn-primary" style="margin-top:12px;">Demander un nouveau devis</a>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// --- OUVRIER ---
function renderOuvrierDashboard(container, user) {
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
      <h1 class="display-md">Espace Ouvrier</h1>
      <button onclick="logout('ouvrier')" class="btn btn-outline btn-sm">Déconnexion</button>
    </div>
    
    <div class="portal-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <h2 style="margin:0; font-size:20px;">Planning du Jour</h2>
        <span style="padding:4px 12px; background:var(--c-brand); color:#fff; border-radius:999px; font-size:12px; font-weight:bold;">Aujourd'hui</span>
      </div>
      
      <div class="task-card">
        <div>
          <h4 style="margin:0 0 4px 0; font-size:15px;">Villa Brazzaville R+1</h4>
          <p style="margin:0; font-size:13px; color:var(--c-muted);">08:00 - 12:00 • Maçonnerie (Mur porteur)</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="alert('Pointage validé !')">Pointer</button>
      </div>
      
      <div class="task-card">
        <div>
          <h4 style="margin:0 0 4px 0; font-size:15px;">Villa Brazzaville R+1</h4>
          <p style="margin:0; font-size:13px; color:var(--c-muted);">13:00 - 16:30 • Coulage Béton</p>
        </div>
        <button class="btn btn-outline btn-sm">En attente</button>
      </div>
      
      <div style="margin-top:32px; padding-top:24px; border-top:1px solid var(--c-border);">
        <h2 style="margin-bottom:16px; font-size:20px;">Signaler un problème</h2>
        <p style="color:var(--c-muted); font-size:14px; margin-bottom:16px;">Besoin de matériel ou incident sur le chantier ?</p>
        <button class="btn btn-outline" onclick="alert('Le chef de chantier a été notifié.')">Alerter le Chef de Chantier</button>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}
