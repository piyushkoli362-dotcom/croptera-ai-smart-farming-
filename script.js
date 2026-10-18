const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
if (menu && nav) {
  menu.addEventListener('click', () => {
    const isOpen = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', String(!isOpen));
    nav.classList.toggle('open', !isOpen);
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) {
      menu.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    }
  });
}
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

// Local development writes to Excel. A deployed site writes to a private
// Google Sheet after its server-side integration has been configured.
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const forms = document.querySelectorAll('.interest-form');
forms.forEach(form => {
  const type = form.dataset.form;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.form-status');
  button.disabled = !isLocal;
  status.textContent = isLocal
    ? 'This local preview saves submitted information to a private Excel workbook on this computer.'
    : 'Checking whether online submissions are available…';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    data.type = type;
    data.consent = form.querySelector('[name="consent"]').checked;
    button.disabled = true;
    status.textContent = 'Saving your information…';
    try {
      const response = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok || result.saved !== true) throw new Error(result.error || 'Submission could not be saved.');
      form.reset();
      status.textContent = 'Saved successfully. Thank you for your interest.';
    } catch (error) {
      status.textContent = error.message || 'Submission could not be saved. Please try again later.';
    } finally {
      button.disabled = false;
    }
  });
});

if (!isLocal && forms.length) {
  fetch('/api/status', { cache: 'no-store' })
    .then(response => response.ok ? response.json() : { ready: false })
    .then(({ ready }) => {
      forms.forEach(form => {
        form.querySelector('button[type="submit"]').disabled = !ready;
        form.querySelector('.form-status').textContent = ready
          ? 'Your information will be saved to Croptera AI’s private response sheet.'
          : 'Online submissions are not connected yet. Please check back later.';
      });
    })
    .catch(() => {
      forms.forEach(form => {
        form.querySelector('.form-status').textContent = 'Online submissions are temporarily unavailable.';
      });
    });
}
