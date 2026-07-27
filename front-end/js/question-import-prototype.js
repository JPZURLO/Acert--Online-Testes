/**
 * question-import-prototype.js
 * Assistente funcional do fluxo de importação em 3 etapas com pré-visualização editável.
 * 
 * IMPORTANTE:
 * - A etapa de análise usa o backend real de importação para evitar divergência entre preview e banco.
 * - A importação final entrega as questões revisadas ao construtor do teste.
 */

(function () {
  'use strict';

  // --- Tipos aceitos pelo backend atual ---
  const BACKEND_QUESTION_TYPES = [
    { value: 'single_choice', label: 'Escolha única' },
    { value: 'multiple_choice', label: 'Múltipla escolha (várias corretas)' },
    { value: 'true_false', label: 'Verdadeiro ou Falso' },
    { value: 'binary_choice', label: 'Duas opções (Termos personalizados)' },
    { value: 'fill_blank', label: 'Preenchimento de lacunas' },
    { value: 'short_answer', label: 'Resposta curta (Palavras-chave)' },
    { value: 'long_answer', label: 'Dissertativa / Texto longo' },
    { value: 'essay', label: 'Redação / Ensaio' },
    { value: 'matching', label: 'Associação' },
    { value: 'numeric_answer', label: 'Resposta numérica' }
  ];

  // --- Estado do Protótipo ---
  const state = {
    step: 1, // 1: Escolha de arquivos, 2: Preview editável, 3: Confirmação
    importMode: 'single', // 'single' ou 'two_files'
    files: {
      singleFile: null,
      questionFile: null,
      answerKeyFile: null
    },
    questions: [],
    filter: 'all' // 'all', 'ready', 'warning', 'error', 'excluded'
  };

  const ACCEPTED_EXTENSIONS = ['xlsx', 'gift', 'txt'];

  // Mock de Dados para Inicialização da Etapa 2
  function generateMockQuestions() {
    return [
      {
        id: 'q1',
        num: 1,
        type: 'single_choice',
        prompt: 'Qual é o principal objetivo do teste de regressão em desenvolvimento de software?',
        options: [
          'Verificar se novas alterações não afetaram funcionalidades já existentes',
          'Testar apenas a velocidade e tempo de resposta do banco de dados',
          'Validar os requisitos de infraestrutura e hospedagem em nuvem',
          'Substituir o teste unitário no ciclo de integração contínua'
        ],
        correctAnswers: [0],
        points: 10,
        explanation: 'O teste de regressão garante que o software continue funcionando corretamente após modificações.',
        status: 'ready',
        statusDetail: 'Pronta para importar',
        isExpanded: true,
        isExcluded: false
      },
      {
        id: 'q2',
        num: 2,
        type: 'multiple_choice',
        prompt: 'Selecione as três boas práticas fundamentais de segurança em APIs RESTful (Múltiplas respostas):',
        options: [
          'Uso obrigatorio de HTTPS / TLS em todas as requisições',
          'Armazenar senhas em texto puro nos bancos de dados',
          'Autenticação e autorização via tokens JWT ou OAuth2',
          'Permitir requisições de qualquer origem sem sanitização de entrada',
          'Validação estrita de tipos e sanitização de payloads de entrada'
        ],
        correctAnswers: [0, 2, 4], // A, C, E
        points: 15,
        explanation: 'Gabarito oficial: A, C e E são práticas indispensáveis de segurança.',
        status: 'ready',
        statusDetail: 'Pronta para importar',
        isExpanded: true,
        isExcluded: false
      },
      {
        id: 'q3',
        num: 3,
        type: 'binary_choice',
        prompt: 'Em testes de software, qual abordagem é realizada sem ter acesso ao código-fonte da aplicação?',
        options: ['Caixa branca', 'Caixa preta'],
        correctAnswers: [1], // Caixa preta
        points: 10,
        explanation: 'No teste de caixa preta, o avaliador não visualiza a estrutura interna do código.',
        status: 'ready',
        statusDetail: 'Pronta para importar (Termos personalizados)',
        isExpanded: false,
        isExcluded: false
      },
      {
        id: 'q4',
        num: 4,
        type: 'true_false',
        prompt: 'A arquitetura de microsserviços exige obrigatoriamente um único banco de dados monolítico compartilhado por todos os serviços.',
        options: ['Verdadeiro', 'Falso'],
        correctAnswers: [1], // Falso
        points: 10,
        explanation: 'Em microsserviços, o padrão recomendado é ter banco de dados descentralizado por serviço.',
        status: 'ready',
        statusDetail: 'Pronta para importar',
        isExpanded: false,
        isExcluded: false
      },
      {
        id: 'q5',
        num: 5,
        type: 'short_answer',
        prompt: 'Informe a sigla do protocolo de transferência de hipertexto seguro padrão da web:',
        options: [],
        correctAnswers: ['HTTPS'],
        points: 10,
        explanation: 'Termo esperado: HTTPS.',
        status: 'warning',
        statusDetail: 'Revisão recomendada',
        isExpanded: false,
        isExcluded: false
      },
      {
        id: 'q6',
        num: 6,
        type: 'single_choice',
        prompt: 'Qual métrica mede a cobertura de código pelos testes automatizados?',
        options: [
          'Code Coverage / Cobertura de Código',
          'Latency / Latência',
          'Throughput / Vazão'
        ],
        correctAnswers: [], // ERRO: Sem gabarito!
        points: 10,
        explanation: '',
        status: 'error',
        statusDetail: 'Questão sem gabarito',
        isExpanded: true,
        isExcluded: false
      },
      {
        id: 'q7',
        num: 7,
        type: 'multiple_choice',
        prompt: 'Quais destas linguagens possuem suporte nativo à tipagem estática?',
        options: [
          'TypeScript',
          'Python',
          'Java'
        ],
        correctAnswers: [0, 2, 5], // ERRO: Opção índice 5 não existe no arquivo de perguntas!
        points: 15,
        explanation: 'Gabarito indicou alternativa F inexistente.',
        status: 'error',
        statusDetail: 'Resposta não localizada no gabarito',
        isExpanded: true,
        isExcluded: false
      }
    ];
  }

  // --- Validação Dinâmica de Questões ---
  function validateQuestion(q) {
    if (q.isExcluded) {
      q.status = 'excluded';
      q.statusDetail = 'Excluída da importação';
      return;
    }

    if (!q.prompt || !q.prompt.trim()) {
      q.status = 'error';
      q.statusDetail = 'Campo obrigatório ausente (Enunciado vazio)';
      return;
    }

    if (q.type === 'single_choice' || q.type === 'multiple_choice') {
      if (!q.options || q.options.length < 2) {
        q.status = 'error';
        q.statusDetail = 'A questão precisa ter no mínimo 2 alternativas';
        return;
      }

      // Filtra corretas dentro do limite válido
      const validCorrect = q.correctAnswers.filter(idx => typeof idx === 'number' && idx >= 0 && idx < q.options.length);

      if (validCorrect.length === 0) {
        q.status = 'error';
        q.statusDetail = 'Questão sem gabarito (nenhuma alternativa selecionada)';
        return;
      }

      if (q.type === 'single_choice' && validCorrect.length > 1) {
        q.status = 'warning';
        q.statusDetail = 'Revisão recomendada (várias corretas em escolha única)';
        return;
      }

      // Se passou nas verificações, está pronta!
      q.status = 'ready';
      q.statusDetail = 'Pronta para importar';
      return;
    }

    if (q.type === 'true_false' || q.type === 'binary_choice') {
      if (q.correctAnswers.length === 0) {
        q.status = 'error';
        q.statusDetail = 'Selecione a opção correta';
        return;
      }
      q.status = 'ready';
      q.statusDetail = 'Pronta para importar';
      return;
    }

    if (q.type === 'short_answer' || q.type === 'long_answer' || q.type === 'essay') {
      q.status = 'warning';
      q.statusDetail = 'Revisão recomendada (questão dissertativa/curta)';
      return;
    }

    q.status = 'ready';
    q.statusDetail = 'Pronta para importar';
  }

  function validateAllQuestions() {
    state.questions.forEach(validateQuestion);
  }

  // --- Elementos do DOM ---
  let overlay, modal;

  // --- Inicialização e Injeção do HTML do Modal ---
  function initPrototypeModal() {
    if (document.getElementById('qimp-modal-backdrop')) return;

    const modalHTML = `
      <div class="qimp-modal-backdrop" id="qimp-modal-backdrop" hidden>
        <div class="qimp-modal" role="dialog" aria-modal="true" aria-labelledby="qimp-title">
          <!-- Cabeçalho -->
          <header class="qimp-header">
            <div class="qimp-header-title-group">
              <p class="eyebrow">ASSISTENTE DE IMPORTAÇÃO</p>
              <h2 id="qimp-title">
                <span>Importar questões</span>
              </h2>
              <p id="qimp-subtitle">Selecione o formato dos arquivos e revise as questões antes de incluir no teste.</p>
            </div>
            <div class="qimp-header-actions">
              <button class="qimp-btn-help" id="qimp-btn-help" type="button" title="Ajuda sobre o formato de arquivos">?</button>
              <button class="qimp-btn-close" id="qimp-btn-close" type="button" aria-label="Fechar">×</button>
            </div>
          </header>

          <!-- Barra de Etapas -->
          <div class="qimp-stepper-bar">
            <div class="qimp-step-item active" id="qimp-step-1-indicator">
              <span class="qimp-step-num">1</span>
              <span>Escolha dos Arquivos</span>
            </div>
            <div class="qimp-step-divider" id="qimp-divider-1"></div>
            <div class="qimp-step-item" id="qimp-step-2-indicator">
              <span class="qimp-step-num">2</span>
              <span>Pré-visualização Editável</span>
            </div>
            <div class="qimp-step-divider" id="qimp-divider-2"></div>
            <div class="qimp-step-item" id="qimp-step-3-indicator">
              <span class="qimp-step-num">3</span>
              <span>Confirmação</span>
            </div>
          </div>

          <!-- Corpo do Modal -->
          <div class="qimp-body" id="qimp-body">
            <!-- ETAPA 1 -->
            <div id="qimp-step-1-content">
              <h3 class="qimp-mode-title">Como estão organizados os arquivos?</h3>
              <div class="qimp-mode-grid">
                <div class="qimp-mode-card selected" id="qimp-mode-single" data-mode="single">
                  <input type="radio" name="qimpMode" class="qimp-mode-radio" checked>
                  <div class="qimp-mode-info">
                    <strong>Um único arquivo</strong>
                    <span>As perguntas, alternativas, respostas corretas e imagens estão reunidas no mesmo arquivo (.xlsx, .gift ou .txt).</span>
                  </div>
                </div>

                <div class="qimp-mode-card" id="qimp-mode-two" data-mode="two_files">
                  <input type="radio" name="qimpMode" class="qimp-mode-radio">
                  <div class="qimp-mode-info">
                    <strong>Dois arquivos separados</strong>
                    <span>Um arquivo contém as perguntas com alternativas e outro arquivo separado contém o gabarito de respostas.</span>
                  </div>
                </div>
              </div>

              <!-- Área de Upload Modo Único -->
              <div id="qimp-single-upload-area" class="qimp-dropzone-group">
                <div>
                  <label class="qimp-field-label">Arquivo da prova (Questões + Gabarito)</label>
                  <span class="qimp-field-desc">Selecione o arquivo contendo todas as informações da avaliação.</span>
                </div>
                <div class="qimp-dropzone" id="qimp-dropzone-single">
                  <span class="qimp-dropzone-icon">📁</span>
                  <div class="qimp-dropzone-text">
                    Arraste e solte o arquivo aqui ou <span>clique para navegar</span>
                  </div>
                  <div class="qimp-dropzone-hint">Formatos aceitos: .xlsx, .gift, .txt</div>
                  <input type="file" id="qimp-file-single" accept=".xlsx,.gift,.txt" hidden>
                </div>
                <div id="qimp-single-file-card" hidden></div>
              </div>

              <!-- Área de Upload Modo Dois Arquivos -->
              <div id="qimp-two-upload-area" class="qimp-dropzone-group" hidden>
                <div>
                  <label class="qimp-field-label">Campo 1: Arquivo de perguntas</label>
                  <span class="qimp-field-desc">Deve conter os enunciados, alternativas e opções das questões.</span>
                  <div class="qimp-dropzone" id="qimp-dropzone-questions">
                    <span class="qimp-dropzone-icon">📝</span>
                    <div class="qimp-dropzone-text">Arraste ou <span>selecione o arquivo de perguntas</span></div>
                    <div class="qimp-dropzone-hint">.xlsx, .gift, .txt</div>
                    <input type="file" id="qimp-file-questions" accept=".xlsx,.gift,.txt" hidden>
                  </div>
                  <div id="qimp-questions-file-card" hidden></div>
                </div>

                <div>
                  <label class="qimp-field-label">Campo 2: Arquivo de respostas ou gabarito</label>
                  <span class="qimp-field-desc">Deve identificar todas as respostas corretas de cada questão (ex: Questão 1: A, C, E).</span>
                  <div class="qimp-dropzone" id="qimp-dropzone-answers">
                    <span class="qimp-dropzone-icon">🔑</span>
                    <div class="qimp-dropzone-text">Arraste ou <span>selecione o arquivo de gabarito</span></div>
                    <div class="qimp-dropzone-hint">.docx, .xlsx, .csv, .txt</div>
                    <input type="file" id="qimp-file-answers" accept=".docx,.xlsx,.csv,.txt" hidden>
                  </div>
                  <div id="qimp-answers-file-card" hidden></div>
                </div>
              </div>
            </div>

            <!-- ETAPA 2 (Pré-Visualização Editável) -->
            <div id="qimp-step-2-content" hidden>
              <div class="qimp-summary-bar">
                <div class="qimp-summary-stats">
                  <span class="qimp-stat-pill total">Total: <b id="qimp-count-total">0</b></span>
                  <span class="qimp-stat-pill excluded">Excluídas: <b id="qimp-count-excluded">0</b></span>
                </div>
              </div>

              <!-- Lista Dinâmica de Cartões -->
              <div class="qimp-questions-list" id="qimp-questions-list"></div>
            </div>
          </div>

          <!-- Rodapé Fixo -->
          <footer class="qimp-footer">
            <div class="qimp-footer-left">
              <button class="button secondary" id="qimp-btn-cancel" type="button">Cancelar</button>
              <button class="button secondary" id="qimp-btn-back-step1" type="button" hidden>← Voltar para arquivos</button>
            </div>
            <div class="qimp-footer-right">
              <button class="button primary" id="qimp-btn-analyze" type="button">Analisar arquivos →</button>
              <button class="button primary" id="qimp-btn-confirm-import" type="button" hidden>Importar questões para o teste</button>
            </div>
          </footer>
        </div>
      </div>

      <!-- Modal de Ajuda Contextual -->
      <div class="qimp-help-overlay" id="qimp-help-overlay" hidden>
        <div class="qimp-help-card">
          <header class="qimp-help-header">
            <h3>Guia de Formatação e Exemplos de Gabarito</h3>
            <button class="qimp-btn-close" id="qimp-btn-close-help" type="button">×</button>
          </header>
          <div class="qimp-help-body">
            <div class="qimp-help-section">
              <h4>1. Escolha Única e Múltipla Escolha com Várias Respostas Corretas</h4>
              <p>O arquivo de gabarito ou arquivo único aceita a identificação de todas as alternativas corretas por questão:</p>
              <div class="qimp-code-box">Exemplo de Gabarito:
Questão 1: A, C, E
Questão 2: B
Questão 3: A e D</div>
            </div>

            <div class="qimp-help-section">
              <h4>2. Termos Personalizados (Caixa Branca / Caixa Preta)</h4>
              <p>Para opções binárias que não sejam apenas Verdadeiro/Falso, você pode indicar o termo exato no gabarito:</p>
              <div class="qimp-code-box">Questão 3: Caixa preta
Questão 4: Verdadeiro</div>
            </div>

            <div class="qimp-help-section">
              <h4>3. Imagens, gráficos e Formato GIFT</h4>
              <div class="qimp-code-box">Exemplo GIFT:
::Questão 5:: Qual é a capital do Brasil? {=Brasília =Brasilia}
::Questão 6:: Observe o gráfico:&lt;br&gt;&lt;img src="https://exemplo.com/grafico.png" alt="Gráfico"&gt; Qual alternativa está correta? {=A ~B}</div>
              <p>No Excel, use as colunas <b>Imagem</b> e <b>Texto alternativo</b>. Também é possível anexar imagem manualmente ao editar a questão.</p>
            </div>

            <div class="qimp-help-section">
              <h4>4. Recomendações Importantes</h4>
              <ul>
                <li>A numeração da prova e do gabarito deve coincidir (ex: Questão 1, 2, 3...).</li>
                <li>Todas as alternativas devem estar listadas no arquivo de perguntas.</li>
                <li>Nenhuma questão será enviada ao banco de dados sem a sua pré-visualização e confirmação prévia.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de Confirmação Final (Etapa 3) -->
      <div class="qimp-help-overlay" id="qimp-confirm-overlay" hidden>
        <div class="qimp-confirm-card">
          <div class="qimp-confirm-icon">✓</div>
          <h3>Confirmar Importação para o Teste</h3>
          <p>Deseja importar estas questões revisadas para a avaliação atual?</p>

          <div class="qimp-confirm-summary">
            <strong>Resumo da Importação:</strong>
            <ul id="qimp-confirm-summary-list">
              <li><b>7 questões</b> prontas para inserção.</li>
              <li><b>100 pontos</b> no valor total acumulado.</li>
              <li>Modo: <b>Substituir questões atuais</b>.</li>
            </ul>
          </div>

          <div class="qimp-confirm-notice">
            ℹ️ As questões revisadas serão adicionadas ao construtor de testes.
          </div>

          <div class="qimp-confirm-actions">
            <button class="button secondary" id="qimp-btn-confirm-back" type="button">Voltar e revisar</button>
            <button class="button primary" id="qimp-btn-confirm-execute" type="button">Confirmar importação</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    overlay = document.getElementById('qimp-modal-backdrop');
    modal = overlay.querySelector('.qimp-modal');

    bindEvents();
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Abrir Modal pelo botão principal de importação
    ['import-questions', 'btn-open-import-assistant'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', openModal);
    });

    document.querySelectorAll('[data-open-qimp]').forEach(btn => btn.addEventListener('click', openModal));

    // Fechar Modal
    document.getElementById('qimp-btn-close').addEventListener('click', closeModal);
    document.getElementById('qimp-btn-cancel').addEventListener('click', closeModal);

    // Seleção de Modo (1 arquivo vs 2 arquivos)
    document.getElementById('qimp-mode-single').addEventListener('click', () => setImportMode('single'));
    document.getElementById('qimp-mode-two').addEventListener('click', () => setImportMode('two_files'));

    // Fechar ao clicar fora (backdrop)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Tecla ESC fecha
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) {
        closeHelpModal();
        closeConfirmModal();
        closeModal();
      }
    });

    // File Inputs & Dropzones
    setupDropzone('qimp-dropzone-single', 'qimp-file-single', (file) => handleFileSelected('singleFile', file));
    setupDropzone('qimp-dropzone-questions', 'qimp-file-questions', (file) => handleFileSelected('questionFile', file));
    setupDropzone('qimp-dropzone-answers', 'qimp-file-answers', (file) => handleFileSelected('answerKeyFile', file));

    // Botão Analisar -> envia o arquivo ao backend real e avança para Etapa 2
    document.getElementById('qimp-btn-analyze').addEventListener('click', analyzeSelectedFile);

    // Botão Voltar para Etapa 1
    document.getElementById('qimp-btn-back-step1').addEventListener('click', goToStep1);

    // Botão Confirmar Importação (Abre Modal Etapa 3)
    document.getElementById('qimp-btn-confirm-import').addEventListener('click', openConfirmModal);

    // Ações dos cartões de revisão
    document.getElementById('qimp-questions-list').addEventListener('click', handleQuestionCardClick);

    // Modal de Ajuda
    document.getElementById('qimp-btn-help').addEventListener('click', openHelpModal);
    document.getElementById('qimp-btn-close-help').addEventListener('click', closeHelpModal);

    // Modal de Confirmação (Etapa 3)
    document.getElementById('qimp-btn-confirm-back').addEventListener('click', closeConfirmModal);
    document.getElementById('qimp-btn-confirm-execute').addEventListener('click', executeSimulatedImport);
  }

  // --- Handlers de Dropzone e Seleção de Arquivo ---
  function setupDropzone(zoneId, inputId, onSelect) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onSelect(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener('change', () => {
      if (input.files && input.files[0]) {
        onSelect(input.files[0]);
      }
    });
  }

  function handleFileSelected(fileKey, file) {
    const extension = getFileExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      showInlineImportError('Use um arquivo Excel (.xlsx) ou GIFT (.gift/.txt).');
      clearFileInput(fileKey);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showInlineImportError('O arquivo deve ter no máximo 5 MB.');
      clearFileInput(fileKey);
      return;
    }
    state.files[fileKey] = file;
    state.questions = [];
    updateFileCardsUI();
    validateStep1();
  }

  function getFileExtension(fileName) {
    return String(fileName || '').toLowerCase().split('.').pop();
  }

  function inputIdForFileKey(fileKey) {
    return {
      singleFile: 'qimp-file-single',
      questionFile: 'qimp-file-questions',
      answerKeyFile: 'qimp-file-answers'
    }[fileKey];
  }

  function clearFileInput(fileKey) {
    const inputId = inputIdForFileKey(fileKey);
    const input = inputId ? document.getElementById(inputId) : null;
    if (input) input.value = '';
  }

  function selectedQuestionFile() {
    return state.importMode === 'single' ? state.files.singleFile : state.files.questionFile;
  }

  function showInlineImportError(message) {
    if (typeof window.toast === 'function') {
      window.toast(message, 'error');
      return;
    }
    alert(message);
  }

  function updateFileCardsUI() {
    // Single file
    const singleCard = document.getElementById('qimp-single-file-card');
    const singleDropzone = document.getElementById('qimp-dropzone-single');
    if (state.files.singleFile) {
      singleDropzone.hidden = true;
      singleCard.hidden = false;
      singleCard.innerHTML = renderFileCardHTML('Arquivo da prova', state.files.singleFile.name, 'singleFile');
    } else {
      singleDropzone.hidden = false;
      singleCard.hidden = true;
    }

    // Two files - Questions
    const qCard = document.getElementById('qimp-questions-file-card');
    const qDropzone = document.getElementById('qimp-dropzone-questions');
    if (state.files.questionFile) {
      qDropzone.hidden = true;
      qCard.hidden = false;
      qCard.innerHTML = renderFileCardHTML('Perguntas', state.files.questionFile.name, 'questionFile');
    } else {
      qDropzone.hidden = false;
      qCard.hidden = true;
    }

    // Two files - Answers
    const aCard = document.getElementById('qimp-answers-file-card');
    const aDropzone = document.getElementById('qimp-dropzone-answers');
    if (state.files.answerKeyFile) {
      aDropzone.hidden = true;
      aCard.hidden = false;
      aCard.innerHTML = renderFileCardHTML('Gabarito', state.files.answerKeyFile.name, 'answerKeyFile');
    } else {
      aDropzone.hidden = false;
      aCard.hidden = true;
    }
  }

  function renderFileCardHTML(label, fileName, fileKey) {
    return `
      <div class="qimp-file-card">
        <div class="qimp-file-info">
          <span class="qimp-file-icon">📄</span>
          <div class="qimp-file-details">
            <strong>${escapeHTML(fileName)}</strong>
            <small>${label} selecionado com sucesso</small>
          </div>
        </div>
        <div class="qimp-file-actions">
          <button class="qimp-file-btn danger" type="button" onclick="window.QImpProto.removeFile('${fileKey}')">Excluir arquivo</button>
        </div>
      </div>
    `;
  }

  window.QImpProto = {
    removeFile: function (fileKey) {
      state.files[fileKey] = null;
      state.questions = [];
      clearFileInput(fileKey);
      updateFileCardsUI();
      validateStep1();
    }
  };

  function setImportMode(mode) {
    state.importMode = mode;
    const cardSingle = document.getElementById('qimp-mode-single');
    const cardTwo = document.getElementById('qimp-mode-two');
    const areaSingle = document.getElementById('qimp-single-upload-area');
    const areaTwo = document.getElementById('qimp-two-upload-area');

    if (mode === 'single') {
      cardSingle.classList.add('selected');
      cardSingle.querySelector('input').checked = true;
      cardTwo.classList.remove('selected');
      areaSingle.hidden = false;
      areaTwo.hidden = true;
    } else {
      cardTwo.classList.add('selected');
      cardTwo.querySelector('input').checked = true;
      cardSingle.classList.remove('selected');
      areaSingle.hidden = true;
      areaTwo.hidden = false;
    }
    validateStep1();
  }

  function validateStep1() {
    const btnAnalyze = document.getElementById('qimp-btn-analyze');
    let valid = false;

    if (state.importMode === 'single') {
      valid = Boolean(state.files.singleFile);
    } else {
      valid = Boolean(state.files.questionFile);
    }

    btnAnalyze.disabled = !valid;
  }

  // --- Navegação entre Etapas ---
  function openModal() {
    initPrototypeModal();
    state.step = 1;
    goToStep1();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (overlay) overlay.hidden = true;
    document.body.style.overflow = '';
  }

  function goToStep1() {
    state.step = 1;
    document.getElementById('qimp-step-1-content').hidden = false;
    document.getElementById('qimp-step-2-content').hidden = true;

    // Stepper UI
    document.getElementById('qimp-step-1-indicator').className = 'qimp-step-item active';
    document.getElementById('qimp-step-2-indicator').className = 'qimp-step-item';
    document.getElementById('qimp-step-3-indicator').className = 'qimp-step-item';
    document.getElementById('qimp-divider-1').className = 'qimp-step-divider';
    document.getElementById('qimp-divider-2').className = 'qimp-step-divider';

    // Footer buttons
    document.getElementById('qimp-btn-back-step1').hidden = true;
    document.getElementById('qimp-btn-confirm-import').hidden = true;
    document.getElementById('qimp-btn-analyze').hidden = false;
  }

  async function analyzeSelectedFile() {
    const btnAnalyze = document.getElementById('qimp-btn-analyze');
    const file = selectedQuestionFile();
    if (!file) {
      showInlineImportError('Selecione o arquivo antes de analisar.');
      return;
    }

    btnAnalyze.disabled = true;
    btnAnalyze.textContent = 'Analisando arquivo...';
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/company/question-imports', {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCsrfToken() },
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        const details = Array.isArray(data.errors) && data.errors.length ? `\n${data.errors.join('\n')}` : '';
        throw new Error(`${data.message || 'Não foi possível analisar o arquivo.'}${details}`);
      }
      const importedQuestions = Array.isArray(data.questions) ? data.questions : [];
      state.questions = importedQuestions.map(importedQuestionToPreview);
      if (!state.questions.length) {
        throw new Error('Nenhuma questão foi encontrada no arquivo.');
      }
      distributePointsIfNeeded();
      goToStep2();
    } catch (error) {
      showInlineImportError(error.message || 'Falha ao analisar o arquivo.');
    } finally {
      btnAnalyze.disabled = false;
      btnAnalyze.textContent = 'Analisar arquivos →';
    }
  }

  function importedQuestionToPreview(question, index) {
    const options = Array.isArray(question.options) ? question.options.map(opt => String(opt || '').trim()).filter(Boolean) : [];
    const rawCorrect = Array.isArray(question.correctAnswers)
      ? question.correctAnswers
      : (question.correctAnswer ? [question.correctAnswer] : []);
    const correctAnswers = rawCorrect
      .map(answer => {
        if (typeof answer === 'number') return answer;
        const normalized = normalizeText(answer);
        return options.findIndex(option => normalizeText(option) === normalized);
      })
      .filter(indexValue => Number.isInteger(indexValue) && indexValue >= 0);
    const type = question.type || inferTypeFromOptions(options, correctAnswers);

    return {
      id: question.id || `qimp-${Date.now()}-${index}`,
      num: index + 1,
      type,
      prompt: question.prompt || question.title || 'Questão sem enunciado',
      imageData: question.imageData || '',
      imageUrl: question.imageUrl || '',
      imageName: question.imageName || '',
      imageAlt: question.imageAlt || '',
      options,
      correctAnswers: correctAnswers.length ? correctAnswers : fallbackCorrectAnswers(question, options, type),
      points: Number(question.points) || 0,
      explanation: question.explanation || '',
      status: 'ready',
      statusDetail: 'Pronta para importar',
      isExpanded: index === 0,
      isExcluded: false
    };
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function inferTypeFromOptions(options, correctAnswers) {
    if (options.length === 2 && options.every(opt => ['verdadeiro', 'falso'].includes(normalizeText(opt)))) return 'true_false';
    if (correctAnswers.length > 1) return 'multiple_choice';
    return options.length ? 'single_choice' : 'essay';
  }

  function fallbackCorrectAnswers(question, options, type) {
    if (!options.length) return question.correctAnswer ? [String(question.correctAnswer)] : [];
    if (type === 'true_false' && question.correctAnswer) {
      const expected = normalizeText(question.correctAnswer);
      const indexValue = options.findIndex(option => normalizeText(option) === expected);
      return indexValue >= 0 ? [indexValue] : [];
    }
    return [];
  }

  function distributePointsIfNeeded() {
    const validQuestions = state.questions.filter(q => !q.isExcluded);
    if (!validQuestions.length) return;
    const allSameDefault = validQuestions.every(q => Number(q.points) === 10 || Number(q.points) === 0);
    if (!allSameDefault) return;
    const basePoints = Math.round((100 / validQuestions.length) * 100) / 100;
    validQuestions.forEach(q => { q.points = basePoints; });
  }

  function goToStep2() {
    state.step = 2;
    document.getElementById('qimp-step-1-content').hidden = true;
    document.getElementById('qimp-step-2-content').hidden = false;

    // Stepper UI
    document.getElementById('qimp-step-1-indicator').className = 'qimp-step-item completed';
    document.getElementById('qimp-step-2-indicator').className = 'qimp-step-item active';
    document.getElementById('qimp-step-3-indicator').className = 'qimp-step-item';
    document.getElementById('qimp-divider-1').className = 'qimp-step-divider completed';

    // Footer buttons
    document.getElementById('qimp-btn-analyze').hidden = true;
    document.getElementById('qimp-btn-back-step1').hidden = false;
    document.getElementById('qimp-btn-confirm-import').hidden = false;

    validateAllQuestions();
    renderQuestionsList();
    updateSummaryStats();
  }

  // --- Renderização dos Cartões de Questão na Etapa 2 ---
  function renderQuestionsList() {
    const container = document.getElementById('qimp-questions-list');
    container.innerHTML = '';

    if (state.questions.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--muted, #68758a);">
          Nenhuma questão encontrada no arquivo importado.
        </div>
      `;
      return;
    }

    state.questions.forEach((q, index) => {
      const questionId = escapeAttribute(q.id);
      const card = document.createElement('div');
      card.className = `qimp-qcard status-${q.status} ${q.isExcluded ? 'is-excluded' : ''}`;
      card.dataset.id = q.id;

      card.innerHTML = `
        <!-- Cabeçalho do Cartão -->
        <div class="qimp-qcard-header" data-qimp-action="toggle" data-qimp-id="${questionId}">
          <div class="qimp-qcard-header-left">
            <button class="qimp-qcard-edit-toggle" type="button" data-qimp-action="toggle" data-qimp-id="${questionId}">✎ Editar</button>
            <span class="qimp-qcard-num">Questão ${q.num}</span>
            <span class="qimp-qcard-preview-text">${escapeHTML(q.prompt)}</span>
          </div>
          <div class="qimp-qcard-header-right">
            <button class="qimp-qcard-btn-action" type="button" data-qimp-action="duplicate" data-qimp-id="${questionId}">📋 Duplicar</button>
            <button class="qimp-qcard-btn-action ${q.isExcluded ? '' : 'danger'}" type="button" data-qimp-action="exclude" data-qimp-id="${questionId}">
              ${q.isExcluded ? 'Restaurar' : '🗑 Excluir'}
            </button>
            <span style="font-size: 14px; color: #94a3b8;">${q.isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>

        <!-- Corpo do Cartão (Editável) -->
        <div class="qimp-qcard-body" ${q.isExpanded ? '' : 'hidden'}>
          ${q.status === 'error' ? `
            <div class="qimp-card-alert error">
              ⚠️ <b>Atenção:</b> ${q.statusDetail}. Marque ou corrija as opções abaixo para solucionar.
            </div>
          ` : q.status === 'warning' ? `
            <div class="qimp-card-alert warning">
              💡 <b>Aviso:</b> ${q.statusDetail}. Verifique se a opção identificada atende ao formato desejado.
            </div>
          ` : ''}

          <div class="qimp-qcard-row">
            <div class="qimp-field-group">
              <label>Enunciado da questão</label>
              <textarea class="qimp-textarea" onchange="window.QImpProto.updatePrompt('${q.id}', this.value)">${escapeHTML(q.prompt)}</textarea>
              ${q.imageData || q.imageUrl ? `
                <figure class="qimp-question-image-preview">
                  <img src="${escapeAttribute(q.imageData || q.imageUrl)}" alt="${escapeAttribute(q.imageAlt || q.imageName || 'Imagem da questão')}">
                </figure>
              ` : ''}
            </div>

            <div class="qimp-field-group">
              <label>Tipo da questão (Backend)</label>
              <select class="qimp-select" onchange="window.QImpProto.updateType('${q.id}', this.value)">
                ${BACKEND_QUESTION_TYPES.map(t => `<option value="${t.value}" ${t.value === q.type ? 'selected' : ''}>${t.label}</option>`).join('')}
              </select>

              <label style="margin-top: 10px;">Pontuação (pontos)</label>
              <input type="number" class="qimp-input" min="0" max="100" step="0.01" value="${q.points}" onchange="window.QImpProto.updatePoints('${q.id}', this.value)">
            </div>
          </div>

          <!-- Seção de Alternativas (para escolha única, múltipla escolha, verdadeiro/falso ou binária) -->
          ${['single_choice', 'multiple_choice', 'true_false', 'binary_choice'].includes(q.type) ? `
            <div class="qimp-options-block">
              <div class="qimp-options-header">
                <label>Alternativas e Respostas Corretas (${q.type === 'multiple_choice' ? 'Múltiplas respostas permitidas' : 'Uma única resposta'})</label>
                <button class="qimp-btn-add-opt" type="button" onclick="window.QImpProto.addOption('${q.id}')">＋ Adicionar alternativa</button>
              </div>

              ${q.options.map((optText, optIdx) => {
                const isChecked = q.correctAnswers.includes(optIdx);
                const inputType = q.type === 'multiple_choice' ? 'checkbox' : 'radio';
                const labelLetter = String.fromCharCode(65 + optIdx); // A, B, C...

                return `
                  <div class="qimp-option-item">
                    <input type="${inputType}" name="correct-${q.id}" class="qimp-option-check" ${isChecked ? 'checked' : ''} onchange="window.QImpProto.toggleOptionCorrect('${q.id}', ${optIdx})">
                    <strong style="font-size: 12px; color: #475569;">${labelLetter})</strong>
                    <input type="text" class="qimp-option-input" value="${escapeHTML(optText)}" onchange="window.QImpProto.updateOptionText('${q.id}', ${optIdx}, this.value)">
                    <button class="qimp-option-remove" type="button" title="Remover opção" onclick="window.QImpProto.removeOption('${q.id}', ${optIdx})">×</button>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          <!-- Explicação / Gabarito Comentado -->
          <div class="qimp-field-group">
            <label>Explicação / Comentário do Gabarito</label>
            <input type="text" class="qimp-input" value="${escapeHTML(q.explanation || '')}" placeholder="Opcional: insira a explicação para o candidato" onchange="window.QImpProto.updateExplanation('${q.id}', this.value)">
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  function handleQuestionCardClick(event) {
    const actionElement = event.target.closest('[data-qimp-action]');
    if (!actionElement) return;

    const id = actionElement.dataset.qimpId;
    if (!id) return;

    const action = actionElement.dataset.qimpAction;
    if (action === 'toggle') {
      window.QImpProto.toggleExpand(id);
      return;
    }
    if (action === 'duplicate') {
      window.QImpProto.duplicateQuestion(id);
      return;
    }
    if (action === 'exclude') {
      window.QImpProto.toggleExclude(id);
    }
  }

  // --- Handlers Interativos dos Cartões ---
  window.QImpProto.toggleExpand = function (id) {
    const q = state.questions.find(item => item.id === id);
    if (q) {
      q.isExpanded = !q.isExpanded;
      renderQuestionsList();
    }
  };

  window.QImpProto.toggleExclude = function (id) {
    const q = state.questions.find(item => item.id === id);
    if (q) {
      q.isExcluded = !q.isExcluded;
      validateQuestion(q);
      renderQuestionsList();
      updateSummaryStats();
    }
  };

  window.QImpProto.duplicateQuestion = function (id) {
    const q = state.questions.find(item => item.id === id);
    if (q) {
      const newQ = JSON.parse(JSON.stringify(q));
      newQ.id = 'q_' + Date.now();
      newQ.num = state.questions.length + 1;
      newQ.prompt += ' (Cópia)';
      state.questions.push(newQ);
      validateQuestion(newQ);
      renderQuestionsList();
      updateSummaryStats();
    }
  };

  window.QImpProto.updatePrompt = function (id, val) {
    const q = state.questions.find(item => item.id === id);
    if (q) {
      q.prompt = val;
      validateQuestion(q);
      renderQuestionsList();
      updateSummaryStats();
    }
  };

  window.QImpProto.updateType = function (id, val) {
    const q = state.questions.find(item => item.id === id);
    if (q) {
      q.type = val;
      validateQuestion(q);
      renderQuestionsList();
      updateSummaryStats();
    }
  };

  window.QImpProto.updatePoints = function (id, val) {
    const q = state.questions.find(item => item.id === id);
    if (q) {
      q.points = parseFloat(String(val).replace(',', '.')) || 0;
      updateSummaryStats();
    }
  };

  window.QImpProto.updateExplanation = function (id, val) {
    const q = state.questions.find(item => item.id === id);
    if (q) {
      q.explanation = val;
    }
  };

  window.QImpProto.toggleOptionCorrect = function (id, optIdx) {
    const q = state.questions.find(item => item.id === id);
    if (q) {
      if (q.type === 'multiple_choice') {
        const idxInList = q.correctAnswers.indexOf(optIdx);
        if (idxInList >= 0) {
          q.correctAnswers.splice(idxInList, 1);
        } else {
          q.correctAnswers.push(optIdx);
        }
      } else {
        q.correctAnswers = [optIdx];
      }
      validateQuestion(q);
      renderQuestionsList();
      updateSummaryStats();
    }
  };

  window.QImpProto.updateOptionText = function (id, optIdx, val) {
    const q = state.questions.find(item => item.id === id);
    if (q && q.options[optIdx] !== undefined) {
      q.options[optIdx] = val;
      validateQuestion(q);
      updateSummaryStats();
    }
  };

  window.QImpProto.addOption = function (id) {
    const q = state.questions.find(item => item.id === id);
    if (q) {
      const nextLetter = String.fromCharCode(65 + q.options.length);
      q.options.push(`Nova Alternativa ${nextLetter}`);
      validateQuestion(q);
      renderQuestionsList();
      updateSummaryStats();
    }
  };

  window.QImpProto.removeOption = function (id, optIdx) {
    const q = state.questions.find(item => item.id === id);
    if (q && q.options.length > 2) {
      q.options.splice(optIdx, 1);
      q.correctAnswers = q.correctAnswers
        .filter(i => i !== optIdx)
        .map(i => (i > optIdx ? i - 1 : i));
      validateQuestion(q);
      renderQuestionsList();
      updateSummaryStats();
    }
  };

  // --- Atualização de Estatísticas no Topo ---
  function updateSummaryStats() {
    const total = state.questions.length;
    const ready = state.questions.filter(q => q.status === 'ready' && !q.isExcluded).length;
    const warning = state.questions.filter(q => q.status === 'warning' && !q.isExcluded).length;
    const error = state.questions.filter(q => q.status === 'error' && !q.isExcluded).length;
    const excluded = state.questions.filter(q => q.isExcluded).length;

    setText('qimp-count-total', total);
    setText('qimp-count-ready', ready);
    setText('qimp-count-warning', warning);
    setText('qimp-count-error', error);
    setText('qimp-count-excluded', excluded);

    const btnConfirm = document.getElementById('qimp-btn-confirm-import');
    if (btnConfirm) {
      if (error > 0) {
        btnConfirm.disabled = true;
        btnConfirm.title = `Resolva as ${error} questão(ões) com erro antes de importar.`;
      } else {
        btnConfirm.disabled = false;
        btnConfirm.title = '';
      }
    }
  }

  // --- Modais de Ajuda e Confirmação ---
  function openHelpModal() {
    document.getElementById('qimp-help-overlay').hidden = false;
  }

  function closeHelpModal() {
    document.getElementById('qimp-help-overlay').hidden = true;
  }

  function openConfirmModal() {
    const readyCount = state.questions.filter(q => (q.status === 'ready' || q.status === 'warning') && !q.isExcluded).length;
    const totalScore = state.questions
      .filter(q => !q.isExcluded)
      .reduce((sum, q) => sum + (q.points || 0), 0);

    const modeLabel = document.getElementById('question-import-mode')?.value === 'append' ? 'Adicionar às questões atuais' : 'Substituir questões atuais';

    const listHTML = `
      <li><b>${readyCount} questão(ões)</b> prontas e revisadas para importação.</li>
      <li><b>${totalScore} pontos</b> no valor total da avaliação.</li>
      <li>Modo: <b>${modeLabel}</b>.</li>
    `;

    document.getElementById('qimp-confirm-summary-list').innerHTML = listHTML;
    document.getElementById('qimp-confirm-overlay').hidden = false;
  }

  function closeConfirmModal() {
    document.getElementById('qimp-confirm-overlay').hidden = true;
  }

  function executeSimulatedImport() {
    closeConfirmModal();
    closeModal();

    const activeQuestions = state.questions.filter(q => !q.isExcluded).map(previewQuestionToExamQuestion);
    const mode = document.getElementById('question-import-mode')?.value || 'replace';

    if (typeof window.importQuestionsToExam === 'function') {
      window.importQuestionsToExam(activeQuestions, mode);
    } else if (typeof window.toast === 'function') {
      window.toast(`Sucesso: ${activeQuestions.length} questão(ões) importada(s) com sucesso!`, 'success');
    }
  }

  function previewQuestionToExamQuestion(q) {
    const selectedOptions = Array.isArray(q.correctAnswers)
      ? q.correctAnswers
          .map(answer => typeof answer === 'number' ? q.options?.[answer] : answer)
          .filter(Boolean)
      : [];
    let correctAnswer = '';
    if (['single_choice', 'true_false', 'binary_choice'].includes(q.type)) {
      correctAnswer = selectedOptions[0] || q.options?.[0] || '';
    } else if (q.type === 'multiple_choice') {
      correctAnswer = JSON.stringify(selectedOptions);
    } else {
      correctAnswer = selectedOptions[0] || '';
    }
    return {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      imageData: q.imageData || '',
      imageUrl: q.imageUrl || '',
      imageName: q.imageName || '',
      imageAlt: q.imageAlt || '',
      points: Number(q.points) || 0,
      required: true,
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer,
      correctAnswers: selectedOptions,
      explanation: q.explanation || ''
    };
  }

  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)acert_csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
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

  function escapeAttribute(str) {
    return escapeHTML(str);
  }

  // Inicializa ao carregar o DOM
  document.addEventListener('DOMContentLoaded', () => {
    initPrototypeModal();
  });

})();
