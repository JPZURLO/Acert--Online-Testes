/**
 * Base de Conhecimento da Empresa — Módulo Oficial (Online Teste)
 * Restrito ao painel da empresa para consulta de tutoriais, orientações e guias de uso.
 */

(function () {
  'use strict';

  // --- 1. Banco de Dados Oficial dos 14 Artigos ---
  const KNOWLEDGE_ARTICLES = [
    {
      id: 'como-criar-um-novo-participante',
      title: 'Como criar um novo participante',
      summary: 'Aprenda a cadastrar manualmente um candidato ou aluno no painel da empresa para conceder acesso aos exames.',
      category: 'Participantes',
      audience: 'company',
      readTime: '3 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Este guia ensina passo a passo como cadastrar um participante individual no painel da empresa.',
      toc: [
        { id: 'sec-acesso', title: '1. Acessando a tela de Participantes' },
        { id: 'sec-formulario', title: '2. Preenchendo o formulário de cadastro' },
        { id: 'sec-confirmacao', title: '3. Salvando e enviando as credenciais' }
      ],
      steps: [
        {
          num: 1,
          title: 'Acesse a área de Participantes',
          desc: 'No painel da empresa, clique na opção "Participantes" na barra superior de ações ou no menu para abrir a lista completa.'
        },
        {
          num: 2,
          title: 'Clique no botão "Novo Participante"',
          desc: 'Localize o botão "+ Novo Participante". Um modal centralizado e responsivo será aberto na tela.'
        },
        {
          num: 3,
          title: 'Preencha os dados cadastrais',
          desc: 'Informe Nome Completo, E-mail oficial, CPF/Documento e selecione o exame ao qual o participante terá acesso.'
        },
        {
          num: 4,
          title: 'Confirme o cadastro',
          desc: 'Clique em "Criar Participante". As credenciais de acesso serão geradas e disponibilizadas para o candidato.'
        }
      ],
      alertTip: 'Você também pode importar centenas de participantes de uma só vez utilizando a importação em lote via arquivo CSV.',
      relatedIds: ['como-importar-participantes-por-csv', 'como-configurar-envio-acesso']
    },

    {
      id: 'como-importar-participantes-por-csv',
      title: 'Como importar participantes por CSV',
      summary: 'Cadastre turmas inteiras ou listas de candidatos de forma rápida enviando uma planilha no formato CSV.',
      category: 'Participantes',
      audience: 'company',
      readTime: '4 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Saiba como estruturar sua planilha no formato CSV e importar múltiplos participantes em lote.',
      toc: [
        { id: 'sec-modelo', title: '1. Baixando o modelo CSV' },
        { id: 'sec-envio', title: '2. Envio e validação da lista' }
      ],
      steps: [
        {
          num: 1,
          title: 'Abra a opção "Importar CSV"',
          desc: 'Na tela de Gestão de Participantes, clique em "Importar CSV" para abrir o assistente em lote.'
        },
        {
          num: 2,
          title: 'Preencha a planilha e envie o arquivo',
          desc: 'Abra o modelo no Excel ou Google Sheets, preencha os campos (Nome, E-mail, Documento) e faça o envio do arquivo `.csv`.'
        },
        {
          num: 3,
          title: 'Valide e confirme a importação',
          desc: 'O sistema exibirá a pré-visualização das linhas. Clique em "Validar e Importar" para incluir os participantes.'
        }
      ],
      alertTip: 'Certifique-se de salvar a planilha com a codificação UTF-8 para evitar problemas com acentos.',
      relatedIds: ['como-criar-um-novo-participante', 'como-configurar-envio-acesso']
    },

    {
      id: 'como-salvar-um-exame-como-rascunho',
      title: 'Como salvar um exame como rascunho',
      summary: 'Entenda como o salvamento de rascunhos protege suas alterações antes da publicação final do teste.',
      category: 'Criação de exames',
      audience: 'company',
      readTime: '2 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Evite a perda de dados durante a montagem das suas avaliações salvando rascunhos da edição.',
      toc: [
        { id: 'sec-salvamento', title: '1. Funcionamento do rascunho local' },
        { id: 'sec-recuperacao', title: '2. Salvar rascunho manualmente' }
      ],
      steps: [
        {
          num: 1,
          title: 'Edite o conteúdo do teste',
          desc: 'Qualquer alteração no título, instruções, tempo ou questões atualiza a indicação "Rascunho local" no topo.'
        },
        {
          num: 2,
          title: 'Clique em "Salvar rascunho"',
          desc: 'Utilize o botão "Salvar rascunho" no canto superior direito para persistir a versão atual no banco.'
        }
      ],
      alertTip: 'O exame em rascunho não fica visível para os candidatos até que você clique no botão "Publicar teste".',
      relatedIds: ['como-importar-questoes', 'como-personalizar-aparencia-exame']
    },

    {
      id: 'como-importar-questoes',
      title: 'Como importar questões',
      summary: 'Utilize o assistente de importação em 3 etapas com pré-visualização editável para subir questões por Excel, Word, CSV ou GIFT.',
      category: 'Questões e importação',
      audience: 'company',
      readTime: '5 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Aprenda a utilizar o assistente oficial de importação de questões com revisão prévia editável.',
      toc: [
        { id: 'sec-assistente', title: '1. Abrindo o Assistente de Importação' },
        { id: 'sec-revisao', title: '2. Pré-visualização e edição dos cartões' },
        { id: 'sec-confirmacao-q', title: '3. Inserção no construtor de testes' }
      ],
      steps: [
        {
          num: 1,
          title: 'Clique em "Importar questões"',
          desc: 'No construtor do exame, clique no botão azul "Importar questões" para abrir o assistente em 3 etapas.'
        },
        {
          num: 2,
          title: 'Escolha o modo de importação (Etapa 1)',
          desc: 'Selecione se deseja enviar 1 único arquivo (perguntas + alternativas) ou 2 arquivos separados (perguntas e gabarito).'
        },
        {
          num: 3,
          title: 'Revise as questões na pré-visualização (Etapa 2)',
          desc: 'Corrija enunciados, ajuste alternativas ou marque respostas corretas diretamente nos cartões editáveis.'
        },
        {
          num: 4,
          title: 'Confirme a importação (Etapa 3)',
          desc: 'Clique em "Confirmar importação". As questões revisadas serão injetadas diretamente na lista do seu exame.'
        }
      ],
      alertTip: 'Você pode escolher se a importação vai Substituir a lista atual ou Adicionar às questões existentes.',
      relatedIds: ['como-importar-perguntas-e-gabarito-separados', 'como-configurar-multiplas-respostas-corretas']
    },

    {
      id: 'como-importar-perguntas-e-gabarito-separados',
      title: 'Como importar perguntas e gabarito em arquivos separados',
      summary: 'Saiba como importar um arquivo contendo enunciados e opções e um segundo arquivo contendo as respostas corretas.',
      category: 'Questões e importação',
      audience: 'company',
      readTime: '4 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Ideal para provas extensas onde as respostas corretas estão organizadas em uma folha de gabarito separada.',
      toc: [
        { id: 'sec-dois-arquivos', title: '1. Selecionando a opção de 2 arquivos' },
        { id: 'sec-formato-gabarito', title: '2. Formatação do arquivo de gabarito' }
      ],
      steps: [
        {
          num: 1,
          title: 'Selecione "Dois arquivos separados"',
          desc: 'Na primeira etapa do assistente, escolha o card "Dois arquivos separados".'
        },
        {
          num: 2,
          title: 'Consulte os modelos de gabarito no botão "Modelos"',
          desc: 'Clique no botão "Modelos" para ver exemplos de gabaritos suportados (inclusive com múltiplas respostas corretas por questão).'
        }
      ],
      alertTip: 'O arquivo de gabarito pode conter múltiplas respostas por questão, ex: `Questão 1: A, C, E`.',
      relatedIds: ['como-importar-questoes', 'como-configurar-multiplas-respostas-corretas']
    },

    {
      id: 'como-configurar-multiplas-respostas-corretas',
      title: 'Como configurar múltiplas respostas corretas',
      summary: 'Configure questões de múltipla seleção onde o participante precisa marcar mais de uma alternativa correta.',
      category: 'Questões e importação',
      audience: 'company',
      readTime: '3 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Saiba como definir opções de seleção múltipla (checkboxes) com pontuação integral ou parcial.',
      toc: [
        { id: 'sec-tipo-selecao', title: '1. Alterando o tipo da questão' },
        { id: 'sec-marcando-corretas', title: '2. Marcando as opções corretas' }
      ],
      steps: [
        {
          num: 1,
          title: 'Escolha "Múltipla seleção (várias respostas)"',
          desc: 'No seletor de tipo de questão, escolha "Múltipla seleção". Os seletores mudarão de formato de rádio para checkbox.'
        },
        {
          num: 2,
          title: 'Marque todas as alternativas corretas',
          desc: 'Selecione os checkboxes ao lado de cada opção correta (ex: Alternativas A, C e E).'
        }
      ],
      alertTip: 'Você também pode definir este formato durante a importação via Excel marcando as colunas correspondentes.',
      relatedIds: ['como-importar-questoes', 'conheca-os-tipos-de-questoes-disponiveis']
    },

    {
      id: 'como-anexar-documentos-e-termos',
      title: 'Como anexar documentos e termos',
      summary: 'Adicione regras do exame, termos de aceite com leitura obrigatória ou formulários que exigem assinatura e devolução.',
      category: 'Documentos e termos',
      audience: 'company',
      readTime: '4 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Garanta o cumprimento de exigências normativas e de conformidade anexando termos e documentos ao exame.',
      toc: [
        { id: 'sec-painel-docs', title: '1. Acessando a seção de Documentos' },
        { id: 'sec-regras-aceite', title: '2. Configurando regras e confirmações' }
      ],
      steps: [
        {
          num: 1,
          title: 'Acesse a seção "Documentos, Regras e Termos"',
          desc: 'No Estúdio de Testes, na aba Aplicação, localize o painel de documentos e clique em "+ Anexar Documento / Termo".'
        },
        {
          num: 2,
          title: 'Configure o documento no modal de anexo',
          desc: 'Defina o título, selecione o arquivo PDF/DOCX e marque a regra de exigência (confirmação ou devolução assinada).'
        }
      ],
      alertTip: 'Se marcar "Exigir aceite digital", o participante só poderá iniciar a prova após aceitar o termo.',
      relatedIds: ['como-exigir-assinatura-antes-da-prova', 'como-salvar-um-exame-como-rascunho']
    },

    {
      id: 'como-exigir-assinatura-antes-da-prova',
      title: 'Como exigir assinatura antes da prova',
      summary: 'Exija que o candidato baixe o documento de instrução ou termo, assine e envie a cópia antes de iniciar.',
      category: 'Documentos e termos',
      audience: 'company',
      readTime: '3 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Passo a passo para ativar a exigência de devolução de documento assinado antes da liberação das questões.',
      toc: [
        { id: 'sec-opcao-devolucao', title: '1. Ativando a opção de devolução' },
        { id: 'sec-validacao-empresa', title: '2. Acompanhando o arquivo enviado pelo participante' }
      ],
      steps: [
        {
          num: 1,
          title: 'Ative a regra no modal do documento',
          desc: 'No modal de anexo do documento, selecione a regra "Exigir devolução do documento assinado pelo participante".'
        },
        {
          num: 2,
          title: 'Acompanhamento do envio',
          desc: 'Na área do candidato, os botões de download e upload do termo assinado ficarão bloqueando o início até a conclusão.'
        }
      ],
      alertTip: 'O envio do comprovante assinado fica gravado no histórico individual do participante para auditoria.',
      relatedIds: ['como-anexar-documentos-e-termos', 'como-acompanhar-o-exame-em-tempo-real']
    },

    {
      id: 'como-configurar-envio-acesso',
      title: 'Como configurar o envio do acesso',
      summary: 'Escolha se os convites com login e senha serão enviados automaticamente ao salvar, agendados por horário ou enviados manualmente.',
      category: 'Convites e acessos',
      audience: 'company',
      readTime: '3 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Configure as opções de notificação por e-mail para disponibilizar credenciais de acesso no momento exato.',
      toc: [
        { id: 'sec-formas-envio', title: '1. Formas de envio disponíveis' }
      ],
      steps: [
        {
          num: 1,
          title: 'Selecione a forma de envio do acesso',
          desc: 'Na aba Aplicação do exame, navegue até o painel "Envio do acesso ao candidato" e escolha a opção desejada.'
        }
      ],
      alertTip: 'Se selecionar envio manual, você pode disparar os e-mails quando desejar através da lista de participantes.',
      relatedIds: ['como-criar-um-novo-participante', 'como-acompanhar-o-exame-em-tempo-real']
    },

    {
      id: 'como-acompanhar-o-exame-em-tempo-real',
      title: 'Como acompanhar o exame em tempo real',
      summary: 'Monitore quais participantes iniciaram, quem está em andamento, tempo restante e respostas enviadas ao vivo.',
      category: 'Monitoramento',
      audience: 'company',
      readTime: '4 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Tenha controle total do andamento dos testes com indicadores em tempo real.',
      toc: [
        { id: 'sec-painel-ao-vivo', title: '1. Painel de monitoramento ao vivo' }
      ],
      steps: [
        {
          num: 1,
          title: 'Acesse o Painel de Acompanhamento ao Vivo',
          desc: 'Clique em "Resultados" ou "Monitoramento" para abrir o acompanhamento em tempo real dos participantes em prova.'
        }
      ],
      alertTip: 'Caso um participante perca a conexão, o sistema permite retomar o exame exatamente de onde parou.',
      relatedIds: ['como-visualizar-os-resultados', 'como-configurar-envio-acesso']
    },

    {
      id: 'como-visualizar-os-resultados',
      title: 'Como visualizar os resultados',
      summary: 'Analise notas finais, relatórios por competência, tempo de resposta e notas corrigidas automaticamente.',
      category: 'Resultados',
      audience: 'company',
      readTime: '3 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Saiba como interpretar os resultados consolidados e exportar relatórios de desempenho.',
      toc: [
        { id: 'sec-painel-resultados', title: '1. Visão geral de notas e aprovações' }
      ],
      steps: [
        {
          num: 1,
          title: 'Acesse o Dashboard de Resultados',
          desc: 'Clique no menu "Resultados" para abrir a visão consolidada de notas, percentuais de acerto e aprovações.'
        }
      ],
      alertTip: 'Você pode liberar os resultados de forma automática ou somente após a revisão manual do avaliador.',
      relatedIds: ['como-acompanhar-o-exame-em-tempo-real', 'conheca-os-tipos-de-questoes-disponiveis']
    },

    {
      id: 'como-personalizar-aparencia-exame',
      title: 'Como personalizar a aparência do exame',
      summary: 'Adicione o logotipo da sua empresa, altere as cores da marca e visualize a prévia em tempo real.',
      category: 'Personalização',
      audience: 'company',
      readTime: '3 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Fortaleça a autoridade da sua marca personalizando a tela em que o participante fará a avaliação.',
      toc: [
        { id: 'sec-painel-aparencia', title: '1. Painel de Aparência' }
      ],
      steps: [
        {
          num: 1,
          title: 'Personalize as cores e o logotipo da empresa',
          desc: 'Navegue até a seção 4 (Aparência) para fazer upload da sua marca (PNG/JPG) e escolher a paleta de cores.'
        }
      ],
      alertTip: 'A personalização visual está disponível nos planos Pró e Enterprise da plataforma.',
      relatedIds: ['como-salvar-um-exame-como-rascunho', 'conheca-a-plataforma-online-teste']
    },

    {
      id: 'conheca-os-tipos-de-questoes-disponiveis',
      title: 'Conheça os tipos de questões disponíveis',
      summary: 'Explore todas as modalidades de questões suportadas: resposta única, seleção múltipla, verdadeiro/falso, escolha binária, lacunas e dissertativas.',
      category: 'Conheça a plataforma',
      audience: 'platform',
      readTime: '5 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Conheça os recursos pedagógicos e formatos de avaliação disponíveis na plataforma Online Teste.',
      toc: [
        { id: 'sec-objetivas', title: '1. Questões Objetivas e Seleção' }
      ],
      steps: [
        {
          num: 1,
          title: 'Tipos de Questões no Construtor',
          desc: 'O construtor permite alternar instantaneamente entre escolha única, seleção múltipla, verdadeiro/falso, lacunas e dissertativas.'
        }
      ],
      alertTip: 'Todas as alternativas podem ser embaralhadas automaticamente a cada tentativa.',
      relatedIds: ['como-importar-questoes', 'conheca-a-plataforma-online-teste']
    },

    {
      id: 'conheca-a-plataforma-online-teste',
      title: 'Conheça a plataforma Online Teste',
      summary: 'Visão geral completa da solução em nuvem para criação, aplicação segura, correção automática e gestão corporativa de avaliações.',
      category: 'Conheça a plataforma',
      audience: 'platform',
      readTime: '6 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Descubra como o Online Teste ajuda empresas, instituições de ensino e órgãos certificadores a transformar seu processo de avaliações.',
      toc: [
        { id: 'sec-recursos-chave', title: '1. Visão Geral da Plataforma' }
      ],
      steps: [
        {
          num: 1,
          title: 'Experiência Completa para a Empresa',
          desc: 'Do cadastro de exames ao acompanhamento em tempo real, o sistema oferece um ambiente integrado e seguro.'
        }
      ],
      alertTip: 'Você pode solicitar um teste gratuito ou agendar uma demonstração exclusiva com nossos especialistas.',
      relatedIds: ['conheca-os-tipos-de-questoes-disponiveis', 'como-personalizar-aparencia-exame']
    }
  ];

  // --- Listas e Estado ---
  const CATEGORIES = [
    { name: 'Todas', icon: '🔍' },
    { name: 'Primeiros passos', icon: '🚀' },
    { name: 'Criação de exames', icon: '📝' },
    { name: 'Questões e importação', icon: '⇩' },
    { name: 'Participantes', icon: '♙' },
    { name: 'Documentos e termos', icon: '📄' },
    { name: 'Convites e acessos', icon: '✉' },
    { name: 'Monitoramento', icon: '👁' },
    { name: 'Resultados', icon: '📊' },
    { name: 'Personalização', icon: '🎨' },
    { name: 'Conheça a plataforma', icon: '✨' }
  ];

  let state = {
    searchQuery: '',
    selectedCategory: 'Todas',
    currentArticleId: null
  };

  // --- Elementos do DOM ---
  let elCatalogView = null;
  let elArticleView = null;
  let elSearchInput = null;
  let elSearchClear = null;
  let elCategoryPills = null;
  let elArticlesGrid = null;
  let elNoResults = null;

  document.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    renderCategoryPills();
    bindEvents();
    bindModalControls();
  });

  function cacheDOMElements() {
    elCatalogView = document.getElementById('kb-catalog-view');
    elArticleView = document.getElementById('kb-article-view');
    elSearchInput = document.getElementById('kb-search-input');
    elSearchClear = document.getElementById('kb-search-clear');
    elCategoryPills = document.getElementById('kb-category-pills');
    elArticlesGrid = document.getElementById('kb-articles-grid');
    elNoResults = document.getElementById('kb-no-results');
  }

  function bindEvents() {
    if (elSearchInput) {
      elSearchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        if (elSearchClear) elSearchClear.hidden = !state.searchQuery;
        renderArticlesList();
      });
    }

    if (elSearchClear) {
      elSearchClear.addEventListener('click', () => {
        elSearchInput.value = '';
        state.searchQuery = '';
        elSearchClear.hidden = true;
        renderArticlesList();
      });
    }
  }

  function bindModalControls() {
    // Botão de Ajuda na barra da Empresa
    document.querySelectorAll('.help-button, #btn-open-help-kb, [data-open-kb]').forEach(btn => {
      btn.addEventListener('click', openKBModal);
    });

    const closeBtn = document.getElementById('close-kb-company-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeKBModal);
  }

  function openKBModal() {
    const modal = document.getElementById('kb-company-modal');
    if (modal) {
      modal.hidden = false;
      showCatalog();
    }
  }

  function closeKBModal() {
    const modal = document.getElementById('kb-company-modal');
    if (modal) modal.hidden = true;
  }

  function renderCategoryPills() {
    if (!elCategoryPills) return;
    elCategoryPills.innerHTML = CATEGORIES.map(cat => {
      const isActive = state.selectedCategory === cat.name;
      return `<button class="kb-pill ${isActive ? 'active' : ''}" type="button" data-category="${cat.name}">
        <span>${cat.icon}</span> ${cat.name}
      </button>`;
    }).join('');

    elCategoryPills.querySelectorAll('.kb-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        elCategoryPills.querySelectorAll('.kb-pill').forEach(b => b.classList.remove('active'));
        const target = e.target.closest('.kb-pill');
        target.classList.add('active');
        state.selectedCategory = target.dataset.category;
        renderArticlesList();
      });
    });
  }

  function filterArticles() {
    return KNOWLEDGE_ARTICLES.filter(art => {
      if (state.selectedCategory !== 'Todas' && art.category !== state.selectedCategory) {
        return false;
      }
      if (state.searchQuery) {
        const query = state.searchQuery;
        const inTitle = art.title.toLowerCase().includes(query);
        const inSummary = art.summary.toLowerCase().includes(query);
        const inCategory = art.category.toLowerCase().includes(query);
        return inTitle || inSummary || inCategory;
      }
      return true;
    });
  }

  function renderArticlesList() {
    if (!elArticlesGrid) return;
    const filtered = filterArticles();

    if (filtered.length === 0) {
      elArticlesGrid.innerHTML = '';
      if (elNoResults) elNoResults.hidden = false;
      return;
    }

    if (elNoResults) elNoResults.hidden = true;

    elArticlesGrid.innerHTML = filtered.map(art => {
      return `
        <article class="kb-article-card kb-animated" onclick="window.showKnowledgeArticle('${art.id}')">
          <div class="kb-article-meta-row">
            <span class="kb-badge kb-badge-company">🏢 Para Empresas</span>
            <span class="kb-read-time">${art.readTime}</span>
          </div>
          <h3 class="kb-article-title">${escapeHTML(art.title)}</h3>
          <p class="kb-article-summary">${escapeHTML(art.summary)}</p>
          <span class="kb-article-link">Ver tutorial completo →</span>
        </article>
      `;
    }).join('');
  }

  function showCatalog() {
    if (elCatalogView) elCatalogView.hidden = false;
    if (elArticleView) elArticleView.hidden = true;
    renderArticlesList();
  }

  window.showKnowledgeArticle = function (articleId) {
    const article = KNOWLEDGE_ARTICLES.find(a => a.id === articleId);
    if (!article) return;

    state.currentArticleId = articleId;
    if (elCatalogView) elCatalogView.hidden = true;
    if (elArticleView) elArticleView.hidden = false;

    let tocHTML = '';
    if (article.toc && article.toc.length > 0) {
      tocHTML = `
        <div class="kb-toc-card">
          <div class="kb-toc-title">Sumário do Guia</div>
          <ol class="kb-toc-list">
            ${article.toc.map(item => `<li><a href="#${item.id}">${escapeHTML(item.title)}</a></li>`).join('')}
          </ol>
        </div>
      `;
    }

    let stepsHTML = '';
    if (article.steps && article.steps.length > 0) {
      stepsHTML = article.steps.map(step => `
        <div class="kb-step-card">
          <div class="kb-step-header">
            <span class="kb-step-num">${step.num}</span>
            <h3 class="kb-step-title">${escapeHTML(step.title)}</h3>
          </div>
          <p style="margin: 0;">${escapeHTML(step.desc)}</p>
        </div>
      `).join('');
    }

    elArticleView.innerHTML = `
      <div class="kb-animated">
        <button class="button secondary" type="button" style="margin-bottom: 16px;" onclick="window.backToKnowledgeCatalog()">
          ← Voltar para a lista de artigos
        </button>

        <header class="kb-article-header">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span class="kb-badge kb-badge-company">🏢 Para Empresas</span>
            <span class="kb-read-time">⏱️ ${article.readTime}</span>
            <span class="kb-read-time">📅 Atualizado em ${article.updatedAt}</span>
          </div>
          <h1 style="font-size: 24px; font-weight: 800; margin: 10px 0;">${escapeHTML(article.title)}</h1>
          <p class="kb-article-lead">${escapeHTML(article.lead || article.summary)}</p>
        </header>

        ${tocHTML}

        <div class="kb-article-body">
          <h2 style="font-size: 18px; font-weight: 800; margin: 20px 0 14px;">Passo a Passo Guiado</h2>
          ${stepsHTML}

          ${article.alertTip ? `
            <div class="kb-alert kb-alert-tip">
              <span class="kb-alert-icon">💡</span>
              <div><strong>Dica Útil:</strong> ${escapeHTML(article.alertTip)}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  window.backToKnowledgeCatalog = function () {
    showCatalog();
  };

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
