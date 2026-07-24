/**
 * Base de Conhecimento Pública — Módulo de Dados e Interatividade (Online Teste)
 * Suporta busca rápida, filtros por categoria/público, visualização completa de artigos
 * com passo a passo, caixa de imagem placeholder [Imagem: Tela de ...], compartilhamento e feedback.
 */

(function () {
  'use strict';

  // --- 1. Banco de Dados Fictício dos 14 Artigos Oficiais ---
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
          imagePlaceholder: 'colocar imagem tela de Participantes - menu lateral'
        },
        {
          num: 2,
          title: 'Clique em "Novo Participante"',
          desc: 'Localize o botão azul "+ Novo Participante" no canto superior direito da tela. Um modal centralizado será aberto.',
          imagePlaceholder: 'colocar imagem tela de Participantes - botão Novo Participante'
        },
        {
          num: 3,
          title: 'Preencha os dados cadastrais',
          desc: 'Informe o Nome Completo, E-mail oficial, CPF/Documento, Cargo/Turma e selecione o exame ao qual o participante terá acesso.',
          imagePlaceholder: 'colocar imagem tela do Modal de Cadastro de Participante'
        },
        {
          num: 4,
          title: 'Confirme o salvamento',
          desc: 'Clique em "Criar Participante". O sistema enviará automaticamente as instruções ou gerará o login direto.',
          imagePlaceholder: 'colocar imagem tela de Confirmação de Cadastro do Participante'
        }
      ],
      alertTip: 'Você também pode importar centenas de participantes de uma só vez utilizando a importação em lote via arquivo CSV.',
      relatedIds: ['como-importar-participantes-por-csv', 'como-configurar-envio-acesso']
    },

    {
      id: 'como-importar-participantes-por-csv',
      title: 'Como importar participantes por CSV',
      summary: 'Cadastre turmas inteiras ou listas de candidatos de forma rápida e automatizada enviando uma planilha CSV.',
      category: 'Participantes',
      audience: 'company',
      readTime: '4 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Saiba como estruturar sua planilha no formato CSV e importar múltiplos participantes em lote.',
      toc: [
        { id: 'sec-modelo', title: '1. Baixando o modelo CSV' },
        { id: 'sec-preenchimento', title: '2. Preenchendo os cabeçalhos' },
        { id: 'sec-envio', title: '3. Envio e validação da lista' }
      ],
      steps: [
        {
          num: 1,
          title: 'Baixe o modelo CSV padrão',
          desc: 'Na tela de Participantes, clique em "Importar CSV" e faça o download do modelo padrão formatado.',
          imagePlaceholder: 'colocar imagem tela da área de Importação CSV de Participantes'
        },
        {
          num: 2,
          title: 'Insira os dados na planilha',
          desc: 'Abra o arquivo no Excel ou Google Sheets e preencha as colunas: Nome, Email, Documento e Grupo.',
          imagePlaceholder: 'colocar imagem da planilha CSV com dados preenchidos'
        },
        {
          num: 3,
          title: 'Faça o upload do arquivo',
          desc: 'Selecione o arquivo `.csv` salvo e clique em "Validar e Importar". O sistema exibirá o resumo prévio.',
          imagePlaceholder: 'colocar imagem da tela de pré-visualização da importação CSV'
        }
      ],
      alertTip: 'Certifique-se de salvar o arquivo com a codificação UTF-8 para evitar problemas em nomes com acentos.',
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
          imagePlaceholder: 'colocar imagem do indicador de Rascunho no cabeçalho do Estúdio de Testes'
        },
        {
          num: 2,
          title: 'Clique em "Salvar rascunho"',
          desc: 'Utilize o botão "Salvar rascunho" a qualquer momento para persistir a versão em andamento na sua conta.',
          imagePlaceholder: 'colocar imagem do botão Salvar Rascunho no Estúdio de Testes'
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
          imagePlaceholder: 'colocar imagem da seção de Construtor de Questões - Botão Importar Questões'
        },
        {
          num: 2,
          title: 'Escolha o modo e selecione o arquivo',
          desc: 'Escolha se deseja enviar 1 único arquivo (perguntas + alternativas) ou 2 arquivos separados (perguntas e gabarito).',
          imagePlaceholder: 'colocar imagem da Etapa 1 do Assistente de Importação de Questões'
        },
        {
          num: 3,
          title: 'Revise as questões na pré-visualização',
          desc: 'Corrija enunciados, ajuste alternativas ou marque múltiplas respostas corretas diretamente nos cartões editáveis.',
          imagePlaceholder: 'colocar imagem da Etapa 2 de Pré-visualização Editável de Questões'
        },
        {
          num: 4,
          title: 'Confirme a importação',
          desc: 'Clique em "Confirmar importação". As questões revisadas serão injetadas diretamente na lista do seu exame.',
          imagePlaceholder: 'colocar imagem da Etapa 3 de Confirmação da Importação'
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
          imagePlaceholder: 'colocar imagem da opção de 2 arquivos no Assistente de Importação'
        },
        {
          num: 2,
          title: 'Envie o arquivo de perguntas e o de gabarito',
          desc: 'No primeiro campo envie a prova (.docx, .xlsx, .txt) e no segundo envie o gabarito (.txt, .csv ou .xlsx).',
          imagePlaceholder: 'colocar imagem dos seletores de arquivo duplo de Perguntas e Gabarito'
        },
        {
          num: 3,
          title: 'Confira a associação na pré-visualização',
          desc: 'O assistente cruzará os dados automaticamente e exibirá as respostas marcadas em cada cartão.',
          imagePlaceholder: 'colocar imagem da validação cruzada do Gabarito na pré-visualização'
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
          imagePlaceholder: 'colocar imagem do seletor de Tipo de Questão Múltipla Seleção'
        },
        {
          num: 2,
          title: 'Marque todas as alternativas corretas',
          desc: 'Selecione os checkboxes ao lado das alternativas desejadas (ex: Opções A, C e D).',
          imagePlaceholder: 'colocar imagem dos checkboxes de múltiplas alternativas corretas marcadas'
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
          title: 'Clique em "Anexar Documento / Termo"',
          desc: 'Na seção "Aplicação e Resultado", localize o painel "Documentos, Regras e Termos" e clique em "+ Anexar Documento / Termo".',
          imagePlaceholder: 'colocar imagem do painel de Documentos no Estúdio de Testes'
        },
        {
          num: 2,
          title: 'Preencha o título e selecione o arquivo',
          desc: 'Escolha o tipo de documento (Regras, Instruções, Termo de Aceite) e faça o envio do PDF, DOCX ou imagem.',
          imagePlaceholder: 'colocar imagem do Modal de Anexo de Documentos e Termos'
        },
        {
          num: 3,
          title: 'Defina a exigência para o candidato',
          desc: 'Marque se é exigida confirmação de leitura, aceite digital com IP ou devolução de arquivo assinado antes da prova.',
          imagePlaceholder: 'colocar imagem das opções de exigência e aceite digital'
        }
      ],
      alertTip: 'Se marcar "Exigir aceite digital", o participante só poderá iniciar a prova após aceitar o termo.',
      relatedIds: ['como-exigir-assinatura-antes-da-prova', 'como-salvar-um-exame-como-rascunho']
    },

    {
      id: 'como-exigir-assinatura-antes-da-prova',
      title: 'Como exigir assinatura antes da prova',
      summary: 'Exija que o candidato baixe o documento de instrução ou termo, assine fisicamente ou digitalmente e envie a cópia antes de iniciar.',
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
          title: 'Marque "Exigir devolução do documento assinado"',
          desc: 'No modal de anexo do documento, selecione a regra "Exigir devolução do documento assinado pelo participante".',
          imagePlaceholder: 'colocar imagem da opção de devolução de documento assinado'
        },
        {
          num: 2,
          title: 'Visualização pelo candidato',
          desc: 'O candidato visualizará o botão de download do termo e um campo para envio do comprovante assinado antes do teste.',
          imagePlaceholder: 'colocar imagem da tela do Candidato baixando e enviando termo assinado'
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
          title: 'Acesse o painel "Envio do acesso ao candidato"',
          desc: 'Na aba Aplicação do exame, escolha a opção desejada no seletor "Forma de envio".',
          imagePlaceholder: 'colocar imagem do painel Envio do acesso ao candidato'
        },
        {
          num: 2,
          title: 'Selecione a regra de envio',
          desc: 'Opções: "Enviar ao concluir o cadastro", "Enviar minutos antes do início" ou "Não enviar agora (envio manual)".',
          imagePlaceholder: 'colocar imagem do seletor com as formas de envio de e-mail'
        },
        {
          num: 3,
          title: 'Defina os minutos (caso agendado)',
          desc: 'Se escolher envio agendado, preencha o número de minutos antes do horário de início cadastrado.',
          imagePlaceholder: 'colocar imagem do campo de minutos para envio agendado'
        }
      ],
      alertTip: 'Se selecionar envio manual, o campo de minutos fica oculto e você pode disparar o e-mail quando desejar.',
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
        { id: 'sec-painel-ao-vivo', title: '1. Painel de monitoramento ao vivo' },
        { id: 'sec-status-participantes', title: '2. Verificando os status de cada participante' }
      ],
      steps: [
        {
          num: 1,
          title: 'Acesse o menu Resultados / Operação',
          desc: 'No painel da empresa, selecione o exame desejado e clique no botão "Acompanhar em tempo real".',
          imagePlaceholder: 'colocar imagem do Painel de Monitoramento ao Vivo'
        },
        {
          num: 2,
          title: 'Visualize os cards de progresso',
          desc: 'Acompanhe o cronômetro individual de cada candidato, registros de selfie/câmera e confirmações de presença.',
          imagePlaceholder: 'colocar imagem da lista de Participantes em andamento no teste'
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
        { id: 'sec-painel-resultados', title: '1. Visão geral de notas e aprovações' },
        { id: 'sec-revisao-manual', title: '2. Correção manual de questões dissertativas' }
      ],
      steps: [
        {
          num: 1,
          title: 'Acesse o painel de Resultados',
          desc: 'Clique em "Resultados" no menu lateral para visualizar o ranking, percentuais de acerto e notas finais.',
          imagePlaceholder: 'colocar imagem do Dashboard de Resultados de Exames'
        },
        {
          num: 2,
          title: 'Corrija questões dissertativas (se houver)',
          desc: 'Se o teste possui questões dissertativas, atribua a nota do critério para atualizar o resultado final.',
          imagePlaceholder: 'colocar imagem da tela de Revisão Manual de Questões Dissertativas'
        }
      ],
      alertTip: 'Você pode liberar os resultados de forma automática ou somente após a revisão manual do avaliador.',
      relatedIds: ['como-acompanhar-o-exame-em-tempo-real', 'conheca-os-tipos-de-questoes-disponiveis']
    },

    {
      id: 'como-personalizar-aparencia-exame',
      title: 'Como personalizar a aparência do exame',
      summary: 'Adicione o logotipo da sua empresa, altere as cores da marca, escolha a tipografia e visualize a prévia em tempo real.',
      category: 'Personalização',
      audience: 'company',
      readTime: '3 min de leitura',
      updatedAt: '24/07/2026',
      lead: 'Fortaleça a autoridade da sua marca personalizando completamente a tela em que o participante fará a avaliação.',
      toc: [
        { id: 'sec-painel-aparencia', title: '1. Painel lateral de Aparência' },
        { id: 'sec-upload-logo', title: '2. Upload de logo e escolha de cores' }
      ],
      steps: [
        {
          num: 1,
          title: 'Acesse a aba "Aparência"',
          desc: 'No Estúdio de Testes, navegue até a seção de Personalização ou clique na etapa 4 do topo.',
          imagePlaceholder: 'colocar imagem do Painel Lateral de Aparência no Estúdio de Testes'
        },
        {
          num: 2,
          title: 'Envie seu logotipo e ajuste as cores',
          desc: 'Faça upload do arquivo da sua marca (PNG, JPG) e escolha as cores principal, de destaque e de fundo.',
          imagePlaceholder: 'colocar imagem dos seletores de cor e upload de marca'
        },
        {
          num: 3,
          title: 'Confira no simulador de prévia',
          desc: 'Veja as alterações em tempo real no simulador interativo antes de salvar a aparência.',
          imagePlaceholder: 'colocar imagem do Simulador de Prévia do Candidato'
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
        { id: 'sec-objetivas', title: '1. Questões Objetivas' },
        { id: 'sec-binarias-lacunas', title: '2. Escolha Binária e Lacunas' },
        { id: 'sec-dissertativas', title: '3. Questões Dissertativas e Critérios' }
      ],
      steps: [
        {
          num: 1,
          title: 'Múltipla Escolha e Múltipla Seleção',
          desc: 'Formatos ideais para checar conhecimentos objetivos com 1 única resposta correta ou várias alternativas selecionáveis.',
          imagePlaceholder: 'colocar imagem do exemplo de questão de Múltipla Escolha e Seleção'
        },
        {
          num: 2,
          title: 'Escolha Binária e Preenchimento de Lacunas',
          desc: 'Permite sim/não, conforme/não conforme e preenchimento de palavras ocultas no meio do enunciado.',
          imagePlaceholder: 'colocar imagem do exemplo de Escolha Binária e Lacunas'
        },
        {
          num: 3,
          title: 'Dissertativas com limite de caracteres',
          desc: 'Questões onde o participante digita sua própria resposta, podendo definir limites mínimo e máximo de texto.',
          imagePlaceholder: 'colocar imagem do exemplo de Questão Dissertativa no teste'
        }
      ],
      alertTip: 'Todas as alternativas e opções podem ser embaralhadas automaticamente a cada tentativa do participante.',
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
        { id: 'sec-recursos-chave', title: '1. Principais Recursos da Plataforma' },
        { id: 'sec-seguranca', title: '2. Segurança e Conformidade LGPD' },
        { id: 'sec-comece', title: '3. Como começar a utilizar' }
      ],
      steps: [
        {
          num: 1,
          title: 'Criação ágil e importação inteligente',
          desc: 'Crie provas personalizadas do zero ou importe questões via Excel, Word, CSV ou GIFT em segundos.',
          imagePlaceholder: 'colocar imagem da visão geral do Estúdio de Testes'
        },
        {
          num: 2,
          title: 'Aplicação segura com verificação de identidade',
          desc: 'Exija foto/selfie, documento de identidade e aceite de termos com carimbo de data, hora e IP.',
          imagePlaceholder: 'colocar imagem da tela de verificação de identidade do candidato'
        },
        {
          num: 3,
          title: 'Relatórios em tempo real e correção automática',
          desc: 'Receba resultados instantâneos após a conclusão das provas com relatórios gráficos completos.',
          imagePlaceholder: 'colocar imagem dos relatórios e gráficos executivos'
        }
      ],
      alertTip: 'Você pode solicitar um teste gratuito ou agendar uma demonstração exclusiva com nossos especialistas.',
      relatedIds: ['conheca-os-tipos-de-questoes-disponiveis', 'como-personalizar-aparencia-exame']
    }
  ];

  // --- Categories List ---
  const CATEGORIES = [
    { name: 'Todas', icon: '🔍', count: KNOWLEDGE_ARTICLES.length },
    { name: 'Primeiros passos', icon: '🚀', count: 2 },
    { name: 'Criação de exames', icon: '📝', count: 3 },
    { name: 'Questões e importação', icon: '⇩', count: 3 },
    { name: 'Participantes', icon: '♙', count: 2 },
    { name: 'Documentos e termos', icon: '📄', count: 2 },
    { name: 'Convites e acessos', icon: '✉', count: 1 },
    { name: 'Monitoramento', icon: '👁', count: 1 },
    { name: 'Resultados', icon: '📊', count: 1 },
    { name: 'Personalização', icon: '🎨', count: 1 },
    { name: 'Conheça a plataforma', icon: '✨', count: 2 },
    { name: 'Novidades', icon: '📢', count: 1 }
  ];

  // --- State ---
  let state = {
    searchQuery: '',
    selectedCategory: 'Todas',
    selectedAudience: 'all',
    currentArticleId: null
  };

  // --- Elements ---
  let elCatalogView = null;
  let elArticleView = null;
  let elSearchInput = null;
  let elSearchClear = null;
  let elCategoryPills = null;
  let elAudiencePills = null;
  let elArticlesGrid = null;
  let elNoResults = null;

  // --- Initialize ---
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
      // Filtro de Categoria
      if (state.selectedCategory !== 'Todas' && art.category !== state.selectedCategory) {
        return false;
      }
      // Filtro de Público
      if (state.selectedAudience !== 'all' && art.audience !== state.selectedAudience) {
        return false;
      }
      // Filtro de Busca por Texto
      if (state.searchQuery) {
        const query = state.searchQuery;
        const inTitle = art.title.toLowerCase().includes(query);
        const inSummary = art.summary.toLowerCase().includes(query);
        const inCategory = art.category.toLowerCase().includes(query);
        const inSteps = art.steps && art.steps.some(s => s.title.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query));
        return inTitle || inSummary || inCategory || inSteps;
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

  // --- Navegação entre Catálogo e Leitor de Artigo ---
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

    // Sumário HTML
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

    // Passo a Passo com Placeholders de Imagem
    let stepsHTML = '';
    if (article.steps && article.steps.length > 0) {
      stepsHTML = article.steps.map(step => `
        <div class="kb-step-card">
          <div class="kb-step-header">
            <span class="kb-step-num">${step.num}</span>
            <h3 class="kb-step-title">${escapeHTML(step.title)}</h3>
          </div>
          <p>${escapeHTML(step.desc)}</p>
          
          <!-- Bloco Placeholder de Imagem conforme diretriz do usuário -->
          <div class="kb-image-placeholder-box">
            <span class="kb-image-placeholder-icon">🖼️</span>
            <span class="kb-image-placeholder-text">${escapeHTML(step.imagePlaceholder || 'colocar imagem da tela correspondente')}</span>
            <span class="kb-image-placeholder-caption">Ilustração visual da interface do sistema</span>
          </div>
        </div>
      `).join('');
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

    // Renderiza HTML do Artigo Completo
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
          <!-- Coluna de Conteúdo Principal -->
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

              <!-- Bloco Comercial CTA para Conhecer a Plataforma -->
              <div class="kb-commercial-cta">
                <div>
                  <h4>Gostou deste recurso?</h4>
                  <p>Crie avaliações online seguras com o logotipo e as cores da sua empresa.</p>
                </div>
                <div class="kb-cta-actions">
                  <a class="button primary" href="./solicitar-acesso.html" style="background: #2563eb; color: #fff; text-decoration: none;">Solicitar Acesso</a>
                  <a class="button secondary" href="./contato.html" style="background: #ffffff; color: #0f172a; text-decoration: none;">Fale com Especialista</a>
                </div>
              </div>

              <!-- Widget de Feedback -->
              <div class="kb-feedback-box" id="kb-feedback-container">
                <div class="kb-feedback-question">Este conteúdo foi útil para você?</div>
                <div class="kb-feedback-buttons">
                  <button class="kb-btn-feedback" type="button" onclick="window.sendKnowledgeFeedback(true)">👍 Sim</button>
                  <button class="kb-btn-feedback" type="button" onclick="window.sendKnowledgeFeedback(false)">👎 Não</button>
                </div>
              </div>
            </div>
          </main>

          <!-- Coluna Lateral de Ações e Links -->
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

  // --- Ações de Interatividade ---
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
