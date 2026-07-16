function licenseBanner(message) {
  const host = document.querySelector('.page-content') || document.querySelector('main');
  if (!host || document.querySelector('.license-alert')) return;
  const alert = document.createElement('div');
  alert.className = 'license-alert';
  alert.setAttribute('role', 'alert');
  alert.textContent = message;
  alert.style.cssText = 'margin:0 0 18px;padding:13px 16px;color:#78491b;background:#fff4dc;border:1px solid #f1d39c;border-radius:10px;font:600 12px/1.45 Inter,Segoe UI,Arial,sans-serif';
  host.prepend(alert);
}

function applyLicenseFeatures(license) {
  const features = new Set(license.features || []);
  const hide = selector => document.querySelectorAll(selector).forEach(element => { element.hidden = true; });
  if (!features.has('exams')) hide('[href*="login_cliente"], [data-view="exams"]');
  if (!features.has('participants')) hide('[href*="Participante"]');
  if (!features.has('results')) hide('[href*="Resultados"]');
  if (!features.has('excel_import')) hide('.question-import-card, #question-import-errors');
  if (!features.has('branding')) hide('#branding-panel, [data-scroll="branding-panel"]');
  if (!features.has('export_results')) hide('#export-excel, #print-report, #share-result, #print-individual');

  const page = window.location.pathname.split('/').pop().toLowerCase();
  const required = page === 'login_cliente.html' ? 'exams' : page === 'participante.html' ? 'participants' : page === 'resultados.html' ? 'results' : null;
  if (required && !features.has(required)) licenseBanner('Este módulo não está incluído na licença atual da empresa. Fale com o administrador para alterar o plano.');
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/company/license');
    const data = await response.json();
    if (data.license) applyLicenseFeatures(data.license);
    if (response.status === 423) licenseBanner(data.message || 'A licença da empresa não está ativa.');
  } catch (_) {
    // A tela principal continuará tratando indisponibilidade e autenticação.
  }
});
