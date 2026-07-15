const publicLoginDropdown = document.querySelector('.public-login-dropdown');
const publicLoginTrigger = document.querySelector('.public-login-trigger');

function setPublicLoginMenu(open) {
  if (!publicLoginDropdown || !publicLoginTrigger) return;
  publicLoginDropdown.classList.toggle('active', open);
  publicLoginTrigger.setAttribute('aria-expanded', String(open));
}

publicLoginTrigger?.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  setPublicLoginMenu(!publicLoginDropdown.classList.contains('active'));
});

document.addEventListener('click', event => {
  if (!event.target.closest('.public-login-dropdown')) setPublicLoginMenu(false);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setPublicLoginMenu(false);
    publicLoginTrigger?.focus();
  }
});

const currentPage = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
document.querySelectorAll('.public-nav-link').forEach(link => {
  const targetPage = new URL(link.href, window.location.href).pathname.split('/').pop().toLowerCase() || 'index.html';
  if (targetPage === currentPage) {
    link.classList.add('active');
    link.setAttribute('aria-current', 'page');
  }
});
