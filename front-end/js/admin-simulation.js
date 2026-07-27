(function () {
  'use strict';

  function csrf() {
    const item = document.cookie.split('; ').find(value => value.startsWith('acert_csrf_token='));
    return item ? decodeURIComponent(item.split('=').slice(1).join('=')) : '';
  }

  async function stopSimulation() {
    const response = await fetch('/api/admin/impersonation/stop', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf(), 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await response.json().catch(() => ({}));
    window.location.href = data.redirectUrl || 'Admin.html';
  }

  function installBanner(status) {
    if (!status?.active || document.getElementById('admin-simulation-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'admin-simulation-banner';
    banner.className = 'admin-simulation-banner';
    const label = status.mode === 'participant' ? 'Participante' : 'Empresa';
    banner.innerHTML = `
      <div>
        <strong>Modo administrador: visualizando como ${label}</strong>
        <span>${status.targetName || 'Conta'} — nenhuma alteração será salva nesta simulação.</span>
      </div>
      <button type="button" id="admin-simulation-exit">Sair da simulação</button>
    `;
    const style = document.createElement('style');
    style.textContent = `
      body{padding-top:58px!important}
      .admin-simulation-banner{position:fixed;inset:0 0 auto 0;min-height:58px;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;background:#fff6da;border-bottom:1px solid #e9c76a;color:#5c3d00;z-index:99999;box-shadow:0 8px 24px rgba(70,44,0,.12);font-family:Inter,"Segoe UI",Arial,sans-serif}
      .admin-simulation-banner div{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px}
      .admin-simulation-banner strong:before{content:"⚠";margin-right:8px}
      .admin-simulation-banner span{font-size:12px;color:#775415}
      .admin-simulation-banner button{height:36px;padding:0 14px;border:1px solid #d9ad38;border-radius:9px;background:#fff;color:#5c3d00;font-size:12px;font-weight:800;cursor:pointer}
      .admin-simulation-banner button:hover{background:#fffaf0}
      @media(max-width:720px){body{padding-top:92px!important}.admin-simulation-banner{align-items:flex-start;flex-direction:column}.admin-simulation-banner button{width:100%}}
    `;
    document.head.appendChild(style);
    document.body.prepend(banner);
    document.getElementById('admin-simulation-exit')?.addEventListener('click', stopSimulation);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('/api/impersonation/status', { cache: 'no-store' });
      const status = await response.json();
      installBanner(status);
    } catch (_) {
      // Sem sessão ou sem backend disponível: não exibe nada.
    }
  });
})();
