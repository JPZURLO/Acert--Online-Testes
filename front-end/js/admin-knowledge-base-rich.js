/**
 * Admin — Base de Conhecimento
 * Editor rico em tela cheia, dentro do próprio Admin, com edição dos passos e imagens.
 */
(function () {
  'use strict';

  let articlesState = [];
  let filterState = { search: '', category: '' };
  let currentArticle = null;
  let selectedFigure = null;
  let previewMode = false;

  let elTableBody = null;
  let elCount = null;
  let elSearchInput = null;
  let elCategoryFilter = null;
  let elEditor = null;
  let elDocument = null;
  let elTitle = null;
  let elCategory = null;
  let elAudience = null;
  let elReadTime = null;
  let elFile = null;
  let elStatus = null;

  document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindListEvents();
    bindEditorEvents();
    loadArticles();
  });

  function cacheElements() {
    elTableBody = document.getElementById('admin-kb-table-body');
    elCount = document.getElementById('admin-kb-count');
    elSearchInput = document.getElementById('admin-kb-search');
    elCategoryFilter = document.getElementById('admin-kb-category-filter');

    elEditor = document.getElementById('kb-rich-editor');
    elDocument = document.getElementById('kb-rich-document');
    elTitle = document.getElementById('kb-rich-title');
    elCategory = document.getElementById('kb-rich-category');
    elAudience = document.getElementById('kb-rich-audience');
    elReadTime = document.getElementById('kb-rich-readtime');
    elFile = document.getElementById('kb-rich-file');
    elStatus = document.getElementById('kb-rich-status');
  }

  function bindListEvents() {
    const btnNew = document.getElementById('btn-admin-kb-new');
    if (btnNew) btnNew.addEventListener('click', openEditorForNew);

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
    const publish = document.getElementById('kb-rich-publish');
    const preview = document.getElementById('kb-rich-preview');
    const addStep = document.getElementById('kb-rich-add-step');
    const addAlert = document.getElementById('kb-rich-add-alert');
    const uploadImage = document.getElementById('kb-rich-upload-image');
    const attach = document.getElementById('kb-rich-attach');
    const copyLink = document.getElementById('kb-rich-copy-link');
    const blockStyle = document.getElementById('kb-rich-block-style');

    if (back) back.addEventListener('click', closeEditor);
    if (cancel) cancel.addEventListener('click', closeEditor);
    if (saveDraft) saveDraft.addEventListener('click', () => saveArticle('draft'));
    if (publish) publish.addEventListener('click', () => saveArticle('published'));
    if (preview) preview.addEventListener('click', togglePreview);
    if (addStep) addStep.addEventListener('click', () => insertStep());
    if (addAlert) addAlert.addEventListener('click', () => insertAlert());
    if (uploadImage) uploadImage.addEventListener('click', () => triggerImagePicker());
    if (attach) attach.addEventListener('click', () => triggerImagePicker());
    if (copyLink) copyLink.addEventListener('click', copyCurrentArticleLink);

    document.querySelectorAll('.kb-rich-toolbar [data-command]').forEach((button) => {
      button.addEventListener('click', () => {
        elDocument.focus();
        document.execCommand(button.dataset.command, false, null);
      });
    });

    if (blockStyle) {
      blockStyle.addEventListener('change', () => {
        elDocument.focus();
        document.execCommand('formatBlock', false, blockStyle.value);
        blockStyle.value = 'p';
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
    if (elFile) elFile.addEventListener('change', handleImageFileChange);
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
      lead: 'Escreva aqui a apresentação rápida do artigo para orientar o cliente.',
      summary: 'Escreva aqui a apresentação rápida do artigo para orientar o cliente.',
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
    const article = articlesState.find((item) => item.id === id);
    if (!article) return;
    openEditor(article);
  };

  function openEditor(article) {
    if (!elEditor || !elDocument) return;

    currentArticle = deepClone(article);
    previewMode = false;
    selectedFigure = null;

    elTitle.value = currentArticle.title || '';
    elCategory.value = currentArticle.category || 'Primeiros passos';
    elAudience.value = currentArticle.audience || 'company';
    elReadTime.value = currentArticle.readTime || '3 min de leitura';
    elDocument.innerHTML = buildEditableDocument(currentArticle);
    elDocument.contentEditable = 'true';
    elEditor.classList.remove('kb-rich-preview-mode');
    elEditor.hidden = false;
    document.body.style.overflow = 'hidden';
    updateStatus('Editando no Admin');
    setTimeout(() => elTitle.focus(), 80);
  }

  function closeEditor() {
    if (!elEditor) return;
    elEditor.hidden = true;
    document.body.style.overflow = '';
    selectedFigure = null;
    currentArticle = null;
    loadArticles();
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
      <div class="kb-rich-image-placeholder" style="padding:42px 18px;text-align:center;color:#64748b;">
        <i class="fa-regular fa-image" style="font-size:28px;display:block;margin-bottom:8px;"></i>
        Clique em Imagem para inserir o print deste passo.
      </div>
    `;

    return `
      <section class="kb-rich-step" data-kb-step>
        <p>
          <span class="kb-rich-step-number">${index + 1}</span>
          <span class="kb-rich-step-title" data-kb-step-title>${escapeHTML(step.title || `Passo ${index + 1}`)}</span>
        </p>
        <p class="kb-rich-step-desc" data-kb-step-desc>${escapeHTML(step.desc || 'Descreva este passo.')}</p>
        <figure class="kb-rich-figure" data-kb-figure contenteditable="false">
          ${imageHTML}
          <div class="kb-rich-image-actions">
            <button type="button" data-image-action="replace" title="Trocar imagem"><i class="fa-solid fa-rotate"></i></button>
            <button type="button" data-image-action="remove" title="Remover imagem"><i class="fa-solid fa-trash"></i></button>
            <button type="button" data-image-action="up" title="Subir passo"><i class="fa-solid fa-arrow-up"></i></button>
            <button type="button" data-image-action="down" title="Descer passo"><i class="fa-solid fa-arrow-down"></i></button>
          </div>
          <figcaption contenteditable="true">${escapeHTML(caption)}</figcaption>
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
    selectedFigure.classList.add('is-selected');
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
      form.append('image', file);
      form.append('slug', slugify(elTitle.value || currentArticle.slug || currentArticle.id));

      const response = await fetch('/api/admin/knowledge-base/upload-image', {
        method: 'POST',
        headers: csrfHeader(),
        body: form
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Falha ao enviar imagem.');
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
      const lastStep = elDocument.querySelector('[data-kb-step]:last-of-type') || insertStep();
      figure = lastStep.querySelector('[data-kb-figure]');
      selectFigure(figure);
    }

    const title = figure.closest('[data-kb-step]')?.querySelector('[data-kb-step-title]')?.textContent.trim() || fileName;
    figure.querySelector('.kb-rich-image-placeholder')?.remove();

    let img = figure.querySelector('img');
    if (!img) {
      img = document.createElement('img');
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
        <div class="kb-rich-image-placeholder" style="padding:42px 18px;text-align:center;color:#64748b;">
          <i class="fa-regular fa-image" style="font-size:28px;display:block;margin-bottom:8px;"></i>
          Clique em Imagem para inserir o print deste passo.
        </div>`);
    }
    markDirty();
  }

  function insertStep() {
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
    step.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return step;
  }

  function insertAlert() {
    let alert = elDocument.querySelector('[data-kb-alert]');
    if (!alert) {
      elDocument.insertAdjacentHTML('beforeend', `
        <div class="kb-rich-alert" data-kb-alert>
          <strong>Dica útil:</strong> <span>Escreva aqui uma orientação importante para o cliente.</span>
        </div>`);
      alert = elDocument.querySelector('[data-kb-alert]');
    }
    alert.removeAttribute('data-empty');
    alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    elDocument.querySelectorAll('[data-kb-step]').forEach((step, index) => {
      const number = step.querySelector('.kb-rich-step-number');
      if (number) number.textContent = index + 1;
    });
  }

  function togglePreview() {
    previewMode = !previewMode;
    if (!elEditor) return;
    elEditor.classList.toggle('kb-rich-preview-mode', previewMode);
    elDocument.contentEditable = previewMode ? 'false' : 'true';
    updateStatus(previewMode ? 'Pré-visualização' : 'Editando no Admin');
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
        throw new Error(data.error || 'Falha ao salvar artigo.');
      }

      currentArticle = data.article || payload;
      upsertArticle(currentArticle);
      renderTable();
      updateStatus(status === 'published' ? 'Publicado' : 'Rascunho salvo');
      showToast(status === 'published' ? 'Artigo publicado com sucesso.' : 'Rascunho salvo com sucesso.');
    } catch (error) {
      console.error(error);
      updateStatus('Erro ao salvar');
      showToast(error.message || 'Não foi possível salvar o artigo.');
    }
  }

  function collectPayload(status) {
    const title = elTitle.value.trim() || 'Artigo sem título';
    const slug = slugify(currentArticle.slug || title);
    const lead = plainText(elDocument.querySelector('[data-kb-field="lead"]')) || currentArticle.lead || '';
    const alertNode = elDocument.querySelector('[data-kb-alert]');
    const alertTip = alertNode && !alertNode.hasAttribute('data-empty')
      ? plainText(alertNode).replace(/^Dica útil:\s*/i, '').trim()
      : '';

    const steps = Array.from(elDocument.querySelectorAll('[data-kb-step]')).map((step, index) => {
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
      category: elCategory.value || 'Primeiros passos',
      audience: elAudience.value || 'company',
      readTime: elReadTime.value.trim() || '3 min de leitura',
      updatedAt: new Date().toLocaleDateString('pt-BR'),
      lead,
      summary: lead,
      alertTip,
      status,
      steps,
      blocks: [
        {
          type: 'rich_text',
          content: elDocument.innerHTML
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
        throw new Error(data.error || 'Não foi possível excluir o artigo.');
      }

      articlesState = articlesState.filter((item) => item.id !== id);
      renderTable();
      showToast('Artigo excluído com sucesso.');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Erro ao excluir artigo.');
    }
  };

  function copyCurrentArticleLink() {
    if (!currentArticle) return;
    const slug = slugify(currentArticle.slug || elTitle.value);
    const url = `${window.location.origin}/BaseConhecimento.html#artigo=${encodeURIComponent(slug)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Link copiado.'));
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
    if (elStatus) elStatus.textContent = message;
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
