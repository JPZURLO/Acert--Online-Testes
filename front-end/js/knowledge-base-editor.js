/**
 * Online Teste — Editor Visual Inline por Blocos da Base de Conhecimento
 * Permite editar artigos diretamente na própria estrutura da página com visualização em tempo real.
 *
 * Ativação:
 *   window.enableInlineKbEditor(articleData)  — chamado pelo knowledge-base.js após renderizar o artigo
 *   window.disableInlineKbEditor()            — sai do modo de edição
 */

(function () {
  'use strict';

  // --- Estado do Editor ---
  let editorState = {
    article: null,
    isEditing: false,
    isPreviewOnly: false,
    autosaveTimer: null,
    pendingImageTarget: null,
    uploadedImageUrl: null
  };

  let elAdminBar    = null;
  let elToolbar     = null;
  let elSettingsDrawer = null;
  let elImageModal  = null;

  // -------------------------------------------------------------------------
  // Injeção do DOM de controle (barra de admin, toolbar, drawer, modal imagem)
  // Chamada a cada vez que enableInlineKbEditor é invocado para garantir que
  // os elementos estejam na página.
  // -------------------------------------------------------------------------
  function injectEditorChrome() {

    // ---- Barra de Administração (fixa no topo) ----------------------------
    if (!document.getElementById('kb-editor-admin-bar')) {
      const bar = document.createElement('div');
      bar.id = 'kb-editor-admin-bar';
      bar.className = 'kb-editor-admin-bar';
      bar.innerHTML = `
        <div class="kb-editor-admin-info">
          <i class="fa-solid fa-pen-to-square"></i>
          <span>Modo Edição Visual</span>
          <span class="kb-status-badge draft" id="kb-editor-status-badge">Rascunho</span>
          <small id="kb-editor-autosave-status" style="color:#94a3b8;font-weight:500;">Pronto para editar</small>
        </div>
        <div class="kb-editor-admin-actions">
          <button class="kb-btn-editor secondary" id="btn-kb-toggle-preview" type="button">
            <i class="fa-solid fa-eye"></i> <span id="kb-preview-label">Visualizar Limpo</span>
          </button>
          <button class="kb-btn-editor secondary" id="btn-kb-open-settings" type="button">
            <i class="fa-solid fa-gear"></i> Configurações
          </button>
          <button class="kb-btn-editor warning" id="btn-kb-save-draft" type="button">
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
      document.body.prepend(bar);
      elAdminBar = bar;
    } else {
      elAdminBar = document.getElementById('kb-editor-admin-bar');
    }

    // ---- Barra de Formatação Sticky (logo abaixo da admin bar) -----------
    if (!document.getElementById('kb-editor-toolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'kb-editor-toolbar';
      toolbar.className = 'kb-editor-toolbar';
      toolbar.innerHTML = `
        <div class="kb-toolbar-group">
          <select class="kb-toolbar-select" id="kb-tool-heading" title="Formatar como">
            <option value="p">Texto Normal</option>
            <option value="h2">Título H2</option>
            <option value="h3">Subtítulo H3</option>
            <option value="blockquote">Citação</option>
          </select>
        </div>
        <div class="kb-toolbar-group">
          <button class="kb-toolbar-btn" data-cmd="bold" title="Negrito"><i class="fa-solid fa-bold"></i></button>
          <button class="kb-toolbar-btn" data-cmd="italic" title="Itálico"><i class="fa-solid fa-italic"></i></button>
          <button class="kb-toolbar-btn" data-cmd="underline" title="Sublinhado"><i class="fa-solid fa-underline"></i></button>
          <button class="kb-toolbar-btn" id="btn-kb-tool-link" title="Link"><i class="fa-solid fa-link"></i></button>
        </div>
        <div class="kb-toolbar-group">
          <button class="kb-toolbar-btn" data-cmd="insertUnorderedList" title="Lista •"><i class="fa-solid fa-list-ul"></i></button>
          <button class="kb-toolbar-btn" data-cmd="insertOrderedList" title="Lista 1."><i class="fa-solid fa-list-ol"></i></button>
        </div>
        <div class="kb-toolbar-group">
          <button class="kb-toolbar-btn" id="btn-kb-add-image" title="Inserir Imagem"><i class="fa-solid fa-image"></i> Imagem</button>
          <button class="kb-toolbar-btn" id="btn-kb-add-step-block" title="Novo Passo"><i class="fa-solid fa-list-check"></i> Passo</button>
          <button class="kb-toolbar-btn" id="btn-kb-add-alert-block" title="Inserir Dica/Alerta"><i class="fa-solid fa-lightbulb"></i> Dica</button>
        </div>
        <div class="kb-toolbar-group">
          <button class="kb-toolbar-btn" data-cmd="undo" title="Desfazer"><i class="fa-solid fa-rotate-left"></i></button>
          <button class="kb-toolbar-btn" data-cmd="redo" title="Refazer"><i class="fa-solid fa-rotate-right"></i></button>
          <button class="kb-toolbar-btn" data-cmd="removeFormat" title="Limpar formatação"><i class="fa-solid fa-text-slash"></i></button>
        </div>
      `;
      // Insere a toolbar APÓS a barra de admin, antes do conteúdo da página
      elAdminBar.insertAdjacentElement('afterend', toolbar);
      elToolbar = toolbar;
    } else {
      elToolbar = document.getElementById('kb-editor-toolbar');
    }

    // ---- Painel Lateral de Configurações ---------------------------------
    if (!document.getElementById('kb-settings-drawer')) {
      const drawer = document.createElement('div');
      drawer.id = 'kb-settings-drawer';
      drawer.className = 'kb-settings-drawer';
      drawer.innerHTML = `
        <div class="kb-drawer-header">
          <h3 style="margin:0;font-size:16px;">Configurações do Artigo</h3>
          <button class="kb-drawer-close" id="btn-kb-drawer-close" type="button">×</button>
        </div>
        <label class="kb-drawer-field">Slug (URL do artigo)
          <input class="admin-input" id="kb-setting-slug" placeholder="como-criar-participante">
        </label>
        <label class="kb-drawer-field">Categoria
          <select class="admin-input" id="kb-setting-category">
            <option>Primeiros passos</option>
            <option>Criação de exames</option>
            <option>Questões e importação</option>
            <option>Participantes</option>
            <option>Documentos e termos</option>
            <option>Convites e acessos</option>
            <option>Monitoramento</option>
            <option>Resultados</option>
            <option>Personalização</option>
            <option>Conheça a plataforma</option>
          </select>
        </label>
        <label class="kb-drawer-field">Público-Alvo
          <select class="admin-input" id="kb-setting-audience">
            <option value="company">Empresas</option>
            <option value="participant">Participantes</option>
            <option value="platform">Geral</option>
          </select>
        </label>
        <label class="kb-drawer-field">Tempo de Leitura
          <input class="admin-input" id="kb-setting-readtime" placeholder="5 min de leitura">
        </label>
        <label class="kb-drawer-field">Resumo Curto (Lead)
          <textarea class="admin-input" id="kb-setting-lead" rows="3" placeholder="Resumo para a lista de artigos..."></textarea>
        </label>
        <label class="kb-drawer-field">SEO Title
          <input class="admin-input" id="kb-setting-seo-title" placeholder="Título para o Google">
        </label>
        <label class="kb-drawer-field">Meta Description
          <textarea class="admin-input" id="kb-setting-meta-desc" rows="2" placeholder="Descrição para o Google..."></textarea>
        </label>
        <div style="margin-top:16px;">
          <button class="kb-btn-editor primary" id="btn-kb-save-settings" type="button" style="width:100%;justify-content:center;">
            <i class="fa-solid fa-check"></i> Aplicar Configurações
          </button>
        </div>
      `;
      document.body.appendChild(drawer);
      elSettingsDrawer = drawer;
    } else {
      elSettingsDrawer = document.getElementById('kb-settings-drawer');
    }

    // ---- Modal de Upload de Imagem ---------------------------------------
    if (!document.getElementById('kb-image-modal')) {
      const modal = document.createElement('div');
      modal.id = 'kb-image-modal';
      modal.className = 'kb-image-modal';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="kb-image-modal-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="font-size:16px;font-weight:800;margin:0;">Inserir Imagem / Print de Tela</h3>
            <button type="button" class="kb-drawer-close" id="btn-kb-image-modal-close">×</button>
          </div>
          <div class="kb-drop-zone" id="kb-image-drop-zone">
            <i class="fa-solid fa-cloud-arrow-up" style="font-size:32px;color:#0f6f73;"></i>
            <p style="font-weight:700;font-size:14px;margin:8px 0 4px;">Arraste e solte sua imagem aqui</p>
            <span style="font-size:12px;color:#64748b;">PNG, JPG, JPEG ou WEBP — máximo 10 MB</span>
            <input type="file" id="kb-image-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;">
          </div>
          <div id="kb-image-preview-area" hidden style="text-align:center;margin:12px 0;">
            <img id="kb-image-preview-img" src="" alt="" style="max-height:180px;border-radius:8px;border:1px solid #cbd5e1;object-fit:contain;">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;">
            <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;">
              Legenda
              <input class="admin-input" id="kb-img-caption-input" placeholder="Ex: Tela de participantes">
            </label>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;">
              Texto ALT
              <input class="admin-input" id="kb-img-alt-input" placeholder="Descrição da imagem">
            </label>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button class="kb-btn-editor secondary" id="btn-kb-img-cancel" type="button">Cancelar</button>
            <button class="kb-btn-editor primary" id="btn-kb-img-confirm" type="button">
              <i class="fa-solid fa-check"></i> Inserir Imagem
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      elImageModal = modal;
    } else {
      elImageModal = document.getElementById('kb-image-modal');
    }

    bindChromeEvents();
  }

  // -------------------------------------------------------------------------
  // Bind de eventos para todos os elementos de controle do editor
  // Usa flags para não duplicar listeners (removeEventListener via named fn)
  // -------------------------------------------------------------------------
  function bindChromeEvents() {
    // Usa delegação de evento na barra de admin para não re-registrar
    const bar = document.getElementById('kb-editor-admin-bar');
    if (bar && !bar._evBound) {
      bar._evBound = true;

      bar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.id;
        if (id === 'btn-kb-toggle-preview') togglePreviewMode();
        else if (id === 'btn-kb-open-settings') openSettingsDrawer();
        else if (id === 'btn-kb-save-draft') saveArticle('draft');
        else if (id === 'btn-kb-publish') saveArticle('published');
        else if (id === 'btn-kb-cancel-edit') exitEditorMode();
      });
    }

    // Toolbar
    const toolbar = document.getElementById('kb-editor-toolbar');
    if (toolbar && !toolbar._evBound) {
      toolbar._evBound = true;

      toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const cmd = btn.getAttribute('data-cmd');
        if (cmd) { document.execCommand(cmd, false, null); triggerAutosave(); return; }
        if (btn.id === 'btn-kb-tool-link') {
          const url = prompt('URL do link:', 'https://');
          if (url) { document.execCommand('createLink', false, url); triggerAutosave(); }
        }
        if (btn.id === 'btn-kb-add-image') openImageModal();
        if (btn.id === 'btn-kb-add-step-block') insertStepBlock();
        if (btn.id === 'btn-kb-add-alert-block') insertAlertBlock();
      });

      const sel = document.getElementById('kb-tool-heading');
      if (sel) {
        sel.addEventListener('change', (e) => {
          const map = { p: '<p>', h2: '<h2>', h3: '<h3>', blockquote: '<blockquote>' };
          document.execCommand('formatBlock', false, map[e.target.value] || '<p>');
          triggerAutosave();
        });
      }
    }

    // Settings drawer
    const drawer = document.getElementById('kb-settings-drawer');
    if (drawer && !drawer._evBound) {
      drawer._evBound = true;
      drawer.addEventListener('click', (e) => {
        if (e.target.id === 'btn-kb-drawer-close') closeSettingsDrawer();
        if (e.target.id === 'btn-kb-save-settings') applySettingsFromDrawer();
      });
    }

    // Image modal
    const modal = document.getElementById('kb-image-modal');
    if (modal && !modal._evBound) {
      modal._evBound = true;

      modal.addEventListener('click', (e) => {
        if (e.target.id === 'btn-kb-image-modal-close') closeImageModal();
        if (e.target.id === 'btn-kb-img-cancel') closeImageModal();
        if (e.target.id === 'btn-kb-img-confirm') confirmImageInsertion();
      });

      const dropZone = document.getElementById('kb-image-drop-zone');
      const fileInput = document.getElementById('kb-image-file-input');
      if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) handleImageFileUpload(e.target.files[0]);
        });
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.classList.remove('dragover');
          if (e.dataTransfer.files && e.dataTransfer.files[0]) handleImageFileUpload(e.dataTransfer.files[0]);
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Ativação principal do Editor Visual Inline
  // -------------------------------------------------------------------------
  window.enableInlineKbEditor = function (articleData) {
    if (!articleData) return;

    editorState.article = articleData;
    editorState.isEditing = true;
    editorState.isPreviewOnly = false;
    editorState.uploadedImageUrl = null;

    // Garante que o chrome do editor existe
    injectEditorChrome();

    // Mostra barra de admin e toolbar
    if (elAdminBar) elAdminBar.hidden = false;
    if (elToolbar) elToolbar.hidden = false;

    // Atualiza badge de status
    const badge = document.getElementById('kb-editor-status-badge');
    if (badge) {
      const s = articleData.status || 'published';
      badge.textContent = s === 'draft' ? 'Rascunho' : 'Publicado';
      badge.className = 'kb-status-badge ' + s;
    }

    // Preenche campos do drawer com valores atuais
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setVal('kb-setting-slug',      articleData.slug  || articleData.id);
    setVal('kb-setting-category',  articleData.category || '');
    setVal('kb-setting-audience',  articleData.audience || 'company');
    setVal('kb-setting-readtime',  articleData.readTime || '3 min de leitura');
    setVal('kb-setting-lead',      articleData.lead || articleData.summary || '');
    setVal('kb-setting-seo-title', articleData.seoTitle || articleData.title || '');
    setVal('kb-setting-meta-desc', articleData.metaDescription || '');

    // Esconde o botão "✏️ Editar no Editor Visual" para não duplicar
    const btnTrigger = document.getElementById('btn-trigger-inline-edit');
    if (btnTrigger) btnTrigger.hidden = true;

    // Adiciona padding no body para compensar a barra fixa
    document.body.style.paddingTop = '110px';

    // Habilita edição nos elementos
    makeArticleEditable();

    // Marca modo edição com classe no body
    document.body.classList.add('kb-edit-active');
  };

  function makeArticleEditable() {
    const articleView = document.getElementById('kb-article-view');
    if (!articleView) return;

    // Título do artigo
    const titleEl = articleView.querySelector('h1');
    if (titleEl && !titleEl._editBound) {
      titleEl._editBound = true;
      titleEl.contentEditable = 'true';
      titleEl.classList.add('kb-editable');
      titleEl.addEventListener('input', triggerAutosave);
    }

    // Lead / resumo
    const leadEl = articleView.querySelector('.kb-article-lead');
    if (leadEl && !leadEl._editBound) {
      leadEl._editBound = true;
      leadEl.contentEditable = 'true';
      leadEl.classList.add('kb-editable');
      leadEl.addEventListener('input', triggerAutosave);
    }

    // Passos — ativa edição inline e adiciona controles de bloco
    const stepsEl = articleView.querySelector('.kb-article-steps');
    if (stepsEl) {
      Array.from(stepsEl.children).forEach(stepCard => activateBlockEditor(stepCard));
    }

    // Dica/Alerta
    const alertEl = articleView.querySelector('.kb-alert');
    if (alertEl && !alertEl._editBound) {
      alertEl._editBound = true;
      alertEl.contentEditable = 'true';
      alertEl.classList.add('kb-editable');
    }
  }

  function activateBlockEditor(stepCard) {
    if (stepCard._blockActivated) return;
    stepCard._blockActivated = true;

    stepCard.classList.add('kb-block-wrapper');

    // Habilita edição nos campos de texto do passo
    ['.kb-step-title', '.kb-step-desc', 'figcaption span'].forEach(sel => {
      const el = stepCard.querySelector(sel);
      if (el && !el._editBound) {
        el._editBound = true;
        el.contentEditable = 'true';
        el.classList.add('kb-editable');
        el.addEventListener('input', triggerAutosave);
      }
    });

    // Cria a barra de ações flutuante do bloco
    if (!stepCard.querySelector('.kb-block-actions')) {
      const actions = document.createElement('div');
      actions.className = 'kb-block-actions';
      actions.innerHTML = `
        <button class="kb-block-action-btn" type="button" title="Mover para cima" onclick="window.moveKbBlock(this, -1)">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button class="kb-block-action-btn" type="button" title="Mover para baixo" onclick="window.moveKbBlock(this, 1)">
          <i class="fa-solid fa-arrow-down"></i>
        </button>
        <button class="kb-block-action-btn" type="button" title="Trocar imagem" onclick="window.replaceKbBlockImage(this)">
          <i class="fa-solid fa-camera"></i> Foto
        </button>
        <button class="kb-block-action-btn danger" type="button" title="Excluir passo" onclick="window.removeKbBlock(this)">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;
      stepCard.appendChild(actions);
    }
  }

  // -------------------------------------------------------------------------
  // Controles de bloco expostos globalmente
  // -------------------------------------------------------------------------
  window.moveKbBlock = function (btn, dir) {
    const wrapper = btn.closest('.kb-block-wrapper');
    if (!wrapper) return;
    if (dir === -1 && wrapper.previousElementSibling) {
      wrapper.parentNode.insertBefore(wrapper, wrapper.previousElementSibling);
    } else if (dir === 1 && wrapper.nextElementSibling) {
      wrapper.parentNode.insertBefore(wrapper.nextElementSibling, wrapper);
    }
    renumberSteps();
    triggerAutosave();
  };

  window.removeKbBlock = function (btn) {
    const wrapper = btn.closest('.kb-block-wrapper');
    if (!wrapper) return;
    if (!confirm('Deseja excluir este passo?')) return;
    wrapper.remove();
    renumberSteps();
    triggerAutosave();
  };

  window.replaceKbBlockImage = function (btn) {
    const wrapper = btn.closest('.kb-block-wrapper');
    if (!wrapper) return;
    editorState.pendingImageTarget = wrapper.querySelector('img');
    openImageModal();
  };

  function renumberSteps() {
    const stepsEl = document.querySelector('.kb-article-steps');
    if (!stepsEl) return;
    Array.from(stepsEl.children).forEach((card, i) => {
      const numEl = card.querySelector('.kb-step-number');
      if (numEl) numEl.textContent = i + 1;
    });
  }

  // -------------------------------------------------------------------------
  // Inserir novo passo
  // -------------------------------------------------------------------------
  function insertStepBlock() {
    const stepsEl = document.querySelector('.kb-article-steps');
    if (!stepsEl) return;

    const idx = stepsEl.children.length + 1;
    const card = document.createElement('div');
    card.className = 'kb-step-card kb-block-wrapper';
    card.innerHTML = `
      <div class="kb-step-header">
        <span class="kb-step-number">${idx}</span>
        <h3 class="kb-step-title kb-editable" contenteditable="true">Título do Passo ${idx}</h3>
      </div>
      <p class="kb-step-desc kb-editable" contenteditable="true">Descreva este passo aqui...</p>
      <figure class="kb-step-figure">
        <div class="kb-step-figure-badge">🖼️ Clique em <strong>📷 Foto</strong> para inserir uma imagem</div>
        <button class="kb-image-zoom-btn" type="button" style="display:none;">
          <img src="" alt="" loading="lazy">
        </button>
        <figcaption>
          <span contenteditable="true" class="kb-editable">Legenda da imagem</span>
        </figcaption>
      </figure>
    `;

    stepsEl.appendChild(card);
    activateBlockEditor(card);

    // Foca no título do novo passo
    const t = card.querySelector('.kb-step-title');
    if (t) { t.focus(); document.execCommand('selectAll'); }
    triggerAutosave();
  }

  // -------------------------------------------------------------------------
  // Inserir bloco de alerta/dica
  // -------------------------------------------------------------------------
  function insertAlertBlock() {
    const body = document.querySelector('.kb-article-body');
    if (!body) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = 'kb-alert kb-alert-tip kb-editable';
    alertDiv.contentEditable = 'true';
    alertDiv.innerHTML = `<span class="kb-alert-icon">💡</span> <strong>Dica:</strong> Clique aqui para digitar a dica ou aviso...`;
    alertDiv.addEventListener('input', triggerAutosave);
    body.appendChild(alertDiv);
    alertDiv.focus();
    triggerAutosave();
  }

  // -------------------------------------------------------------------------
  // Upload & Inserção de Imagem
  // -------------------------------------------------------------------------
  function openImageModal() {
    if (!elImageModal) return;
    elImageModal.hidden = false;
    const preview = document.getElementById('kb-image-preview-area');
    if (preview) preview.hidden = true;
    const cap = document.getElementById('kb-img-caption-input');
    if (cap) cap.value = '';
    const alt = document.getElementById('kb-img-alt-input');
    if (alt) alt.value = '';
    editorState.uploadedImageUrl = null;
  }

  function closeImageModal() {
    if (elImageModal) elImageModal.hidden = true;
    editorState.pendingImageTarget = null;
    editorState.uploadedImageUrl = null;
  }

  async function handleImageFileUpload(file) {
    const slug = (editorState.article && (editorState.article.slug || editorState.article.id)) || 'sem-slug';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('slug', slug);

    // Lê o CSRF token do cookie
    const csrf = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('acert_csrf_token='));
    const csrfValue = csrf ? csrf.split('=')[1] : '';

    const statusEl = document.getElementById('kb-editor-autosave-status');
    if (statusEl) statusEl.textContent = 'Enviando imagem...';

    try {
      const res = await fetch('/api/admin/knowledge-base/upload-image', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfValue },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        editorState.uploadedImageUrl = data.url;

        const previewImg = document.getElementById('kb-image-preview-img');
        if (previewImg) previewImg.src = data.url;
        const previewArea = document.getElementById('kb-image-preview-area');
        if (previewArea) previewArea.hidden = false;

        if (statusEl) statusEl.textContent = 'Imagem carregada. Confirme para inserir.';
      } else {
        alert('Erro no upload: ' + (data.message || 'Tente novamente.'));
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      alert('Falha ao enviar imagem. Verifique sua conexão.');
    }
  }

  function confirmImageInsertion() {
    const url = editorState.uploadedImageUrl;
    const caption = (document.getElementById('kb-img-caption-input') || {}).value || '';
    const alt = (document.getElementById('kb-img-alt-input') || {}).value || '';

    if (!url) { alert('Selecione uma imagem primeiro.'); return; }

    // Se estiver trocando imagem de um bloco existente
    if (editorState.pendingImageTarget) {
      editorState.pendingImageTarget.src = url;
      editorState.pendingImageTarget.alt = alt || caption;
      const fig = editorState.pendingImageTarget.closest('figure');
      if (fig) {
        const btn = fig.querySelector('.kb-image-zoom-btn');
        if (btn) btn.style.display = '';
        const cap = fig.querySelector('figcaption span');
        if (cap) cap.textContent = caption;
      }
      closeImageModal();
      triggerAutosave();
      return;
    }

    // Inserção de novo bloco de imagem standalone
    const stepsEl = document.querySelector('.kb-article-steps') || document.querySelector('.kb-article-body');
    if (!stepsEl) { closeImageModal(); return; }

    const fig = document.createElement('figure');
    fig.className = 'kb-step-figure kb-editable';
    fig.style.margin = '20px 0';
    fig.innerHTML = `
      <button class="kb-image-zoom-btn" type="button" onclick="window.openKnowledgeImageZoom('${url}','${alt}','${caption}')">
        <img src="${url}" alt="${alt}" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;">
      </button>
      <figcaption>
        <span contenteditable="true" class="kb-editable">${caption || 'Legenda da imagem'}</span>
      </figcaption>
    `;
    stepsEl.appendChild(fig);

    closeImageModal();
    triggerAutosave();
  }

  // -------------------------------------------------------------------------
  // Configurações / Drawer
  // -------------------------------------------------------------------------
  function openSettingsDrawer() {
    if (!elSettingsDrawer) return;
    elSettingsDrawer.classList.add('kb-drawer-open');
  }

  function closeSettingsDrawer() {
    if (!elSettingsDrawer) return;
    elSettingsDrawer.classList.remove('kb-drawer-open');
  }

  function applySettingsFromDrawer() {
    if (!editorState.article) return;
    const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    editorState.article.slug          = get('kb-setting-slug');
    editorState.article.category      = get('kb-setting-category');
    editorState.article.audience      = get('kb-setting-audience');
    editorState.article.readTime      = get('kb-setting-readtime');
    editorState.article.lead          = get('kb-setting-lead');
    editorState.article.seoTitle      = get('kb-setting-seo-title');
    editorState.article.metaDescription = get('kb-setting-meta-desc');
    closeSettingsDrawer();
    triggerAutosave();
  }

  // -------------------------------------------------------------------------
  // Salvar Artigo
  // -------------------------------------------------------------------------
  function triggerAutosave() {
    clearTimeout(editorState.autosaveTimer);
    const statusEl = document.getElementById('kb-editor-autosave-status');
    if (statusEl) statusEl.textContent = 'Salvando...';
    editorState.autosaveTimer = setTimeout(() => saveArticle('draft', true), 2500);
  }

  async function saveArticle(targetStatus, isAutosave = false) {
    if (!editorState.article) return;

    clearTimeout(editorState.autosaveTimer);

    const articleView = document.getElementById('kb-article-view');
    const titleEl    = articleView && articleView.querySelector('h1');
    const leadEl     = articleView && articleView.querySelector('.kb-article-lead');
    const stepsEl    = articleView && articleView.querySelector('.kb-article-steps');

    const updatedTitle = titleEl ? titleEl.textContent.trim() : (editorState.article.title || '');
    const updatedLead  = leadEl  ? leadEl.textContent.trim()  : (editorState.article.lead || '');

    // Extrai os passos editados do DOM
    const steps = [];
    if (stepsEl) {
      Array.from(stepsEl.querySelectorAll('.kb-step-card, .kb-block-wrapper')).forEach((card, idx) => {
        const titleNode   = card.querySelector('.kb-step-title');
        const descNode    = card.querySelector('.kb-step-desc');
        const imgNode     = card.querySelector('img');
        const captionNode = card.querySelector('figcaption span');
        steps.push({
          num:     idx + 1,
          title:   titleNode   ? titleNode.textContent.trim()   : `Passo ${idx + 1}`,
          desc:    descNode    ? descNode.textContent.trim()    : '',
          image:   imgNode     ? (imgNode.src || '')            : '',
          alt:     imgNode     ? (imgNode.alt || '')            : '',
          caption: captionNode ? captionNode.textContent.trim() : ''
        });
      });
    }

    const payload = {
      id:              editorState.article.id,
      slug:            editorState.article.slug || editorState.article.id,
      title:           updatedTitle,
      category:        editorState.article.category || 'Primeiros passos',
      audience:        editorState.article.audience || 'company',
      readTime:        editorState.article.readTime || '3 min de leitura',
      lead:            updatedLead,
      alertTip:        editorState.article.alertTip || '',
      status:          targetStatus,
      steps:           steps,
      seoTitle:        editorState.article.seoTitle || updatedTitle,
      metaDescription: editorState.article.metaDescription || (updatedLead ? updatedLead.slice(0, 160) : '')
    };

    // CSRF
    const csrf = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('acert_csrf_token='));
    const csrfValue = csrf ? csrf.split('=')[1] : '';

    try {
      const res = await fetch('/api/admin/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfValue },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        editorState.article = data.article;

        const statusEl = document.getElementById('kb-editor-autosave-status');
        if (statusEl) {
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          statusEl.textContent = `Salvo às ${now}`;
        }

        const badge = document.getElementById('kb-editor-status-badge');
        if (badge) {
          badge.textContent = targetStatus === 'draft' ? 'Rascunho' : 'Publicado';
          badge.className = 'kb-status-badge ' + targetStatus;
        }

        if (!isAutosave) {
          const msg = targetStatus === 'published' ? 'Artigo publicado com sucesso!' : 'Rascunho salvo!';
          alert(msg);
        }
      } else {
        const statusEl = document.getElementById('kb-editor-autosave-status');
        if (statusEl) statusEl.textContent = 'Erro ao salvar.';
        if (!isAutosave) alert('Não foi possível salvar. ' + (data.message || ''));
      }
    } catch (err) {
      console.warn('Erro ao salvar:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Visualizar sem controles / Voltar ao modo de edição
  // -------------------------------------------------------------------------
  function togglePreviewMode() {
    editorState.isPreviewOnly = !editorState.isPreviewOnly;
    const label = document.getElementById('kb-preview-label');
    if (editorState.isPreviewOnly) {
      document.body.classList.add('kb-preview-mode');
      if (elToolbar) elToolbar.hidden = true;
      if (label) label.textContent = 'Voltar à Edição';
    } else {
      document.body.classList.remove('kb-preview-mode');
      if (elToolbar) elToolbar.hidden = false;
      if (label) label.textContent = 'Visualizar Limpo';
    }
  }

  // -------------------------------------------------------------------------
  // Saída do modo de edição
  // -------------------------------------------------------------------------
  window.disableInlineKbEditor = function () {
    exitEditorMode();
  };

  function exitEditorMode() {
    editorState.isEditing = false;
    clearTimeout(editorState.autosaveTimer);

    if (elAdminBar) elAdminBar.hidden = true;
    if (elToolbar) elToolbar.hidden = true;
    if (elSettingsDrawer) elSettingsDrawer.classList.remove('kb-drawer-open');

    document.body.classList.remove('kb-edit-active', 'kb-preview-mode');
    document.body.style.paddingTop = '';

    // Remove contenteditable de todos os elementos
    document.querySelectorAll('.kb-editable').forEach(el => {
      el.contentEditable = 'false';
      el.classList.remove('kb-editable');
      el._editBound = false;
    });
    document.querySelectorAll('.kb-block-wrapper').forEach(el => {
      el._blockActivated = false;
      const actions = el.querySelector('.kb-block-actions');
      if (actions) actions.remove();
    });

    // Recoloca o botão de edição se estiver na BaseConhecimento
    const btnTrigger = document.getElementById('btn-trigger-inline-edit');
    if (btnTrigger) btnTrigger.hidden = false;

    // Se estiver no overlay do Admin, fecha-o e recarrega a tabela
    if (typeof window._kbEditorOnClose === 'function') {
      window._kbEditorOnClose();
      window._kbEditorOnClose = null;
    }
  }

})();
