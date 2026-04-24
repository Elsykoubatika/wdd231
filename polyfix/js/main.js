/* ================================================================
   POLYFIX — Global JavaScript
   ================================================================ */

'use strict';

/* ── NAVBAR ──────────────────────────────────────────────────── */
const hamburger = document.querySelector('.hamburger');
const navMobile = document.querySelector('.nav-mobile');

hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navMobile?.classList.toggle('open');
  document.body.style.overflow = navMobile?.classList.contains('open') ? 'hidden' : '';
});

// Close mobile menu on link click
document.querySelectorAll('.nav-mobile a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger?.classList.remove('open');
    navMobile?.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// Active nav link based on current page
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    link.classList.add('active');
  }
});

/* ── SCROLL EFFECTS ───────────────────────────────────────────── */
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  if (navbar) {
    navbar.style.background = window.scrollY > 50
      ? 'rgba(10,10,12,.97)'
      : 'rgba(10,10,12,.88)';
  }
}, { passive: true });

/* ── BACK TO TOP ──────────────────────────────────────────────── */
const backToTop = document.querySelector('.back-to-top');
window.addEventListener('scroll', () => {
  if (backToTop) {
    backToTop.classList.toggle('show', window.scrollY > 400);
  }
}, { passive: true });
backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ── INTERSECTION OBSERVER (fade-up) ─────────────────────────── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

/* ── COUNTDOWN TIMER ──────────────────────────────────────────── */
function startCountdown(targetDate, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const update = () => {
    const now  = Date.now();
    const diff = Math.max(0, targetDate - now);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const pad = n => String(n).padStart(2, '0');
    el.innerHTML = `
      <div class="countdown-unit"><div class="countdown-num">${pad(d)}</div><div class="countdown-lbl">Jours</div></div>
      <div class="countdown-unit"><div class="countdown-num">${pad(h)}</div><div class="countdown-lbl">Heures</div></div>
      <div class="countdown-unit"><div class="countdown-num">${pad(m)}</div><div class="countdown-lbl">Min</div></div>
      <div class="countdown-unit"><div class="countdown-num">${pad(s)}</div><div class="countdown-lbl">Sec</div></div>`;
  };
  update();
  setInterval(update, 1000);
}

// Lancer le countdown promo (fin du mois en cours)
const endOfMonth = new Date();
endOfMonth.setDate(endOfMonth.getDate() + 18); // 18 jours de promo
startCountdown(endOfMonth.getTime(), 'promoCountdown');

/* ── TOAST NOTIFICATIONS ──────────────────────────────────────── */
function showToast(msg, type = 'info') {
  const container = document.querySelector('.toast-container') || (() => {
    const c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();

  const icon = type === 'success'
    ? `<svg viewBox="0 0 24 24" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icon} <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

window.showToast = showToast;

/* ── FORM VALIDATION ──────────────────────────────────────────── */
function validateField(input) {
  const group = input.closest('.form-group');
  if (!group) return true;
  const errorEl = group.querySelector('.form-error');
  let valid = true;
  let msg = '';

  if (input.required && !input.value.trim()) {
    valid = false; msg = 'Ce champ est obligatoire.';
  } else if (input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
    valid = false; msg = 'Adresse e-mail invalide.';
  } else if (input.type === 'tel' && input.value && !/^[+\d\s\-]{8,}$/.test(input.value)) {
    valid = false; msg = 'Numéro de téléphone invalide.';
  }

  group.classList.toggle('has-error', !valid);
  if (errorEl) errorEl.textContent = msg;
  return valid;
}

document.querySelectorAll('.form-control').forEach(input => {
  input.addEventListener('blur', () => validateField(input));
  input.addEventListener('input', () => {
    if (input.closest('.form-group')?.classList.contains('has-error')) validateField(input);
  });
});

/* ── FORM SUBMISSION ──────────────────────────────────────────── */
document.querySelectorAll('form[data-polyfix]').forEach(form => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate all fields
    let allValid = true;
    form.querySelectorAll('.form-control[required]').forEach(inp => {
      if (!validateField(inp)) allValid = false;
    });
    if (!allValid) {
      showToast('Veuillez corriger les erreurs avant de continuer.', 'error');
      form.querySelector('.has-error .form-control')?.focus();
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    const originalText = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<svg viewBox="0 0 24 24" stroke-width="2" style="width:18px;height:18px;animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-18 0"/></svg> Envoi en cours…`;
    }

    // Simulate async send (replace with real fetch in production)
    await new Promise(r => setTimeout(r, 1800));

    const successEl = form.closest('.form-card')?.querySelector('.form-success');
    const formInner = form.closest('.form-card')?.querySelector('.form-inner');

    if (successEl && formInner) {
      formInner.style.display = 'none';
      successEl.style.display = 'block';
    } else {
      showToast('✅ Demande envoyée ! Nous vous contactons sous 24h.', 'success');
      form.reset();
    }

    if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
  });
});

/* ── RANGE INPUTS ─────────────────────────────────────────────── */
document.querySelectorAll('input[type="range"]').forEach(range => {
  const output = document.getElementById(range.id + 'Val');
  const update = () => {
    if (output) output.textContent = new Intl.NumberFormat('fr-FR').format(range.value);
  };
  range.addEventListener('input', update);
  update();
});

/* ── ANIMATED COUNTERS ────────────────────────────────────────── */
function animateCounter(el) {
  const target = parseInt(el.dataset.count, 10);
  const duration = 1800;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = (el.dataset.prefix || '') +
      new Intl.NumberFormat('fr-FR').format(Math.floor(current)) +
      (el.dataset.suffix || '');
    if (current >= target) clearInterval(timer);
  }, 16);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

/* ── SPIN KEYFRAME (inject) ───────────────────────────────────── */
if (!document.getElementById('spin-style')) {
  const s = document.createElement('style');
  s.id = 'spin-style';
  s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}
