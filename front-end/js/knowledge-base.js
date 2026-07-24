/**
 * Base de Conhecimento da Empresa — Módulo Oficial em Tela Cheia (Online Teste)
 * Mapeamento 100% auditado dos 14 artigos para os prints reais das telas do sistema.
 */

(function () {
  'use strict';

  // Caminho base para as imagens oficiais da Base de Conhecimento
  const IMG_BASE_PATH = './assets/images/base-conhecimento/';

  // --- 1. Banco de Dados Oficial dos 14 Artigos com Mapeamento Exato de Prints ---
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
          desc: 'No painel da empresa, clique na opção "Participantes" na barra de navegação lateral para visualizar a lista completa.',
          image: IMG_BASE_PATH + '12-empresa-participantes-listagem.png',
          filename: '12-empresa-participantes-listagem.png',
          alt: 'Tela de Gestão de Participantes com a lista de inscritos',
          caption: 'Tela principal de Gestão de Participantes da empresa'
        },
        {
          num: 2,
          title: 'Clique no botão "Novo Participante"',
          desc: 'Localize o botão azul "+ Novo Participante" no canto superior direito da tela. O modal centralizado de cadastro será aberto.',
          image: IMG_BASE_PATH + '13-empresa-participantes-novo-modal.png',
          filename: '13-empresa-participantes-novo-modal.png',
          alt: 'Modal centralizado de cadastro de novo participante',
          caption: 'Formulário de cadastro individual do novo participante'
        },
        {
          num: 3,
          title: 'Preencha os dados e confirme o cadastro',
          desc: 'Informe o Nome Completo, E-mail oficial, Documento e selecione o exame ao qual o participante terá acesso.',
          image: IMG_BASE_PATH + '12-empresa-participantes-listagem.png',
          filename: '12-empresa-participantes-listagem.png',
          alt: 'Lista de participantes com o cadastro confirmado',
          caption: 'Participante cadastrado e credenciais de acesso ativas'
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
          image: IMG_BASE_PATH + '12-empresa-participantes-listagem.png',
          filename: '12-empresa-participantes-listagem.png',
          alt: 'Tela de Gestão com o botão de Importar CSV destacado',
          caption: 'Tela de Participantes com o botão Importar CSV'
        },
        {
          num: 2,
          title: 'Preencha a planilha e envie o arquivo',
          desc: 'Selecione o arquivo `.csv` preenchido com a lista de candidatos no modal de importação.',
          image: IMG_BASE_PATH + '14-empresa-participantes-importar-csv-modal.png',
          filename: '14-empresa-participantes-importar-csv-modal.png',
          alt: 'Modal de importação de participantes via arquivo CSV',
          caption: 'Modal para envio do arquivo CSV formatado'
        },
        {
          num: 3,
          title: 'Valide e confirme a importação',
          desc: 'O sistema processará as linhas da planilha. Clique em "Validar e Importar" para salvar a turma no sistema.',
          image: IMG_BASE_PATH + '12-empresa-participantes-listagem.png',
          filename: '12-empresa-participantes-listagem.png',
          alt: 'Lista atualizada após a importação via CSV',
          caption: 'Participantes cadastrados com sucesso na plataforma'
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
          desc: 'Qualquer alteração no título, instruções, tempo ou questões atualiza a indicação "Rascunho local" no topo.',
          image: IMG_BASE_PATH + '15-empresa-exames-rascunho-indicador.png',
          filename: '15-empresa-exames-rascunho-indicador.png',
          alt: 'Indicador de Rascunho no cabeçalho do Estúdio de Testes',
          caption: 'Cabeçalho do Estúdio com indicação de Rascunho local'
        },
        {
          num: 2,
          title: 'Clique em "Salvar rascunho"',
          desc: 'Utilize o botão "Salvar rascunho" no canto superior direito para persistir a versão atual no banco.',
          image: IMG_BASE_PATH + '11-empresa-dashboard-main.png',
          filename: '11-empresa-dashboard-main.png',
          alt: 'Visão geral do painel do Estúdio com o botão Salvar rascunho',
          caption: 'Estúdio de Testes da empresa com botões de rascunho'
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
          filename: '19-empresa-construtor-questoes.png',
          alt: 'Botão de Importar Questões no Construtor do Exame',
          caption: 'Seção do Construtor com botões de ação'
        },
        {
          num: 2,
          title: 'Escolha o formato dos arquivos (Etapa 1)',
          desc: 'Selecione se deseja enviar 1 único arquivo (perguntas + alternativas) ou 2 arquivos separados (perguntas e gabarito).',
          image: IMG_BASE_PATH + '20-empresa-importacao-assistente-etapa1.png',
          filename: '20-empresa-importacao-assistente-etapa1.png',
          alt: 'Etapa 1 do Assistente de Importação com 1 ou 2 arquivos',
          caption: 'Etapa 1: Seleção do modo de arquivo'
        },
        {
          num: 3,
          title: 'Revise as questões na pré-visualização (Etapa 2)',
          desc: 'Corrija enunciados, ajuste alternativas ou marque respostas corretas diretamente nos cartões editáveis.',
          image: IMG_BASE_PATH + '21-empresa-importacao-assistente-etapa2-preview.png',
          filename: '21-empresa-importacao-assistente-etapa2-preview.png',
          alt: 'Etapa 2 de pré-visualização editável das questões',
          caption: 'Etapa 2: Cartões de questões pré-visualizados e editáveis'
        },
        {
          num: 4,
          title: 'Confirme a importação (Etapa 3)',
          desc: 'Clique em "Confirmar importação". As questões revisadas serão injetadas diretamente na lista do seu exame.',
          image: IMG_BASE_PATH + '22-empresa-importacao-assistente-etapa3-confirmacao.png',
          filename: '22-empresa-importacao-assistente-etapa3-confirmacao.png',
          alt: 'Etapa 3 de confirmação da importação no exame',
          caption: 'Etapa 3: Resumo e confirmação no teste'
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
          filename: '20-empresa-importacao-assistente-etapa1.png',
          alt: 'Seleção da opção de 2 arquivos separados no assistente',
          caption: 'Assistente de importação no modo de dois arquivos'
        },
        {
          num: 2,
          title: 'Consulte os modelos de gabarito no botão "Modelos"',
          desc: 'Clique no botão "Modelos" para ver exemplos de gabaritos suportados (inclusive com múltiplas respostas corretas por questão).',
          image: IMG_BASE_PATH + '23-empresa-importacao-modelos-modal.png',
          filename: '23-empresa-importacao-modelos-modal.png',
          alt: 'Modal de modelos de importação e especificações de gabarito',
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
          image: IMG_BASE_PATH + '19-empresa-construtor-questoes.png',
          filename: '19-empresa-construtor-questoes.png',
          alt: 'Seletor do tipo Múltipla seleção no Construtor',
          caption: 'Seletor de tipo de questão no Construtor'
        },
        {
          num: 2,
          title: 'Marque todas as alternativas corretas',
          desc: 'Selecione os checkboxes ao lado de cada opção correta (ex: Alternativas A, C e E).',
          image: IMG_BASE_PATH + '21-empresa-importacao-assistente-etapa2-preview.png',
          filename: '21-empresa-importacao-assistente-etapa2-preview.png',
          alt: 'Questão com múltiplas opções marcadas como corretas',
          caption: 'Cartão de questão com várias respostas corretas'
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
          desc: 'No Estúdio de Testes, na aba Aplicação, localize o painel de documentos e clique em "+ Anexar Documento / Termo".',
          image: IMG_BASE_PATH + '17-empresa-documentos-painel.png',
          filename: '17-empresa-documentos-painel.png',
          alt: 'Painel de Gestão de Documentos e Termos anexados ao exame',
          caption: 'Painel de Gestão de Documentos e Termos do Exame'
        },
        {
          num: 2,
          title: 'Configure o documento no modal de anexo',
          desc: 'Defina o título, selecione o arquivo PDF/DOCX e marque a regra de exigência (confirmação ou devolução assinada).',
          image: IMG_BASE_PATH + '18-empresa-documentos-anexo-modal.png',
          filename: '18-empresa-documentos-anexo-modal.png',
          alt: 'Modal de anexo e regras de documentos e termos',
          caption: 'Modal de anexo de documentos e aceite digital'
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
          desc: 'No modal de anexo do documento, selecione a regra "Exigir devolução do documento assinado pelo participante".',
          image: IMG_BASE_PATH + '18-empresa-documentos-anexo-modal.png',
          filename: '18-empresa-documentos-anexo-modal.png',
          alt: 'Configuração da regra de devolução no modal',
          caption: 'Configuração no modal de anexo do documento'
        },
        {
          num: 2,
          title: 'Exigência na tela do participante',
          desc: 'Na área do candidato, os botões de download e upload do termo assinado ficarão bloqueando o início até a conclusão.',
          image: IMG_BASE_PATH + '27-participante-documentos-pendentes.png',
          filename: '27-participante-documentos-pendentes.png',
          alt: 'Ambiente do participante com documento pendente',
          caption: 'Ambiente do participante com envio de documento pendente'
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
          desc: 'Na aba Aplicação do exame, navegue até o painel "Envio do acesso ao candidato" e escolha a opção desejada.',
          image: IMG_BASE_PATH + '16-empresa-envio-acesso-painel.png',
          filename: '16-empresa-envio-acesso-painel.png',
          alt: 'Painel de configuração de envio de credenciais de acesso',
          caption: 'Painel de agendamento e forma de envio do acesso'
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
          desc: 'Clique em "Resultados" ou "Monitoramento" para abrir o acompanhamento em tempo real dos participantes em prova.',
          image: IMG_BASE_PATH + '24-empresa-monitoramento-ao-vivo.png',
          filename: '24-empresa-monitoramento-ao-vivo.png',
          alt: 'Painel de Acompanhamento ao Vivo em tempo real',
          caption: 'Painel de Monitoramento ao Vivo'
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
          filename: '25-empresa-resultados-dashboard.png',
          alt: 'Dashboard de Resultados consolidados',
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
        { id: 'sec-painel-aparencia', title: '1. Painel de Aparência' }
      ],
      steps: [
        {
          num: 1,
          title: 'Personalize as cores e o logotipo da empresa',
          desc: 'Navegue até a seção 4 (Aparência) para fazer upload da sua marca (PNG/JPG) e escolher a paleta de cores.',
          image: IMG_BASE_PATH + '11-empresa-dashboard-main.png',
          filename: '11-empresa-dashboard-main.png',
          alt: 'Painel de Aparência e Marca no Estúdio',
          caption: 'Estúdio de Testes com personalização de marca'
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
          filename: '19-empresa-construtor-questoes.png',
          alt: 'Seletor de tipo de questão no Construtor',
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
          title: 'Experiência Completa para a Empresa',
          desc: 'Do cadastro de exames ao acompanhamento em tempo real, o sistema oferece um ambiente integrado e seguro.',
          image: IMG_BASE_PATH + '11-empresa-dashboard-main.png',
          filename: '11-empresa-dashboard-main.png',
          alt: 'Visão Geral do Painel da Empresa',
          caption: 'Visão Geral do Estúdio de Testes da Empresa'
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

  document.addEventListener('DOMContentLoaded', async () => {
    cacheDOMElements();
    renderCategoryPills();
    bindEvents();
    await fetchServerArticles();
    checkURLHashRoute();
  });

  async function fetchServerArticles() {
    try {
      const res = await fetch('/api/knowledge-base/articles');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.articles) && data.articles.length > 0) {
          KNOWLEDGE_ARTICLES.length = 0;
          KNOWLEDGE_ARTICLES.push(...data.articles);
        }
      }
    } catch (_) {}
  }

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

    window.addEventListener('hashchange', checkURLHashRoute);
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
        <article class="kb-article-card kb-animated" onclick="window.openKnowledgeArticle('${art.id}')">
          <div class="kb-article-meta-row">
            <span class="kb-badge kb-badge-company">🏢 Para Empresas</span>
            <span class="kb-read-time">${art.readTime}</span>
          </div>
          <h3 class="kb-article-title">${escapeHTML(art.title)}</h3>
          <p class="kb-article-summary">${escapeHTML(art.summary)}</p>
          <span class="kb-article-link">Ver tutorial com imagens →</span>
        </article>
      `;
    }).join('');
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

  function showArticle(articleId, customArticle = null, forceEditMode = false) {
    const article = customArticle || KNOWLEDGE_ARTICLES.find(a => a.id === articleId);
    if (!article) {
      showCatalog();
      return;
    }

    state.currentArticleId = article.id;
    if (elCatalogView) elCatalogView.hidden = true;
    if (elArticleView) elArticleView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let stepsHTML = '';
    if (article.steps && article.steps.length > 0) {
      stepsHTML = article.steps.map(step => {
        const imageSrc = step.image || (IMG_BASE_PATH + '11-empresa-dashboard-main.png');
        const altText = escapeHTML(step.alt || step.title);
        const captionText = escapeHTML(step.caption || step.title);
        const fileName = step.filename || 'print-da-tela.png';

        return `
          <div class="kb-step-card kb-block-wrapper">
            <div class="kb-step-header">
              <span class="kb-step-number">${step.num}</span>
              <h3 class="kb-step-title">${escapeHTML(step.title)}</h3>
            </div>
            <p class="kb-step-desc">${escapeHTML(step.desc)}</p>
            
            <figure class="kb-step-figure">
              <div class="kb-step-figure-badge">🖼️ Print da Tela: <code>${fileName}</code></div>
              <button class="kb-image-zoom-btn" type="button" aria-label="Ampliar captura de tela" onclick="window.openKnowledgeImageZoom('${imageSrc}', '${altText}', '${captionText}')">
                <img src="${imageSrc}" alt="${altText}" loading="lazy" onerror="this.src='./assets/images/Logo.png';">
              </button>
              <figcaption>
                <span>${captionText}</span>
                <span class="kb-zoom-badge">🔍 Clique para ampliar em tela cheia</span>
              </figcaption>
            </figure>
          </div>
        `;
      }).join('');
    }

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

    elArticleView.innerHTML = `
      <div class="kb-animated">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <button class="button secondary" type="button" onclick="window.backToCatalog()">
            ← Voltar para a lista de artigos
          </button>
          
          <button class="kb-btn-editor primary" type="button" id="btn-trigger-inline-edit" onclick="window.enableInlineKbEditor(window.currentKbArticleObj)">
            <i class="fa-solid fa-pen-to-square"></i> ✏️ Editar no Editor Visual
          </button>
        </div>

        <div class="kb-reader-layout">
          <main class="kb-article-content">
            <header class="kb-article-header">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span class="kb-badge kb-badge-company">🏢 Para Empresas</span>
                <span class="kb-read-time">⏱️ ${article.readTime}</span>
                <span class="kb-read-time">📅 Atualizado em ${article.updatedAt}</span>
              </div>
              <h1 class="kb-header-title" style="font-size: 28px; font-weight: 850; margin: 12px 0;">${escapeHTML(article.title)}</h1>
              <p class="kb-header-lead kb-article-lead">${escapeHTML(article.lead || article.summary)}</p>
            </header>

            <div class="kb-article-body">
              <h2 style="font-size: 20px; font-weight: 850; margin: 24px 0 16px;">Passo a Passo Guiado com Imagens</h2>
              <div class="kb-article-steps">
                ${stepsHTML}
              </div>

              ${article.alertTip ? `
                <div class="kb-alert kb-alert-tip">
                  <span class="kb-alert-icon">💡</span>
                  <div><strong>Dica Útil:</strong> ${escapeHTML(article.alertTip)}</div>
                </div>
              ` : ''}
            </div>
          </main>

          <aside class="kb-article-sidebar">
            <div class="kb-sidebar-card">
              <div class="kb-sidebar-title">Ações do Guia</div>
              <div class="kb-share-buttons">
                <button class="kb-btn-action secondary" type="button" onclick="window.printKnowledgeArticle()">
                  <span>🖨️</span> Imprimir Artigo
                </button>
                <button class="kb-btn-action primary" type="button" onclick="window.backToCatalog()">
                  <span>←</span> Voltar para o Catálogo
                </button>
              </div>
            </div>

            ${relatedHTML}
          </aside>
        </div>
      </div>
    `;

    window.currentKbArticleObj = article;

    if (forceEditMode && typeof window.enableInlineKbEditor === 'function') {
      window.enableInlineKbEditor(article);
    }
  }

  // --- Modal Lightbox Zoom de Imagem ---
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

  window.printKnowledgeArticle = function () {
    window.print();
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
