const operationState = {
  items: [],
  selectedId: null,
  expandedId: null,
  viewMode: 'grid',
  chatLastId: 0,
  refreshTimer: null,
  chatTimer: null
};

const operationElements = {};
const operationIds = [
  'company-name', 'company-initials', 'operations-waiting', 'operations-active',
  'operations-paused', 'operations-unread', 'operations-finished', 'operation-search',
  'operation-status', 'operation-filter-exam', 'operation-filter-unit', 'operation-filter-live',
  'view-mode-grid', 'view-mode-table', 'operations-cards-container', 'operations-table-wrapper',
  'operations-body', 'operations-empty', 'operation-detail', 'operation-placeholder',
  'operation-content', 'detail-avatar', 'detail-name', 'detail-email', 'detail-status',
  'detail-exam', 'detail-started', 'detail-remaining', 'detail-resume', 'authorize-attempt',
  'pause-attempt', 'resume-attempt', 'close-attempt', 'operation-feedback', 'chat-live',
  'company-chat-messages', 'company-chat-form', 'company-chat-input', 'operations-toast-region',
  'expanded-candidate-modal', 'modal-close-button', 'modal-candidate-avatar',
  'modal-candidate-name', 'modal-candidate-email', 'modal-webrtc-badge',
  'modal-stream-player', 'modal-stream-placeholder', 'modal-exam-title',
  'modal-remaining-time', 'modal-toggle-audio-btn', 'modal-proctor-talk-btn',
  'modal-authorize-btn', 'modal-pause-btn', 'modal-resume-btn', 'modal-close-attempt-btn',
  'modal-chat-messages', 'modal-chat-form', 'modal-chat-input'
];

const operationLabels = {
  not_started: 'Não iniciado',
  waiting_proctor: 'Aguardando liberação',
  in_progress: 'Em andamento',
  paused: 'Retomada pendente',
  submitted: 'Enviado',
  closed: 'Encerrado'
};

function operationCache() {
  operationIds.forEach(id => operationElements[id] = document.getElementById(id));
}

function operationInitials(name) {
  return String(name || 'PT').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function operationCsrf() {
  const item = document.cookie.split('; ').find(value => value.startsWith('acert_csrf_token='));
  return item ? decodeURIComponent(item.split('=').slice(1).join('=')) : '';
}

async function operationApi(url, options = {}) {
  const method = options.method || 'GET';
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-CSRF-Token'] = operationCsrf();
  const response = await fetch(url, { ...options, headers });
  let data = {};
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) {
    const error = new Error(data.message || 'Não foi possível concluir a operação.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function operationToast(message, type = 'success') {
  const region = operationElements['operations-toast-region'] || document.getElementById('operations-toast-region');
  if (!region) return;
  const item = document.createElement('div');
  item.className = `operations-toast ${type === 'error' ? 'error' : ''}`;
  item.textContent = message;
  region.appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

function operationDate(value) {
  if (!value) return 'Ainda não iniciada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function operationRemaining(seconds, status) {
  if (!['in_progress', 'paused'].includes(status)) return '—';
  const value = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  return [hours, minutes, secs].map(item => String(item).padStart(2, '0')).join(':');
}

function updateOperationStats() {
  if (operationElements['operations-waiting']) operationElements['operations-waiting'].textContent = operationState.items.filter(item => item.status === 'waiting_proctor').length;
  if (operationElements['operations-active']) operationElements['operations-active'].textContent = operationState.items.filter(item => item.status === 'in_progress').length;
  if (operationElements['operations-paused']) operationElements['operations-paused'].textContent = operationState.items.filter(item => item.status === 'paused').length;
  if (operationElements['operations-unread']) operationElements['operations-unread'].textContent = operationState.items.reduce((total, item) => total + Number(item.unreadMessages || 0), 0);
  if (operationElements['operations-finished']) operationElements['operations-finished'].textContent = operationState.items.filter(item => ['submitted', 'closed'].includes(item.status)).length;
}

function populateFilterOptions() {
  const examSelect = document.getElementById('operation-filter-exam');
  const unitSelect = document.getElementById('operation-filter-unit');
  if (!examSelect || !unitSelect) return;

  const currentExam = examSelect.value;
  const currentUnit = unitSelect.value;

  const exams = new Set();
  const units = new Set();

  operationState.items.forEach(item => {
    if (item.examTitle) exams.add(item.examTitle);
    if (item.unitName) units.add(item.unitName);
  });

  examSelect.innerHTML = '<option value="all">Todos os exames</option>';
  exams.forEach(title => {
    const opt = document.createElement('option');
    opt.value = title;
    opt.textContent = title;
    examSelect.appendChild(opt);
  });
  if (Array.from(exams).includes(currentExam)) examSelect.value = currentExam;

  unitSelect.innerHTML = '<option value="all">Todas as filiais</option>';
  units.forEach(unit => {
    const opt = document.createElement('option');
    opt.value = unit;
    opt.textContent = unit;
    unitSelect.appendChild(opt);
  });
  if (Array.from(units).includes(currentUnit)) unitSelect.value = currentUnit;
}

function filteredOperations() {
  const searchInput = document.getElementById('operation-search');
  const search = searchInput ? searchInput.value.trim().toLocaleLowerCase('pt-BR') : '';
  const statusSelect = document.getElementById('operation-status');
  const status = statusSelect ? statusSelect.value : 'all';

  const examFilter = document.getElementById('operation-filter-exam')?.value || 'all';
  const unitFilter = document.getElementById('operation-filter-unit')?.value || 'all';
  const liveFilter = document.getElementById('operation-filter-live')?.value || 'all';

  return operationState.items.filter(item => {
    const matchesStatus = (status === 'all' || item.status === status);
    const matchesSearch = !search || `${item.participantName} ${item.participantEmail} ${item.examTitle} ${item.unitName || ''}`.toLocaleLowerCase('pt-BR').includes(search);
    const matchesExam = (examFilter === 'all' || item.examTitle === examFilter);
    const matchesUnit = (unitFilter === 'all' || item.unitName === unitFilter);

    let matchesLive = true;
    if (liveFilter === 'live_only') {
      const entry = proctorPeers.get(item.id);
      matchesLive = Boolean(entry && entry.pc && ['connected', 'completed'].includes(entry.pc.iceConnectionState));
    }

    return matchesStatus && matchesSearch && matchesExam && matchesUnit && matchesLive;
  });
}

function renderOperationsGrid() {
  populateFilterOptions();
  const container = document.getElementById('operations-cards-container');
  if (!container) return;

  const items = filteredOperations();
  const activeIds = new Set(items.map(i => i.id));

  // Remove cards que não atendem aos filtros
  Array.from(container.children).forEach(card => {
    const cardId = Number(card.dataset.attemptId);
    if (!activeIds.has(cardId)) {
      card.remove();
    }
  });

  const emptyMsg = document.getElementById('operations-empty');
  if (emptyMsg) emptyMsg.hidden = items.length > 0;

  items.forEach(item => {
    let card = document.getElementById(`candidate-card-${item.id}`);

    if (card) {
      // PRESERVA O ELEMENTO <VIDEO> E SEU SRCOBJECT - Atualiza apenas textos/status incrementalmente
      const statusSpan = card.querySelector('.candidate-card-status');
      if (statusSpan) {
        statusSpan.className = `operation-status candidate-card-status ${item.status}`;
        statusSpan.textContent = operationLabels[item.status] || item.status;
      }
      const timeDd = card.querySelector(`.card-time-${item.id}`);
      if (timeDd) {
        timeDd.textContent = operationRemaining(item.remainingSeconds, item.status);
      }
      const authBtn = card.querySelector(`.card-auth-btn-${item.id}`);
      if (authBtn) authBtn.disabled = item.status !== 'waiting_proctor';

      const pauseBtn = card.querySelector(`.card-pause-btn-${item.id}`);
      if (pauseBtn) pauseBtn.disabled = item.status !== 'in_progress';

      const resumeBtn = card.querySelector(`.card-resume-btn-${item.id}`);
      if (resumeBtn) resumeBtn.disabled = !item.allowResume || !['in_progress', 'paused'].includes(item.status);

      const closeBtn = card.querySelector(`.card-close-btn-${item.id}`);
      if (closeBtn) closeBtn.disabled = !['not_started', 'waiting_proctor', 'in_progress', 'paused'].includes(item.status);
    } else {
      // Cria card novo apenas 1 vez por tentativa
      card = document.createElement('article');
      card.id = `candidate-card-${item.id}`;
      card.dataset.attemptId = item.id;
      card.className = 'candidate-card';

      card.innerHTML = `
        <header class="candidate-card-header">
          <div class="candidate-card-user">
            <span class="detail-avatar" style="width: 32px; height: 32px; font-size: 10px;">${operationInitials(item.participantName)}</span>
            <div>
              <strong>${item.participantName}</strong>
              <small>${item.participantEmail}</small>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span id="card-webrtc-badge-${item.id}" class="operation-status" style="background: #334155; color: #cbd5e1; font-weight: bold; font-size: 9px;">Conectando...</span>
            <span class="operation-status candidate-card-status ${item.status}">${operationLabels[item.status] || item.status}</span>
          </div>
        </header>
        <div class="candidate-card-video-wrap">
          <video id="card-stream-player-${item.id}" autoplay playsinline muted></video>
          <div id="card-stream-placeholder-${item.id}" class="candidate-card-placeholder">
            <span>🎥</span>
            <p style="margin: 4px 0 0 0;">Nenhuma transmissão ativa</p>
          </div>
        </div>
        <div class="candidate-card-body">
          <dl class="candidate-card-meta">
            <div>
              <dt>Teste</dt>
              <dd>${item.examTitle}</dd>
            </div>
            <div>
              <dt>Tempo Restante</dt>
              <dd class="card-time-${item.id}">${operationRemaining(item.remainingSeconds, item.status)}</dd>
            </div>
          </dl>
          <div style="display: flex; gap: 6px; margin-top: 4px;">
            <button id="card-audio-btn-${item.id}" type="button" class="operation-button secondary" style="flex: 1; font-size: 10px; padding: 4px;">🔊 Ouvir</button>
            <button id="card-talk-btn-${item.id}" type="button" class="operation-button primary" style="flex: 1; font-size: 10px; padding: 4px; background-color: #3b82f6; color: white; border: none;">🎤 Falar</button>
            <button id="card-expand-btn-${item.id}" type="button" class="operation-button secondary" style="font-size: 10px; padding: 4px 8px;">🔍 Expandir</button>
          </div>
          <div class="candidate-card-actions">
            <button class="operation-button primary card-auth-btn-${item.id}" type="button" style="background-color: #10b981; color: white;" ${item.status !== 'waiting_proctor' ? 'disabled' : ''}>Liberar</button>
            <button class="operation-button secondary card-pause-btn-${item.id}" type="button" ${item.status !== 'in_progress' ? 'disabled' : ''}>Pausar</button>
            <button class="operation-button primary card-resume-btn-${item.id}" type="button" ${!item.allowResume || !['in_progress', 'paused'].includes(item.status) ? 'disabled' : ''}>Retomar</button>
            <button class="operation-button danger card-close-btn-${item.id}" type="button" ${!['not_started', 'waiting_proctor', 'in_progress', 'paused'].includes(item.status) ? 'disabled' : ''}>Encerrar</button>
          </div>
        </div>
      `;

      container.appendChild(card);

      document.getElementById(`card-audio-btn-${item.id}`).onclick = () => {
        const v = document.getElementById(`card-stream-player-${item.id}`);
        if (!v) return;
        v.muted = !v.muted;
        document.getElementById(`card-audio-btn-${item.id}`).textContent = v.muted ? '🔊 Ouvir' : '🔇 Mutar';
      };

      document.getElementById(`card-talk-btn-${item.id}`).onclick = () => toggleProctorSpeaking(item.id);
      document.getElementById(`card-expand-btn-${item.id}`).onclick = () => openExpandedModal(item.id);

      card.querySelector(`.card-auth-btn-${item.id}`).onclick = () => runAttemptActionForId(item.id, 'authorize_start');
      card.querySelector(`.card-pause-btn-${item.id}`).onclick = () => runAttemptActionForId(item.id, 'pause');
      card.querySelector(`.card-resume-btn-${item.id}`).onclick = () => runAttemptActionForId(item.id, 'generate_resume');
      card.querySelector(`.card-close-btn-${item.id}`).onclick = () => runAttemptActionForId(item.id, 'close');
    }

    if (['waiting_proctor', 'in_progress', 'paused'].includes(item.status)) {
      initProctorWebRTC(item.id);
    }
  });

  items.forEach(item => updateProctorTalkButtonState(item.id));
}

function renderOperations() {
  updateOperationStats();
  const items = filteredOperations();
  const body = operationElements['operations-body'] || document.getElementById('operations-body');
  if (!body) return;

  body.replaceChildren();
  const emptyMsg = document.getElementById('operations-empty');
  if (emptyMsg) emptyMsg.hidden = items.length > 0;

  items.forEach(item => {
    const row = document.createElement('tr');
    row.classList.toggle('selected', item.id === operationState.selectedId);
    row.addEventListener('click', () => selectOperation(item.id));

    const dateCell = document.createElement('td');
    const dateButton = document.createElement('button');
    dateButton.type = 'button';
    dateButton.className = 'operation-date-button';
    dateButton.textContent = operationDate(item.startedAt);
    dateCell.appendChild(dateButton);

    const person = document.createElement('td');
    const personName = document.createElement('strong');
    personName.textContent = item.participantName;
    const personEmail = document.createElement('small');
    personEmail.textContent = item.participantEmail;
    person.append(personName, personEmail);

    const exam = document.createElement('td');
    exam.textContent = item.examTitle;

    const remaining = document.createElement('td');
    remaining.textContent = operationRemaining(item.remainingSeconds, item.status);

    const statusCell = document.createElement('td');
    const status = document.createElement('span');
    status.className = `operation-status ${item.status}`;
    status.textContent = operationLabels[item.status] || item.status;
    statusCell.appendChild(status);

    const messages = document.createElement('td');
    if (item.unreadMessages) {
      const badge = document.createElement('span');
      badge.className = 'message-count';
      badge.textContent = item.unreadMessages;
      messages.appendChild(badge);
    }

    row.append(dateCell, person, exam, remaining, statusCell, messages);
    body.appendChild(row);
  });
}

function selectedOperation() {
  return operationState.items.find(item => item.id === operationState.selectedId);
}

function renderOperationDetail() {
  const item = selectedOperation();
  if (operationElements['operation-placeholder']) operationElements['operation-placeholder'].hidden = Boolean(item);
  if (operationElements['operation-content']) operationElements['operation-content'].hidden = !item;
  if (!item) return;

  if (operationElements['detail-avatar']) operationElements['detail-avatar'].textContent = operationInitials(item.participantName);
  if (operationElements['detail-name']) operationElements['detail-name'].textContent = item.participantName;
  if (operationElements['detail-email']) operationElements['detail-email'].textContent = item.participantEmail;
  if (operationElements['detail-status']) {
    operationElements['detail-status'].className = `operation-status ${item.status}`;
    operationElements['detail-status'].textContent = operationLabels[item.status] || item.status;
  }
  if (operationElements['detail-exam']) operationElements['detail-exam'].textContent = item.examTitle;
  if (operationElements['detail-started']) operationElements['detail-started'].textContent = operationDate(item.startedAt);
  if (operationElements['detail-remaining']) operationElements['detail-remaining'].textContent = operationRemaining(item.remainingSeconds, item.status);
  if (operationElements['detail-resume']) operationElements['detail-resume'].textContent = item.allowResume ? (item.resumeCodeExpiresAt ? `Código válido até ${operationDate(item.resumeCodeExpiresAt)}` : 'Permitida pelo teste') : 'Não permitida';

  if (operationElements['authorize-attempt']) operationElements['authorize-attempt'].disabled = item.status !== 'waiting_proctor';
  if (operationElements['pause-attempt']) operationElements['pause-attempt'].disabled = item.status !== 'in_progress';
  if (operationElements['resume-attempt']) operationElements['resume-attempt'].disabled = !item.allowResume || !['in_progress', 'paused'].includes(item.status);
  if (operationElements['close-attempt']) operationElements['close-attempt'].disabled = !['not_started', 'waiting_proctor', 'in_progress', 'paused'].includes(item.status);

  if (operationElements['company-chat-input']) operationElements['company-chat-input'].disabled = !['waiting_proctor', 'in_progress', 'paused'].includes(item.status);
  if (operationElements['company-chat-form']) operationElements['company-chat-form'].querySelector('button').disabled = operationElements['company-chat-input'].disabled;
  if (operationElements['chat-live']) operationElements['chat-live'].style.opacity = ['waiting_proctor', 'in_progress', 'paused'].includes(item.status) ? '1' : '.45';
}

async function loadOperations(silent = false) {
  try {
    const data = await operationApi('/api/company/operations');
    operationState.items = data.operations || [];
    if (operationState.selectedId && !selectedOperation()) operationState.selectedId = null;

    if (operationState.viewMode === 'grid') {
      renderOperationsGrid();
    } else {
      renderOperations();
      renderOperationDetail();
    }

    if (operationState.expandedId) {
      pollModalChat(operationState.expandedId);
    }
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.replace('login_empresa.html');
      return;
    }
    if (!silent) operationToast(error.message, 'error');
  }
}

async function loadCompany() {
  try {
    const data = await operationApi('/api/company/overview');
    if (operationElements['company-name']) operationElements['company-name'].textContent = data.company.name;
    if (operationElements['company-initials']) operationElements['company-initials'].textContent = operationInitials(data.company.name);
  } catch (_) {}
}

function clearCompanyChat() {
  operationState.chatLastId = 0;
  if (operationElements['company-chat-messages']) {
    operationElements['company-chat-messages'].innerHTML = '<p class="chat-empty">Nenhuma mensagem ainda.</p>';
  }
}

function appendCompanyChat(messages) {
  const host = operationElements['company-chat-messages'];
  if (!host || !messages.length) return;
  host.querySelector('.chat-empty')?.remove();
  messages.forEach(item => {
    operationState.chatLastId = Math.max(operationState.chatLastId, Number(item.id || 0));
    const bubble = document.createElement('article');
    bubble.className = `company-chat-message ${item.senderType}`;
    const message = document.createElement('span');
    message.textContent = item.message;
    const meta = document.createElement('small');
    const time = item.createdAt ? new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    meta.textContent = `${item.senderType === 'company' ? 'Você' : item.senderName}${time ? ' · ' + time : ''}`;
    bubble.append(message, meta);
    host.appendChild(bubble);
  });
  host.scrollTop = host.scrollHeight;
}

async function pollCompanyChat() {
  if (!operationState.selectedId) return;
  try {
    const data = await operationApi(`/api/company/attempts/${operationState.selectedId}/chat?after=${operationState.chatLastId}`);
    appendCompanyChat(data.messages || []);
  } catch (error) {
    if (error.status !== 409) console.warn(error.message);
  }
}

function selectOperation(id) {
  operationState.selectedId = id;
  clearCompanyChat();
  renderOperations();
  renderOperationDetail();
  pollCompanyChat();
  clearInterval(operationState.chatTimer);
  operationState.chatTimer = setInterval(pollCompanyChat, 3000);
  initProctorWebRTC(id);
}

async function runAttemptActionForId(attemptId, action) {
  const item = operationState.items.find(i => i.id === attemptId);
  if (!item) return;
  if (action === 'close' && !window.confirm(`Fechar a avaliação de ${item.participantName}? Esta ação interrompe a aplicação imediatamente.`)) return;

  try {
    if (action === 'authorize_start') {
      await operationApi(`/api/company/attempts/${attemptId}/authorize-start`, { method: 'POST', body: JSON.stringify({}) });
      operationToast('Prova liberada com sucesso! O candidato foi autorizado a iniciar o exame.');
    } else {
      await operationApi(`/api/company/attempts/${attemptId}/action`, { method: 'POST', body: JSON.stringify({ action }) });
      const success = {
        pause: 'Avaliação pausada. Agora gere o código para autorizar a retomada.',
        generate_resume: 'Código especial enviado ao e-mail do participante.',
        close: 'Avaliação encerrada com sucesso.'
      }[action];
      operationToast(success || 'Operação realizada com sucesso.');
    }
    await loadOperations(true);
  } catch (error) {
    operationToast(error.message, 'error');
  }
}

async function runAttemptAction(action) {
  if (operationState.selectedId) {
    await runAttemptActionForId(operationState.selectedId, action);
  }
}

async function sendCompanyChat(event) {
  event.preventDefault();
  const input = operationElements['company-chat-input'];
  const message = input.value.trim();
  if (!message || !operationState.selectedId) return;
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  try {
    await operationApi(`/api/company/attempts/${operationState.selectedId}/chat`, { method: 'POST', body: JSON.stringify({ message }) });
    input.value = '';
    await pollCompanyChat();
  } catch (error) {
    operationToast(error.message, 'error');
  } finally {
    button.disabled = false;
    input.focus();
  }
}

function setViewMode(mode) {
  operationState.viewMode = mode;
  const gridBtn = document.getElementById('view-mode-grid');
  const tableBtn = document.getElementById('view-mode-table');
  const cardsContainer = document.getElementById('operations-cards-container');
  const tableWrap = document.getElementById('operations-table-wrapper');
  const sideDetail = document.getElementById('operation-detail');

  if (mode === 'grid') {
    if (gridBtn) { gridBtn.className = 'view-toggle-btn active'; gridBtn.style.background = '#0f6f73'; gridBtn.style.color = 'white'; }
    if (tableBtn) { tableBtn.className = 'view-toggle-btn'; tableBtn.style.background = 'transparent'; tableBtn.style.color = '#475569'; }
    if (cardsContainer) cardsContainer.hidden = false;
    if (tableWrap) tableWrap.hidden = true;
    if (sideDetail) sideDetail.hidden = true;
    renderOperationsGrid();
  } else {
    if (gridBtn) { gridBtn.className = 'view-toggle-btn'; gridBtn.style.background = 'transparent'; gridBtn.style.color = '#475569'; }
    if (tableBtn) { tableBtn.className = 'view-toggle-btn active'; tableBtn.style.background = '#0f6f73'; tableBtn.style.color = 'white'; }
    if (cardsContainer) cardsContainer.hidden = true;
    if (tableWrap) tableWrap.hidden = false;
    if (sideDetail) sideDetail.hidden = false;
    renderOperations();
  }
}

function bindOperations() {
  document.getElementById('collapse-sidebar')?.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
  document.getElementById('mobile-menu')?.addEventListener('click', () => document.body.classList.toggle('menu-open'));
  document.getElementById('logout-button')?.addEventListener('click', async () => {
    try { await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-Token': operationCsrf() } }); } finally { window.location.replace('login_empresa.html'); }
  });

  document.getElementById('operation-search')?.addEventListener('input', () => operationState.viewMode === 'grid' ? renderOperationsGrid() : renderOperations());
  document.getElementById('operation-status')?.addEventListener('change', () => operationState.viewMode === 'grid' ? renderOperationsGrid() : renderOperations());
  document.getElementById('operation-filter-exam')?.addEventListener('change', () => operationState.viewMode === 'grid' ? renderOperationsGrid() : renderOperations());
  document.getElementById('operation-filter-unit')?.addEventListener('change', () => operationState.viewMode === 'grid' ? renderOperationsGrid() : renderOperations());
  document.getElementById('operation-filter-live')?.addEventListener('change', () => operationState.viewMode === 'grid' ? renderOperationsGrid() : renderOperations());

  document.getElementById('view-mode-grid')?.addEventListener('click', () => setViewMode('grid'));
  document.getElementById('view-mode-table')?.addEventListener('click', () => setViewMode('table'));

  document.getElementById('modal-close-button')?.addEventListener('click', closeExpandedModal);
  document.getElementById('modal-chat-form')?.addEventListener('submit', sendModalChat);

  if (operationElements['authorize-attempt']) operationElements['authorize-attempt'].addEventListener('click', () => runAttemptAction('authorize_start'));
  if (operationElements['pause-attempt']) operationElements['pause-attempt'].addEventListener('click', () => runAttemptAction('pause'));
  if (operationElements['resume-attempt']) operationElements['resume-attempt'].addEventListener('click', () => runAttemptAction('generate_resume'));
  if (operationElements['close-attempt']) operationElements['close-attempt'].addEventListener('click', () => runAttemptAction('close'));
  if (operationElements['company-chat-form']) operationElements['company-chat-form'].addEventListener('submit', sendCompanyChat);
}

document.addEventListener('DOMContentLoaded', async () => {
  operationCache();
  bindOperations();
  await Promise.all([loadCompany(), loadOperations()]);
  operationState.refreshTimer = setInterval(() => loadOperations(true), 5000);
});

// ---------------------------------------------------------------------------
// Abstração e Transmissão WebRTC P2P — Proctor (ETAPA 7.2D Multi-Candidate)
// ---------------------------------------------------------------------------

window.ACERT_ICE_SERVERS = window.ACERT_ICE_SERVERS || [{ urls: 'stun:stun.l.google.com:19302' }];
const proctorPeers = new Map();
let proctorAudioStream = null;
let proctorAudioTrack = null;
let currentSpeakingAttemptId = null;

async function sendProctorWebRTCSignal(attemptId, signalType, payload) {
  if (!attemptId) {
    throw new Error('attemptId é obrigatório para envio de sinalização pelo proctor.');
  }
  return await operationApi('/api/webrtc/signal', {
    method: 'POST',
    body: JSON.stringify({
      attemptId: attemptId,
      signalType: signalType,
      payload: payload
    })
  });
}

async function pollProctorWebRTCSignals(attemptId, lastId = 0) {
  if (!attemptId) {
    return { success: false, signals: [], count: 0 };
  }
  return await operationApi(
    `/api/webrtc/signals?attemptId=${attemptId}&lastId=${lastId}`
  );
}

function updateStreamBadge(attemptId, text, color = '#cbd5e1', bgColor = '#334155') {
  if (!attemptId) return;

  const cardBadge = document.getElementById(`card-webrtc-badge-${attemptId}`);
  if (cardBadge) {
    cardBadge.textContent = text;
    cardBadge.style.color = color;
    cardBadge.style.backgroundColor = bgColor;
  }

  if (operationState.selectedId === attemptId) {
    const sideBadge = document.getElementById('stream-status-badge');
    if (sideBadge) {
      sideBadge.textContent = text;
      sideBadge.style.color = color;
      sideBadge.style.backgroundColor = bgColor;
    }
  }

  if (operationState.expandedId === attemptId) {
    const modalBadge = document.getElementById('modal-webrtc-badge');
    if (modalBadge) {
      modalBadge.textContent = text;
      modalBadge.style.color = color;
      modalBadge.style.backgroundColor = bgColor;
    }
  }
}

function updateProctorTalkButtonState(attemptId) {
  if (!attemptId) return;
  const isSpeaking = (currentSpeakingAttemptId === attemptId);
  const text = isSpeaking ? '🔴 Falando (Parar)' : '🎤 Falar';
  const fullText = isSpeaking ? '🔴 Falando com candidato (Parar)' : '🎤 Falar com candidato';
  const bgColor = isSpeaking ? '#dc2626' : '#3b82f6';

  const cardTalkBtn = document.getElementById(`card-talk-btn-${attemptId}`);
  if (cardTalkBtn) {
    cardTalkBtn.textContent = text;
    cardTalkBtn.style.backgroundColor = bgColor;
  }

  if (operationState.selectedId === attemptId) {
    const sideTalkBtn = document.getElementById('proctor-talk-button');
    if (sideTalkBtn) {
      sideTalkBtn.textContent = fullText;
      sideTalkBtn.style.backgroundColor = bgColor;
    }
  }

  if (operationState.expandedId === attemptId) {
    const modalTalkBtn = document.getElementById('modal-proctor-talk-btn');
    if (modalTalkBtn) {
      modalTalkBtn.textContent = fullText;
      modalTalkBtn.style.backgroundColor = bgColor;
    }
  }
}

async function getProctorAudioTrack() {
  if (proctorAudioTrack && proctorAudioTrack.readyState === 'live') {
    return proctorAudioTrack;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('O navegador não oferece suporte à captura de áudio.');
  }

  proctorAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  proctorAudioTrack = proctorAudioStream.getAudioTracks()[0];

  if (proctorAudioTrack) {
    proctorAudioTrack.onended = () => {
      proctorAudioTrack = null;
      proctorAudioStream = null;
      if (currentSpeakingAttemptId) {
        stopProctorSpeaking(currentSpeakingAttemptId);
      }
    };
  }

  return proctorAudioTrack;
}

async function toggleProctorSpeaking(attemptId) {
  if (!attemptId) return;

  const entry = proctorPeers.get(attemptId);
  if (!entry || !entry.pc || entry.pc.connectionState === 'closed') {
    operationToast('Conexão ao vivo inativa para este candidato.', 'error');
    return;
  }

  if (currentSpeakingAttemptId === attemptId) {
    await stopProctorSpeaking(attemptId);
    return;
  }

  if (currentSpeakingAttemptId && currentSpeakingAttemptId !== attemptId) {
    await stopProctorSpeaking(currentSpeakingAttemptId);
  }

  try {
    const track = await getProctorAudioTrack();
    if (!track) throw new Error('Não foi possível obter a faixa de áudio.');
    track.enabled = true;

    if (entry.proctorAudioSender) {
      await entry.proctorAudioSender.replaceTrack(track);
    }

    currentSpeakingAttemptId = attemptId;
    updateProctorTalkButtonState(attemptId);

    sendProctorWebRTCSignal(attemptId, 'speaking_state', { speaking: true }).catch(_ => {});
    operationToast('Microfone ativado para este candidato.');
  } catch (error) {
    operationToast(error.message || 'Erro ao acessar o microfone do proctor.', 'error');
  }
}

async function stopProctorSpeaking(attemptId) {
  const entry = proctorPeers.get(attemptId);
  if (entry && entry.proctorAudioSender) {
    try {
      await entry.proctorAudioSender.replaceTrack(null);
    } catch (_) {}
  }

  if (proctorAudioTrack) {
    proctorAudioTrack.enabled = false;
  }

  if (currentSpeakingAttemptId === attemptId) {
    currentSpeakingAttemptId = null;
    updateProctorTalkButtonState(attemptId);
  }

  sendProctorWebRTCSignal(attemptId, 'speaking_state', { speaking: false }).catch(_ => {});
}

function stopProctorMicrophone() {
  if (currentSpeakingAttemptId) {
    stopProctorSpeaking(currentSpeakingAttemptId);
  }
  if (proctorAudioTrack) {
    try { proctorAudioTrack.stop(); } catch (_) {}
    proctorAudioTrack = null;
  }
  if (proctorAudioStream) {
    try { proctorAudioStream.getTracks().forEach(t => t.stop()); } catch (_) {}
    proctorAudioStream = null;
  }
}

function attachStreamToPlayers(attemptId, stream) {
  const cardVideo = document.getElementById(`card-stream-player-${attemptId}`);
  const cardPlaceholder = document.getElementById(`card-stream-placeholder-${attemptId}`);
  if (cardVideo) {
    if (cardVideo.srcObject !== stream) {
      cardVideo.srcObject = stream;
      cardVideo.play().catch(_ => {});
    }
    if (cardPlaceholder) cardPlaceholder.hidden = true;
  }

  if (operationState.selectedId === attemptId) {
    const sideVideo = document.getElementById('live-stream-player');
    const sidePlaceholder = document.getElementById('live-stream-placeholder');
    if (sideVideo) {
      if (sideVideo.srcObject !== stream) {
        sideVideo.srcObject = stream;
        sideVideo.play().catch(_ => {});
      }
      if (sidePlaceholder) sidePlaceholder.hidden = true;
    }
  }

  if (operationState.expandedId === attemptId) {
    const modalVideo = document.getElementById('modal-stream-player');
    const modalPlaceholder = document.getElementById('modal-stream-placeholder');
    if (modalVideo) {
      if (modalVideo.srcObject !== stream) {
        modalVideo.srcObject = stream;
        modalVideo.play().catch(_ => {});
      }
      if (modalPlaceholder) modalPlaceholder.hidden = true;
    }
  }
}

function bindAudioControls(attemptId) {
  const toggleBtn = document.getElementById('toggle-audio-button');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const videoEl = document.getElementById('live-stream-player');
      if (!videoEl) return;
      videoEl.muted = !videoEl.muted;
      toggleBtn.textContent = videoEl.muted ? '🔊 Ouvir candidato' : '🔇 Mutar candidato';
    };
  }

  const talkBtn = document.getElementById('proctor-talk-button');
  if (talkBtn) {
    talkBtn.onclick = () => toggleProctorSpeaking(attemptId);
    updateProctorTalkButtonState(attemptId);
  }
}

function openExpandedModal(attemptId) {
  const item = operationState.items.find(i => i.id === attemptId);
  if (!item) return;

  operationState.expandedId = attemptId;

  const modalOverlay = document.getElementById('expanded-candidate-modal');
  if (modalOverlay) modalOverlay.hidden = false;

  document.getElementById('modal-candidate-avatar').textContent = operationInitials(item.participantName);
  document.getElementById('modal-candidate-name').textContent = item.participantName;
  document.getElementById('modal-candidate-email').textContent = item.participantEmail;
  document.getElementById('modal-exam-title').textContent = item.examTitle;
  document.getElementById('modal-remaining-time').textContent = operationRemaining(item.remainingSeconds, item.status);

  const authBtn = document.getElementById('modal-authorize-btn');
  const pauseBtn = document.getElementById('modal-pause-btn');
  const resumeBtn = document.getElementById('modal-resume-btn');
  const closeBtn = document.getElementById('modal-close-attempt-btn');

  if (authBtn) {
    authBtn.disabled = item.status !== 'waiting_proctor';
    authBtn.onclick = () => runAttemptActionForId(attemptId, 'authorize_start');
  }
  if (pauseBtn) {
    pauseBtn.disabled = item.status !== 'in_progress';
    pauseBtn.onclick = () => runAttemptActionForId(attemptId, 'pause');
  }
  if (resumeBtn) {
    resumeBtn.disabled = !item.allowResume || !['in_progress', 'paused'].includes(item.status);
    resumeBtn.onclick = () => runAttemptActionForId(attemptId, 'generate_resume');
  }
  if (closeBtn) {
    closeBtn.disabled = !['not_started', 'waiting_proctor', 'in_progress', 'paused'].includes(item.status);
    closeBtn.onclick = () => runAttemptActionForId(attemptId, 'close');
  }

  const toggleAudioBtn = document.getElementById('modal-toggle-audio-btn');
  if (toggleAudioBtn) {
    toggleAudioBtn.onclick = () => {
      const modalVideo = document.getElementById('modal-stream-player');
      if (!modalVideo) return;
      modalVideo.muted = !modalVideo.muted;
      toggleAudioBtn.textContent = modalVideo.muted ? '🔊 Ouvir candidato' : '🔇 Mutar candidato';
    };
  }

  const talkBtn = document.getElementById('modal-proctor-talk-btn');
  if (talkBtn) {
    talkBtn.onclick = () => toggleProctorSpeaking(attemptId);
    updateProctorTalkButtonState(attemptId);
  }

  // Reutiliza o remoteStream já mantido em proctorPeers — ZERO PEERS NOVOS
  const entry = proctorPeers.get(attemptId);
  if (entry) {
    if (entry.remoteStream) {
      attachStreamToPlayers(attemptId, entry.remoteStream);
      updateStreamBadge(attemptId, '🔴 AO VIVO', '#ffffff', '#dc2626');
    } else {
      updateStreamBadge(attemptId, 'Conectando...', '#f59e0b', '#78350f');
    }
  }

  clearModalChat();
  pollModalChat(attemptId);
}

function closeExpandedModal() {
  operationState.expandedId = null;
  const modalOverlay = document.getElementById('expanded-candidate-modal');
  if (modalOverlay) modalOverlay.hidden = true;

  const modalVideo = document.getElementById('modal-stream-player');
  if (modalVideo) {
    modalVideo.srcObject = null;
  }
}

function clearModalChat() {
  const host = document.getElementById('modal-chat-messages');
  if (host) host.innerHTML = '<p class="chat-empty">Nenhuma mensagem ainda.</p>';
}

async function pollModalChat(attemptId) {
  if (!attemptId || operationState.expandedId !== attemptId) return;
  try {
    const data = await operationApi(`/api/company/attempts/${attemptId}/chat?after=0`);
    const host = document.getElementById('modal-chat-messages');
    if (host && data.messages) {
      host.innerHTML = '';
      if (!data.messages.length) {
        host.innerHTML = '<p class="chat-empty">Nenhuma mensagem ainda.</p>';
        return;
      }
      data.messages.forEach(item => {
        const bubble = document.createElement('article');
        bubble.className = `company-chat-message ${item.senderType}`;
        const message = document.createElement('span');
        message.textContent = item.message;
        const meta = document.createElement('small');
        const time = item.createdAt ? new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        meta.textContent = `${item.senderType === 'company' ? 'Você' : item.senderName}${time ? ' · ' + time : ''}`;
        bubble.append(message, meta);
        host.appendChild(bubble);
      });
      host.scrollTop = host.scrollHeight;
    }
  } catch (_) {}
}

async function sendModalChat(event) {
  event.preventDefault();
  const attemptId = operationState.expandedId;
  const input = document.getElementById('modal-chat-input');
  if (!input || !attemptId) return;
  const message = input.value.trim();
  if (!message) return;

  try {
    await operationApi(`/api/company/attempts/${attemptId}/chat`, { method: 'POST', body: JSON.stringify({ message }) });
    input.value = '';
    await pollModalChat(attemptId);
  } catch (error) {
    operationToast(error.message, 'error');
  }
}

async function initProctorWebRTC(attemptId) {
  if (!attemptId) return;

  let entry = proctorPeers.get(attemptId);
  if (entry && entry.pc && entry.pc.connectionState !== 'closed') {
    bindAudioControls(attemptId);
    if (entry.remoteStream) {
      attachStreamToPlayers(attemptId, entry.remoteStream);
    }
    startProctorWebRTCSignalingLoop(attemptId);
    return;
  }

  const iceServers = window.ACERT_ICE_SERVERS || [{ urls: 'stun:stun.l.google.com:19302' }];
  const pc = new RTCPeerConnection({ iceServers });
  const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });

  entry = {
    attemptId: attemptId,
    pc: pc,
    proctorAudioSender: audioTransceiver.sender,
    remoteStream: null,
    lastSignalId: 0,
    timer: null,
    active: true,
    reconnectAttempts: 0,
    reconnectInProgress: false,
    graceTimer: null,
    backoffTimer: null,
    negotiationId: null
  };
  proctorPeers.set(attemptId, entry);

  bindAudioControls(attemptId);
  updateStreamBadge(attemptId, 'Conectando...', '#f59e0b', '#78350f');

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      entry.remoteStream = event.streams[0];
      attachStreamToPlayers(attemptId, entry.remoteStream);
      updateStreamBadge(attemptId, '🔴 AO VIVO', '#ffffff', '#dc2626');
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      const payload = event.candidate.toJSON();
      if (entry.negotiationId) payload.negotiationId = entry.negotiationId;
      sendProctorWebRTCSignal(attemptId, 'ice_candidate', payload).catch(_ => {});
    }
  };

  const handleStateChange = () => {
    const connState = pc.connectionState;
    const iceState = pc.iceConnectionState;

    if (connState === 'connected' || iceState === 'connected' || iceState === 'completed') {
      entry.reconnectAttempts = 0;
      entry.reconnectInProgress = false;
      if (entry.graceTimer) {
        clearTimeout(entry.graceTimer);
        entry.graceTimer = null;
      }
      updateStreamBadge(attemptId, '🔴 AO VIVO', '#ffffff', '#dc2626');
    } else if (connState === 'disconnected' || iceState === 'disconnected') {
      updateStreamBadge(attemptId, 'Conexão instável', '#f59e0b', '#78350f');
      if (currentSpeakingAttemptId === attemptId) {
        stopProctorSpeaking(attemptId);
      }
      if (!entry.graceTimer) {
        entry.graceTimer = setTimeout(() => {
          entry.graceTimer = null;
          handleProctorWebRTCFailure(attemptId);
        }, 3000);
      }
    } else if (connState === 'failed' || iceState === 'failed') {
      updateStreamBadge(attemptId, 'Sem sinal ao vivo', '#cbd5e1', '#334155');
      if (currentSpeakingAttemptId === attemptId) {
        stopProctorSpeaking(attemptId);
      }
      if (entry.graceTimer) {
        clearTimeout(entry.graceTimer);
        entry.graceTimer = null;
      }
      handleProctorWebRTCFailure(attemptId);
    }
  };

  pc.onconnectionstatechange = handleStateChange;
  pc.oniceconnectionstatechange = handleStateChange;

  // Solicta oferta limpa ao candidato (CANDIDATO = OFFERER)
  sendProctorWebRTCSignal(attemptId, 'request_offer', { attemptId: attemptId }).catch(_ => {});
  startProctorWebRTCSignalingLoop(attemptId);
}

function handleProctorWebRTCFailure(attemptId) {
  const entry = proctorPeers.get(attemptId);
  if (!entry || !entry.active || entry.reconnectInProgress) return;

  const pc = entry.pc;
  if (!pc || pc.connectionState === 'connected' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
    entry.reconnectInProgress = false;
    entry.reconnectAttempts = 0;
    return;
  }

  entry.reconnectInProgress = true;
  entry.reconnectAttempts = (entry.reconnectAttempts || 0) + 1;
  updateStreamBadge(attemptId, 'Reconectando...', '#f59e0b', '#78350f');

  if (entry.reconnectAttempts <= 4) {
    const delays = [1000, 2000, 5000, 10000];
    const delay = delays[entry.reconnectAttempts - 1] || 10000;
    console.warn(`[WebRTC Proctor] Solicitando reconexão ao candidato ${attemptId} (${entry.reconnectAttempts}/4) em ${delay}ms...`);

    entry.backoffTimer = setTimeout(async () => {
      if (!entry.active || !entry.pc || ['connected', 'completed'].includes(entry.pc.iceConnectionState)) {
        entry.reconnectInProgress = false;
        entry.reconnectAttempts = 0;
        return;
      }
      sendProctorWebRTCSignal(attemptId, 'request_offer', { attemptId: attemptId }).catch(_ => {});
      entry.reconnectInProgress = false;
    }, delay);
  } else {
    console.warn(`[WebRTC Proctor] Limite de tentativas atingido para candidato ${attemptId}. Recriando peer como fallback...`);
    closeProctorWebRTC(attemptId);
    initProctorWebRTC(attemptId);
  }
}

function startProctorWebRTCSignalingLoop(attemptId) {
  const entry = proctorPeers.get(attemptId);
  if (!entry || entry.timer) return;

  entry.timer = setInterval(async () => {
    await processProctorWebRTCSignals(attemptId);
  }, 2000);
}

async function processProctorWebRTCSignals(attemptId) {
  const entry = proctorPeers.get(attemptId);
  if (!entry || !entry.active) return;

  try {
    const res = await pollProctorWebRTCSignals(attemptId, entry.lastSignalId);
    if (res && res.success && res.signals && res.signals.length > 0) {
      for (const sig of res.signals) {
        entry.lastSignalId = Math.max(entry.lastSignalId, Number(sig.id || 0));
        const pc = entry.pc;
        if (!pc || pc.connectionState === 'closed') continue;

        const payload = sig.payload || {};

        if (sig.signalType === 'offer') {
          if (payload.negotiationId) {
            entry.negotiationId = payload.negotiationId;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          const answerPayload = {
            sdp: pc.localDescription.sdp,
            type: pc.localDescription.type
          };
          if (entry.negotiationId) answerPayload.negotiationId = entry.negotiationId;

          await sendProctorWebRTCSignal(attemptId, 'answer', answerPayload);
        } else if (sig.signalType === 'ice_candidate') {
          if (payload.negotiationId && entry.negotiationId && payload.negotiationId !== entry.negotiationId) {
            continue;
          }
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          } catch (_) {}
        }
      }
    }
  } catch (_) {}
}

function closeProctorWebRTC(attemptId) {
  if (currentSpeakingAttemptId === attemptId) {
    stopProctorSpeaking(attemptId);
  }
  const entry = proctorPeers.get(attemptId);
  if (entry) {
    entry.active = false;
    if (entry.timer) clearInterval(entry.timer);
    if (entry.graceTimer) clearTimeout(entry.graceTimer);
    if (entry.backoffTimer) clearTimeout(entry.backoffTimer);
    if (entry.pc) {
      try { entry.pc.close(); } catch (_) {}
    }
    proctorPeers.delete(attemptId);
  }
}
