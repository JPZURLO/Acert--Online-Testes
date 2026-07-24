/**
 * Online Teste — Editor Visual Inline por Blocos da Base de Conhecimento
 * Permite editar artigos diretamente na própria estrutura da página com visualização em tempo real.
 */

(function () {
  'use strict';

  // --- Estado do Editor ---
  let editorState = {
    article: null,
    isEditing: false,
    isPreviewOnly: false,
    activeBlockIndex: null,
    autosaveTimer: null,
    historyStack: [],
    historyIndex: -1,
    pendingImageTarget: null // elemento de bloco aguardando upload
  };

  // DOM Containers
  let elAdminBar = null;
  let elToolbar = null;
  let elArticleReader = null;
  let elSettingsDrawer = null;
  let elImageModal = null;

  document.addEventListener('DOMContentLoaded', () => {
    initEditorUI();
  });

  function initEditorUI() {
    // Injeta a estrutura de controle no leitor se não existir
    ensureEditorDOM();
    bindGlobalEvents();
  }

  function ensureEditorDOM() {
    // Verifica se já temos o container do leitor
    elArticleReader = document.getElementById('kb-article-view');
    if (!elArticleReader) return;

    // Criar a barra de Admin
    if (!document.getElementById('kb-editor-admin-bar')) {
      const adminBar = document.createElement('div');
      adminBar.id = 'kb-editor-admin-bar';
      adminBar.className = 'kb-editor-admin-bar';
      adminBar.hidden = true;
      adminBar.innerHTML = `
        <div class="kb-editor-admin-info">
          <i class="fa-solid fa-pen-to-square"></i>
          <span>Modo de Edição Inline</span>
          <span class="kb-status-badge draft" id="kb-editor-status-badge">Rascunho</span>
          <small id="kb-editor-autosave-status" style="color: #94a3b8; font-weight: 500;">Alterações salvas</small>
        </div>

        <div class="kb-editor-admin-actions">
          <button class="kb-btn-editor secondary" id="btn-kb-toggle-preview" type="button" title="Alterna visualização limpa">
            <i class="fa-solid fa-eye"></i> <span id="kb-preview-label">Visualizar sem controles</span>
          </button>
          <button class="kb-btn-editor secondary" id="btn-kb-open-settings" type="button" title="Metadados, Slug e SEO">
            <i class="fa-solid fa-gear"></i> Configurações
          </button>
          <button class="kb-btn-editor secondary" id="btn-kb-save-draft" type="button">
            <i class="fa-solid fa-floppy-disk"></i> Salvar Rascunho
          </button>
          <button class="kb-btn-editor success" id="btn-kb-publish" type="button">
            <i class="fa-solid fa-paper-plane"></i> Publicar
          </button>
          <button class="kb-btn-editor danger" id="btn-kb-cancel-edit" type="button">
            <i class="fa-solid fa-times"></i> Fechar Editor
          </button>
        </div>
      `;
      document.body.prepend(adminBar);
      elAdminBar = adminBar;
    } else {
      elAdminBar = document.getElementById('kb-editor-admin-bar');
    }

    // Criar Barra de Ferramentas Sticky
    if (!document.getElementById('kb-editor-toolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'kb-editor-toolbar';
      toolbar.className = 'kb-editor-toolbar';
      toolbar.hidden = true;
      toolbar.innerHTML = `
        <div class="kb-toolbar-group">
          <select class="kb-toolbar-select" id="kb-tool-heading">
            <option value="p">Texto Normal</option>
            <option value="h2">Título Principal (H2)</option>
            <option value="h3">Subtítulo (H3)</option>
            <option value="blockquote">Citação</option>
          </select>
        </div>

        <div class="kb-toolbar-group">
          <button class="kb-toolbar-btn" data-cmd="bold" title="Negrito (Ctrl+B)"><i class="fa-solid fa-bold"></i></button>
          <button class="kb-toolbar-btn" data-cmd="italic" title="Itálico (Ctrl+I)"><i class="fa-solid fa-italic"></i></button>
          <button class="kb-toolbar-btn" data-cmd="underline" title="Sublinhado (Ctrl+U)"><i class="fa-solid fa-underline"></i></button>
          <button class="kb-toolbar-btn" id="btn-kb-tool-link" title="Inserir Link"><i class="fa-solid fa-link"></i></button>
        </div>

        <div class="kb-toolbar-group">
          <button class="kb-toolbar-btn" data-cmd="insertUnorderedList" title="Lista com Marcadores"><i class="fa-solid fa-list-ul"></i></button>
          <button class="kb-toolbar-btn" data-cmd="insertOrderedList" title="Lista Numerada"><i class="fa-solid fa-list-ol"></i></button>
        </div>

        <div class="kb-toolbar-group">
          <button class="kb-toolbar-btn" id="btn-kb-add-image" title="Inserir Imagem / Print"><i class="fa-solid fa-image"></i></button>
          <button class="kb-toolbar-btn" id="btn-kb-add-step-block" title="Inserir Bloco Passo a Passo"><i class="fa-solid fa-list-check"></i></button>
          <button class="kb-toolbar-btn" id="btn-kb-add-alert-block" title="Inserir Alerta / Dica / Aviso"><i class="fa-solid fa-lightbulb"></i></button>
        </div>

        <div class="kb-toolbar-group">
          <button class="kb-toolbar-btn" data-cmd="undo" title="Desfazer"><i class="fa-solid fa-rotate-left"></i></button>
          <button class="kb-toolbar-btn" data-cmd="redo" title="Refazer"><i class="fa-solid fa-rotate-right"></i></button>
          <button class="kb-toolbar-btn" data-cmd="removeFormat" title="Remover Formatação"><i class="fa-solid fa-text-slash"></i></button>
        </div>
      `;
      elToolbar = toolbar;
    }

    // Criar Painel de Configurações Lateral (Settings Drawer)
    if (!document.getElementById('kb-settings-drawer')) {
      const drawer = document.createElement('div');
      drawer.id = 'kb-settings-drawer';
      drawer.className = 'kb-settings-drawer';
      drawer.innerHTML = `
        <div class="kb-drawer-header">
          <h3>Configurações do Artigo</h3>
          <button class="kb-drawer-close" id="btn-kb-drawer-close" type="button">×</button>
        </div>

        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 700; font-size: 12px;">Título da URL (Slug)
          <input class="admin-input" id="kb-setting-slug" placeholder="ex: como-criar-um-novo-participante">
        </label>

        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 700; font-size: 12px;">Categoria
          <select class="admin-select" id="kb-setting-category">
            <option value="Primeiros passos">Primeiros passos</option>
            <option value="Criação de exames">Criação de exames</option>
            <option value="Questões e importação">Questões e importação</option>
            <option value="Participantes">Participantes</option>
            <option value="Documentos e termos">Documentos e termos</option>
            <option value="Convites e acessos">Convites e acessos</option>
            <option value="Monitoramento">Monitoramento</option>
            <option value="Resultados">Resultados</option>
            <option value="Personalização">Personalização</option>
            <option value="Conheça a plataforma">Conheça a plataforma</option>
          </select>
        </label>

        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 700; font-size: 12px;">Público-Alvo
          <select class="admin-select" id="kb-setting-audience">
            <option value="company">Empresas (Painel)</option>
            <option value="participant">Participantes</option>
            <option value="platform">Geral / Institucional</option>
          </select>
        </label>

        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 700; font-size: 12px;">Resumo Curto (Lead)
          <textarea class="admin-input" id="kb-setting-lead" rows="3" placeholder="Resumo exibido na lista de artigos..."></textarea>
        </label>

        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 700; font-size: 12px;">SEO Title
          <input class="admin-input" id="kb-setting-seo-title" placeholder="Título Otimizado para Motores de Busca">
        </label>

        <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 700; font-size: 12px;">Meta Description
          <textarea class="admin-input" id="kb-setting-meta-desc" rows="2" placeholder="Descrição para o Google..."></textarea>
        </label>

        <div style="margin-top: auto; padding-top: 16px;">
          <button class="kb-btn-editor primary" id="btn-kb-save-settings" type="button" style="width: 100%; justify-content: center;">
            Aplicar Configurações
          </button>
        </div>
      `;
      document.body.appendChild(drawer);
      elSettingsDrawer = drawer;
    }

    // Criar Modal de Upload de Imagem
    if (!document.getElementById('kb-image-modal')) {
      const imageModal = document.createElement('div');
      imageModal.id = 'kb-image-modal';
      imageModal.className = 'kb-image-modal';
      imageModal.hidden = true;
      imageModal.innerHTML = `
        <div class="kb-image-modal-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 16px; font-weight: 800; margin: 0;">Inserir Print ou Imagem no Artigo</h3>
            <button type="button" class="kb-drawer-close" id="btn-kb-image-modal-close">×</button>
          </div>

          <div class="kb-drop-zone" id="kb-image-drop-zone">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <p style="font-weight: 700; font-size: 14px; margin: 4px 0;">Arraste e solte sua imagem aqui</p>
            <span style="font-size: 12px; color: #64748b;">Suporta PNG, JPG, JPEG ou WEBP (até 10 MB)</span>
            <input type="file" id="kb-image-file-input" accept="image/png,image/jpeg,image/webp" style="display: none;">
          </div>

          <div id="kb-image-preview-area" hidden style="text-align: center;">
            <img id="kb-image-preview-img" style="max-height: 180px; border-radius: 8px; border: 1px solid #cbd5e1;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: 12px;">Legenda (Caption)
              <input class="admin-input" id="kb-img-caption-input" placeholder="Ex: Tela de lista de participantes">
            </label>
            <label style="display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: 12px;">Texto Alternativo (ALT)
              <input class="admin-input" id="kb-img-alt-input" placeholder="Ex: Imagem do botão Novo Participante">
            </label>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="kb-btn-editor secondary" id="btn-kb-img-cancel" type="button">Cancelar</button>
            <button class="kb-btn-editor primary" id="btn-kb-img-confirm" type="button">Inserir Imagem</button>
          </div>
        </div>
      `;
      document.body.appendChild(imageModal);
      elImageModal = imageModal;
    }
  }

  function bindGlobalEvents() {
    // Botões da Barra de Administração
    const btnTogglePreview = document.getElementById('btn-kb-toggle-preview');
    if (btnTogglePreview) btnTogglePreview.addEventListener('click', togglePreviewMode);

    const btnOpenSettings = document.getElementById('btn-kb-open-settings');
    if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettingsDrawer);

    const btnSaveDraft = document.getElementById('btn-kb-save-draft');
    if (btnSaveDraft) btnSaveDraft.addEventListener('click', () => saveArticle('draft'));

    const btnPublish = document.getElementById('btn-kb-publish');
    if (btnPublish) btnPublish.addEventListener('click', () => saveArticle('published'));

    const btnCancel = document.getElementById('btn-kb-cancel-edit');
    if (btnCancel) btnCancel.addEventListener('click', exitEditorMode);

    // Botão fechar Drawer de Configurações
    const btnCloseDrawer = document.getElementById('btn-kb-drawer-close');
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeSettingsDrawer);

    const btnSaveSettings = document.getElementById('btn-kb-save-settings');
    if (btnSaveSettings) btnSaveSettings.addEventListener('click', applySettingsFromDrawer);

    // Botões da Barra de Formatação (execCommand)
    document.querySelectorAll('.kb-toolbar-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-cmd');
        document.execCommand(cmd, false, null);
        triggerAutosave();
      });
    });

    const selectHeading = document.getElementById('kb-tool-heading');
    if (selectHeading) {
      selectHeading.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'p') document.execCommand('formatBlock', false, '<p>');
        else if (val === 'h2') document.execCommand('formatBlock', false, '<h2>');
        else if (val === 'h3') document.execCommand('formatBlock', false, '<h3>');
        else if (val === 'blockquote') document.execCommand('formatBlock', false, '<blockquote>');
        triggerAutosave();
      });
    }

    const btnAddLink = document.getElementById('btn-kb-tool-link');
    if (btnAddLink) {
      btnAddLink.addEventListener('click', () => {
        const url = prompt('Digite a URL do link:', 'https://');
        if (url) document.execCommand('createLink', false, url);
        triggerAutosave();
      });
    }

    // Modal de Imagem
    const btnAddImage = document.getElementById('btn-kb-add-image');
    if (btnAddImage) btnAddImage.addEventListener('click', () => openImageModal());

    const btnCloseImgModal = document.getElementById('btn-kb-image-modal-close');
    if (btnCloseImgModal) btnCloseImgModal.addEventListener('click', closeImageModal);

    const btnCancelImgModal = document.getElementById('btn-kb-img-cancel');
    if (btnCancelImgModal) btnCancelImgModal.addEventListener('click', closeImageModal);

    const dropZone = document.getElementById('kb-image-drop-zone');
    const fileInput = document.getElementById('kb-image-file-input');
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleImageFileUpload(e.target.files[0]);
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    const btnConfirmImg = document.getElementById('btn-kb-img-confirm');
    if (btnConfirmImg) btnConfirmImg.addEventListener('click', confirmImageInsertion);

    // Botões para adicionar blocos especiais
    const btnAddStep = document.getElementById('btn-kb-add-step-block');
    if (btnAddStep) btnAddStep.addEventListener('click', () => insertStepBlock());

    const btnAddAlert = document.getElementById('btn-kb-add-alert-block');
    if (btnAddAlert) btnAddAlert.addEventListener('click', () => insertAlertBlock());
  }

  // --- Ativação do Modo Edição Inline ---
  window.enableInlineKbEditor = function (articleData) {
    editorState.article = articleData;
    editorState.isEditing = true;
    editorState.isPreviewOnly = false;

    ensureEditorDOM();

    if (elAdminBar) {
      elAdminBar.hidden = false;
      const statusBadge = document.getElementById('kb-editor-status-badge');
      if (statusBadge) {
        statusBadge.textContent = articleData.status === 'draft' ? 'Rascunho' : 'Publicado';
        statusBadge.className = `kb-status-badge ${articleData.status || 'published'}`;
      }
    }

    if (elToolbar && elArticleReader) {
      elArticleReader.prepend(elToolbar);
      elToolbar.hidden = false;
    }

    makeArticleBlocksEditable();
  };

  function makeArticleBlocksEditable() {
    if (!elArticleReader) return;

    // Torna título e lead editáveis diretamente
    const titleEl = elArticleReader.querySelector('.kb-header-title');
    if (titleEl) {
      titleEl.contentEditable = "true";
      titleEl.addEventListener('input', triggerAutosave);
    }

    const leadEl = elArticleReader.querySelector('.kb-header-lead');
    if (leadEl) {
      leadEl.contentEditable = "true";
      leadEl.addEventListener('input', triggerAutosave);
    }

    // Passos do tutorial
    const stepsContainer = elArticleReader.querySelector('.kb-article-steps');
    if (stepsContainer) {
      Array.from(stepsContainer.children).forEach((stepCard) => {
        wrapStepInBlockEditor(stepCard);
      });
    }
  }

  function wrapStepInBlockEditor(stepCard) {
    if (stepCard.classList.contains('kb-block-wrapper')) return;

    stepCard.classList.add('kb-block-wrapper');

    const titleEl = stepCard.querySelector('.kb-step-title');
    if (titleEl) {
      titleEl.contentEditable = "true";
      titleEl.addEventListener('input', triggerAutosave);
    }

    const descEl = stepCard.querySelector('.kb-step-desc');
    if (descEl) {
      descEl.contentEditable = "true";
      descEl.addEventListener('input', triggerAutosave);
    }

    // Ações do bloco (Cima, Baixo, Duplicar, Excluir)
    const actionsBar = document.createElement('div');
    actionsBar.className = 'kb-block-actions';
    actionsBar.innerHTML = `
      <button class="kb-block-action-btn" type="button" title="Mover para cima" onclick="window.moveKbBlock(this, -1)"><i class="fa-solid fa-arrow-up"></i></button>
      <button class="kb-block-action-btn" type="button" title="Mover para baixo" onclick="window.moveKbBlock(this, 1)"><i class="fa-solid fa-arrow-down"></i></button>
      <button class="kb-block-action-btn" type="button" title="Trocar imagem" onclick="window.replaceKbBlockImage(this)"><i class="fa-solid fa-camera"></i></button>
      <button class="kb-block-action-btn danger" type="button" title="Excluir este passo" onclick="window.removeKbBlock(this)"><i class="fa-solid fa-trash"></i></button>
    `;
    stepCard.appendChild(actionsBar);
  }

  window.moveKbBlock = function (btn, direction) {
    const wrapper = btn.closest('.kb-block-wrapper');
    if (!wrapper) return;

    if (direction === -1 && wrapper.previousElementSibling) {
      wrapper.parentNode.insertBefore(wrapper, wrapper.previousElementSibling);
    } else if (direction === 1 && wrapper.nextElementSibling) {
      wrapper.parentNode.insertBefore(wrapper.nextElementSibling, wrapper);
    }
    renumberSteps();
    triggerAutosave();
  };

  window.removeKbBlock = function (btn) {
    const wrapper = btn.closest('.kb-block-wrapper');
    if (!wrapper) return;

    if (confirm('Deseja realmente remover este bloco?')) {
      wrapper.remove();
      renumberSteps();
      triggerAutosave();
    }
  };

  window.replaceKbBlockImage = function (btn) {
    const wrapper = btn.closest('.kb-block-wrapper');
    if (!wrapper) return;

    editorState.pendingImageTarget = wrapper.querySelector('img');
    openImageModal();
  };

  function renumberSteps() {
    if (!elArticleReader) return;
    const steps = elArticleReader.querySelectorAll('.kb-block-wrapper');
    steps.forEach((step, idx) => {
      const numBadge = step.querySelector('.kb-step-number');
      if (numBadge) numBadge.textContent = idx + 1;
    });
  }

  function togglePreviewMode() {
    editorState.isPreviewOnly = !editorState.isPreviewOnly;
    const label = document.getElementById('kb-preview-label');

    if (editorState.isPreviewOnly) {
      document.body.classList.add('kb-preview-mode');
      if (label) label.textContent = 'Voltar para Edição';
    } else {
      document.body.classList.remove('kb-preview-mode');
      if (label) label.textContent = 'Visualizar sem controles';
    }
  }

  function openSettingsDrawer() {
    if (!elSettingsDrawer) return;

    const art = editorState.article || {};
    document.getElementById('kb-setting-slug').value = art.slug || art.id || '';
    document.getElementById('kb-setting-category').value = art.category || 'Primeiros passos';
    document.getElementById('kb-setting-audience').value = art.audience || 'company';
    document.getElementById('kb-setting-lead').value = art.lead || art.summary || '';
    document.getElementById('kb-setting-seo-title').value = art.seoTitle || art.title || '';
    document.getElementById('kb-setting-meta-desc').value = art.metaDescription || art.summary || '';

    elSettingsDrawer.classList.add('open');
  }

  function closeSettingsDrawer() {
    if (elSettingsDrawer) elSettingsDrawer.classList.remove('open');
  }

  function applySettingsFromDrawer() {
    if (!editorState.article) return;

    editorState.article.slug = document.getElementById('kb-setting-slug').value.trim();
    editorState.article.category = document.getElementById('kb-setting-category').value;
    editorState.article.audience = document.getElementById('kb-setting-audience').value;
    editorState.article.lead = document.getElementById('kb-setting-lead').value.trim();
    editorState.article.seoTitle = document.getElementById('kb-setting-seo-title').value.trim();
    editorState.article.metaDescription = document.getElementById('kb-setting-meta-desc').value.trim();

    closeSettingsDrawer();
    triggerAutosave();
  }

  function openImageModal() {
    if (!elImageModal) return;
    document.getElementById('kb-image-preview-area').hidden = true;
    document.getElementById('kb-img-caption-input').value = '';
    document.getElementById('kb-img-alt-input').value = '';
    elImageModal.hidden = false;
  }

  function closeImageModal() {
    if (elImageModal) elImageModal.hidden = true;
    editorState.pendingImageTarget = null;
  }

  async function handleImageFileUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('slug', editorState.article?.slug || 'geral');

    const previewImg = document.getElementById('kb-image-preview-img');
    const previewArea = document.getElementById('kb-image-preview-area');

    try {
      const res = await fetch('/api/admin/knowledge-base/upload-image', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        previewImg.src = data.url;
        previewImg.dataset.uploadedUrl = data.url;
        previewImg.dataset.filename = data.filename;
        previewArea.hidden = false;
      } else {
        alert(data.message || 'Erro ao enviar imagem.');
      }
    } catch (err) {
      alert('Falha na comunicação com o servidor de upload.');
    }
  }

  function confirmImageInsertion() {
    const previewImg = document.getElementById('kb-image-preview-img');
    const caption = document.getElementById('kb-img-caption-input').value.trim();
    const alt = document.getElementById('kb-img-alt-input').value.trim();
    const url = previewImg.dataset.uploadedUrl || previewImg.src;

    if (!url) {
      alert('Selecione ou envie uma imagem antes de confirmar.');
      return;
    }

    if (editorState.pendingImageTarget) {
      // Substitui imagem existente no bloco
      editorState.pendingImageTarget.src = url;
      editorState.pendingImageTarget.alt = alt || 'Print da tela';

      const figcaption = editorState.pendingImageTarget.closest('figure')?.querySelector('figcaption');
      if (figcaption) figcaption.textContent = caption || 'Print da tela';
    } else {
      // Cria um novo bloco de passo com a imagem
      insertStepBlockWithImage(url, caption, alt);
    }

    closeImageModal();
    triggerAutosave();
  }

  function insertStepBlock() {
    insertStepBlockWithImage('./assets/images/base-conhecimento/11-empresa-dashboard-main.png', 'Novo passo', 'Novo passo');
  }

  function insertStepBlockWithImage(imgUrl, caption, alt) {
    if (!elArticleReader) return;

    const stepsContainer = elArticleReader.querySelector('.kb-article-steps');
    if (!stepsContainer) return;

    const stepNum = stepsContainer.children.length + 1;
    const stepCard = document.createElement('article');
    stepCard.className = 'kb-step-card kb-block-wrapper';
    stepCard.innerHTML = `
      <header class="kb-step-header">
        <span class="kb-step-number">${stepNum}</span>
        <h3 class="kb-step-title" contenteditable="true">Novo Passo do Tutorial</h3>
      </header>
      <p class="kb-step-desc" contenteditable="true">Descreva o que o usuário deve realizar neste passo...</p>
      <figure class="kb-step-figure">
        <img src="${imgUrl}" alt="${alt || 'Print da tela'}" loading="lazy">
        <span class="kb-step-figure-badge">🖼️ Print da Tela</span>
        <figcaption contenteditable="true">${caption || 'Legenda da imagem'}</figcaption>
      </figure>
    `;

    stepsContainer.appendChild(stepCard);
    wrapStepInBlockEditor(stepCard);
    renumberSteps();
    triggerAutosave();
  }

  function insertAlertBlock() {
    if (!elArticleReader) return;

    const alertBox = document.createElement('aside');
    alertBox.className = 'kb-alert-box tip kb-block-wrapper';
    alertBox.innerHTML = `
      <div class="kb-alert-icon">💡</div>
      <div class="kb-alert-content">
        <strong>Dica Útil</strong>
        <p contenteditable="true">Escreva aqui uma dica ou recomendação importante para o usuário...</p>
      </div>
    `;

    const stepsContainer = elArticleReader.querySelector('.kb-article-steps');
    if (stepsContainer) {
      stepsContainer.appendChild(alertBox);
      triggerAutosave();
    }
  }

  function triggerAutosave() {
    const statusEl = document.getElementById('kb-editor-autosave-status');
    if (statusEl) statusEl.textContent = 'Salvando rascunho...';

    clearTimeout(editorState.autosaveTimer);
    editorState.autosaveTimer = setTimeout(() => {
      saveArticle('draft', true);
    }, 2000);
  }

  async function saveArticle(targetStatus = 'draft', isAutosave = false) {
    if (!editorState.article || !elArticleReader) return;

    const titleEl = elArticleReader.querySelector('.kb-header-title');
    const leadEl = elArticleReader.querySelector('.kb-header-lead');

    const updatedTitle = titleEl ? titleEl.textContent.trim() : editorState.article.title;
    const updatedLead = leadEl ? leadEl.textContent.trim() : editorState.article.lead;

    // Coleta todos os passos dos blocos
    const stepCards = Array.from(elArticleReader.querySelectorAll('.kb-step-card'));
    const steps = stepCards.map((card, idx) => {
      const stTitle = card.querySelector('.kb-step-title')?.textContent.trim() || '';
      const stDesc = card.querySelector('.kb-step-desc')?.textContent.trim() || '';
      const img = card.querySelector('img');
      const figcaption = card.querySelector('figcaption');

      const imagePath = img ? img.getAttribute('src') : '';
      const filename = imagePath ? imagePath.split('/').pop() : '';

      return {
        num: idx + 1,
        title: stTitle,
        desc: stDesc,
        image: imagePath,
        filename: filename,
        caption: figcaption ? figcaption.textContent.trim() : stTitle,
        alt: img ? img.alt : stTitle
      };
    });

    const payload = {
      id: editorState.article.id,
      slug: editorState.article.slug || editorState.article.id,
      title: updatedTitle,
      category: editorState.article.category || 'Primeiros passos',
      audience: editorState.article.audience || 'company',
      readTime: editorState.article.readTime || '3 min de leitura',
      lead: updatedLead,
      alertTip: editorState.article.alertTip || '',
      status: targetStatus,
      steps: steps,
      seoTitle: editorState.article.seoTitle || updatedTitle,
      metaDescription: editorState.article.metaDescription || (updatedLead ? updatedLead.slice(0, 160) : '')
    };

    try {
      const res = await fetch('/api/admin/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        editorState.article = data.article;

        const statusEl = document.getElementById('kb-editor-autosave-status');
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (statusEl) statusEl.textContent = `Alterações salvas às ${nowStr}`;

        const statusBadge = document.getElementById('kb-editor-status-badge');
        if (statusBadge) {
          statusBadge.textContent = targetStatus === 'draft' ? 'Rascunho' : 'Publicado';
          statusBadge.className = `kb-status-badge ${targetStatus}`;
        }

        if (!isAutosave) {
          alert(targetStatus === 'published' ? 'Artigo publicado com sucesso!' : 'Rascunho salvo com sucesso!');
        }
      }
    } catch (err) {
      console.warn('Erro ao salvar artigo:', err);
    }
  }

  function exitEditorMode() {
    if (confirm('Deseja fechar o modo de edição?')) {
      document.body.classList.remove('kb-preview-mode');
      if (elAdminBar) elAdminBar.hidden = true;
      if (elToolbar) elToolbar.hidden = true;
      window.location.reload();
    }
  }

})();
