/* =============================================
   BIRTHDAY BUDDY — APP SCRIPT
   ============================================= */

/* === Footer year === */
document.getElementById('footer-year').textContent = new Date().getFullYear();

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

// Close nav when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-label', 'Open menu');
  });
});

// Close nav on outside click
document.addEventListener('click', e => {
  if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('is-open');
  }
});

/* =============================================
   FORM VALIDATION & SUBMISSION
   ============================================= */
const form        = document.getElementById('birthday-form');
const submitBtn   = form.querySelector('button[type="submit"]');
const successMsg  = document.getElementById('form-success');

const fields = {
  fullName:  { el: form.querySelector('#full-name'),   errorEl: form.querySelector('#name-error') },
  birthday:  { el: form.querySelector('#birthday'),    errorEl: form.querySelector('#birthday-error') },
  whatsapp:  { el: form.querySelector('#whatsapp'),    errorEl: form.querySelector('#whatsapp-error') },
  groupName: { el: form.querySelector('#group-name'),  errorEl: form.querySelector('#group-error') },
};

function validateField(name, el, errorEl) {
  let message = '';

  if (name === 'fullName') {
    if (!el.value.trim()) message = 'Please enter your full name.';
    else if (el.value.trim().length < 2) message = 'Name must be at least 2 characters.';
  }

  if (name === 'birthday') {
    if (!el.value) {
      message = 'Please enter your birthday.';
    } else {
      const date = new Date(el.value);
      if (isNaN(date.getTime())) message = 'Please enter a valid date.';
    }
  }

  if (name === 'whatsapp') {
    const raw = el.value.trim();
    if (!raw) {
      message = 'Please enter your WhatsApp number.';
    } else if (!/^\+?[\d\s\-().]{7,20}$/.test(raw)) {
      message = 'Please enter a valid phone number (e.g. +1 555 000 0000).';
    }
  }

  if (name === 'groupName') {
    if (!el.value.trim()) message = 'Please enter your WhatsApp group name.';
    else if (el.value.trim().length < 2) message = 'Group name must be at least 2 characters.';
  }

  errorEl.textContent = message;
  el.setAttribute('aria-invalid', message ? 'true' : 'false');
  return message === '';
}

// Live validation on blur
Object.entries(fields).forEach(([name, { el, errorEl }]) => {
  el.addEventListener('blur', () => validateField(name, el, errorEl));
  el.addEventListener('input', () => {
    if (el.getAttribute('aria-invalid') === 'true') {
      validateField(name, el, errorEl);
    }
  });
});

// Submit
form.addEventListener('submit', async e => {
  e.preventDefault();

  // Validate all
  const valid = Object.entries(fields).map(([name, { el, errorEl }]) =>
    validateField(name, el, errorEl)
  ).every(Boolean);

  if (!valid) {
    const firstInvalid = Object.values(fields).find(f => f.el.getAttribute('aria-invalid') === 'true');
    if (firstInvalid) firstInvalid.el.focus();
    return;
  }

  // Simulate submission
  submitBtn.classList.add('is-loading');

  await new Promise(resolve => setTimeout(resolve, 1500));

  submitBtn.classList.remove('is-loading');
  form.reset();
  Object.values(fields).forEach(({ el }) => el.removeAttribute('aria-invalid'));

  successMsg.hidden = false;
  successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Hide success after 8s
  setTimeout(() => { successMsg.hidden = true; }, 8000);
});

/* =============================================
   SCROLL ANIMATIONS (Intersection Observer)
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

/* Staggered feature cards */
document.querySelectorAll('.feature-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 80}ms`;
});

/* =============================================
   ACTIVE NAV LINK ON SCROLL
   ============================================= */
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navAnchors.forEach(a => {
        const match = a.getAttribute('href') === `#${id}`;
        a.style.color = match ? 'var(--color-text)' : '';
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObserver.observe(s));
