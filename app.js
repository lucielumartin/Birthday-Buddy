/* =============================================
   BIRTHDAY BUDDY — LANDING PAGE SCRIPT
   =============================================
   Replace GOOGLE_CLIENT_ID with your real
   Client ID from Google Cloud Console:
   https://console.cloud.google.com/apis/credentials
   ============================================= */

const GOOGLE_CLIENT_ID = '994888306541-mght883sg72ug6ds0ab6c6da5kr8msp5.apps.googleusercontent.com';

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
   THEME TOGGLE (light / dark)
   ============================================= */
(function initThemeToggle() {
  const btn  = document.getElementById('theme-toggle');
  const icon = btn?.querySelector('.theme-toggle-icon');
  if (!btn || !icon) return;

  function sync() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    icon.textContent = isLight ? '☀️' : '🌙';
    btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    btn.setAttribute('aria-pressed', String(isLight));
  }

  sync();
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('bb_theme', next);
    sync();
  });
})();

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

function makeMockSignInBtn(container) {
  if (!container) return;
  const btn = document.createElement('button');
  btn.className = 'btn btn-ghost';
  btn.style.cssText = 'border-color:rgba(217,70,239,0.5);';
  btn.innerHTML = 'Sign In';
  btn.title = 'Dev mode: replace GOOGLE_CLIENT_ID in app.js and dashboard.js';
  btn.addEventListener('click', () => {
    localStorage.setItem('bb_user', JSON.stringify({
      sub: 'dev-user-001', name: 'Dev User', given_name: 'Dev',
      email: 'dev@birthdaybuddy.app', picture: '',
    }));
    window.location.href = 'dashboard.html';
  });
  container.appendChild(btn);
}

function initGoogleAuth(containerId = 'hero-signin-container') {
  if (typeof google === 'undefined' || !google?.accounts?.id) {
    window.addEventListener('load', () => initGoogleAuth(containerId), { once: true });
    return;
  }

  if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
    makeMockSignInBtn(document.getElementById(containerId));
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
  });

  const container = document.getElementById(containerId);
  if (container) {
    google.accounts.id.renderButton(container, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      logo_alignment: 'left',
    });
  }
}

/* =============================================
   AUTH STATE — update nav + hero
   ============================================= */
function updateNavAuthState() {
  const user = getUser();
  const navSignedIn       = document.getElementById('nav-auth-signed-in');
  const heroSignedOut     = document.getElementById('hero-auth-signed-out');
  const heroSignedIn      = document.getElementById('hero-auth-signed-in');

  if (user) {
    if (navSignedIn)   navSignedIn.hidden   = false;
    if (heroSignedOut) heroSignedOut.hidden  = true;
    if (heroSignedIn)  heroSignedIn.hidden   = false;

    const avatar = document.getElementById('nav-avatar');
    if (avatar && user.picture) { avatar.src = user.picture; avatar.alt = user.name || ''; }
    else if (avatar) avatar.style.display = 'none';

    const nameEl = document.getElementById('nav-username');
    if (nameEl) nameEl.textContent = user.given_name || user.name?.split(' ')[0] || 'You';
  } else {
    if (navSignedIn)   navSignedIn.hidden   = true;
    if (heroSignedOut) heroSignedOut.hidden  = false;
    if (heroSignedIn)  heroSignedIn.hidden   = true;
    initGoogleAuth();
  }
}

/* Guest button — scroll to form (or how-it-works if no invite) */
document.getElementById('guest-btn')?.addEventListener('click', () => {
  const target = joinGroupId ? '#contact' : '#how-it-works';
  document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

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

  if (joinGroupId) {
    setTimeout(() => renderGroupView(joinGroupId, decodeURIComponent(joinGroupName || '')), 600);
  }
});

/* =============================================
   NEWSLETTER SUBSCRIPTION
   ============================================= */
const newsletterForm = document.getElementById('newsletter-form');

if (newsletterForm) {
  const newsletterSubmitBtn  = newsletterForm.querySelector('button[type="submit"]');
  const newsletterSuccessMsg = document.getElementById('newsletter-success');
  const newsletterEmail      = newsletterForm.querySelector('#newsletter-email');
  const newsletterEmailError = newsletterForm.querySelector('#newsletter-email-error');
  const newsletterConsent      = newsletterForm.querySelector('#newsletter-consent');
  const newsletterConsentError = newsletterForm.querySelector('#newsletter-consent-error');

  function validateNewsletterEmail() {
    let message = '';
    if (!newsletterEmail.value.trim()) message = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail.value.trim())) message = 'Please enter a valid email address.';
    newsletterEmailError.textContent = message;
    newsletterEmail.setAttribute('aria-invalid', message ? 'true' : 'false');
    return message === '';
  }

  function validateNewsletterConsent() {
    const message = newsletterConsent.checked ? '' : 'Please agree to receive emails to subscribe.';
    newsletterConsentError.textContent = message;
    newsletterConsent.setAttribute('aria-invalid', message ? 'true' : 'false');
    return message === '';
  }

  newsletterEmail.addEventListener('blur', validateNewsletterEmail);
  newsletterEmail.addEventListener('input', () => {
    if (newsletterEmail.getAttribute('aria-invalid') === 'true') validateNewsletterEmail();
  });
  newsletterConsent.addEventListener('change', validateNewsletterConsent);

  newsletterForm.addEventListener('submit', async e => {
    e.preventDefault();

    const validEmail   = validateNewsletterEmail();
    const validConsent = validateNewsletterConsent();
    if (!validEmail) { newsletterEmail.focus(); return; }
    if (!validConsent) { newsletterConsent.focus(); return; }

    newsletterSubmitBtn.classList.add('is-loading');
    await new Promise(r => setTimeout(r, 600));
    newsletterSubmitBtn.classList.remove('is-loading');

    newsletterForm.reset();
    newsletterEmail.removeAttribute('aria-invalid');
    newsletterConsent.removeAttribute('aria-invalid');

    newsletterSuccessMsg.hidden = false;
    newsletterSuccessMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => { newsletterSuccessMsg.hidden = true; }, 8000);
  });
}

/* =============================================
   GROUP BIRTHDAY VIEW (guest post-registration)
   ============================================= */
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatBirthday(dateStr) {
  const [, month, day] = dateStr.split('-');
  const d = new Date(2000, parseInt(month) - 1, parseInt(day));
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function isTodaysBirthday(dateStr) {
  const today = new Date();
  const [, month, day] = dateStr.split('-');
  return parseInt(month) === today.getMonth() + 1 && parseInt(day) === today.getDate();
}

function renderGroupView(groupId, groupName) {
  const section  = document.getElementById('group-view');
  const nameEl   = document.getElementById('group-view-name');
  const listEl   = document.getElementById('group-members-list');
  const ctaEl    = document.getElementById('group-view-cta');
  const signinEl = document.getElementById('group-view-signin');
  if (!section || !listEl) return;

  nameEl.textContent = groupName;

  const members = JSON.parse(localStorage.getItem(`bb_members_${groupId}`) || '[]');
  if (members.length === 0) {
    listEl.innerHTML = '<p class="group-members-empty">You\'re the first one here — share the invite link to get your crew registered!</p>';
  } else {
    listEl.innerHTML = members.map(m => `
      <div class="member-bday-card">
        <div class="member-bday-initial">${escapeHtml(m.name.charAt(0).toUpperCase())}</div>
        <div class="member-bday-info">
          <strong class="member-bday-name">${escapeHtml(m.name)}</strong>
          <span class="member-bday-date">🎂 ${formatBirthday(m.birthday)}${isTodaysBirthday(m.birthday) ? ' — <span class="today-badge">Today!</span>' : ''}</span>
        </div>
      </div>
    `).join('');
  }

  // Show login CTA only if not already signed in
  if (!getUser() && ctaEl && signinEl) {
    ctaEl.hidden = false;
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
      makeMockSignInBtn(signinEl);
    } else {
      google.accounts.id.renderButton(signinEl, {
        theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with',
      });
    }
  } else if (ctaEl) {
    ctaEl.hidden = true;
  }

  section.hidden = false;
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

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
