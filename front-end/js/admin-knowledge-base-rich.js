/**
 * Console Admin — Gerenciamento do Manual do Usuário / Base de Conhecimento
 * Permite criar, editar, visualizar prévia e remover artigos diretamente no módulo Admin,
 * mantendo o menu lateral, cabeçalho, permissões e identidade visual do painel administrativo.
 */

(function () {
  'use strict';

  let articlesState = [];
  let filterState = { search: '', category: '' };
  let currentArticle = null;
  let selectedFigure = null;

  // Elementos da Listagem
  let elListView = null;
  let elTableBody = null;
  let elCount = null;
  let elSearchInput = null;
  let elCategoryFilter = null;

  // Elementos do Editor
  let elEditorView = null;
  let elDocument = null;
  let elTitle = null;
  let elCategory = null;
  let elAudience = null;
  let elReadTime = null;
  let elStatusSelect = null;
  let elLead = null;
  let elAlertInput = null;
  let elFile = null;
  let elStatusText = null;

  // Elementos da Prévia
  let elPreviewContainer = null;
  let elPreviewBody = null;

  document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindListEvents();
    bindEditorEvents();
    loadArticles().then(() => {
      handleHashRoute();
    });

    window.addEventListener('hashchange', handleHashRoute);
  });

  function cacheElements() {
    elListView = document.getElementById('admin-kb-list-view');
    elTableBody = document.getElementById('admin-kb-table-body');
    elCount = document.getElementById('admin-kb-count');
    elSearchInput = document.getElementById('admin-kb-search');
    elCategoryFilter = document.getElementById('admin-kb-category-filter');

    elEditorView = document.getElementById('kb-rich-editor');
    elDocument = document.getElementById('kb-rich-document');
    elTitle = document.getElementById('kb-rich-title');
    elCategory = document.getElementById('kb-rich-category');
    elAudience = document.getElementById('kb-rich-audience');
    elReadTime = document.getElementById('kb-rich-readtime');
    elStatusSelect = document.getElementById('kb-rich-status-select');
    elLead = document.getElementById('kb-rich-lead');
    elAlertInput = document.getElementById('kb-rich-alert-input');
    elFile = document.getElementById('kb-rich-file');
    elStatusText = document.getElementById('kb-rich-status');

    elPreviewContainer = document.getElementById('kb-rich-preview-container');
    elPreviewBody = document.getElementById('admin-kb-preview-body');
  }

  function bindListEvents() {
    const btnNew = document.getElementById('btn-admin-kb-new');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        window.location.hash = '#knowledge-base/novo';
      });
    }

    if (elSearchInput) {
      elSearchInput.addEventListener('input', (event) => {
        filterState.search = event.target.value.trim().toLowerCase();
        renderTable();
      });
    }

    if (elCategoryFilter) {
      elCategoryFilter.addEventListener('change', (event) => {
        filterState.category = event.target.value;
        renderTable();
      });
    }
  }

  function bindEditorEvents() {
    const back = document.getElementById('kb-rich-back');
    const cancel = document.getElementById('kb-rich-cancel');
    const saveDraft = document.getElementById('kb-rich-save-draft');
    const saveDraftBottom = document.getElementById('kb-rich-save-draft-bottom');
    const publish = document.getElementById('kb-rich-publish');
    const publishBottom = document.getElementById('kb-rich-publish-bottom');
    const preview = document.getElementById('kb-rich-preview');
    const deleteBtn = document.getElementById('kb-rich-delete');
    const addStep = document.getElementById('kb-rich-add-step');
    const addAlert = document.getElementById('kb-rich-add-alert');
    const uploadImage = document.getElementById('kb-rich-upload-image');
    const attach = document.getElementById('kb-rich-attach');
    const copyLink = document.getElementById('kb-rich-copy-link');
    const blockStyle = document.getElementById('kb-rich-block-style');

    const previewBack = document.getElementById('btn-admin-kb-preview-back');
    const previewPublish = document.getElementById('btn-admin-kb-preview-publish');

    if (back) back.addEventListener('click', navigateToList);
    if (cancel) cancel.addEventListener('click', navigateToList);
    if (saveDraft) saveDraft.addEventListener('click', () => saveArticle('draft'));
    if (saveDraftBottom) saveDraftBottom.addEventListener('click', () => saveArticle('draft'));
    if (publish) publish.addEventListener('click', () => saveArticle('published'));
    if (publishBottom) publishBottom.addEventListener('click', () => saveArticle('published'));
    if (preview) preview.addEventListener('click', () => {
      if (currentArticle) {
        window.location.hash = `#knowledge-base/${encodeURIComponent(currentArticle.id)}/visualizar`;
      }
    });
    if (deleteBtn) deleteBtn.addEventListener('click', () => {
      if (currentArticle && currentArticle.id) {
        window.deleteAdminArticle(currentArticle.id);
      }
    });

    if (previewBack) previewBack.addEventListener('click', () => {
      if (currentArticle) {
        window.location.hash = `#knowledge-base/${encodeURIComponent(currentArticle.id)}/editar`;
      } else {
        navigateToList();
      }
    });
    if (previewPublish) previewPublish.addEventListener('click', () => saveArticle('published'));

    if (addStep) addStep.addEventListener('click', () => insertStep());
    if (addAlert) addAlert.addEventListener('click', () => insertAlert());
    if (uploadImage) uploadImage.addEventListener('click', () => triggerImagePicker());
    if (attach) attach.addEventListener('click', () => triggerImagePicker());
    if (copyLink) copyLink.addEventListener('click', copyCurrentArticleLink);

    document.querySelectorAll('.kb-rich-toolbar [data-command]').forEach((button) => {
      button.addEventListener('click', () => {
        if (elDocument) {
          elDocument.focus();
          document.execCommand(button.dataset.command, false, null);
        }
      });
    });

    if (blockStyle) {
      blockStyle.addEventListener('change', () => {
        if (elDocument) {
          elDocument.focus();
          document.execCommand('formatBlock', false, blockStyle.value);
          blockStyle.value = 'p';
        }
      });
    }

    if (elDocument) {
      elDocument.addEventListener('click', handleDocumentClick);
      elDocument.addEventListener('input', markDirty);
      elDocument.addEventListener('dragover', (event) => event.preventDefault());
      elDocument.addEventListener('drop', handleImageDrop);
    }

    if (elTitle) elTitle.addEventListener('input', markDirty);
    if (elCategory) elCategory.addEventListener('change', markDirty);
    if (elAudience) elAudience.addEventListener('change', markDirty);
    if (elReadTime) elReadTime.addEventListener('input', markDirty);
    if (elStatusSelect) elStatusSelect.addEventListener('change', markDirty);
    if (elLead) elLead.addEventListener('input', markDirty);
    if (elAlertInput) elAlertInput.addEventListener('input', markDirty);
    if (elFile) elFile.addEventListener('change', handleImageFileChange);
  }

  function navigateToList() {
    window.location.hash = '#knowledge-base';
  }

  function handleHashRoute() {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (!rawHash) return;

    if (rawHash.startsWith('knowledge-base') || rawHash.startsWith('admin/base-conhecimento')) {
      const parts = rawHash.split('/');
      const section = document.querySelector('[data-admin-section="knowledge-base"]');
      if (section && section.hidden) {
        if (typeof window.showView === 'function') {
          window.showView('knowledge-base');
        } else {
          section.hidden = false;
        }
      }

      if (parts.length === 1) {
        showSubView('list');
      } else if (parts.length === 2 && parts[1] === 'novo') {
        openEditorForNew();
      } else if (parts.length >= 3) {
        const articleId = decodeURIComponent(parts[1]);
        const action = parts[2];
        if (action === 'editar') {
          openEditorById(articleId);
        } else if (action === 'visualizar') {
          openPreviewById(articleId);
        } else {
          showSubView('list');
        }
      }
    }
  }

  function showSubView(viewName) {
    if (elListView) elListView.hidden = (viewName !== 'list');
    if (elEditorView) elEditorView.hidden = (viewName !== 'editor');
    if (elPreviewContainer) elPreviewContainer.hidden = (viewName !== 'preview');
  }

  async function loadArticles() {
    if (elCount) elCount.textContent = 'Carregando artigos...';

    try {
      const response = await fetch('/api/admin/knowledge-base');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.articles)) {
          articlesState = data.articles;
          renderTable();
          return;
        }
      }
    } catch (error) {
      console.warn('Não foi possível carregar artigos administrativos:', error);
    }

    articlesState = [];
    renderTable();
  }

  function renderTable() {
    if (!elTableBody) return;

    const filtered = articlesState.filter((article) => {
      if (filterState.category && article.category !== filterState.category) return false;
      if (!filterState.search) return true;
      const query = filterState.search;
      return [
        article.title,
        article.summary,
        article.lead,
        article.category
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });

    if (elCount) elCount.textContent = `${filtered.length} artigo(s) encontrado(s).`;

    if (!filtered.length) {
      elTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:30px;color:var(--muted,#94a3b8);">
            Nenhum artigo encontrado. Clique em "+ Novo artigo" para cadastrar o primeiro tutorial.
          </td>
        </tr>`;
      return;
    }

    elTableBody.innerHTML = filtered.map((article) => {
      const stepsCount = Array.isArray(article.steps) ? article.steps.length : 0;
      const audience = {
        company: '🏢 Empresa',
        participant: '♙ Participante',
        platform: '✨ Geral'
      }[article.audience] || '🏢 Empresa';
      const status = article.status === 'draft' ? '🟡 Rascunho' : '🟢 Publicado';

      return `
        <tr>
          <td>
            <strong style="color:#0f172a;font-size:13px;">${escapeHTML(article.title || 'Sem título')}</strong>
            <small style="display:block;color:#64748b;font-size:11px;">ID: ${escapeHTML(article.id || '')}</small>
          </td>
          <td><span class="admin-status" style="background:#f1f5f9;color:#334155;">${escapeHTML(article.category || 'Geral')}</span></td>
          <td><span class="admin-status active" style="font-size:11px;">${audience}</span></td>
          <td><strong>${stepsCount}</strong> passo(s)</td>
          <td><small style="color:#64748b;">${escapeHTML(article.readTime || '3 min')}</small></td>
          <td><small style="color:#64748b;">${status}</small></td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="admin-primary" type="button" style="padding:4px 14px;font-size:12px;"
                onclick="window.editAdminArticle('${escapeAttribute(article.id)}')">
                <i class="fa-solid fa-pen-to-square"></i> Editar
              </button>
              <button class="admin-secondary" type="button" style="padding:4px 10px;font-size:12px;"
                onclick="window.previewAdminArticle('${escapeAttribute(article.id)}')">
                <i class="fa-regular fa-eye"></i> Prévia
              </button>
              <button class="admin-secondary danger" type="button" style="padding:4px 10px;font-size:12px;"
                onclick="window.deleteAdminArticle('${escapeAttribute(article.id)}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function openEditorForNew() {
    openEditor({
      id: `artigo-${Date.now()}`,
      slug: `artigo-${Date.now()}`,
      title: 'Novo artigo',
      category: 'Primeiros passos',
      audience: 'company',
      readTime: '3 min de leitura',
      lead: 'Escreva aqui a apresentação rápida do artigo para orientar o leitor.',
      summary: 'Escreva aqui a apresentação rápida do artigo para orientar o leitor.',
      alertTip: '',
      status: 'draft',
      steps: [
        {
          title: 'Primeiro passo',
          desc: 'Explique aqui o que o usuário precisa fazer nesta etapa.',
          image: '',
          caption: 'Legenda da imagem do passo.',
          alt: 'Imagem do primeiro passo'
        }
      ],
      blocks: []
    });
  }

  window.openModalForCreate = openEditorForNew;

  window.editAdminArticle = function (id) {
    window.location.hash = `#knowledge-base/${encodeURIComponent(id)}/editar`;
  };

  window.previewAdminArticle = function (id) {
    window.location.hash = `#knowledge-base/${encodeURIComponent(id)}/visualizar`;
  };

  function openEditorById(id) {
    const article = articlesState.find((item) => item.id === id);
    if (!article) {
      fetch(`/api/admin/knowledge-base/${encodeURIComponent(id)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.article) {
            openEditor(data.article);
          } else {
            showToast('Artigo não encontrado.');
            navigateToList();
          }
        })
        .catch(() => {
          showToast('Erro ao buscar artigo.');
          navigateToList();
        });
      return;
    }
    openEditor(article);
  }

  function openPreviewById(id) {
    const article = articlesState.find((item) => item.id === id);
    if (article) {
      currentArticle = deepClone(article);
      renderPreview(currentArticle);
    } else {
      fetch(`/api/admin/knowledge-base/${encodeURIComponent(id)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.article) {
            currentArticle = data.article;
            renderPreview(currentArticle);
          } else {
            showToast('Artigo não encontrado.');
            navigateToList();
          }
        })
        .catch(() => navigateToList());
    }
  }

  function openEditor(article) {
    currentArticle = deepClone(article);
    selectedFigure = null;

    if (elTitle) elTitle.value = currentArticle.title || '';
    if (elCategory) elCategory.value = currentArticle.category || 'Primeiros passos';
    if (elAudience) elAudience.value = currentArticle.audience || 'company';
    if (elReadTime) elReadTime.value = currentArticle.readTime || '3 min de leitura';
    if (elStatusSelect) elStatusSelect.value = currentArticle.status || 'published';
    if (elLead) elLead.value = currentArticle.lead || currentArticle.summary || '';
    if (elAlertInput) elAlertInput.value = currentArticle.alertTip || '';

    const heading = document.getElementById('admin-kb-editor-heading');
    if (heading) heading.textContent = currentArticle.title ? `Editar: ${currentArticle.title}` : 'Novo Artigo';

    if (elDocument) {
      elDocument.innerHTML = buildEditableDocument(currentArticle);
      elDocument.contentEditable = 'true';
    }

    const deleteBtn = document.getElementById('kb-rich-delete');
    if (deleteBtn) {
      deleteBtn.style.display = currentArticle.id ? 'inline-flex' : 'none';
    }

    showSubView('editor');
    updateStatus('Editando no Admin');
  }

  function renderPreview(article) {
    if (!elPreviewBody) return;
    const steps = Array.isArray(article.steps) ? article.steps : [];
    const lead = article.lead || article.summary || '';
    const alert = article.alertTip || '';

    const stepsHTML = steps.map((step, index) => {
      const img = step.image ? `<img src="${escapeAttribute(step.image)}" alt="${escapeAttribute(step.title || '')}" style="max-width:100%; border-radius:6px; margin: 12px 0; border:1px solid #cbd5e1;">` : '';
      return `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <span style="background:#2563eb; color:#fff; font-weight:800; border-radius:50%; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; font-size:13px;">${index + 1}</span>
            <h3 style="font-size:16px; font-weight:700; margin:0;">${escapeHTML(step.title || `Passo ${index + 1}`)}</h3>
          </div>
          <p style="color:#475569; font-size:14px; margin:0 0 8px;">${escapeHTML(step.desc || '')}</p>
          ${img}
          ${step.caption ? `<p style="font-size:12px; color:#64748b; font-style:italic; margin:4px 0 0;">${escapeHTML(step.caption)}</p>` : ''}
        </div>
      `;
    }).join('');

    const alertHTML = alert ? `
      <div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:14px 16px; border-radius:4px; margin-top:20px;">
        <strong style="color:#92400e;">💡 Dica útil:</strong> <span style="color:#78350f;">${escapeHTML(alert)}</span>
      </div>
    ` : '';

    elPreviewBody.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto;">
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px;">
          <span class="admin-status" style="background:#e0f2fe; color:#0369a1;">${escapeHTML(article.category || 'Geral')}</span>
          <small style="color:#64748b;">⏱️ ${escapeHTML(article.readTime || '3 min')}</small>
          <small style="color:#64748b;">📅 ${escapeHTML(article.updatedAt || 'Hoje')}</small>
        </div>
        <h1 style="font-size:26px; font-weight:800; color:#0f172a; margin: 0 0 12px;">${escapeHTML(article.title || 'Sem título')}</h1>
        ${lead ? `<p style="font-size:16px; color:#334155; line-height:1.6; margin-bottom:24px; font-weight:500;">${escapeHTML(lead)}</p>` : ''}
        <hr style="border:0; border-top:1px solid #e2e8f0; margin:20px 0;">
        <h2 style="font-size:18px; font-weight:700; color:#0f172a; margin-bottom:16px;">Passo a Passo Guiado</h2>
        ${stepsHTML}
        ${alertHTML}
      </div>
    `;

    showSubView('preview');
  }

  function buildEditableDocument(article) {
    const steps = Array.isArray(article.steps) ? article.steps : [];
    const lead = article.lead || article.summary || 'Escreva aqui a apresentação rápida do artigo.';
    const alert = article.alertTip || '';

    const stepsHTML = steps.length ? steps.map((step, index) => stepHTML(step, index)).join('') : stepHTML({
      title: 'Primeiro passo',
      desc: 'Explique aqui o que o usuário precisa fazer nesta etapa.',
      image: '',
      caption: 'Legenda da imagem do passo.',
      alt: 'Imagem do passo'
    }, 0);

    return `
      <p class="kb-rich-lead" data-kb-field="lead">${escapeHTML(lead)}</p>
      <h2>Passo a passo guiado</h2>
      <div class="kb-rich-steps" data-kb-steps>
        ${stepsHTML}
      </div>
      <div class="kb-rich-alert" data-kb-alert ${alert ? '' : 'data-empty="true"'}>
        <strong>Dica útil:</strong> <span>${escapeHTML(alert || 'Clique aqui para escrever uma dica ou orientação importante.')}</span>
      </div>`;
  }

  function stepHTML(step, index) {
    const image = step.image || '';
    const caption = step.caption || step.title || 'Legenda da imagem.';
    const alt = step.alt || step.title || `Imagem do passo ${index + 1}`;
    const imageHTML = image ? `
      <img src="${escapeAttribute(image)}" alt="${escapeAttribute(alt)}" loading="lazy">
    ` : `
      <div class="kb-rich-image-placeholder" style="padding:32px 18px;text-align:center;color:#64748b;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;margin:8px 0;">
        <i class="fa-regular fa-image" style="font-size:24px;display:block;margin-bottom:6px;color:#94a3b8;"></i>
        Clique em "Anexar Imagem / Print" para selecionar a captura deste passo.
      </div>
    `;

    return `
      <section class="kb-rich-step" data-kb-step style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:16px;">
        <p style="margin: 0 0 8px;">
          <span class="kb-rich-step-number" style="background:#2563eb; color:#ffffff; font-weight:800; border-radius:50%; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; font-size:12px; margin-right:8px;">${index + 1}</span>
          <span class="kb-rich-step-title" data-kb-step-title style="font-weight:700; font-size:15px; color:#0f172a;">${escapeHTML(step.title || `Passo ${index + 1}`)}</span>
        </p>
        <p class="kb-rich-step-desc" data-kb-step-desc style="color:#475569; font-size:13px; margin:0 0 10px;">${escapeHTML(step.desc || 'Descreva este passo.')}</p>
        <figure class="kb-rich-figure" data-kb-figure contenteditable="false" style="margin:0;">
          ${imageHTML}
          <div class="kb-rich-image-actions" style="display:flex; gap:6px; margin-top:8px;">
            <button type="button" data-image-action="replace" class="admin-secondary" style="font-size:11px; padding:4px 8px;" title="Trocar imagem"><i class="fa-solid fa-rotate"></i> Trocar</button>
            <button type="button" data-image-action="remove" class="admin-secondary danger" style="font-size:11px; padding:4px 8px;" title="Remover imagem"><i class="fa-solid fa-trash"></i> Remover</button>
            <button type="button" data-image-action="up" class="admin-secondary" style="font-size:11px; padding:4px 8px;" title="Subir passo"><i class="fa-solid fa-arrow-up"></i></button>
            <button type="button" data-image-action="down" class="admin-secondary" style="font-size:11px; padding:4px 8px;" title="Descer passo"><i class="fa-solid fa-arrow-down"></i></button>
          </div>
          <figcaption contenteditable="true" style="font-size:12px; color:#64748b; margin-top:6px; font-style:italic;">${escapeHTML(caption)}</figcaption>
        </figure>
      </section>`;
  }

  function handleDocumentClick(event) {
    const actionButton = event.target.closest('[data-image-action]');
    const figure = event.target.closest('[data-kb-figure]');

    if (figure) selectFigure(figure);

    if (!actionButton) return;
    event.preventDefault();
    event.stopPropagation();

    const action = actionButton.dataset.imageAction;
    if (action === 'replace') triggerImagePicker(figure);
    if (action === 'remove') removeFigureImage(figure);
    if (action === 'up') moveStep(figure.closest('[data-kb-step]'), -1);
    if (action === 'down') moveStep(figure.closest('[data-kb-step]'), 1);
  }

  function selectFigure(figure) {
    document.querySelectorAll('.kb-rich-figure.is-selected').forEach((item) => item.classList.remove('is-selected'));
    selectedFigure = figure;
    if (selectedFigure) selectedFigure.classList.add('is-selected');
  }

  function triggerImagePicker(figure) {
    if (figure) selectFigure(figure);
    if (elFile) elFile.click();
  }

  async function handleImageDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    await uploadAndApplyImage(file);
  }

  async function handleImageFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadAndApplyImage(file);
  }

  async function uploadAndApplyImage(file) {
    if (!currentArticle) return;
    updateStatus('Enviando imagem...');

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('image', file);
      form.append('slug', slugify(elTitle?.value || currentArticle.slug || currentArticle.id));

      const response = await fetch('/api/admin/knowledge-base/upload-image', {
        method: 'POST',
        headers: csrfHeader(),
        body: form
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.message || 'Falha ao enviar imagem.');
      }

      applyImageToEditor(data.url, file.name);
      updateStatus('Imagem inserida');
      markDirty();
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Não foi possível enviar a imagem.');
      updateStatus('Falha no upload');
    }
  }

  function applyImageToEditor(url, fileName) {
    let figure = selectedFigure;
    if (!figure) {
      const lastStep = elDocument?.querySelector('[data-kb-step]:last-of-type') || insertStep();
      figure = lastStep.querySelector('[data-kb-figure]');
      selectFigure(figure);
    }

    if (!figure) return;

    const title = figure.closest('[data-kb-step]')?.querySelector('[data-kb-step-title]')?.textContent.trim() || fileName;
    figure.querySelector('.kb-rich-image-placeholder')?.remove();

    let img = figure.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.style.maxWidth = '100%';
      img.style.borderRadius = '6px';
      img.style.border = '1px solid #cbd5e1';
      figure.insertBefore(img, figure.firstChild);
    }

    img.src = url;
    img.alt = title;
    img.loading = 'lazy';

    const caption = figure.querySelector('figcaption');
    if (caption && (!caption.textContent.trim() || caption.textContent.includes('Legenda da imagem'))) {
      caption.textContent = title;
    }
  }

  function removeFigureImage(figure) {
    const img = figure.querySelector('img');
    if (img) img.remove();
    if (!figure.querySelector('.kb-rich-image-placeholder')) {
      figure.insertAdjacentHTML('afterbegin', `
        <div class="kb-rich-image-placeholder" style="padding:32px 18px;text-align:center;color:#64748b;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;margin:8px 0;">
          <i class="fa-regular fa-image" style="font-size:24px;display:block;margin-bottom:6px;color:#94a3b8;"></i>
          Clique em "Anexar Imagem / Print" para selecionar a captura deste passo.
        </div>`);
    }
    markDirty();
  }

  function insertStep() {
    if (!elDocument) return null;
    const stepsContainer = elDocument.querySelector('[data-kb-steps]');
    if (!stepsContainer) return null;
    const index = stepsContainer.querySelectorAll('[data-kb-step]').length;
    stepsContainer.insertAdjacentHTML('beforeend', stepHTML({
      title: `Novo passo ${index + 1}`,
      desc: 'Descreva o que deve ser feito nesta etapa.',
      caption: 'Legenda da imagem do passo.'
    }, index));
    renumberSteps();
    markDirty();
    const step = stepsContainer.querySelector('[data-kb-step]:last-child');
    if (step) step.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return step;
  }

  function insertAlert() {
    if (!elDocument) return;
    let alert = elDocument.querySelector('[data-kb-alert]');
    if (!alert) {
      elDocument.insertAdjacentHTML('beforeend', `
        <div class="kb-rich-alert" data-kb-alert style="background:#fef3c7; border-left:4px solid #f59e0b; padding:12px; border-radius:4px; margin-top:16px;">
          <strong>Dica útil:</strong> <span>Escreva aqui uma orientação importante para o cliente.</span>
        </div>`);
      alert = elDocument.querySelector('[data-kb-alert]');
    }
    if (alert) {
      alert.removeAttribute('data-empty');
      alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    markDirty();
  }

  function moveStep(step, direction) {
    if (!step) return;
    if (direction < 0 && step.previousElementSibling) {
      step.parentNode.insertBefore(step, step.previousElementSibling);
    }
    if (direction > 0 && step.nextElementSibling) {
      step.parentNode.insertBefore(step.nextElementSibling, step);
    }
    renumberSteps();
    markDirty();
  }

  function renumberSteps() {
    if (!elDocument) return;
    elDocument.querySelectorAll('[data-kb-step]').forEach((step, index) => {
      const number = step.querySelector('.kb-rich-step-number');
      if (number) number.textContent = index + 1;
    });
  }

  async function saveArticle(status) {
    if (!currentArticle) return;
    updateStatus(status === 'published' ? 'Publicando...' : 'Salvando...');

    const payload = collectPayload(status);

    try {
      const response = await fetch('/api/admin/knowledge-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeader()
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Falha ao salvar artigo.');
      }

      currentArticle = data.article || payload;
      upsertArticle(currentArticle);
      renderTable();
      updateStatus(status === 'published' ? 'Publicado' : 'Rascunho salvo');
      showToast(status === 'published' ? 'Artigo publicado com sucesso no Admin!' : 'Rascunho salvo com sucesso no Admin!');

      // Permanece na tela da Base de Conhecimento do Admin sem redirecionar
      window.location.hash = '#knowledge-base';
    } catch (error) {
      console.error(error);
      updateStatus('Erro ao salvar');
      showToast(error.message || 'Não foi possível salvar o artigo.');
    }
  }

  function collectPayload(status) {
    const title = elTitle?.value.trim() || 'Artigo sem título';
    const slug = slugify(currentArticle.slug || title);
    const category = elCategory?.value || 'Primeiros passos';
    const audience = elAudience?.value || 'company';
    const readTime = elReadTime?.value.trim() || '3 min de leitura';
    const statusVal = status || elStatusSelect?.value || 'published';
    const lead = elLead?.value.trim() || plainText(elDocument?.querySelector('[data-kb-field="lead"]')) || '';
    const alertTip = elAlertInput?.value.trim() || '';

    const steps = Array.from(elDocument ? elDocument.querySelectorAll('[data-kb-step]') : []).map((step, index) => {
      const titleNode = step.querySelector('[data-kb-step-title]');
      const descNode = step.querySelector('[data-kb-step-desc]');
      const figure = step.querySelector('[data-kb-figure]');
      const image = figure?.querySelector('img')?.getAttribute('src') || '';
      const caption = plainText(figure?.querySelector('figcaption')) || plainText(titleNode) || `Passo ${index + 1}`;

      return {
        title: plainText(titleNode) || `Passo ${index + 1}`,
        desc: plainText(descNode),
        image,
        caption,
        alt: plainText(titleNode) || caption,
        filename: image ? image.split('/').pop() : ''
      };
    });

    return {
      ...currentArticle,
      id: currentArticle.id || slug,
      slug,
      title,
      category,
      audience,
      readTime,
      updatedAt: new Date().toLocaleDateString('pt-BR'),
      lead,
      summary: lead,
      alertTip,
      status: statusVal,
      steps,
      content: elDocument ? elDocument.innerHTML : '',
      blocks: [
        {
          type: 'rich_text',
          content: elDocument ? elDocument.innerHTML : ''
        }
      ]
    };
  }

  window.deleteAdminArticle = async function (id) {
    const article = articlesState.find((item) => item.id === id);
    if (!confirm(`Deseja realmente excluir o artigo "${article?.title || id}"?`)) return;

    try {
      const response = await fetch(`/api/admin/knowledge-base/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: csrfHeader()
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Não foi possível excluir o artigo.');
      }

      articlesState = articlesState.filter((item) => item.id !== id);
      renderTable();
      showToast('Artigo excluído com sucesso.');
      navigateToList();
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Erro ao excluir artigo.');
    }
  };

  function copyCurrentArticleLink() {
    if (!currentArticle) return;
    const slug = slugify(currentArticle.slug || elTitle?.value);
    const url = `${window.location.origin}/BaseConhecimento.html#artigo=${encodeURIComponent(slug)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Link público copiado.'));
    } else {
      showToast(url);
    }
  }

  function upsertArticle(article) {
    const index = articlesState.findIndex((item) => item.id === article.id);
    if (index >= 0) articlesState[index] = article;
    else articlesState.unshift(article);
  }

  function markDirty() {
    updateStatus('Alterações locais');
  }

  function updateStatus(message) {
    if (elStatusText) elStatusText.textContent = message;
  }

  function showToast(message) {
    const region = document.getElementById('admin-toast-region');
    if (!region) {
      alert(message);
      return;
    }
    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.textContent = message;
    region.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  function csrfHeader() {
    const cookie = document.cookie.split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith('acert_csrf_token='));
    const token = cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
    return token ? { 'X-CSRF-Token': token } : {};
  }

  function slugify(value) {
    return String(value || 'artigo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'artigo';
  }

  function plainText(node) {
    return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function escapeHTML(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHTML(value).replace(/`/g, '&#096;');
  }
})();
