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
  emailSendOption: 'manual',
  emailScheduleMinutesBefore: null,
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
    'total-points', 'total-points-unit', 'grading-scale-summary-label', 'title-count', 'preview-title', 'preview-duration', 'preview-questions',
    'preview-instructions', 'preview-logo', 'preview-company', 'primary-color', 'accent-color',
    'background-color', 'primary-value', 'accent-value', 'background-value', 'font-family',
    'border-radius', 'candidate-instructions', 'logo-upload', 'remove-logo', 'save-status',
    'exam-picker', 'page-title', 'breadcrumb-mode', 'publish-modal', 'modal-question-count',
    'modal-total-points', 'modal-duration', 'toast-region', 'question-import-file',
    'question-import-mode', 'question-import-errors', 'result-delivery', 'available-from', 'available-until',
    'require-identity', 'require-recording', 'allow-resume', 'show-answer-details', 'grading-scale-type',
    'grading-preview', 'concept-scale-editor', 'concept-bands',
    'email-send-option', 'email-schedule-minutes', 'email-schedule-minutes-field', 'email-status-panel',
    'preview-modal', 'close-preview-modal', 'close-preview-btn', 'publish-from-preview-btn', 'preview-exam-btn',
    'modal-preview-company', 'modal-preview-logo', 'modal-preview-exam-title', 'modal-preview-instructions',
    'modal-preview-duration-tag', 'modal-preview-questions-tag', 'modal-preview-points-tag', 'modal-preview-questions-feed',
    'candidate-preview-container', 'modal-preview-timer'
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
  const preview = document.querySelector('.candidate-preview');
  preview.style.setProperty('--primary', state.branding.primaryColor);
  preview.style.setProperty('--accent', state.branding.accentColor);
  preview.style.setProperty('--canvas', state.branding.backgroundColor);
  preview.style.setProperty('--font', `${state.branding.fontFamily}, "Segoe UI", Arial, sans-serif`);
  preview.style.setProperty('--radius', getRadiusValue());

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
    image.src = './assets/images/Logo_com_Slogan (sem fundo).png';
    image.style.filter = 'brightness(0) invert(1)';
    elements['remove-logo'].hidden = true;
  }
}

function renderOptions(question, container, questionIndex = 0) {
  container.replaceChildren();

  if (['long_answer', 'essay'].includes(question.type)) {
    const note = document.createElement('div');
    note.className = 'essay-note';
    note.textContent = 'O candidato responderá em um campo de texto livre. Questões dissertativas exigem correção manual no painel de Resultados.';
    
    const charGrid = document.createElement('div');
    charGrid.className = 'char-limits-grid';

    const minLabel = document.createElement('label');
    minLabel.className = 'char-limit-field';
    minLabel.innerHTML = `<span>Mínimo de caracteres</span><input type="number" class="question-min-chars" min="0" max="10000" value="${question.minCharacters || 0}">`;

    const maxLabel = document.createElement('label');
    maxLabel.className = 'char-limit-field';
    maxLabel.innerHTML = `<span>Máximo de caracteres</span><input type="number" class="question-max-chars" min="0" max="50000" value="${question.maxCharacters || 5000}">`;

    charGrid.append(minLabel, maxLabel);
    container.append(note, charGrid);
    return;
  }

  if (question.type === 'short_answer') {
    if (!Array.isArray(question.acceptedAnswers) || question.acceptedAnswers.length === 0) {
      question.acceptedAnswers = question.correctAnswer ? [question.correctAnswer] : ['Resposta correta'];
    }

    const helper = document.createElement('div');
    helper.className = 'options-helper-text';
    helper.textContent = 'Cadastre as respostas aceitas para correção automática (sem diferenciar maiúsculas/minúsculas ou espaços nas pontas):';
    container.appendChild(helper);

    question.acceptedAnswers.forEach((ans, ansIndex) => {
      const row = document.createElement('div');
      row.className = 'option-row short-answer-row';

      const marker = document.createElement('span');
      marker.className = 'correct-badge';
      marker.textContent = `Aceita ${ansIndex + 1}`;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = ans;
      input.maxLength = 500;
      input.dataset.acceptedIndex = String(ansIndex);
      input.setAttribute('placeholder', 'Digite o texto da resposta aceita');

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-option';
      remove.dataset.removeAccepted = String(ansIndex);
      remove.textContent = '×';

      row.append(marker, input, remove);
      container.appendChild(row);
    });

    if (question.acceptedAnswers.length < 10) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'add-option';
      add.dataset.addAccepted = 'true';
      add.textContent = '+ Adicionar resposta aceita';
      container.appendChild(add);
    }
    return;
  }

  if (!Array.isArray(question.options) || question.options.length === 0) {
    question.options = ['Opção A', 'Opção B'];
  }

  const isMultiSelect = question.type === 'multiple_choice';
  if (isMultiSelect) {
    if (!Array.isArray(question.correctAnswers)) {
      if (question.correctAnswer) {
        try {
          const parsed = JSON.parse(question.correctAnswer);
          question.correctAnswers = Array.isArray(parsed) ? parsed : [question.correctAnswer];
        } catch (_) {
          question.correctAnswers = [question.correctAnswer];
        }
      } else {
        question.correctAnswers = [question.options[0]];
      }
    }
  if (question.type === 'binary_choice') {
    if (!Array.isArray(question.options) || question.options.length !== 2) {
      question.options = ['Conforme', 'Não conforme'];
    }
    if (!question.correctOption) question.correctOption = question.options[0];
    if (!question.correctAnswer) question.correctAnswer = question.options[0];
  } else if (question.type === 'fill_blank') {
    if (!Array.isArray(question.blanks) || question.blanks.length === 0) {
      question.blanks = [{ id: 'blank-1', acceptedAnswers: ['palavra'], caseSensitive: false, accentInsensitive: true }];
    }
  }

  if (question.type === 'fill_blank') {
    const helper = document.createElement('div');
    helper.className = 'options-helper-text';
    helper.textContent = 'Lacunas configuradas no enunciado (use ______ para indicar onde fica cada lacuna):';
    container.appendChild(helper);

    question.blanks.forEach((blank, bIdx) => {
      const row = document.createElement('div');
      row.className = 'option-row';
      row.style.flexDirection = 'column';
      row.style.alignItems = 'flex-start';
      row.style.gap = '0.4rem';

      const title = document.createElement('div');
      title.innerHTML = `<strong>Lacuna #${bIdx + 1}</strong> (${blank.id})`;
      
      const accInput = document.createElement('input');
      accInput.type = 'text';
      accInput.value = (blank.acceptedAnswers || []).join(', ');
      accInput.placeholder = 'Respostas aceitas (separadas por vírgula)';
      accInput.dataset.blankIndex = String(bIdx);

      row.append(title, accInput);
      container.appendChild(row);
    });
    return;
  }

  const helper = document.createElement('div');
  helper.className = 'options-helper-text';
  helper.textContent = isMultiSelect
    ? 'Marque as alternativas corretas (gabarito — múltiplas respostas):'
    : 'Marque a alternativa correta (gabarito):';
  container.appendChild(helper);

  question.options.forEach((option, optionIndex) => {
    const row = document.createElement('div');
    const isCorrect = isMultiSelect
      ? (question.correctAnswers || []).includes(option)
      : ((question.correctAnswer === option) || (!question.correctAnswer && optionIndex === 0));

    row.className = `option-row ${isCorrect ? 'is-correct' : ''}`;

    const markInput = document.createElement('input');
    markInput.type = isMultiSelect ? 'checkbox' : 'radio';
    markInput.className = isMultiSelect ? 'option-correct-checkbox' : 'option-correct-radio';
    if (!isMultiSelect) markInput.name = `correct-option-${questionIndex}`;
    markInput.checked = isCorrect;
    markInput.dataset.correctOption = String(optionIndex);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = option;
    input.maxLength = 500;
    input.dataset.optionIndex = String(optionIndex);
    input.setAttribute('aria-label', `Opção ${optionIndex + 1}`);

    row.append(markInput, input);

    if (isCorrect) {
      const badge = document.createElement('span');
      badge.className = 'correct-badge';
      badge.textContent = '✓ Gabarito';
      row.appendChild(badge);
    }

    if (!['true_false', 'binary_choice'].includes(question.type)) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-option';
      remove.dataset.removeOption = String(optionIndex);
      remove.setAttribute('aria-label', `Remover opção ${optionIndex + 1}`);
      remove.textContent = '×';
      row.appendChild(remove);
    }

    container.appendChild(row);
  });

  if (['single_choice', 'multiple_choice'].includes(question.type) && question.options.length < 10) {
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
    renderOptions(question, card.querySelector('.question-options'), index);
    elements['questions-list'].appendChild(fragment);
  });
  updateSummary();
}

function updateSummary() {
  const total = state.questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  const count = state.questions.length;
  elements['question-count'].textContent = `(${count})`;
  elements['question-total'].textContent = `Pontuação total: ${total} pontos`;
  elements['preview-questions'].textContent = `${count} ${count === 1 ? 'questão' : 'questões'}`;
  elements['modal-question-count'].textContent = String(count);
  elements['modal-total-points'].textContent = String(total);
}

function defaultGradingScale() {
  return {
    type: 'numeric',
    maximum: 100,
    decimals: 0,
    bands: [
      { min: 0, code: 'I', label: 'Irregular' },
      { min: 50, code: 'R', label: 'Regular' },
      { min: 70, code: 'B', label: 'Bom' },
      { min: 90, code: 'MB', label: 'Muito bom' }
    ]
  };
}

function collectGradingScale() {
  const selected = elements['grading-scale-type'].value;
  if (selected === 'concept') {
    const bands = [...elements['concept-bands'].querySelectorAll('.concept-band')].map(row => ({
      code: row.querySelector('[data-field="code"]').value.trim(),
      label: row.querySelector('[data-field="label"]').value.trim(),
      min: Number(row.querySelector('[data-field="min"]').value) || 0
    }));
    return { type: 'concept', maximum: 100, decimals: 0, bands };
  }
  const maximum = Number(selected.split('-')[1]) || 100;
  return { type: 'numeric', maximum, decimals: maximum === 100 ? 0 : 1, bands: defaultGradingScale().bands };
}

function updateGradingPreview() {
  const score = Math.max(0, Math.min(100, Number(elements['passing-score'].value) || 0));
  const scale = collectGradingScale();
  if (scale.type === 'concept') {
    const bands = [...scale.bands].sort((a, b) => a.min - b.min);
    const band = bands.reduce((current, item) => score >= item.min ? item : current, bands[0]);
    elements['grading-preview'].textContent = band ? `${band.code} — ${band.label}` : 'Configure os conceitos';
    elements['grading-scale-summary-label'].textContent = 'Escala por conceitos';
    elements['total-points'].textContent = bands.length ? (bands[0].code + '–' + bands.at(-1).code) : '—';
    elements['total-points-unit'].textContent = 'conceitos';
  } else {
    const converted = score * scale.maximum / 100;
    elements['grading-preview'].textContent = `${converted.toLocaleString('pt-BR', { maximumFractionDigits: scale.decimals })} / ${scale.maximum}`;
    elements['grading-scale-summary-label'].textContent = 'Escala 0 a ' + scale.maximum;
    elements['total-points'].textContent = String(scale.maximum);
    elements['total-points-unit'].textContent = 'pontos';
  }
}

function renderGradingScale(scale = defaultGradingScale()) {
  const normalized = scale && typeof scale === 'object' ? scale : defaultGradingScale();
  elements['grading-scale-type'].value = normalized.type === 'concept' ? 'concept' : `numeric-${[5, 10, 100].includes(Number(normalized.maximum)) ? Number(normalized.maximum) : 100}`;
  const bands = Array.isArray(normalized.bands) && normalized.bands.length ? normalized.bands : defaultGradingScale().bands;
  elements['concept-bands'].replaceChildren();
  bands.forEach((band, index) => {
    const row = document.createElement('div');
    row.className = 'concept-band';
    [['code', band.code], ['label', band.label], ['min', band.min]].forEach(([field, value]) => {
      const input = document.createElement('input');
      input.dataset.field = field;
      input.value = value ?? '';
      input.maxLength = field === 'code' ? 8 : field === 'label' ? 50 : 3;
      if (field === 'min') {
        input.type = 'number';
        input.min = '0';
        input.max = '100';
        input.disabled = index === 0;
      }
      row.appendChild(input);
    });
    elements['concept-bands'].appendChild(row);
  });
  elements['concept-scale-editor'].hidden = normalized.type !== 'concept';
  updateGradingPreview();
}
function collectExam() {
  const sendOption = elements['email-send-option'] ? elements['email-send-option'].value : 'manual';
  const minutesBefore = elements['email-schedule-minutes'] && sendOption === 'scheduled'
    ? (parseInt(elements['email-schedule-minutes'].value, 10) || null)
    : null;
  return {
    title: elements['exam-title'].value.trim(),
    description: elements['exam-description'].value.trim(),
    durationMinutes: Number(elements['exam-duration'].value) || 60,
    passingScore: Number(elements['passing-score'].value) || 0,
    gradingScale: collectGradingScale(),
    shuffleQuestions: elements['shuffle-questions'].checked,
    status: state.status,
    resultDelivery: elements['result-delivery'].value,
    availableFrom: elements['available-from'].value || null,
    availableUntil: elements['available-until'].value || null,
    requireIdentity: elements['require-identity'].checked,
    requireRecording: elements['require-recording'].checked,
    allowResume: elements['allow-resume'].checked,
    showAnswerDetails: elements['show-answer-details'].checked,
    emailSendOption: sendOption,
    emailScheduleMinutesBefore: minutesBefore,
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
  updateGradingPreview();
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
  if (target.classList.contains('question-min-chars')) {
    question.minCharacters = Math.max(0, Number(target.value) || 0);
  }
  if (target.classList.contains('question-max-chars')) {
    question.maxCharacters = Math.max(0, Number(target.value) || 0);
  }
  if (target.matches('[data-accepted-index]')) {
    const accIdx = Number(target.dataset.acceptedIndex);
    if (Array.isArray(question.acceptedAnswers)) {
      question.acceptedAnswers[accIdx] = target.value;
      question.correctAnswer = question.acceptedAnswers[0] || '';
    }
  }
  if (target.matches('[data-option-index]')) {
    const optIdx = Number(target.dataset.optionIndex);
    const oldVal = question.options[optIdx];
    question.options[optIdx] = target.value;
    if (question.type === 'multiple_choice') {
      if (Array.isArray(question.correctAnswers)) {
        const cIndex = question.correctAnswers.indexOf(oldVal);
        if (cIndex >= 0) question.correctAnswers[cIndex] = target.value;
      }
      question.correctAnswer = JSON.stringify(question.correctAnswers || []);
    } else if (question.correctAnswer === oldVal || (!question.correctAnswer && optIdx === 0)) {
      question.correctAnswer = target.value;
    }
  }
  if (target.matches('[data-correct-option]')) {
    const optIdx = Number(target.dataset.correctOption);
    const optVal = question.options[optIdx] || '';
    if (question.type === 'multiple_choice') {
      if (!Array.isArray(question.correctAnswers)) question.correctAnswers = [];
      if (target.checked) {
        if (!question.correctAnswers.includes(optVal)) question.correctAnswers.push(optVal);
      } else {
        question.correctAnswers = question.correctAnswers.filter(item => item !== optVal);
      }
      question.correctAnswer = JSON.stringify(question.correctAnswers);
    } else {
      question.correctAnswer = optVal;
    }
    renderQuestions();
  }
  if (target.classList.contains('question-type')) {
    question.type = target.value;
    if (question.type === 'true_false') {
      question.options = ['Verdadeiro', 'Falso'];
      question.correctAnswer = 'Verdadeiro';
    } else if (['single_choice', 'multiple_choice'].includes(question.type)) {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        question.options = ['Opção A', 'Opção B'];
      }
      if (question.type === 'multiple_choice') {
        question.correctAnswers = [question.options[0]];
        question.correctAnswer = JSON.stringify(question.correctAnswers);
      } else {
        question.correctAnswer = question.options[0];
      }
    } else if (question.type === 'short_answer') {
      question.options = [];
      question.acceptedAnswers = ['Resposta aceita'];
      question.correctAnswer = 'Resposta aceita';
    } else if (['long_answer', 'essay'].includes(question.type)) {
      question.options = [];
      question.acceptedAnswers = [];
      question.correctAnswer = '';
      question.minCharacters = 0;
      question.maxCharacters = 5000;
      question.manualCorrection = true;
    }
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
  renderGradingScale(exam.gradingScale);
  elements['shuffle-questions'].checked = Boolean(exam.shuffleQuestions);
  elements['result-delivery'].value = exam.resultDelivery || 'manual';
  elements['available-from'].value = String(exam.availableFrom || '').replace(' ', 'T').slice(0, 16);
  elements['available-until'].value = String(exam.availableUntil || '').replace(' ', 'T').slice(0, 16);
  elements['require-identity'].checked = Boolean(exam.requireIdentity);
  elements['require-recording'].checked = Boolean(exam.requireRecording);
  elements['allow-resume'].checked = exam.allowResume !== false;
  elements['show-answer-details'].checked = Boolean(exam.showAnswerDetails);
  // Opção de envio de e-mail
  const sendOption = exam.emailSendOption || 'manual';
  if (elements['email-send-option']) elements['email-send-option'].value = sendOption;
  if (elements['email-schedule-minutes']) elements['email-schedule-minutes'].value = exam.emailScheduleMinutesBefore || '';
  updateEmailScheduleVisibility();
  elements['page-title'].textContent = state.examId ? 'Editar teste' : 'Criar novo teste';
  elements['breadcrumb-mode'].textContent = state.examId ? 'Editar teste' : 'Criar teste';
  elements['exam-picker'].value = state.examId ? String(state.examId) : '';
  state.dirty = false;
  renderQuestions();
  updatePreview();
  loadExamDocuments(state.examId);
  setSaveStatus(state.examId ? 'Alterações salvas' : 'Rascunho local', state.examId ? 'saved' : '');
}

function updateEmailScheduleVisibility() {
  const sendOption = elements['email-send-option'] ? elements['email-send-option'].value : 'manual';
  if (elements['email-schedule-minutes-field']) {
    elements['email-schedule-minutes-field'].hidden = sendOption !== 'scheduled';
  }
  if (elements['email-status-panel']) {
    elements['email-status-panel'].hidden = sendOption === 'none';
  }
}

function resetExam() {
  fillExam({
    id: null,
    title: 'Avaliação de Competências',
    description: 'Avaliação para identificar competências técnicas e comportamentais alinhadas à vaga.',
    durationMinutes: 60,
    passingScore: 60,
    gradingScale: defaultGradingScale(),
    shuffleQuestions: false,
    resultDelivery: 'manual',
    availableFrom: null,
    availableUntil: null,
    requireIdentity: false,
    requireRecording: false,
    allowResume: true,
    showAnswerDetails: false,
    emailSendOption: 'manual',
    emailScheduleMinutesBefore: null,
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
  // Valida minutos antes para envio agendado
  if (exam.emailSendOption === 'scheduled' && !(exam.emailScheduleMinutesBefore > 0)) {
    if (!silent) toast('Informe os minutos antes do início para o envio agendado.', 'error');
    elements['email-schedule-minutes']?.focus();
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
    // Exibe resultado do envio de e-mail
    const emailResult = data.emailResult;
    if (!silent && emailResult && emailResult.option !== 'none' && emailResult.option !== 'manual') {
      if (emailResult.option === 'scheduled') {
        const qtd = emailResult.queued || 0;
        toast(`★ ${qtd} acesso(s) ao exame agendado(s) para envio automático.`);
      } else if (emailResult.sent > 0) {
        let msg = `✉ ${emailResult.sent} acesso(s) ao exame enviado(s) com sucesso.`;
        if (emailResult.failed > 0) msg += ` ${emailResult.failed} falhou.`;
        toast(msg, emailResult.failed > 0 ? 'error' : 'success');
      } else if (emailResult.failed > 0) {
        toast(`⚠ Falha ao enviar acesso ao exame: ${emailResult.error || 'Erro desconhecido.'}`, 'error');
      }
    }
    // Atualiza painel de status do e-mail
    updateEmailStatusPanel(emailResult);
    return true;
  } catch (error) {
    setSaveStatus('Falha ao salvar');
    if (!silent) toast(error.message, 'error');
    return false;
  }
}

function updateEmailStatusPanel(emailResult) {
  const panel = elements['email-status-panel'];
  if (!panel || !emailResult) return;
  const optionLabels = { on_save: 'Ao concluir o cadastro', scheduled: 'Agendado', manual: 'Manual', none: 'Não enviar' };
  const statusLabels = { sent: 'Enviado', failed: 'Falha', pending: 'Pendente', cancelled: 'Cancelado' };
  let html = `<div class="email-status-row"><span class="email-status-label">Forma de envio</span><span>${optionLabels[emailResult.option] || emailResult.option}</span></div>`;
  if (emailResult.option === 'scheduled') {
    html += `<div class="email-status-row"><span class="email-status-label">Status</span><span class="badge badge-pending">Agendado — ${emailResult.queued || 0} participante(s)</span></div>`;
  } else if (emailResult.option === 'on_save') {
    const status = emailResult.failed > 0 && emailResult.sent === 0 ? 'failed' : emailResult.sent > 0 ? 'sent' : 'pending';
    html += `<div class="email-status-row"><span class="email-status-label">Status</span><span class="badge badge-${status}">${statusLabels[status]} (${emailResult.sent} enviado${emailResult.sent !== 1 ? 's' : ''})</span></div>`;
    if (emailResult.failed > 0) html += `<div class="email-status-row email-status-error"><span class="email-status-label">Última falha</span><span>${emailResult.error || ''}</span></div>`;
  } else if (emailResult.option === 'manual') {
    html += `<div class="email-status-row"><span class="email-status-label">Status</span><span class="badge badge-pending">Aguardando envio manual</span></div>`;
    html += `<button class="button secondary" id="manual-send-access-btn" type="button">✉ Enviar acesso ao exame agora</button>`;
  }
  panel.innerHTML = html;
  panel.hidden = !emailResult || emailResult.option === 'none';
  // Bind no botão de envio manual
  const btn = document.getElementById('manual-send-access-btn');
  if (btn) {
    btn.addEventListener('click', sendManualAccess);
  }
}

async function sendManualAccess() {
  const btn = document.getElementById('manual-send-access-btn');
  if (!state.examId) { toast('Salve o teste antes de enviar.', 'error'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
  try {
    const data = await api(`/api/company/exams/${state.examId}/send-access`, { method: 'POST', body: JSON.stringify({}) });
    let msg = `✉ ${data.sent} acesso(s) enviado(s) com sucesso.`;
    if (data.failed > 0) msg += ` ${data.failed} falhou.`;
    toast(msg, data.failed > 0 ? 'error' : 'success');
    updateEmailStatusPanel({ option: 'manual', sent: data.sent, failed: data.failed, error: data.failedDetails?.[0] || '' });
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✉ Enviar acesso ao exame agora'; }
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

async function importQuestionsFromFile() {
  const [file] = elements['question-import-file'].files;
  if (!file) return;
  const button = document.getElementById('import-questions');
  elements['question-import-errors'].hidden = true;
  elements['question-import-errors'].replaceChildren();

  const extension = file.name.toLowerCase().split('.').pop();
  if (!['xlsx', 'gift', 'txt'].includes(extension)) {
    showQuestionImportErrors('Selecione um arquivo Excel .xlsx ou GIFT .gift/.txt.');
    elements['question-import-file'].value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showQuestionImportErrors('O arquivo deve ter no máximo 5 MB.');
    elements['question-import-file'].value = '';
    return;
  }

  const formatLabel = extension === 'xlsx' ? 'Excel' : 'GIFT';
  button.disabled = true;
  button.textContent = 'Importando...';
  setSaveStatus(`Validando ${formatLabel}...`, 'saving');
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
    toast(`Revise o arquivo ${formatLabel} e tente novamente.`, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Importar arquivo';
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

function openCandidatePreviewModal() {
  const exam = collectExam();
  const count = state.questions.length;
  const total = state.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  const duration = Number(elements['exam-duration'].value) || 60;

  const container = elements['candidate-preview-container'];
  if (container) {
    container.style.setProperty('--primary', state.branding.primaryColor);
    container.style.setProperty('--accent', state.branding.accentColor);
    container.style.setProperty('--canvas', state.branding.backgroundColor);
    container.style.setProperty('--font', `${state.branding.fontFamily}, "Segoe UI", Arial, sans-serif`);
    container.style.setProperty('--radius', getRadiusValue());
  }

  const companyName = (state.company?.name || 'SUA EMPRESA').toUpperCase();
  if (elements['modal-preview-company']) elements['modal-preview-company'].textContent = companyName;
  if (elements['modal-preview-exam-title']) elements['modal-preview-exam-title'].textContent = exam.title || 'Seu novo teste';
  if (elements['modal-preview-instructions']) elements['modal-preview-instructions'].textContent = state.branding.candidateInstructions || 'Leia as instruções com atenção antes de iniciar a avaliação.';
  if (elements['modal-preview-duration-tag']) elements['modal-preview-duration-tag'].textContent = `${duration} min`;
  if (elements['modal-preview-questions-tag']) elements['modal-preview-questions-tag'].textContent = `${count} ${count === 1 ? 'questão' : 'questões'}`;
  if (elements['modal-preview-points-tag']) elements['modal-preview-points-tag'].textContent = `${total} pontos`;
  if (elements['modal-preview-timer']) elements['modal-preview-timer'].textContent = `${duration}:00`;

  const logoImg = elements['modal-preview-logo'];
  if (logoImg) {
    if (state.branding.logoData) {
      logoImg.src = state.branding.logoData;
      logoImg.style.filter = 'none';
    } else {
      logoImg.src = './assets/images/Logo_com_Slogan (sem fundo).png';
      logoImg.style.filter = 'brightness(0) invert(1)';
    }
  }

  const feed = elements['modal-preview-questions-feed'];
  if (feed) {
    feed.replaceChildren();
    if (!state.questions.length) {
      const empty = document.createElement('p');
      empty.className = 'preview-empty-questions';
      empty.textContent = 'Nenhuma questão cadastrada até o momento.';
      feed.appendChild(empty);
    } else {
      state.questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'candidate-question-card';

        const head = document.createElement('div');
        head.className = 'question-card-head';
        head.innerHTML = `<span>Questão ${index + 1} de ${count}</span><b>${q.points || 0} pt${(q.points || 0) === 1 ? '' : 's'}</b>`;

        const prompt = document.createElement('div');
        prompt.className = 'question-card-prompt';
        prompt.textContent = q.prompt || '(Sem enunciado)';

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'question-card-options';

        if (q.type === 'essay') {
          const area = document.createElement('textarea');
          area.className = 'candidate-textarea-mock';
          area.placeholder = 'O candidato digitará a resposta neste campo de texto livre...';
          area.rows = 4;
          area.readOnly = true;
          optionsDiv.appendChild(area);
        } else {
          const isMulti = q.type === 'multiple_select';
          const opts = Array.isArray(q.options) && q.options.length ? q.options : ['Opção A', 'Opção B'];
          opts.forEach((optText) => {
            const optLabel = document.createElement('label');
            optLabel.className = 'candidate-option-label';
            const input = document.createElement('input');
            input.type = isMulti ? 'checkbox' : 'radio';
            input.name = `preview-q-${index}`;
            input.disabled = true;
            const span = document.createElement('span');
            span.textContent = optText;
            optLabel.append(input, span);
            optionsDiv.appendChild(optLabel);
          });
        }

        card.append(head, prompt, optionsDiv);
        feed.appendChild(card);
      });
    }
  }

  elements['preview-modal'].hidden = false;
}

function closeCandidatePreviewModal() {
  elements['preview-modal'].hidden = true;
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
  // Evento para o campo de opção de envio de e-mail
  if (elements['email-send-option']) {
    elements['email-send-option'].addEventListener('change', () => {
      updateEmailScheduleVisibility();
      markDirty();
    });
  }
  if (elements['email-schedule-minutes']) {
    elements['email-schedule-minutes'].addEventListener('input', markDirty);
  }
  elements['grading-scale-type'].addEventListener('change', () => {
    const scale = collectGradingScale();
    renderGradingScale(scale);
    markDirty();
  });
  elements['concept-bands'].addEventListener('input', () => {
    updateGradingPreview();
    markDirty();
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
  elements['question-import-file'].addEventListener('change', importQuestionsFromFile);
  document.getElementById('save-draft').addEventListener('click', () => saveExam('draft'));
  if (elements['preview-exam-btn']) elements['preview-exam-btn'].addEventListener('click', openCandidatePreviewModal);
  if (elements['preview-button']) elements['preview-button'].addEventListener('click', openCandidatePreviewModal);
  if (elements['close-preview-modal']) elements['close-preview-modal'].addEventListener('click', closeCandidatePreviewModal);
  if (elements['close-preview-btn']) elements['close-preview-btn'].addEventListener('click', closeCandidatePreviewModal);
  if (elements['publish-from-preview-btn']) elements['publish-from-preview-btn'].addEventListener('click', () => { closeCandidatePreviewModal(); openPublishModal(); });
  elements['preview-modal'].addEventListener('click', event => { if (event.target === elements['preview-modal']) closeCandidatePreviewModal(); });
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
  document.querySelectorAll('[data-view="overview"]').forEach(button => button.addEventListener('click', () => window.location.href = 'VisaoGeral.html'));
  document.querySelectorAll('[data-view="results"]').forEach(button => button.addEventListener('click', () => window.location.href = 'Resultados.html'));
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

async function loadExamDocuments(examId) {
  const container = document.getElementById('exam-documents-list');
  if (!container) return;
  if (!examId) {
    container.innerHTML = '<p style="color: #94A3B8; font-size: 0.9rem; font-style: italic;">Salve o exame primeiro para conseguir anexar documentos e termos de aceite.</p>';
    return;
  }
  try {
    const res = await api(`/api/company/exams/${examId}/documents`);
    if (!res.documents || res.documents.length === 0) {
      container.innerHTML = '<p style="color: #94A3B8; font-size: 0.9rem; font-style: italic;">Nenhum documento ou termo anexado a este exame.</p>';
      return;
    }
    const docTypeLabels = {
      rules: 'Regras do Exame',
      general_instructions: 'Instruções Gerais',
      terms: 'Termo de Aceite',
      support_material: 'Material de Apoio',
      other: 'Outro Documento',
    };
    container.innerHTML = res.documents.map(doc => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 0.5rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-weight: 600; color: #1E293B;">${doc.title}</span>
            <span style="background: #E2E8F0; color: #475569; font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; font-weight: 500;">${docTypeLabels[doc.docType] || doc.docType}</span>
          </div>
          <div style="font-size: 0.8rem; color: #64748B; margin-top: 2px;">
            ${doc.originalName} (${(doc.sizeBytes / 1024).toFixed(1)} KB)
            ${doc.requireAcceptance ? ' · <b style="color:#D97706;">Exige aceite digital</b>' : ''}
            ${doc.requireReturnSigned ? ' · <b style="color:#DC2626;">Exige envio assinado</b>' : ''}
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <a href="/api/company/documents/${doc.id}/download" target="_blank" class="button secondary" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">Baixar</a>
          <button onclick="deleteExamDocument(${doc.id})" class="button danger" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">Excluir</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p style="color: #EF4444; font-size: 0.9rem;">Erro ao carregar documentos do exame.</p>';
  }
}

async function deleteExamDocument(docId) {
  if (!confirm('Deseja realmente excluir este documento do exame?')) return;
  try {
    await api(`/api/company/documents/${docId}`, { method: 'DELETE' });
    toast('Documento removido com sucesso.', 'success');
    if (state.examId) loadExamDocuments(state.examId);
  } catch (err) {
    toast(err.message || 'Erro ao excluir documento.', 'error');
  }
}

function initDocumentManagerUI() {
  const btnAdd = document.getElementById('btn-add-document');
  const modal = document.getElementById('document-modal');
  const closeBtn = document.getElementById('close-document-modal');
  const cancelBtn = document.getElementById('cancel-document-modal');
  const form = document.getElementById('document-upload-form');

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      if (!state.examId) {
        toast('Salve o exame antes de anexar documentos ou termos.', 'warning');
        return;
      }
      modal.hidden = false;
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', () => { modal.hidden = true; });
  if (cancelBtn) cancelBtn.addEventListener('click', () => { modal.hidden = true; });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.examId) return;

      const fileInput = document.getElementById('doc-file-input');
      if (!fileInput.files || !fileInput.files[0]) {
        toast('Selecione um arquivo.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('title', document.getElementById('doc-title-input').value.trim());
      formData.append('docType', document.getElementById('doc-type-select').value);
      formData.append('description', document.getElementById('doc-desc-input').value.trim());
      formData.append('downloadAllowed', document.getElementById('doc-download-allowed').checked);
      formData.append('requireRead', document.getElementById('doc-require-read').checked);
      formData.append('requireAcceptance', document.getElementById('doc-require-acceptance').checked);
      formData.append('requireReturnSigned', document.getElementById('doc-require-return-signed').checked);

      try {
        const res = await fetch(`/api/company/exams/${state.examId}/documents`, {
          method: 'POST',
          headers: { 'X-CSRF-Token': getCsrfToken() },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Erro no envio do documento.');
        
        toast('Documento anexado com sucesso!', 'success');
        modal.hidden = true;
        form.reset();
        loadExamDocuments(state.examId);
      } catch (err) {
        toast(err.message || 'Erro ao enviar documento.', 'error');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  state.questions = defaultQuestions();
  bindEvents();
  initDocumentManagerUI();
  renderQuestions();
  applyBranding();
  updatePreview();
  await loadWorkspace();
});
