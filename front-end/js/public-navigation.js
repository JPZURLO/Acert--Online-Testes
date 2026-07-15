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

const feedbackStyles = document.createElement('link');
feedbackStyles.rel = 'stylesheet';
feedbackStyles.href = './css/public-owner-feedback.css?v=1';
document.head.appendChild(feedbackStyles);

const banners = {
  'index.html': { src: './assets/images/banner.png', alt: 'Banner institucional da Online Teste' },
  'quemsomos.html': { src: './assets/images/banner.png', alt: 'Banner institucional da Online Teste' },
  'solucoes.html': { src: './assets/images/foto 1.jpg', alt: 'Soluções para testes online' },
  'nossosplanos.html': { src: './assets/images/foto 3.jpg', alt: 'Planos para testes online' }
};

const bannerConfig = banners[currentPage];
const publicHeader = document.querySelector('.public-header');
if (bannerConfig && publicHeader && !document.querySelector('.legacy-banner')) {
  const banner = document.createElement('section');
  banner.className = 'legacy-banner';
  banner.setAttribute('aria-label', bannerConfig.alt);
  const image = document.createElement('img');
  image.src = bannerConfig.src;
  image.alt = bannerConfig.alt;
  banner.appendChild(image);
  publicHeader.insertAdjacentElement('afterend', banner);
}
