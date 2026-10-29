(function () {
  const STORAGE_KEY = 'online-teste-active-unit-id';
  let context = { company: null, units: [], activeUnit: null };

  function csrf() {
    const match = document.cookie.match(/(?:^|;\s*)acert_csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function initials(name) {
    return String(name || 'OT')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  function activeUnitId() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setActiveUnitId(id) {
    if (id) localStorage.setItem(STORAGE_KEY, String(id));
  }

  function clearExamDrafts() {
    try {
      Object.keys(sessionStorage)
        .filter(key => key === 'acert-company-exam-draft' || key.startsWith('acert-company-exam-draft:'))
        .forEach(key => sessionStorage.removeItem(key));
    } catch (_) {}
  }

  function unitHeaders() {
    const id = activeUnitId();
    return id ? { 'X-Company-Unit-ID': id } : {};
  }

  function safeUnits(payload) {
    const units = Array.isArray(payload?.units) ? payload.units : [];
    const stored = activeUnitId();
    const active = payload?.activeUnit
      || units.find(unit => String(unit.id) === String(stored))
      || units.find(unit => unit.isDefault)
      || units[0]
      || null;
    if (active?.id) setActiveUnitId(active.id);
    return { units, active };
  }

  function badgeContent(unit, company) {
    if (unit?.logoData) {
      const img = document.createElement('img');
      img.src = unit.logoData;
      img.alt = unit.name || company?.name || 'Unidade';
      return img;
    }
    return document.createTextNode(initials(unit?.name || company?.name));
  }

  function buildModal(unit) {
    const current = unit || { name: '', responsibleName: '', email: '', logoData: '', status: 'active' };
    const backdrop = document.createElement('div');
    backdrop.className = 'unit-modal-backdrop';
    backdrop.innerHTML = `
      <section class="unit-modal" role="dialog" aria-modal="true" aria-label="Perfil da empresa">
        <header>
          <div>
            <small>Empresa / Filial</small>
            <h2>${current.id ? 'Editar perfil' : 'Nova empresa / filial'}</h2>
          </div>
          <button type="button" class="unit-modal-close" aria-label="Fechar">×</button>
        </header>
        <form class="unit-form">
          <label>Nome da empresa / filial
            <input name="name" required maxlength="140" value="${escapeHtml(current.name)}">
          </label>
          <label>Responsável
            <input name="responsibleName" maxlength="140" value="${escapeHtml(current.responsibleName || '')}">
          </label>
          <label>E-mail de contato
            <input name="email" type="email" maxlength="254" value="${escapeHtml(current.email || '')}">
          </label>
          <label>Status
            <select name="status" ${current.isDefault ? 'disabled' : ''}>
              <option value="active" ${current.status !== 'inactive' ? 'selected' : ''}>Ativa</option>
              <option value="inactive" ${current.status === 'inactive' ? 'selected' : ''}>Inativa</option>
            </select>
          </label>
          <label class="unit-logo-upload">Logo da empresa / filial
            <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
            <span>PNG, JPG, WEBP ou SVG até 2 MB</span>
          </label>
          <input type="hidden" name="logoData" value="${escapeHtml(current.logoData || '')}">
          <div class="unit-logo-preview">${current.logoData ? `<img src="${current.logoData}" alt="Prévia do logo">` : '<span>Sem logo próprio</span>'}</div>
          <p class="unit-form-message" aria-live="polite"></p>
          <footer>
            <button type="button" class="unit-modal-close secondary">Cancelar</button>
            <button type="submit">Salvar</button>
          </footer>
        </form>
      </section>
    `;
    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop || event.target.closest('.unit-modal-close')) close();
    });

    const file = backdrop.querySelector('[name="logoFile"]');
    file?.addEventListener('change', () => {
      const selected = file.files?.[0];
      if (!selected) return;
      if (selected.size > 2_800_000) {
        backdrop.querySelector('.unit-form-message').textContent = 'O logo precisa ter até 2 MB.';
        file.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || '');
        backdrop.querySelector('[name="logoData"]').value = value;
        backdrop.querySelector('.unit-logo-preview').innerHTML = `<img src="${value}" alt="Prévia do logo">`;
      };
      reader.readAsDataURL(selected);
    });

    backdrop.querySelector('.unit-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = form.querySelector('.unit-form-message');
      const button = form.querySelector('[type="submit"]');
      const payload = {
        name: form.name.value.trim(),
        responsibleName: form.responsibleName.value.trim(),
        email: form.email.value.trim(),
        logoData: form.logoData.value,
        status: form.status?.value || current.status || 'active'
      };
      button.disabled = true;
      message.textContent = 'Salvando...';
      try {
        const response = await fetch(current.id ? `/api/company/units/${current.id}` : '/api/company/units', {
          method: current.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf(), ...unitHeaders() },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Não foi possível salvar a unidade.');
        if (data.unit?.id) setActiveUnitId(data.unit.id);
        window.location.reload();
      } catch (error) {
        message.textContent = error.message || 'Não foi possível salvar.';
      } finally {
        button.disabled = false;
      }
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function render(payload) {
    const resolved = safeUnits(payload || {});
    context = { company: payload?.company || context.company, units: resolved.units, activeUnit: resolved.active };
    const area = document.querySelector('.account-area');
    const badge = document.getElementById('company-initials');
    const companyName = document.getElementById('company-name');
    if (!area || !badge || !context.units.length) return;

    const active = context.activeUnit;
    badge.classList.add('unit-badge');
    badge.replaceChildren(badgeContent(active, context.company));
    if (companyName) companyName.textContent = active?.name || context.company?.name || 'Empresa';

    area.querySelector('.unit-switcher')?.remove();
    const existingBadge = area.querySelector('.account-badge');
    const existingName = area.querySelector('#company-name');
    if (existingBadge) existingBadge.style.display = 'none';
    if (existingName) existingName.style.display = 'none';

    const switcher = document.createElement('div');
    switcher.className = 'unit-switcher';
    switcher.innerHTML = `
      <button class="unit-switcher-button" type="button" aria-haspopup="menu" aria-expanded="false" title="Trocar empresa / filial">
        <span class="unit-badge"></span>
        <span class="unit-switcher-name">${escapeHtml(active?.name || context.company?.name || 'Empresa')}</span>
        <b class="unit-switcher-caret">▾</b>
      </button>
      <div class="unit-switcher-menu" role="menu" hidden></div>
    `;

    const badgeContainer = switcher.querySelector('.unit-badge');
    badgeContainer.appendChild(badgeContent(active, context.company));

    const menu = switcher.querySelector('.unit-switcher-menu');
    context.units.forEach(unit => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = String(unit.id) === String(active?.id) ? 'active' : '';
      const unitLogo = unit.logoData
        ? `<img src="${unit.logoData}" style="width:22px;height:22px;object-fit:contain;border-radius:4px;" alt="">`
        : `<span class="unit-mini-avatar" style="width:22px;height:22px;display:grid;place-items:center;background:#eef8f8;color:#137879;border-radius:50%;font-size:10px;font-weight:800;">${escapeHtml(initials(unit.name))}</span>`;

      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;width:100%;">
          ${unitLogo}
          <strong style="flex:1;">${escapeHtml(unit.name)}</strong>
          ${String(unit.id) === String(active?.id) ? '<span style="color:var(--primary,#0f6f73);font-weight:bold;">✓</span>' : ''}
        </div>
      `;
      item.addEventListener('click', () => {
        setActiveUnitId(unit.id);
        clearExamDrafts();
        window.location.reload();
      });
      menu.appendChild(item);
    });

    const actions = document.createElement('div');
    actions.className = 'unit-actions';
    actions.innerHTML = `
      <button type="button" data-unit-edit>⚙️ Dados da empresa / filial</button>
      <button type="button" data-unit-new>➕ Adicionar empresa / filial</button>
    `;
    actions.querySelector('[data-unit-edit]').addEventListener('click', () => buildModal(active));
    actions.querySelector('[data-unit-new]').addEventListener('click', () => buildModal(null));
    menu.appendChild(actions);

    switcher.querySelector('.unit-switcher-button').addEventListener('click', event => {
      event.stopPropagation();
      const isHidden = menu.hidden;
      menu.hidden = !isHidden;
      event.currentTarget.setAttribute('aria-expanded', String(isHidden));
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.unit-switcher')) menu.hidden = true;
    });
    area.insertBefore(switcher, area.querySelector('.logout-button') || null);
  }

  window.companyUnitHeaders = unitHeaders;
  window.companyUnitActiveId = activeUnitId;
  window.renderCompanyUnitSwitcher = render;

  document.addEventListener('DOMContentLoaded', () => {
    const area = document.querySelector('.account-area');
    if (!area || window.__companyUnitBootstrapStarted) return;
    window.__companyUnitBootstrapStarted = true;
    fetch('/api/company/units', { headers: unitHeaders() })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!data || !Array.isArray(data.units)) return;
        const active = data.units.find(unit => String(unit.id) === String(data.activeUnitId))
          || data.units.find(unit => String(unit.id) === String(activeUnitId()))
          || data.units.find(unit => unit.isDefault)
          || data.units[0];
        render({ company: data.company, units: data.units, activeUnit: active });
      })
      .catch(() => {});
  });
})();
