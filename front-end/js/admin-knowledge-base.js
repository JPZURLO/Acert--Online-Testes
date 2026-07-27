/**
 * Console Admin — Gerenciamento da Base de Conhecimento (Online Teste)
 * Permite criar, editar, reordenar passos e remover tutoriais.
 * Edição acontece em overlay visual dentro do próprio Admin, igual à visualização do cliente.
 */

(function () {
  'use strict';

  let articlesState = [];
  let filterState = { search: '', category: '' };

  // DOM Elements
  let elTableBody = null;
  let elCount     = null;
  let elSearchInput = null;
  let elCategoryFilter = null;

  const IMG_BASE = './assets/images/base-conhecimento/';

  document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    loadArticles();
  });

  function cacheElements() {
    elTableBody      = document.getElementById('admin-kb-table-body');
    elCount          = document.getElementById('admin-kb-count');
    elSearchInput    = document.getElementById('admin-kb-search');
    elCategoryFilter = document.getElementById('admin-kb-category-filter');
  }

  function bindEvents() {
    const btnNew = document.getElementById('btn-admin-kb-new');
    if (btnNew) btnNew.addEventListener('click', openEditorForNew);

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

  // ---------------------------------------------------------------------------
  // Carga de artigos
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Tabela de artigos
  // ---------------------------------------------------------------------------
  function renderTable() {
    if (!elTableBody) return;

    const filtered = articlesState.filter(art => {
      if (filterState.category && art.category !== filterState.category) return false;
      if (filterState.search) {
        const q = filterState.search;
        return (
          (art.title    || '').toLowerCase().includes(q) ||
          (art.summary  || '').toLowerCase().includes(q) ||
          (art.category || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (elCount) elCount.textContent = `${filtered.length} artigo(s) encontrado(s).`;

    if (filtered.length === 0) {
      elTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:30px;color:var(--muted,#94a3b8);">
            Nenhum artigo encontrado. Clique em "+ Novo artigo" para cadastrar o primeiro tutorial.
          </td>
        </tr>`;
      return;
    }

    elTableBody.innerHTML = filtered.map(art => {
      const audienceBadge = {
        company:     '🏢 Empresa',
        participant: '♙ Participante',
        platform:    '✨ Geral'
      }[art.audience] || '🏢 Empresa';

      const stepsCount  = Array.isArray(art.steps) ? art.steps.length : 0;
      const statusLabel = art.status === 'draft' ? '🟡 Rascunho' : '🟢 Publicado';

      return `
        <tr>
          <td>
            <strong style="color:#0f172a;font-size:13px;">${escapeHTML(art.title)}</strong>
            <small style="display:block;color:#64748b;font-size:11px;">ID: ${escapeHTML(art.id)}</small>
          </td>
          <td><span class="admin-status" style="background:#f1f5f9;color:#334155;">${escapeHTML(art.category || 'Geral')}</span></td>
          <td><span class="admin-status active" style="font-size:11px;">${audienceBadge}</span></td>
          <td><strong>${stepsCount}</strong> passo(s)</td>
          <td><small style="color:#64748b;">${escapeHTML(art.readTime || '3 min')}</small></td>
          <td><small style="color:#64748b;">${statusLabel}</small></td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="admin-primary" type="button" style="padding:4px 14px;font-size:12px;"
                onclick="window.editAdminArticle('${art.id}')">
                <i class="fa-solid fa-pen-to-square"></i> Editar
              </button>
              <button class="admin-secondary danger" type="button" style="padding:4px 10px;font-size:12px;"
                onclick="window.deleteAdminArticle('${art.id}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Abre o Editor Visual em Overlay dentro do Admin
  // ---------------------------------------------------------------------------
  function openEditorForNew() {
    const newArt = {
      id: 'novo-' + Date.now(),
      slug: 'novo-artigo',
      title: 'Novo Artigo',
      category: 'Primeiros passos',
      audience: 'company',
      readTime: '3 min de leitura',
      updatedAt: new Date().toLocaleDateString('pt-BR'),
      lead: 'Escreva aqui o resumo do artigo...',
      summary: 'Escreva aqui o resumo do artigo...',
      alertTip: '',
      status: 'draft',
      steps: [],
      blocks: []
    };
    openEditorOverlay(newArt);
  }

  window.openModalForCreate = openEditorForNew;

  window.editAdminArticle = function (id) {
    const art = articlesState.find(a => a.id === id);
    if (!art) return;
    openEditorOverlay(art);
  };

  function openEditorOverlay(article) {
    const overlay = document.getElementById('kb-editor-overlay');
    const articleView = document.getElementById('kb-article-view');
    if (!overlay || !articleView) return;

    // Renderiza o artigo como o cliente vê
    articleView.innerHTML = buildArticleHTML(article);

    // Mostra o overlay
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    // Guarda o objeto no window para o editor acessar
    window.currentKbArticleObj = article;

    // Ativa o editor visual inline
    if (typeof window.enableInlineKbEditor === 'function') {
      window.enableInlineKbEditor(article);
    }

    // Após fechar, recarrega a lista
    window._kbEditorOnClose = async () => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      await loadArticles();
    };
  }

  // ---------------------------------------------------------------------------
  // Monta o HTML do artigo igual à visualização do cliente (BaseConhecimento)
  // ---------------------------------------------------------------------------
  function buildArticleHTML(article) {
    const steps = Array.isArray(article.steps) ? article.steps : [];

    const stepsHTML = steps.length > 0 ? steps.map((step, i) => {
      const imgSrc   = step.image || (IMG_BASE + '11-empresa-dashboard-main.png');
      const altText  = escapeHTML(step.alt || step.title);
      const capText  = escapeHTML(step.caption || step.title);
      const fileName = step.filename || 'print-da-tela.png';

      return `
        <div class="kb-step-card kb-block-wrapper">
          <div class="kb-step-header">
            <span class="kb-step-number">${i + 1}</span>
            <h3 class="kb-step-title">${escapeHTML(step.title)}</h3>
          </div>
          <p class="kb-step-desc">${escapeHTML(step.desc)}</p>
          <figure class="kb-step-figure">
            <div class="kb-step-figure-badge">🖼️ Print: <code>${escapeHTML(fileName)}</code></div>
            <button class="kb-image-zoom-btn" type="button">
              <img src="${imgSrc}" alt="${altText}" loading="lazy"
                onerror="this.src='./assets/images/Logo.png';">
            </button>
            <figcaption>
              <span>${capText}</span>
            </figcaption>
          </figure>
        </div>`;
    }).join('') : `
      <div class="kb-step-card kb-block-wrapper" style="text-align:center;padding:40px;color:#94a3b8;">
        <i class="fa-solid fa-plus" style="font-size:24px;margin-bottom:12px;display:block;"></i>
        Nenhum passo ainda. Use <strong>+ Passo</strong> na toolbar para adicionar.
      </div>`;

    const alertHTML = article.alertTip ? `
      <div class="kb-alert kb-alert-tip">
        <span class="kb-alert-icon">💡</span>
        <div><strong>Dica Útil:</strong> ${escapeHTML(article.alertTip)}</div>
      </div>` : '';

    return `
      <div class="kb-animated">
        <div class="kb-reader-layout">
          <main class="kb-article-content">
            <header class="kb-article-header">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                <span class="kb-badge kb-badge-company">🏢 Para Empresas</span>
                <span class="kb-read-time">⏱️ ${escapeHTML(article.readTime || '3 min de leitura')}</span>
                <span class="kb-read-time">📅 ${escapeHTML(article.updatedAt || '')}</span>
              </div>
              <h1 class="kb-header-title" style="font-size:28px;font-weight:850;margin:12px 0 8px;">
                ${escapeHTML(article.title)}
              </h1>
              <p class="kb-header-lead kb-article-lead">
                ${escapeHTML(article.lead || article.summary || '')}
              </p>
            </header>

            <div class="kb-article-body">
              <h2 style="font-size:20px;font-weight:850;margin:28px 0 16px;">
                Passo a Passo Guiado com Imagens
              </h2>
              <div class="kb-article-steps">
                ${stepsHTML}
              </div>
              ${alertHTML}
            </div>
          </main>

          <aside class="kb-article-sidebar">
            <div class="kb-sidebar-card">
              <div class="kb-sidebar-title">Dicas de Edição</div>
              <ul style="margin:0;padding:0 0 0 16px;font-size:12px;color:#64748b;line-height:1.8;">
                <li>Clique em qualquer texto para editar</li>
                <li>Use a toolbar para formatar</li>
                <li>Hover nos passos para ver ações</li>
                <li>📷 Foto troca a imagem do passo</li>
                <li>Salve como rascunho ou publique</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Excluir artigo
  // ---------------------------------------------------------------------------
  window.deleteAdminArticle = async function (id) {
    const art = articlesState.find(a => a.id === id);
    if (!confirm(`Deseja realmente excluir o artigo "${art?.title || id}"?`)) return;

    try {
      const csrfCookie = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('acert_csrf_token='));
      const csrf = csrfCookie ? csrfCookie.split('=')[1] : '';

      const res = await fetch(`/api/admin/knowledge-base/${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrf }
      });

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

  // ---------------------------------------------------------------------------
  // Renumerar passos (chamado pelo editor)
  // ---------------------------------------------------------------------------
  window.renumberAdminKbSteps = function () {
    const container = document.querySelector('#kb-article-view .kb-article-steps');
    if (!container) return;
    Array.from(container.children).forEach((card, i) => {
      const numEl = card.querySelector('.kb-step-number');
      if (numEl) numEl.textContent = i + 1;
    });
  };

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------
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
