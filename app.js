/* =============================================
   BIRTHDAY BUDDY — LANDING PAGE SCRIPT
   =============================================
   Replace GOOGLE_CLIENT_ID with your real
   Client ID from Google Cloud Console:
   https://console.cloud.google.com/apis/credentials
   ============================================= */

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';

/* EmailJS config — sign up free at https://www.emailjs.com
   then replace these values with your own:
   - Public Key:   Account → API Keys
   - Service ID:   Email Services → your connected email
   - Template ID:  Email Templates → create one with variables:
       {{to_name}}, {{to_email}}, {{group_name}}, {{birthday}}   */
const EMAILJS_PUBLIC_KEY  = 'YOUR_EMAILJS_PUBLIC_KEY';
const EMAILJS_SERVICE_ID  = 'YOUR_EMAILJS_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_EMAILJS_TEMPLATE_ID';

/* === Footer year === */
document.getElementById('footer-year').textContent = new Date().getFullYear();

/* =============================================
   GOOGLE AUTH
   ============================================= */
function decodeJWT(token) {
  const payload = token.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('bb_user')); }
  catch { return null; }
}

function handleCredentialResponse(response) {
  const user = decodeJWT(response.credential);
  localStorage.setItem('bb_user', JSON.stringify(user));
  window.location.href = 'dashboard.html';
}

function initGoogleAuth() {
  if (typeof google === 'undefined' || !google?.accounts?.id) {
    // GIS not loaded yet — retry once it fires
    window.addEventListener('load', initGoogleAuth, { once: true });
    return;
  }

  if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
    // Dev mode: show a mock sign-in button instead of Google's
    showDevSignIn();
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
  });

  const container = document.getElementById('google-signin-container');
  if (container) {
    google.accounts.id.renderButton(container, {
      theme: 'filled_black',
      size: 'medium',
      shape: 'pill',
      text: 'signin_with',
      logo_alignment: 'left',
    });
  }
}

/* Dev-mode mock sign-in (no real Google Client ID configured) */
function showDevSignIn() {
  const container = document.getElementById('google-signin-container');
  if (!container) return;

  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-ghost';
  btn.style.cssText = 'border-color:rgba(217,70,239,0.5);font-size:0.82rem;gap:0.4rem;';
  btn.innerHTML = '🔑 Sign In (Dev)';
  btn.title = 'Dev mode: replace GOOGLE_CLIENT_ID in app.js and dashboard.js';
  btn.addEventListener('click', () => {
    const mockUser = {
      sub: 'dev-user-001',
      name: 'Dev User',
      given_name: 'Dev',
      email: 'dev@birthdaybuddy.app',
      picture: '',
    };
    localStorage.setItem('bb_user', JSON.stringify(mockUser));
    window.location.href = 'dashboard.html';
  });
  container.appendChild(btn);
}

/* =============================================
   AUTH STATE — update nav
   ============================================= */
function updateNavAuthState() {
  const user = getUser();
  const signedOut = document.getElementById('nav-auth-signed-out');
  const signedIn  = document.getElementById('nav-auth-signed-in');

  if (!signedOut || !signedIn) return;

  if (user) {
    signedOut.hidden = true;
    signedIn.hidden  = false;

    const avatar = document.getElementById('nav-avatar');
    if (user.picture) { avatar.src = user.picture; avatar.alt = user.name || ''; }
    else avatar.style.display = 'none';

    const nameEl = document.getElementById('nav-username');
    if (nameEl) nameEl.textContent = user.given_name || user.name?.split(' ')[0] || 'You';
  } else {
    signedOut.hidden = false;
    signedIn.hidden  = true;
    initGoogleAuth();
  }
}

/* =============================================
   JOIN FLOW — invite link handler
   ============================================= */
const urlParams      = new URLSearchParams(window.location.search);
const joinGroupId    = urlParams.get('join');
const joinGroupName  = urlParams.get('group');

function initJoinFlow() {
  if (!joinGroupId || !joinGroupName) return;

  // Show banner
  const banner = document.getElementById('join-banner');
  const nameEl = document.getElementById('join-group-name');
  if (banner && nameEl) {
    nameEl.textContent = decodeURIComponent(joinGroupName);
    banner.hidden = false;
  }

  // Pre-fill and lock group name field
  const groupInput = document.getElementById('group-name');
  if (groupInput) {
    groupInput.value = decodeURIComponent(joinGroupName);
    groupInput.setAttribute('data-locked', 'true');
    groupInput.setAttribute('readonly', 'true');
    groupInput.setAttribute('aria-describedby', 'group-error group-locked-hint');

    const hint = document.createElement('span');
    hint.className = 'field-hint';
    hint.id = 'group-locked-hint';
    hint.textContent = 'Pre-filled from your invite link.';
    groupInput.parentNode.insertBefore(hint, groupInput.nextSibling);
  }

  // Scroll to form
  setTimeout(() => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);

  // Dismiss banner
  document.getElementById('join-banner-close')?.addEventListener('click', () => {
    document.getElementById('join-banner').hidden = true;
  });
}

/* =============================================
   MOBILE NAV TOGGLE
   ============================================= */
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  navLinks.classList.toggle('is-open', !expanded);
  navToggle.setAttribute('aria-label', expanded ? 'Open menu' : 'Close menu');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-label', 'Open menu');
  });
});

document.addEventListener('click', e => {
  if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('is-open');
  }
});

/* =============================================
   FORM VALIDATION & SUBMISSION
   ============================================= */
const form       = document.getElementById('birthday-form');
const submitBtn  = form.querySelector('button[type="submit"]');
const successMsg = document.getElementById('form-success');

const fields = {
  fullName:  { el: form.querySelector('#full-name'),  errorEl: form.querySelector('#name-error') },
  birthday:  { el: form.querySelector('#birthday'),   errorEl: form.querySelector('#birthday-error') },
  email:     { el: form.querySelector('#email'),      errorEl: form.querySelector('#email-error') },
  groupName: { el: form.querySelector('#group-name'), errorEl: form.querySelector('#group-error') },
};

function validateField(name, el, errorEl) {
  let message = '';

  if (name === 'fullName') {
    if (!el.value.trim()) message = 'Please enter your full name.';
    else if (el.value.trim().length < 2) message = 'Name must be at least 2 characters.';
  }
  if (name === 'birthday') {
    if (!el.value) message = 'Please enter your birthday.';
    else if (isNaN(new Date(el.value).getTime())) message = 'Please enter a valid date.';
  }
  if (name === 'email') {
    if (!el.value.trim()) message = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) message = 'Please enter a valid email address.';
  }
  if (name === 'groupName') {
    if (!el.value.trim()) message = 'Please enter your group name.';
    else if (el.value.trim().length < 2) message = 'Group name must be at least 2 characters.';
  }

  errorEl.textContent = message;
  el.setAttribute('aria-invalid', message ? 'true' : 'false');
  return message === '';
}

Object.entries(fields).forEach(([name, { el, errorEl }]) => {
  el.addEventListener('blur', () => validateField(name, el, errorEl));
  el.addEventListener('input', () => {
    if (el.getAttribute('aria-invalid') === 'true') validateField(name, el, errorEl);
  });
});

form.addEventListener('submit', async e => {
  e.preventDefault();

  const valid = Object.entries(fields)
    .map(([name, { el, errorEl }]) => validateField(name, el, errorEl))
    .every(Boolean);

  if (!valid) {
    const first = Object.values(fields).find(f => f.el.getAttribute('aria-invalid') === 'true');
    if (first) first.el.focus();
    return;
  }

  submitBtn.classList.add('is-loading');

  // Send confirmation email via EmailJS
  if (EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') {
    try {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_name:    fields.fullName.el.value.trim(),
        to_email:   fields.email.el.value.trim(),
        group_name: fields.groupName.el.value.trim(),
        birthday:   new Date(fields.birthday.el.value).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
      });
    } catch (err) {
      console.error('EmailJS error:', err);
    }
  } else {
    await new Promise(r => setTimeout(r, 800));
  }

  // Save member data into the group if arriving via invite link
  if (joinGroupId) {
    try {
      const members = JSON.parse(localStorage.getItem(`bb_members_${joinGroupId}`) || '[]');
      members.push({
        name:      fields.fullName.el.value.trim(),
        birthday:  fields.birthday.el.value,
        email:     fields.email.el.value.trim(),
        groupName: fields.groupName.el.value.trim(),
        joinedAt:  new Date().toISOString(),
      });
      localStorage.setItem(`bb_members_${joinGroupId}`, JSON.stringify(members));
    } catch (_) { /* storage unavailable */ }
  }

  submitBtn.classList.remove('is-loading');
  form.reset();
  Object.values(fields).forEach(({ el }) => el.removeAttribute('aria-invalid'));

  successMsg.hidden = false;
  successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => { successMsg.hidden = true; }, 8000);
});

/* =============================================
   SCROLL ANIMATIONS
   ============================================= */
const animatables = document.querySelectorAll(
  '.feature-card, .step, .testimonial-card, .contact-info, .form-wrapper'
);

animatables.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(28px)';
  el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

animatables.forEach(el => observer.observe(el));

document.querySelectorAll('.feature-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 80}ms`;
});

/* =============================================
   ACTIVE NAV ON SCROLL
   ============================================= */
const sections   = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navAnchors.forEach(a => {
        a.style.color = a.getAttribute('href') === `#${id}` ? 'var(--color-text)' : '';
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObserver.observe(s));

/* =============================================
   INIT
   ============================================= */
updateNavAuthState();
initJoinFlow();
