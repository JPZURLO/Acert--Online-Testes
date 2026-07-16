const state = {
  company: null,
  branding: {
    logoData: '',
    primaryColor: '#2563EB',
    accentColor: '#18A6C9',
    backgroundColor: '#F4F7FB',
    fontFamily: 'Inter',
    borderRadius: 'medium',
    candidateInstructions: 'Leia as instruções com atenção antes de iniciar a avaliação.'
  },
  examId: null,
  status: 'draft',
  resultDelivery: 'manual',
  availableFrom: '',
  availableUntil: '',
  requireIdentity: false,
  requireRecording: false,
  allowResume: true,
  showAnswerDetails: false,
  questions: [],
  exams: [],
  dirty: false,
  autosaveTimer: null,
  draggedIndex: null
};

const elements = {};
const draftKey = 'acert-company-exam-draft';

function newId() {
  return globalThis.crypto?.randomUUID?.() || `question-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultQuestions() {
  return [
    {
      id: newId(),
      type: 'multiple_choice',
      prompt: 'Qual das alternativas melhor descreve o princípio da comunicação eficaz?',
      points: 20,
      required: true,
      options: ['Clareza e objetividade', 'Uso de termos complexos', 'Comunicação sem retorno'],
      correctAnswer: 'Clareza e objetividade'
    },
    {
      id: newId(),
      type: 'true_false',
      prompt: 'Feedback deve ser sempre específico e focado em comportamentos.',
      points: 20,
      required: true,
      options: ['Verdadeiro', 'Falso'],
      correctAnswer: 'Verdadeiro'
    },
    {
      id: newId(),
      type: 'essay',
      prompt: 'Descreva uma situação em que você resolveu um problema complexo.',
      points: 60,
      required: true,
      options: [],
      correctAnswer: ''
    }
  ];
}

async function api(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(url, {
    ...options,
    headers: options.body && !isFormData
      ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
      : options.headers
  });
  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }
  if (!response.ok) {
    const error = new Error(data.message || 'Não foi possível concluir a operação.');
    error.status = response.status;
    error.details = Array.isArray(data.errors) ? data.errors : [];
    throw error;
  }
  return data;
}

function cacheElements() {
  const ids = [
    'company-name', 'company-initials', 'exam-title', 'exam-description', 'exam-duration',
    'passing-score', 'shuffle-questions', 'questions-list', 'question-count', 'question-total',
    'total-points', 'title-count', 'preview-title', 'preview-duration', 'preview-questions',
    'preview-instructions', 'preview-logo', 'preview-company', 'primary-color', 'accent-color',
    'background-color', 'primary-value', 'accent-value', 'background-value', 'font-family',
    'border-radius', 'candidate-instructions', 'logo-upload', 'remove-logo', 'save-status',
    'exam-picker', 'page-title', 'breadcrumb-mode', 'publish-modal', 'modal-question-count',
    'modal-total-points', 'modal-duration', 'toast-region', 'question-import-file',
    'question-import-mode', 'question-import-errors', 'result-delivery', 'available-from', 'available-until',
    'require-identity', 'require-recording', 'allow-resume', 'show-answer-details'
  ];
  ids.forEach(id => { elements[id] = document.getElementById(id); });
}

function initials(name) {
  return String(name || 'Empresa').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type === 'error' ? 'error' : ''}`;
  item.textContent = message;
  elements['toast-region'].appendChild(item);
  setTimeout(() => item.remove(), 3600);
}

function setSaveStatus(label, kind = '') {
  elements['save-status'].className = `save-status ${kind}`.trim();
  elements['save-status'].querySelector('span').textContent = label;
}

function getRadiusValue() {
  return { small: '8px', medium: '14px', large: '22px' }[state.branding.borderRadius] || '14px';
}

function applyBranding() {
  const root = document.documentElement;
  root.style.setProperty('--primary', state.branding.primaryColor);
  root.style.setProperty('--accent', state.branding.accentColor);
  root.style.setProperty('--canvas', state.branding.backgroundColor);
  root.style.setProperty('--font', `${state.branding.fontFamily}, "Segoe UI", Arial, sans-serif`);
  root.style.setProperty('--radius', getRadiusValue());

  elements['primary-color'].value = state.branding.primaryColor;
  elements['accent-color'].value = state.branding.accentColor;
  elements['background-color'].value = state.branding.backgroundColor;
  elements['primary-value'].textContent = state.branding.primaryColor;
  elements['accent-value'].textContent = state.branding.accentColor;
  elements['background-value'].textContent = state.branding.backgroundColor;
  elements['font-family'].value = state.branding.fontFamily;
  elements['border-radius'].value = state.branding.borderRadius;
  elements['candidate-instructions'].value = state.branding.candidateInstructions;
  elements['preview-instructions'].textContent = state.branding.candidateInstructions;

  const image = elements['preview-logo'].querySelector('img');
  if (state.branding.logoData) {
    image.src = state.branding.logoData;
    image.style.filter = 'none';
    elements['remove-logo'].hidden = false;
  } else {
    image.src = './assets/images/Logo.png';
    image.style.filter = 'brightness(0) invert(1)';
    elements['remove-logo'].hidden = true;
  }
}

function renderOptions(question, container) {
  container.replaceChildren();
  if (question.type === 'essay') {
    const note = document.createElement('div');
    note.className = 'essay-note';
    note.textContent = 'O candidato responderá em um campo de texto livre.';
    container.appendChild(note);
    return;
  }

  question.options.forEach((option, optionIndex) => {
    const row = document.createElement('div');
    row.className = 'option-row';
    const marker = document.createElement('span');
    marker.className = 'option-marker';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = option;
    input.maxLength = 500;
    input.dataset.optionIndex = String(optionIndex);
    input.setAttribute('aria-label', `Opção ${optionIndex + 1}`);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-option';
    remove.dataset.removeOption = String(optionIndex);
    remove.setAttribute('aria-label', `Remover opção ${optionIndex + 1}`);
    remove.textContent = '×';
    row.append(marker, input, remove);
    container.appendChild(row);
  });

  if (question.type === 'multiple_choice' && question.options.length < 10) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'add-option';
    add.dataset.addOption = 'true';
    add.textContent = '+ Adicionar alternativa';
    container.appendChild(add);
  }
}

function renderQuestions() {
  const template = document.getElementById('question-template');
  elements['questions-list'].replaceChildren();
  state.questions.forEach((question, index) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.question-card');
    card.dataset.index = String(index);
    card.querySelector('.question-number').textContent = String(index + 1);
    card.querySelector('.question-type').value = question.type;
    card.querySelector('.question-points').value = question.points;
    card.querySelector('.question-required').checked = question.required;
    card.querySelector('.question-prompt').value = question.prompt;
    renderOptions(question, card.querySelector('.question-options'));
    elements['questions-list'].appendChild(fragment);
  });
  updateSummary();
}

function updateSummary() {
  const total = state.questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  const count = state.questions.length;
  elements['question-count'].textContent = `(${count})`;
  elements['question-total'].textContent = `Pontuação total: ${total} pontos`;
  elements['total-points'].textContent = String(total);
  elements['preview-questions'].textContent = `${count} ${count === 1 ? 'questão' : 'questões'}`;
  elements['modal-question-count'].textContent = String(count);
  elements['modal-total-points'].textContent = String(total);
}

function collectExam() {
  return {
    title: elements['exam-title'].value.trim(),
    description: elements['exam-description'].value.trim(),
    durationMinutes: Number(elements['exam-duration'].value) || 60,
    passingScore: Number(elements['passing-score'].value) || 0,
    shuffleQuestions: elements['shuffle-questions'].checked,
    status: state.status,
    resultDelivery: elements['result-delivery'].value,
    availableFrom: elements['available-from'].value || null,
    availableUntil: elements['available-until'].value || null,
    requireIdentity: elements['require-identity'].checked,
    requireRecording: elements['require-recording'].checked,
    allowResume: elements['allow-resume'].checked,
    showAnswerDetails: elements['show-answer-details'].checked,
    questions: state.questions
  };
}

function updatePreview() {
  const title = elements['exam-title'].value.trim() || 'Seu novo teste';
  const duration = Number(elements['exam-duration'].value) || 0;
  elements['preview-title'].textContent = title;
  elements['preview-duration'].textContent = `${duration} min`;
  elements['modal-duration'].textContent = String(duration);
  elements['title-count'].textContent = `${elements['exam-title'].value.length}/180`;
  updateSummary();
}

function saveTemporaryDraft() {
  sessionStorage.setItem(draftKey, JSON.stringify(collectExam()));
}

function markDirty() {
  state.dirty = true;
  setSaveStatus(state.examId ? 'Salvamento pendente' : 'Rascunho local');
  saveTemporaryDraft();
  clearTimeout(state.autosaveTimer);
  if (state.examId) {
    state.autosaveTimer = setTimeout(() => saveExam('draft', true), 1200);
  }
}

function syncQuestionFromTarget(target) {
  const card = target.closest('.question-card');
  if (!card) return null;
  const index = Number(card.dataset.index);
  const question = state.questions[index];
  if (!question) return null;
  if (target.classList.contains('question-prompt')) question.prompt = target.value;
  if (target.classList.contains('question-points')) question.points = Math.max(0, Number(target.value) || 0);
  if (target.classList.contains('question-required')) question.required = target.checked;
  if (target.matches('[data-option-index]')) question.options[Number(target.dataset.optionIndex)] = target.value;
  if (target.classList.contains('question-type')) {
    question.type = target.value;
    if (question.type === 'true_false') question.options = ['Verdadeiro', 'Falso'];
    if (question.type === 'multiple_choice' && question.options.length < 2) question.options = ['Opção A', 'Opção B'];
    if (question.type === 'essay') question.options = [];
    renderQuestions();
  }
  updateSummary();
  markDirty();
  return { question, index };
}

function addQuestion() {
  state.questions.push({
    id: newId(),
    type: 'multiple_choice',
    prompt: '',
    points: 10,
    required: true,
    options: ['Opção A', 'Opção B'],
    correctAnswer: ''
  });
  renderQuestions();
  markDirty();
  requestAnimationFrame(() => elements['questions-list'].lastElementChild?.querySelector('.question-prompt')?.focus());
}

function handleQuestionClick(event) {
  const card = event.target.closest('.question-card');
  if (!card) return;
  const index = Number(card.dataset.index);
  if (event.target.closest('.delete-question')) {
    state.questions.splice(index, 1);
    renderQuestions();
    markDirty();
  } else if (event.target.closest('.duplicate-question')) {
    const copy = JSON.parse(JSON.stringify(state.questions[index]));
    copy.id = newId();
    state.questions.splice(index + 1, 0, copy);
    renderQuestions();
    markDirty();
  } else if (event.target.matches('[data-add-option]')) {
    state.questions[index].options.push(`Opção ${String.fromCharCode(65 + state.questions[index].options.length)}`);
    renderQuestions();
    markDirty();
  } else if (event.target.matches('[data-remove-option]')) {
    if (state.questions[index].options.length <= 2) {
      toast('Mantenha pelo menos duas alternativas.', 'error');
      return;
    }
    state.questions[index].options.splice(Number(event.target.dataset.removeOption), 1);
    renderQuestions();
    markDirty();
  }
}

function handleDragStart(event) {
  const card = event.target.closest('.question-card');
  if (!card) return;
  state.draggedIndex = Number(card.dataset.index);
  card.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(event) {
  const card = event.target.closest('.question-card');
  if (!card) return;
  event.preventDefault();
  elements['questions-list'].querySelectorAll('.drag-over').forEach(item => item.classList.remove('drag-over'));
  card.classList.add('drag-over');
}

function handleDrop(event) {
  const card = event.target.closest('.question-card');
  if (!card || state.draggedIndex === null) return;
  event.preventDefault();
  const targetIndex = Number(card.dataset.index);
  const [moved] = state.questions.splice(state.draggedIndex, 1);
  state.questions.splice(targetIndex, 0, moved);
  state.draggedIndex = null;
  renderQuestions();
  markDirty();
}

function handleDragEnd() {
  state.draggedIndex = null;
  elements['questions-list'].querySelectorAll('.dragging, .drag-over').forEach(item => item.classList.remove('dragging', 'drag-over'));
}

function fillExam(exam) {
  state.examId = exam.id || null;
  state.status = exam.status || 'draft';
  state.questions = Array.isArray(exam.questions) ? exam.questions : defaultQuestions();
  elements['exam-title'].value = exam.title || 'Avaliação de Competências';
  elements['exam-description'].value = exam.description || '';
  elements['exam-duration'].value = exam.durationMinutes || 60;
  elements['passing-score'].value = exam.passingScore ?? 60;
  elements['shuffle-questions'].checked = Boolean(exam.shuffleQuestions);
  elements['result-delivery'].value = exam.resultDelivery || 'manual';
  elements['available-from'].value = String(exam.availableFrom || '').replace(' ', 'T').slice(0, 16);
  elements['available-until'].value = String(exam.availableUntil || '').replace(' ', 'T').slice(0, 16);
  elements['require-identity'].checked = Boolean(exam.requireIdentity);
  elements['require-recording'].checked = Boolean(exam.requireRecording);
  elements['allow-resume'].checked = exam.allowResume !== false;
  elements['show-answer-details'].checked = Boolean(exam.showAnswerDetails);
  elements['page-title'].textContent = state.examId ? 'Editar teste' : 'Criar novo teste';
  elements['breadcrumb-mode'].textContent = state.examId ? 'Editar teste' : 'Criar teste';
  elements['exam-picker'].value = state.examId ? String(state.examId) : '';
  state.dirty = false;
  renderQuestions();
  updatePreview();
  setSaveStatus(state.examId ? 'Alterações salvas' : 'Rascunho local', state.examId ? 'saved' : '');
}

function resetExam() {
  fillExam({
    id: null,
    title: 'Avaliação de Competências',
    description: 'Avaliação para identificar competências técnicas e comportamentais alinhadas à vaga.',
    durationMinutes: 60,
    passingScore: 60,
    shuffleQuestions: false,
    resultDelivery: 'manual',
    availableFrom: null,
    availableUntil: null,
    requireIdentity: false,
    requireRecording: false,
    allowResume: true,
    showAnswerDetails: false,
    status: 'draft',
    questions: defaultQuestions()
  });
  sessionStorage.removeItem(draftKey);
}

function populateExamPicker() {
  elements['exam-picker'].replaceChildren(new Option('Novo teste', ''));
  state.exams.forEach(exam => {
    const suffix = exam.status === 'published' ? 'Publicado' : 'Rascunho';
    elements['exam-picker'].appendChild(new Option(`${exam.title} · ${suffix}`, String(exam.id)));
  });
  if (state.examId) elements['exam-picker'].value = String(state.examId);
}

async function loadExam(examId) {
  if (!examId) {
    resetExam();
    return;
  }
  setSaveStatus('Carregando...', 'saving');
  try {
    const data = await api(`/api/company/exams/${examId}`);
    fillExam(data.exam);
  } catch (error) {
    toast(error.message, 'error');
    resetExam();
  }
}

async function saveExam(status = 'draft', silent = false) {
  const exam = collectExam();
  exam.status = status;
  if (!exam.title) {
    if (!silent) toast('Informe o título do teste.', 'error');
    elements['exam-title'].focus();
    return false;
  }
  setSaveStatus('Salvando...', 'saving');
  try {
    const method = state.examId ? 'PUT' : 'POST';
    const url = state.examId ? `/api/company/exams/${state.examId}` : '/api/company/exams';
    const data = await api(url, { method, body: JSON.stringify(exam) });
    state.examId = data.exam.id;
    state.status = data.exam.status;
    state.dirty = false;
    sessionStorage.removeItem(draftKey);
    const existingIndex = state.exams.findIndex(item => item.id === state.examId);
    const summary = { ...data.exam, updatedAt: new Date().toISOString() };
    if (existingIndex >= 0) state.exams[existingIndex] = summary;
    else state.exams.unshift(summary);
    populateExamPicker();
    elements['page-title'].textContent = 'Editar teste';
    elements['breadcrumb-mode'].textContent = 'Editar teste';
    setSaveStatus(status === 'published' ? 'Teste publicado' : 'Alterações salvas', 'saved');
    if (!silent) toast(status === 'published' ? 'Teste publicado com sucesso.' : 'Rascunho salvo com sucesso.');
    return true;
  } catch (error) {
    setSaveStatus('Falha ao salvar');
    if (!silent) toast(error.message, 'error');
    return false;
  }
}

function showQuestionImportErrors(message, details = []) {
  const container = elements['question-import-errors'];
  container.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = message;
  container.appendChild(title);
  if (details.length) {
    const list = document.createElement('ul');
    details.forEach(detail => {
      const item = document.createElement('li');
      item.textContent = detail;
      list.appendChild(item);
    });
    container.appendChild(list);
  }
  container.hidden = false;
}

async function importQuestionsFromExcel() {
  const [file] = elements['question-import-file'].files;
  if (!file) return;
  const button = document.getElementById('import-questions');
  elements['question-import-errors'].hidden = true;
  elements['question-import-errors'].replaceChildren();

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    showQuestionImportErrors('Selecione o modelo preenchido no formato Excel .xlsx.');
    elements['question-import-file'].value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showQuestionImportErrors('O arquivo deve ter no máximo 5 MB.');
    elements['question-import-file'].value = '';
    return;
  }

  button.disabled = true;
  button.textContent = 'Importando...';
  setSaveStatus('Validando Excel...', 'saving');
  try {
    const body = new FormData();
    body.append('file', file);
    const data = await api('/api/company/question-imports', { method: 'POST', body });
    const importedQuestions = Array.isArray(data.questions) ? data.questions : [];
    const append = elements['question-import-mode'].value === 'append';
    const nextQuestions = append ? [...state.questions, ...importedQuestions] : importedQuestions;
    if (nextQuestions.length > 200) {
      throw new Error('O teste pode ter no máximo 200 questões. Escolha substituir ou reduza o arquivo.');
    }

    state.questions = nextQuestions;
    state.dirty = true;
    renderQuestions();
    updatePreview();
    saveTemporaryDraft();
    const saved = await saveExam('draft', true);
    if (!saved) {
      throw new Error('As questões foram carregadas na tela, mas o rascunho não pôde ser salvo. Informe o título e tente salvar novamente.');
    }
    toast(`${data.count} ${data.count === 1 ? 'questão importada' : 'questões importadas'} e salvas no rascunho.`);
  } catch (error) {
    setSaveStatus('Falha na importação');
    showQuestionImportErrors(error.message, error.details || []);
    toast('Revise o arquivo Excel e tente novamente.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Importar Excel';
    elements['question-import-file'].value = '';
  }
}

function collectBranding() {
  return {
    ...state.branding,
    primaryColor: elements['primary-color'].value.toUpperCase(),
    accentColor: elements['accent-color'].value.toUpperCase(),
    backgroundColor: elements['background-color'].value.toUpperCase(),
    fontFamily: elements['font-family'].value,
    borderRadius: elements['border-radius'].value,
    candidateInstructions: elements['candidate-instructions'].value.trim()
  };
}

async function saveBranding() {
  state.branding = collectBranding();
  applyBranding();
  try {
    const data = await api('/api/company/branding', { method: 'PUT', body: JSON.stringify(state.branding) });
    state.branding = data.branding;
    applyBranding();
    toast('A identidade visual foi salva para sua empresa.');
  } catch (error) {
    toast(error.message, 'error');
  }
}

function handleBrandingInput() {
  state.branding = collectBranding();
  applyBranding();
}

function handleLogo(event) {
  const [file] = event.target.files;
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    toast('Use uma imagem PNG, JPG ou WEBP de até 2 MB.', 'error');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.branding.logoData = String(reader.result);
    applyBranding();
    toast('Logo carregado. Clique em “Salvar aparência” para confirmar.');
  };
  reader.readAsDataURL(file);
}

let appearanceStepPinned = false;
let stepScrollFrame = null;

function setActiveStep(step) {
  const items = [...document.querySelectorAll('.stepper li')];
  const activeIndex = items.findIndex(item => {
    const button = item.querySelector('button');
    return button?.dataset.scroll === step || button?.dataset.action === step;
  });
  items.forEach((item, index) => {
    const active = index === activeIndex;
    item.classList.toggle('active', active);
    item.classList.toggle('completed', activeIndex > -1 && index < activeIndex);
    const button = item.querySelector('button');
    if (active) button?.setAttribute('aria-current', 'step');
    else button?.removeAttribute('aria-current');
  });
}

function updateActiveStep() {
  const stepper = document.querySelector('.stepper');
  if (!stepper) return;
  stepper.classList.toggle('is-stuck', stepper.getBoundingClientRect().top <= 69 && window.scrollY > 40);
  if (!elements['publish-modal'].hidden) {
    setActiveStep('publish');
    return;
  }
  const threshold = 68 + stepper.offsetHeight + 32;
  const questions = document.getElementById('questions-section');
  const application = document.getElementById('application-settings');
  if (appearanceStepPinned) {
    setActiveStep('branding-panel');
  } else if (application.getBoundingClientRect().top <= threshold) {
    setActiveStep('application-settings');
  } else if (questions.getBoundingClientRect().top <= threshold) {
    setActiveStep('questions-section');
  } else {
    setActiveStep('exam-information');
  }
}

function scheduleStepUpdate() {
  if (stepScrollFrame) return;
  stepScrollFrame = requestAnimationFrame(() => {
    stepScrollFrame = null;
    updateActiveStep();
  });
}

function navigateToStep(button) {
  const targetId = button.dataset.scroll;
  appearanceStepPinned = targetId === 'branding-panel';
  setActiveStep(targetId);
  document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openPublishModal() {
  updatePreview();
  elements['publish-modal'].hidden = false;
  setActiveStep('publish');
  document.getElementById('confirm-publish').focus();
}

function closePublishModal() {
  elements['publish-modal'].hidden = true;
  updateActiveStep();
}

function bindEvents() {
  ['exam-title', 'exam-description', 'exam-duration', 'passing-score', 'shuffle-questions', 'result-delivery', 'available-from', 'available-until', 'require-identity', 'require-recording', 'allow-resume', 'show-answer-details'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => { updatePreview(); markDirty(); });
    document.getElementById(id).addEventListener('change', () => { updatePreview(); markDirty(); });
  });
  elements['questions-list'].addEventListener('input', event => syncQuestionFromTarget(event.target));
  elements['questions-list'].addEventListener('change', event => syncQuestionFromTarget(event.target));
  elements['questions-list'].addEventListener('click', handleQuestionClick);
  elements['questions-list'].addEventListener('dragstart', handleDragStart);
  elements['questions-list'].addEventListener('dragover', handleDragOver);
  elements['questions-list'].addEventListener('drop', handleDrop);
  elements['questions-list'].addEventListener('dragend', handleDragEnd);
  document.getElementById('add-question').addEventListener('click', addQuestion);
  document.getElementById('import-questions').addEventListener('click', () => elements['question-import-file'].click());
  elements['question-import-file'].addEventListener('change', importQuestionsFromExcel);
  document.getElementById('save-draft').addEventListener('click', () => saveExam('draft'));
  document.getElementById('publish-exam').addEventListener('click', openPublishModal);
  document.querySelector('[data-action="publish"]').addEventListener('click', openPublishModal);
  document.getElementById('confirm-publish').addEventListener('click', async () => { if (await saveExam('published')) closePublishModal(); });
  document.getElementById('close-publish').addEventListener('click', closePublishModal);
  document.getElementById('cancel-publish').addEventListener('click', closePublishModal);
  elements['publish-modal'].addEventListener('click', event => { if (event.target === elements['publish-modal']) closePublishModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !elements['publish-modal'].hidden) closePublishModal(); });
  document.getElementById('new-exam').addEventListener('click', resetExam);
  elements['exam-picker'].addEventListener('change', event => loadExam(event.target.value));
  ['primary-color', 'accent-color', 'background-color', 'font-family', 'border-radius', 'candidate-instructions'].forEach(id => document.getElementById(id).addEventListener('input', handleBrandingInput));
  elements['logo-upload'].addEventListener('change', handleLogo);
  elements['remove-logo'].addEventListener('click', () => { state.branding.logoData = ''; elements['logo-upload'].value = ''; applyBranding(); });
  document.getElementById('save-branding').addEventListener('click', saveBranding);
  document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => navigateToStep(button)));
  document.querySelectorAll('[data-focus]').forEach(button => button.addEventListener('click', () => {
    appearanceStepPinned = button.dataset.focus === 'branding-panel';
    setActiveStep(button.dataset.focus);
    document.getElementById(button.dataset.focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  window.addEventListener('scroll', scheduleStepUpdate, { passive: true });
  window.addEventListener('resize', scheduleStepUpdate);
  updateActiveStep();
  document.querySelectorAll('[data-view="overview"], [data-view="results"]').forEach(button => button.addEventListener('click', () => toast('Este módulo será conectado na próxima etapa.')));
  document.getElementById('collapse-sidebar').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
  document.getElementById('mobile-menu').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  document.getElementById('botao-logout').addEventListener('click', async () => {
    try { await fetch('/logout', { method: 'POST' }); } finally {
      sessionStorage.removeItem(draftKey);
      localStorage.removeItem('RazaoSocial');
      window.location.replace('index.html');
    }
  });
}

async function loadWorkspace() {
  setSaveStatus('Carregando...', 'saving');
  try {
    const data = await api('/api/company/workspace');
    state.company = data.company;
    state.branding = { ...state.branding, ...data.branding };
    state.exams = data.exams || [];
    elements['company-name'].textContent = data.company.name;
    elements['company-initials'].textContent = initials(data.company.name);
    elements['preview-company'].textContent = data.company.name.toUpperCase();
    applyBranding();
    populateExamPicker();
    const temporaryDraft = sessionStorage.getItem(draftKey);
    if (temporaryDraft) {
      try {
        fillExam({ ...JSON.parse(temporaryDraft), id: null });
        setSaveStatus('Rascunho recuperado');
      } catch (_) {
        resetExam();
      }
    } else {
      resetExam();
    }
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.replace('login_empresa.html');
      return;
    }
    state.questions = defaultQuestions();
    renderQuestions();
    applyBranding();
    setSaveStatus('Servidor indisponível');
    toast('Não foi possível carregar os dados. Confirme se a migração 002 foi aplicada.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  state.questions = defaultQuestions();
  bindEvents();
  renderQuestions();
  applyBranding();
  updatePreview();
  await loadWorkspace();
});
