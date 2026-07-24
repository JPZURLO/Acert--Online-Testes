/**
 * Console Admin — Gerenciamento da Base de Conhecimento (Online Teste)
 * Permite criar, editar, reordenar passos, vincular prints e remover tutoriais.
 */

(function () {
  'use strict';

  let articlesState = [];
  let filterState = { search: '', category: '' };

  // DOM Elements
  let elTableBody = null;
  let elCount = null;
  let elSearchInput = null;
  let elCategoryFilter = null;
  let elModal = null;
  let elForm = null;
  let elStepsContainer = null;
  let elFormMessage = null;

  document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    loadArticles();
  });

  function cacheElements() {
    elTableBody = document.getElementById('admin-kb-table-body');
    elCount = document.getElementById('admin-kb-count');
    elSearchInput = document.getElementById('admin-kb-search');
    elCategoryFilter = document.getElementById('admin-kb-category-filter');
    elModal = document.getElementById('admin-kb-modal');
    elForm = document.getElementById('admin-kb-form');
    elStepsContainer = document.getElementById('admin-kb-steps-container');
    elFormMessage = document.getElementById('admin-kb-form-message');
  }

  function bindEvents() {
    const btnNew = document.getElementById('btn-admin-kb-new');
    if (btnNew) btnNew.addEventListener('click', () => openModalForCreate());

    const btnCloseModal = document.getElementById('close-admin-kb-modal');
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

    const btnCancel = document.getElementById('cancel-admin-kb');
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    const btnAddStep = document.getElementById('btn-admin-kb-add-step');
    if (btnAddStep) btnAddStep.addEventListener('click', () => addStepRow());

    if (elForm) elForm.addEventListener('submit', handleFormSubmit);

    if (elSearchInput) {
      elSearchInput.addEventListener('input', (e) => {
        filterState.search = e.target.value.trim().toLowerCase();
        renderTable();
      });
    }

    if (elCategoryFilter) {
      elCategoryFilter.addEventListener('change', (e) => {
        filterState.category = e.target.value;
        renderTable();
      });
    }
  }

  async function loadArticles() {
    if (elCount) elCount.textContent = 'Carregando artigos...';
    try {
      const res = await fetch('/api/admin/knowledge-base');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.articles) && data.articles.length > 0) {
          articlesState = data.articles;
          renderTable();
          return;
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar artigos do admin:', err);
    }

    // Se a API retornar vazio ou falhar, tenta carregar o fallback
    try {
      const resPub = await fetch('/api/knowledge-base/articles');
      if (resPub.ok) {
        const dataPub = await resPub.json();
        if (dataPub.success && Array.isArray(dataPub.articles)) {
          articlesState = dataPub.articles;
        }
      }
    } catch (_) {}

    renderTable();
  }

  function renderTable() {
    if (!elTableBody) return;

    const filtered = articlesState.filter(art => {
      if (filterState.category && art.category !== filterState.category) return false;
      if (filterState.search) {
        const q = filterState.search;
        const inTitle = (art.title || '').toLowerCase().includes(q);
        const inSummary = (art.summary || '').toLowerCase().includes(q);
        const inCategory = (art.category || '').toLowerCase().includes(q);
        return inTitle || inSummary || inCategory;
      }
      return true;
    });

    if (elCount) elCount.textContent = `${filtered.length} artigo(s) encontrado(s).`;

    if (filtered.length === 0) {
      elTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 30px; color: var(--muted, #94a3b8);">
            Nenhum artigo encontrado. Clique em "+ Novo artigo" para cadastrar o primeiro tutorial.
          </td>
        </tr>
      `;
      return;
    }

    elTableBody.innerHTML = filtered.map(art => {
      const audienceBadge = {
        company: '🏢 Empresa',
        participant: '♙ Participante',
        platform: '✨ Geral'
      }[art.audience] || '🏢 Empresa';

      const stepsCount = Array.isArray(art.steps) ? art.steps.length : 0;

      return `
        <tr>
          <td>
            <strong style="color: #0f172a; font-size: 13px;">${escapeHTML(art.title)}</strong>
            <small style="display: block; color: #64748b; font-size: 11px;">ID: ${escapeHTML(art.id)}</small>
          </td>
          <td><span class="admin-status" style="background: #f1f5f9; color: #334155;">${escapeHTML(art.category || 'Geral')}</span></td>
          <td><span class="admin-status active" style="font-size: 11px;">${audienceBadge}</span></td>
          <td><strong>${stepsCount}</strong> passo(s)</td>
          <td><small style="color: #64748b;">${escapeHTML(art.readTime || '3 min')}</small></td>
          <td><small style="color: #64748b;">${escapeHTML(art.updatedAt || '—')}</small></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="admin-secondary" type="button" style="padding: 4px 10px; font-size: 11px;" onclick="window.editAdminArticle('${art.id}')">
                <i class="fa-solid fa-pen-to-square"></i> Editar
              </button>

              <button class="admin-secondary danger" type="button" style="padding: 4px 10px; font-size: 11px;" onclick="window.deleteAdminArticle('${art.id}')">
                <i class="fa-solid fa-trash"></i> Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.openModalForCreate = function () {
    if (!elForm) return;
    elForm.reset();
    document.getElementById('admin-kb-id').value = '';
    document.getElementById('admin-kb-modal-title').textContent = 'Novo Artigo';
    if (elFormMessage) elFormMessage.textContent = '';
    if (elStepsContainer) elStepsContainer.innerHTML = '';
    addStepRow(); // Inicia com 1 passo por padrão
    if (elModal) elModal.hidden = false;
  };

  window.editAdminArticle = function (id) {
    const art = articlesState.find(a => a.id === id);
    if (!art || !elForm) return;

    document.getElementById('admin-kb-modal-title').textContent = `Editar Artigo: ${art.title}`;
    document.getElementById('admin-kb-id').value = art.id;
    document.getElementById('admin-kb-title').value = art.title || '';
    document.getElementById('admin-kb-category').value = art.category || 'Primeiros passos';
    document.getElementById('admin-kb-audience').value = art.audience || 'company';
    document.getElementById('admin-kb-readtime').value = art.readTime || '3 min de leitura';
    document.getElementById('admin-kb-lead').value = art.lead || art.summary || '';
    document.getElementById('admin-kb-alert').value = art.alertTip || '';

    if (elFormMessage) elFormMessage.textContent = '';
    if (elStepsContainer) elStepsContainer.innerHTML = '';

    if (Array.isArray(art.steps) && art.steps.length > 0) {
      art.steps.forEach(step => addStepRow(step));
    } else {
      addStepRow();
    }

    if (elModal) elModal.hidden = false;
  };

  window.deleteAdminArticle = async function (id) {
    const art = articlesState.find(a => a.id === id);
    if (!confirm(`Deseja realmente excluir o artigo "${art?.title || id}"?`)) return;

    try {
      const res = await fetch(`/api/admin/knowledge-base/${id}`, { method: 'DELETE' });
      if (res.ok) {
        articlesState = articlesState.filter(a => a.id !== id);
        renderTable();
        showToast('Artigo excluído com sucesso.');
      } else {
        alert('Não foi possível excluir o artigo.');
      }
    } catch (err) {
      console.error('Erro ao excluir artigo:', err);
    }
  };

  function addStepRow(stepData = {}) {
    if (!elStepsContainer) return;

    const stepIndex = elStepsContainer.children.length + 1;
    const card = document.createElement('div');
    card.className = 'admin-kb-step-item';
    card.style.cssText = 'padding: 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; display: grid; gap: 10px;';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong style="font-size: 13px; color: #0f172a;">Passo <span class="step-num-display">${stepIndex}</span></strong>
        <button class="admin-secondary danger" type="button" style="padding: 2px 8px; font-size: 11px;" onclick="this.closest('.admin-kb-step-item').remove(); window.renumberAdminKbSteps();">
          <i class="fa-solid fa-times"></i> Remover
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: 12px;">Título do Passo *
          <input class="admin-input step-title" required value="${escapeHTML(stepData.title || '')}" placeholder="Ex: Acesse o menu Participantes">
        </label>
        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: 12px;">Nome do Print de Tela (Imagem)
          <input class="admin-input step-filename" value="${escapeHTML(stepData.filename || '')}" placeholder="Ex: 12-empresa-participantes-listagem.png">
        </label>
      </div>

      <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: 12px;">Descrição do Passo *
        <textarea class="admin-input step-desc" rows="2" required placeholder="Explicação clara do que o usuário deve fazer neste passo...">${escapeHTML(stepData.desc || '')}</textarea>
      </label>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: 12px;">Legenda da Imagem (Caption)
          <input class="admin-input step-caption" value="${escapeHTML(stepData.caption || '')}" placeholder="Ex: Tela principal de Gestão de Participantes">
        </label>
        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: 12px;">Texto Alternativo (Alt)
          <input class="admin-input step-alt" value="${escapeHTML(stepData.alt || '')}" placeholder="Ex: Lista de candidatos cadastrados">
        </label>
      </div>
    `;

    elStepsContainer.appendChild(card);
  }

  window.renumberAdminKbSteps = function () {
    if (!elStepsContainer) return;
    Array.from(elStepsContainer.children).forEach((child, idx) => {
      const numSpan = child.querySelector('.step-num-display');
      if (numSpan) numSpan.textContent = idx + 1;
    });
  };

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (elFormMessage) elFormMessage.textContent = 'Salvando artigo...';

    const id = document.getElementById('admin-kb-id').value;
    const title = document.getElementById('admin-kb-title').value.trim();
    const category = document.getElementById('admin-kb-category').value;
    const audience = document.getElementById('admin-kb-audience').value;
    const readTime = document.getElementById('admin-kb-readtime').value.trim();
    const lead = document.getElementById('admin-kb-lead').value.trim();
    const alertTip = document.getElementById('admin-kb-alert').value.trim();

    // Coleta os passos
    const stepCards = Array.from(elStepsContainer.children);
    const steps = stepCards.map((card, idx) => {
      const stTitle = card.querySelector('.step-title').value.trim();
      const stDesc = card.querySelector('.step-desc').value.trim();
      const stFilename = card.querySelector('.step-filename').value.trim();
      const stCaption = card.querySelector('.step-caption').value.trim();
      const stAlt = card.querySelector('.step-alt').value.trim();

      const imagePath = stFilename ? `./assets/images/base-conhecimento/${stFilename}` : './assets/images/base-conhecimento/11-empresa-dashboard-main.png';

      return {
        num: idx + 1,
        title: stTitle,
        desc: stDesc,
        filename: stFilename || 'print-da-tela.png',
        image: imagePath,
        caption: stCaption || stTitle,
        alt: stAlt || stTitle
      };
    });

    const payload = {
      id: id || undefined,
      title,
      category,
      audience,
      readTime,
      lead,
      alertTip,
      steps
    };

    try {
      const res = await fetch('/api/admin/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Artigo salvo com sucesso!');
        closeModal();
        await loadArticles();
      } else {
        if (elFormMessage) elFormMessage.textContent = data.message || 'Erro ao salvar o artigo.';
      }
    } catch (err) {
      if (elFormMessage) elFormMessage.textContent = 'Falha na comunicação com o servidor.';
    }
  }

  function closeModal() {
    if (elModal) elModal.hidden = true;
  }

  function showToast(msg) {
    const region = document.getElementById('admin-toast-region');
    if (!region) return;
    const t = document.createElement('div');
    t.className = 'admin-toast';
    t.textContent = msg;
    region.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
