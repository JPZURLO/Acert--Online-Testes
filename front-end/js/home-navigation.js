const loginDropdown = document.querySelector('.site-navigation .dropdown');
const loginTrigger = document.getElementById('link-login');

function setLoginMenu(open) {
  if (!loginDropdown || !loginTrigger) return;
  loginDropdown.classList.toggle('active', open);
  loginTrigger.setAttribute('aria-expanded', String(open));
}

loginTrigger?.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  setLoginMenu(!loginDropdown.classList.contains('active'));
});

document.addEventListener('click', event => {
  if (!event.target.closest('.site-navigation .dropdown')) setLoginMenu(false);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setLoginMenu(false);
    loginTrigger?.focus();
  }
});
