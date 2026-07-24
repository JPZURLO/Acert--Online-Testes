/**
 * Base de Conhecimento Pública — Módulo Oficial com Prints Reais e Zoom (Online Teste)
 * Suporta busca em tempo real, filtros por categoria/público, leitor de artigos
 * com imagens reais da plataforma, lightbox zoom, compartilhamento e feedback.
 */

(function () {
  'use strict';

  // Base path para as imagens integradas
  const IMG_BASE_PATH = './assets/images/base-conhecimento/';

  // --- 1. Banco de Dados Oficial dos 14 Artigos com Imagens Reais ---
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
          title: 'Acesse o menu Participantes',
          desc: 'No painel da empresa, clique na opção "Participantes" na barra de navegação lateral para visualizar a lista completa.',
          image: IMG_BASE_PATH + '12-empresa-participantes-listagem.png',
          alt: 'Tela de Gestão de Participantes com a lista de inscritos',
          caption: 'Tela principal de Gestão de Participantes da empresa'
        },
        {
          num: 2,
          title: 'Clique em "Novo Participante"',
          desc: 'Localize o botão azul "+ Novo Participante" no canto superior direito da tela. O modal centralizado de cadastro será aberto.',
          image: IMG_BASE_PATH + '13-empresa-participantes-novo-modal.png',
          alt: 'Modal centralizado de cadastro de novo participante',
          caption: 'Formulário de cadastro individual do novo participante'
        },
        {
          num: 3,
          title: 'Preencha os dados e confirme o cadastro',
          desc: 'Informe o Nome Completo, E-mail oficial, Documento e selecione o exame ao qual o participante terá acesso.',
          image: IMG_BASE_PATH + '06-site-login-empresa.png',
          alt: 'Confirmação e credenciais do participante',
          caption: 'Credenciais de acesso prontas para o participante'
        }
      ],
      alertTip: 'Você também pode importar centenas de participantes de uma só vez utilizando a importação em lote via arquivo CSV.',
      relatedIds: ['como-importar-participantes-por-csv', 'como-configurar-envio-acesso']
    },

    {
      id: 'como-importar-participantes-por-csv',
      title: 'Como importar participantes por CSV',
      summary: 'Cadastre turmas inteiras ou listas de candidatos de forma rápida enviando uma planilha CSV.',
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
          title: 'Abra a opção Importar CSV',
          desc: 'Na tela de Participantes, clique em "Importar CSV" para abrir o assistente em lote.',
          image: IMG_BASE_PATH + '14-empresa-participantes-importar-csv-modal.png',
          alt: 'Modal de importação de participantes via arquivo CSV',
          caption: 'Modal para envio do arquivo CSV formatado'
        },
        {
          num: 2,
          title: 'Valide e confirme a lista',
          desc: 'Selecione o arquivo `.csv` preenchido e clique em "Validar e Importar" para incluir os participantes no sistema.',
          image: IMG_BASE_PATH + '12-empresa-participantes-listagem.png',
          alt: 'Lista atualizada após a importação via CSV',
          caption: 'Participantes cadastrados com sucesso'
        }
      ],
      alertTip: 'Certifique-se de salvar a planilha com a codificação UTF-8 para evitar problemas com acentos.',
      relatedIds: ['como-criar-um-novo-participante', 'como-configurar-envio-acesso']
    },

    {
      id: 'como-salvar-um-exame-como-rascunho',
      title: 'Como salvar um exame como rascunho',
      summary: 'Entenda como o salvamento automático e local de rascunhos protege suas alterações antes da publicação final.',
      category: 'Criação de exames',
      audience: 'company',
      readTime: '2 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Evite a perda de dados durante a montagem das suas avaliações com o recurso de rascunho.',
      toc: [
        { id: 'sec-salvamento', title: '1. Funcionamento do rascunho local' },
        { id: 'sec-recuperacao', title: '2. Recuperando edições não publicadas' }
      ],
      steps: [
        {
          num: 1,
          title: 'Edite as informações do exame',
          desc: 'Qualquer alteração no título, instruções ou questões atualiza o indicador "Rascunho local" no cabeçalho.',
          image: IMG_BASE_PATH + '15-empresa-exames-rascunho-indicador.png',
          alt: 'Indicador de Rascunho no cabeçalho do Estúdio de Testes',
          caption: 'Cabeçalho do Estúdio com status de Rascunho ativo'
        },
        {
          num: 2,
          title: 'Salvar rascunho manualmente',
          desc: 'Utilize o botão "Salvar rascunho" a qualquer momento para persistir a versão em andamento.',
          image: IMG_BASE_PATH + '11-empresa-dashboard-main.png',
          alt: 'Visão geral do painel da empresa com botão de rascunho',
          caption: 'Estúdio de Testes da empresa'
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
          desc: 'No construtor do exame, clique no botão azul "Importar questões" para abrir o assistente em 3 etapas.',
          image: IMG_BASE_PATH + '19-empresa-construtor-questoes.png',
          alt: 'Botão de Importar Questões no Construtor do Exame',
          caption: 'Seção do Construtor com opções de importação'
        },
        {
          num: 2,
          title: 'Selecione o formato dos arquivos (Etapa 1)',
          desc: 'Escolha se deseja enviar 1 único arquivo (perguntas + alternativas) ou 2 arquivos separados (perguntas e gabarito).',
          image: IMG_BASE_PATH + '20-empresa-importacao-assistente-etapa1.png',
          alt: 'Etapa 1 do Assistente de Importação com opções de 1 ou 2 arquivos',
          caption: 'Etapa 1: Escolha do modo de importação de arquivos'
        },
        {
          num: 3,
          title: 'Revise as questões na pré-visualização (Etapa 2)',
          desc: 'Corrija enunciados, ajuste alternativas ou marque respostas corretas diretamente nos cartões editáveis.',
          image: IMG_BASE_PATH + '21-empresa-importacao-assistente-etapa2-preview.png',
          alt: 'Etapa 2 com pré-visualização editável das questões',
          caption: 'Etapa 2: Cartões de questões pré-visualizados e editáveis'
        },
        {
          num: 4,
          title: 'Confirme a importação (Etapa 3)',
          desc: 'Clique em "Confirmar importação". As questões revisadas serão injetadas diretamente na lista do seu exame.',
          image: IMG_BASE_PATH + '22-empresa-importacao-assistente-etapa3-confirmacao.png',
          alt: 'Etapa 3 de confirmação da importação no exame',
          caption: 'Etapa 3: Resumo e confirmação da inserção no teste'
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
          desc: 'Na primeira etapa do assistente, escolha o card "Dois arquivos separados".',
          image: IMG_BASE_PATH + '20-empresa-importacao-assistente-etapa1.png',
          alt: 'Seleção do modo de dois arquivos no assistente',
          caption: 'Assistente de importação no modo de dois arquivos'
        },
        {
          num: 2,
          title: 'Consulte as regras de gabarito no modal de Modelos',
          desc: 'Clique no botão "Modelos" para ver exemplos de gabaritos suportados (múltiplas respostas corretas por questão).',
          image: IMG_BASE_PATH + '23-empresa-importacao-modelos-modal.png',
          alt: 'Modal de modelos de importação com especificação de gabarito',
          caption: 'Modal de modelos de arquivos e gabaritos suportados'
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
          desc: 'No seletor de tipo de questão, escolha "Múltipla seleção". Os seletores mudarão de formato de rádio para checkbox.',
          image: IMG_BASE_PATH + '21-empresa-importacao-assistente-etapa2-preview.png',
          alt: 'Questão com múltiplas opções marcadas como corretas',
          caption: 'Cartão de questão com várias respostas corretas marcadas'
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
          desc: 'No Estúdio de Testes, localize o painel de documentos e clique no botão "+ Anexar Documento / Termo".',
          image: IMG_BASE_PATH + '17-empresa-documentos-painel.png',
          alt: 'Painel de Gestão de Documentos e Termos do Exame',
          caption: 'Painel de Gestão de Documentos e Termos anexados'
        },
        {
          num: 2,
          title: 'Configure o documento no modal de anexo',
          desc: 'Defina o título, selecione o arquivo PDF/DOCX e marque a regra de exigência (confirmação ou devolução assinada).',
          image: IMG_BASE_PATH + '18-empresa-documentos-anexo-modal.png',
          alt: 'Modal de anexo e regras do documento',
          caption: 'Modal de configuração de regras e aceite do documento'
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
          desc: 'No modal de documento, marque a opção de devolução de arquivo assinado.',
          image: IMG_BASE_PATH + '18-empresa-documentos-anexo-modal.png',
          alt: 'Configuração da regra de devolução de documento assinado',
          caption: 'Configuração no modal de documentos'
        },
        {
          num: 2,
          title: 'Visualização da exigência pelo candidato',
          desc: 'Na tela do participante, os botões de download do termo e upload do comprovante assinado ficarão visíveis.',
          image: IMG_BASE_PATH + '27-participante-documentos-pendentes.png',
          alt: 'Tela do candidato com termo e envio de documento pendente',
          caption: 'Ambiente do candidato com exigência de documento pendente'
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
        { id: 'sec-formas-envio', title: '1. Formas de envio disponíveis' },
        { id: 'sec-agendamento-minutos', title: '2. Configurando o envio agendado em minutos' }
      ],
      steps: [
        {
          num: 1,
          title: 'Selecione a forma de envio do acesso',
          desc: 'Na aba Aplicação do exame, navegue até a seção "Envio do acesso ao candidato" e escolha a opção desejada.',
          image: IMG_BASE_PATH + '16-empresa-envio-acesso-painel.png',
          alt: 'Painel de configuração de envio de credenciais de acesso',
          caption: 'Painel de agendamento e forma de envio do acesso'
        }
      ],
      alertTip: 'Se selecionar envio manual, o campo de minutos fica oculto e você pode disparar os e-mails quando desejar.',
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
          title: 'Acesse o Painel de Monitoramento ao Vivo',
          desc: 'No menu lateral, selecione o exame e abra o painel de acompanhamento ao vivo para visualizar o progresso dos candidatos.',
          image: IMG_BASE_PATH + '24-empresa-monitoramento-ao-vivo.png',
          alt: 'Painel de Acompanhamento ao Vivo dos exames em andamento',
          caption: 'Painel de Monitoramento ao Vivo em tempo real'
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
          desc: 'Clique no menu "Resultados" para abrir a visão consolidada de notas, percentuais de acerto e aprovações.',
          image: IMG_BASE_PATH + '25-empresa-resultados-dashboard.png',
          alt: 'Dashboard de Resultados de exames com estatísticas e gráficos',
          caption: 'Dashboard de Resultados consolidados da empresa'
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
        { id: 'sec-painel-aparencia', title: '1. Painel lateral de Aparência' }
      ],
      steps: [
        {
          num: 1,
          title: 'Personalize as cores e logotipo',
          desc: 'Navegue até a seção de Personalização visual para enviar o logotipo da sua organização e ajustar a paleta de cores.',
          image: IMG_BASE_PATH + '11-empresa-dashboard-main.png',
          alt: 'Painel do Estúdio com opções de personalização visual',
          caption: 'Estúdio de Testes com marca personalizada'
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
          desc: 'O construtor permite alternar instantaneamente entre escolha única, seleção múltipla, verdadeiro/falso, lacunas e dissertativas.',
          image: IMG_BASE_PATH + '19-empresa-construtor-questoes.png',
          alt: 'Seleção dos tipos de questão no construtor',
          caption: 'Seletor de tipo de questão no Estúdio'
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
          title: 'Experiência Completa do Site ao Exame',
          desc: 'Do site institucional à aplicação das provas, o sistema oferece um ambiente integrado e seguro.',
          image: IMG_BASE_PATH + '08-site-base-conhecimento-home.png',
          alt: 'Página pública da Base de Conhecimento do Online Teste',
          caption: 'Central de Conhecimento e Suporte pública'
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
    { name: 'Conheça a plataforma', icon: '✨' },
    { name: 'Novidades', icon: '📢' }
  ];

  let state = {
    searchQuery: '',
    selectedCategory: 'Todas',
    selectedAudience: 'all',
    currentArticleId: null
  };

  // --- Elementos do DOM ---
  let elCatalogView = null;
  let elArticleView = null;
  let elSearchInput = null;
  let elSearchClear = null;
  let elCategoryPills = null;
  let elAudiencePills = null;
  let elArticlesGrid = null;
  let elNoResults = null;

  document.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    renderCategoryPills();
    bindEvents();
    checkURLHashRoute();
  });

  function cacheDOMElements() {
    elCatalogView = document.getElementById('kb-catalog-view');
    elArticleView = document.getElementById('kb-article-view');
    elSearchInput = document.getElementById('kb-search-input');
    elSearchClear = document.getElementById('kb-search-clear');
    elCategoryPills = document.getElementById('kb-category-pills');
    elAudiencePills = document.getElementById('kb-audience-pills');
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

    if (elAudiencePills) {
      elAudiencePills.querySelectorAll('.kb-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          elAudiencePills.querySelectorAll('.kb-pill').forEach(b => b.classList.remove('active'));
          const target = e.target.closest('.kb-pill');
          target.classList.add('active');
          state.selectedAudience = target.dataset.audience;
          renderArticlesList();
        });
      });
    }

    window.addEventListener('hashchange', checkURLHashRoute);
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
      if (state.selectedAudience !== 'all' && art.audience !== state.selectedAudience) {
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
      const badgeHTML = getAudienceBadgeHTML(art.audience);
      return `
        <article class="kb-article-card kb-animated" onclick="window.openKnowledgeArticle('${art.id}')">
          <div class="kb-article-meta-row">
            ${badgeHTML}
            <span class="kb-read-time">${art.readTime}</span>
          </div>
          <h3 class="kb-article-title">${escapeHTML(art.title)}</h3>
          <p class="kb-article-summary">${escapeHTML(art.summary)}</p>
          <span class="kb-article-link">Ler artigo completo →</span>
        </article>
      `;
    }).join('');
  }

  function getAudienceBadgeHTML(audience) {
    if (audience === 'company') return `<span class="kb-badge kb-badge-company">🏢 Para Empresas</span>`;
    if (audience === 'participant') return `<span class="kb-badge kb-badge-participant">👤 Para Participantes</span>`;
    if (audience === 'platform') return `<span class="kb-badge kb-badge-platform">✨ Conheça a Plataforma</span>`;
    return `<span class="kb-badge kb-badge-general">📖 Geral</span>`;
  }

  function checkURLHashRoute() {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('artigo-')) {
      const articleId = hash.replace('artigo-', '');
      showArticle(articleId);
    } else {
      showCatalog();
    }
  }

  window.openKnowledgeArticle = function (id) {
    window.location.hash = `artigo-${id}`;
  };

  window.backToCatalog = function () {
    window.location.hash = '';
  };

  function showCatalog() {
    if (elCatalogView) elCatalogView.hidden = false;
    if (elArticleView) elArticleView.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderArticlesList();
  }

  function showArticle(articleId) {
    const article = KNOWLEDGE_ARTICLES.find(a => a.id === articleId);
    if (!article) {
      showCatalog();
      return;
    }

    state.currentArticleId = articleId;
    if (elCatalogView) elCatalogView.hidden = true;
    if (elArticleView) elArticleView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const badgeHTML = getAudienceBadgeHTML(article.audience);

    // Sumário
    let tocHTML = '';
    if (article.toc && article.toc.length > 0) {
      tocHTML = `
        <div class="kb-toc-card">
          <div class="kb-toc-title">Sumário do Artigo</div>
          <ol class="kb-toc-list">
            ${article.toc.map(item => `<li><a href="#${item.id}">${escapeHTML(item.title)}</a></li>`).join('')}
          </ol>
        </div>
      `;
    }

    // Passo a Passo com Imagens Reais e Lightbox Zoom
    let stepsHTML = '';
    if (article.steps && article.steps.length > 0) {
      stepsHTML = article.steps.map(step => {
        const imageSrc = step.image || (IMG_BASE_PATH + '01-site-home.png');
        const altText = escapeHTML(step.alt || step.title);
        const captionText = escapeHTML(step.caption || step.title);

        return `
          <div class="kb-step-card">
            <div class="kb-step-header">
              <span class="kb-step-num">${step.num}</span>
              <h3 class="kb-step-title">${escapeHTML(step.title)}</h3>
            </div>
            <p>${escapeHTML(step.desc)}</p>
            
            <figure class="kb-step-figure">
              <button class="kb-image-zoom-btn" type="button" aria-label="Ampliar captura da tela" onclick="window.openKnowledgeImageZoom('${imageSrc}', '${altText}', '${captionText}')">
                <img src="${imageSrc}" alt="${altText}" loading="lazy">
              </button>
              <figcaption>
                <span>${captionText}</span>
                <span class="kb-zoom-badge">🔍 Clique para ampliar</span>
              </figcaption>
            </figure>
          </div>
        `;
      }).join('');
    }

    // Artigos Relacionados
    let relatedHTML = '';
    if (article.relatedIds && article.relatedIds.length > 0) {
      const relArticles = KNOWLEDGE_ARTICLES.filter(a => article.relatedIds.includes(a.id));
      relatedHTML = `
        <div class="kb-sidebar-card">
          <div class="kb-sidebar-title">Artigos Relacionados</div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${relArticles.map(rel => `
              <a href="#artigo-${rel.id}" style="color: #2563eb; text-decoration: none; font-size: 13px; font-weight: 700; line-height: 1.35;">
                • ${escapeHTML(rel.title)}
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Renderiza Leitor Completo
    elArticleView.innerHTML = `
      <div class="kb-main-container kb-animated">
        <nav class="kb-breadcrumb" aria-label="Navegação">
          <a href="./index.html">Home</a>
          <span>/</span>
          <a href="#" onclick="event.preventDefault(); window.backToCatalog();">Base de Conhecimento</a>
          <span>/</span>
          <span>${escapeHTML(article.category)}</span>
        </nav>

        <div class="kb-reader-layout">
          <main class="kb-article-content">
            <header class="kb-article-header">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                ${badgeHTML}
                <span class="kb-read-time">⏱️ ${article.readTime}</span>
                <span class="kb-read-time">📅 Atualizado em ${article.updatedAt}</span>
              </div>
              <h1>${escapeHTML(article.title)}</h1>
              <p class="kb-article-lead">${escapeHTML(article.lead || article.summary)}</p>
            </header>

            ${tocHTML}

            <div class="kb-article-body">
              <h2 id="sec-passos">Passo a Passo Guiado</h2>
              ${stepsHTML}

              ${article.alertTip ? `
                <div class="kb-alert kb-alert-tip">
                  <span class="kb-alert-icon">💡</span>
                  <div><strong>Dica Útil:</strong> ${escapeHTML(article.alertTip)}</div>
                </div>
              ` : ''}

              <div class="kb-commercial-cta">
                <div>
                  <h4>Gostou deste recurso?</h4>
                  <p>Crie avaliações online seguras com o logotipo e as cores da sua empresa.</p>
                </div>
                <div class="kb-cta-actions">
                  <a class="button primary" href="./SolicitarAcesso.html" style="background: #2563eb; color: #fff; text-decoration: none;">Solicitar Acesso</a>
                  <a class="button secondary" href="./contato.html" style="background: #ffffff; color: #0f172a; text-decoration: none;">Fale com Especialista</a>
                </div>
              </div>

              <div class="kb-feedback-box" id="kb-feedback-container">
                <div class="kb-feedback-question">Este conteúdo foi útil para você?</div>
                <div class="kb-feedback-buttons">
                  <button class="kb-btn-feedback" type="button" onclick="window.sendKnowledgeFeedback(true)">👍 Sim</button>
                  <button class="kb-btn-feedback" type="button" onclick="window.sendKnowledgeFeedback(false)">👎 Não</button>
                </div>
              </div>
            </div>
          </main>

          <aside class="kb-article-sidebar">
            <div class="kb-sidebar-card">
              <div class="kb-sidebar-title">Ações</div>
              <div class="kb-share-buttons">
                <button class="kb-btn-action secondary" type="button" onclick="window.copyKnowledgeArticleLink()">
                  <span>🔗</span> Copiar Link do Artigo
                </button>
                <button class="kb-btn-action secondary" type="button" onclick="window.printKnowledgeArticle()">
                  <span>🖨️</span> Imprimir Artigo
                </button>
                <button class="kb-btn-action primary" type="button" onclick="window.backToCatalog()">
                  <span>←</span> Voltar para a Base
                </button>
              </div>
            </div>

            ${relatedHTML}
          </aside>
        </div>
      </div>
    `;
  }

  // --- Funções do Modal Lightbox Zoom ---
  window.openKnowledgeImageZoom = function (src, alt, caption) {
    let backdrop = document.getElementById('kb-image-zoom-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'kb-image-zoom-backdrop';
      backdrop.className = 'kb-zoom-backdrop';
      backdrop.innerHTML = `
        <div class="kb-zoom-container">
          <button class="kb-zoom-close" type="button" aria-label="Fechar zoom" onclick="window.closeKnowledgeImageZoom()">×</button>
          <img id="kb-zoom-img" src="" alt="">
          <div class="kb-zoom-caption" id="kb-zoom-caption"></div>
        </div>
      `;
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) window.closeKnowledgeImageZoom();
      });
      document.body.appendChild(backdrop);
    }

    document.getElementById('kb-zoom-img').src = src;
    document.getElementById('kb-zoom-img').alt = alt || '';
    document.getElementById('kb-zoom-caption').textContent = caption || alt || 'Imagem em tamanho real';
    backdrop.hidden = false;
  };

  window.closeKnowledgeImageZoom = function () {
    const backdrop = document.getElementById('kb-image-zoom-backdrop');
    if (backdrop) backdrop.hidden = true;
  };

  window.copyKnowledgeArticleLink = function () {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link do artigo copiado para a área de transferência!');
    }).catch(() => {
      alert('Link: ' + url);
    });
  };

  window.printKnowledgeArticle = function () {
    window.print();
  };

  window.sendKnowledgeFeedback = function (isPositive) {
    const container = document.getElementById('kb-feedback-container');
    if (!container) return;
    container.innerHTML = `
      <div class="kb-feedback-thanks">
        ✓ Obrigado pelo seu feedback! Isso nos ajuda a melhorar nossos guias constantemente.
      </div>
    `;
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
