/**
 * generate_knowledge_base_screenshots.js
 *
 * Script de automação com Playwright para captura de prints reais das telas
 * da plataforma Online Teste para uso na Base de Conhecimento pública.
 *
 * Uso:
 *   npm run docs:screenshots
 *   ou: node scripts/generate_knowledge_base_screenshots.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const zipfile = require('archiver');

// ── Configurações de Ambiente ──────────────────────────────────────────────
const BASE_URL = process.env.APP_URL || 'http://127.0.0.1:5500';
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'base-conhecimento-imagens');
const ZIP_OUTPUT = path.join(ROOT_DIR, 'base-conhecimento-imagens.zip');

const FOLDERS = [
  'site-publico/home',
  'site-publico/login',
  'site-publico/base-conhecimento',
  'empresa/participantes',
  'empresa/exames',
  'empresa/questoes',
  'empresa/importacao',
  'empresa/documentos',
  'empresa/monitoramento',
  'empresa/resultados',
  'participante/acesso',
  'participante/documentos',
  'participante/prova',
  'participante/resultados',
  'artigos/como-criar-participante',
  'artigos/como-salvar-rascunho',
  'artigos/como-importar-questoes',
  'artigos/como-usar-perguntas-e-gabarito',
  'artigos/como-anexar-documentos',
  'relatorios'
];

let serverProcess = null;
const reportCaptured = [];
const reportFailed = [];

// ── Função Principal ──────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Iniciando Automação de Capturas para a Base de Conhecimento...');

  // 1. Prepara Diretórios
  prepareDirectories();

  // 2. Garante que o Servidor Local está rodando
  await ensureServerRunning();

  // 3. Executa as Capturas com Playwright
  await executeCaptures();

  // 4. Gera Manifestos e Documentações
  generateManifests();

  // 5. Enpacota em ZIP
  await createZipArchive();

  // 6. Encerra Servidor se foi iniciado por este script
  if (serverProcess) {
    serverProcess.kill();
    console.log('🛑 Servidor local encerrado.');
  }

  console.log('\n✨ Automação concluída com sucesso!');
  console.log(`📦 Arquivo final gerado: ${ZIP_OUTPUT}`);
  console.log(`📊 Telas capturadas: ${reportCaptured.length} | Falhas: ${reportFailed.length}`);
}

// ── 1. Preparação dos Diretórios ──────────────────────────────────────────
function prepareDirectories() {
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  FOLDERS.forEach(subfolder => {
    fs.mkdirSync(path.join(OUTPUT_DIR, subfolder), { recursive: true });
  });

  console.log('📁 Estrutura de pastas criada em base-conhecimento-imagens/');
}

// ── 2. Checagem e Inicialização do Servidor ───────────────────────────────
function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServerRunning() {
  const isRunning = await checkServerReady();
  if (isRunning) {
    console.log(`🌐 Servidor local detectado em execução: ${BASE_URL}`);
    return;
  }

  console.log('⚙️ Servidor local não detectado. Iniciando secure_app.py...');
  serverProcess = spawn('python', ['secure_app.py'], { cwd: ROOT_DIR, stdio: 'ignore' });

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await checkServerReady()) {
      console.log(`✅ Servidor secure_app.py pronto em: ${BASE_URL}`);
      return;
    }
  }

  throw new Error('Não foi possível conectar ao servidor local secure_app.py.');
}

// ── 3. Execução das Capturas ──────────────────────────────────────────────
async function executeCaptures() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // Mapeamento de todas as capturas planejadas
  const TASKS = [
    // ── Site Público ──────────────────────────────────────────────────────
    {
      category: 'site-publico/home',
      filename: '01-site-home.png',
      url: '/index.html',
      description: 'Página inicial pública do site institucional com hero e diferenciais.',
      article: 'conheca-a-plataforma-online-teste',
      step: 1
    },
    {
      category: 'site-publico/home',
      filename: '02-site-quemsomos.png',
      url: '/QuemSomos.html',
      description: 'Página institucional Sobre Nós com propósito e valores.',
      article: 'conheca-a-plataforma-online-teste',
      step: 2
    },
    {
      category: 'site-publico/home',
      filename: '03-site-faq.png',
      url: '/FAQ.html',
      description: 'Página de Perguntas Frequentes pública.',
      article: 'conheca-a-plataforma-online-teste',
      step: 3
    },
    {
      category: 'site-publico/home',
      filename: '04-site-contato.png',
      url: '/contato.html',
      description: 'Formulário de contato e canais de suporte.',
      article: 'conheca-a-plataforma-online-teste',
      step: 4
    },
    {
      category: 'site-publico/home',
      filename: '05-site-solicitar-acesso.png',
      url: '/SolicitarAcesso.html',
      description: 'Formulário público de solicitação de acesso para empresas.',
      article: 'conheca-a-plataforma-online-teste',
      step: 5
    },
    {
      category: 'site-publico/login',
      filename: '06-site-login-empresa.png',
      url: '/login_empresa.html',
      description: 'Tela de login para empresas contratantes com credenciais corporativas.',
      article: 'como-criar-um-novo-participante',
      step: 1
    },
    {
      category: 'site-publico/login',
      filename: '07-site-login-participante.png',
      url: '/login.html',
      description: 'Tela de login para candidatos e participantes do exame.',
      article: 'como-configurar-envio-acesso',
      step: 1
    },
    {
      category: 'site-publico/base-conhecimento',
      filename: '08-site-base-conhecimento-home.png',
      url: '/base-conhecimento.html',
      description: 'Página inicial pública da Base de Conhecimento com busca e categorias.',
      article: 'conheca-a-plataforma-online-teste',
      step: 6
    },
    {
      category: 'site-publico/base-conhecimento',
      filename: '09-site-artigo-como-criar-participante.png',
      url: '/base-conhecimento.html#artigo-como-criar-um-novo-participante',
      description: 'Leitor completo do artigo público "Como criar um novo participante".',
      article: 'como-criar-um-novo-participante',
      step: 2
    },
    {
      category: 'site-publico/base-conhecimento',
      filename: '10-site-artigo-como-importar-questoes.png',
      url: '/base-conhecimento.html#artigo-como-importar-questoes',
      description: 'Leitor completo do artigo público "Como importar questões".',
      article: 'como-importar-questoes',
      step: 1
    },

    // ── Área da Empresa ───────────────────────────────────────────────────
    {
      category: 'empresa/participantes',
      filename: '11-empresa-dashboard-main.png',
      url: '/login_cliente.html',
      description: 'Painel principal da empresa (Estúdio de Testes).',
      article: 'como-salvar-um-exame-como-rascunho',
      step: 1
    },
    {
      category: 'empresa/participantes',
      filename: '12-empresa-participantes-listagem.png',
      url: '/login_cliente.html#participantes',
      description: 'Lista de participantes cadastrados na empresa.',
      article: 'como-criar-um-novo-participante',
      step: 1,
      selector: '#participants-section'
    },
    {
      category: 'empresa/participantes',
      filename: '13-empresa-participantes-novo-modal.png',
      url: '/login_cliente.html#participantes',
      action: async (p) => {
        await p.click('#btn-open-create-participant-modal').catch(() => {});
        await p.waitForTimeout(300);
      },
      description: 'Modal centralizado para cadastro individual de novo participante.',
      article: 'como-criar-um-novo-participante',
      step: 2,
      selector: '#modal-add-participant'
    },
    {
      category: 'empresa/participantes',
      filename: '14-empresa-participantes-importar-csv-modal.png',
      url: '/login_cliente.html#participantes',
      action: async (p) => {
        await p.click('#btn-import-participants-csv').catch(() => {});
        await p.waitForTimeout(300);
      },
      description: 'Modal de importação de participantes em lote via arquivo CSV.',
      article: 'como-importar-participantes-por-csv',
      step: 1,
      selector: '#modal-import-csv'
    },

    // ── Exames e Construtor ───────────────────────────────────────────────
    {
      category: 'empresa/exames',
      filename: '15-empresa-exames-rascunho-indicador.png',
      url: '/login_cliente.html',
      description: 'Indicador visual de estado de Rascunho no cabeçalho do exame.',
      article: 'como-salvar-um-exame-como-rascunho',
      step: 1,
      selector: '.editor-header'
    },
    {
      category: 'empresa/exames',
      filename: '16-empresa-envio-acesso-painel.png',
      url: '/login_cliente.html',
      description: 'Painel de configuração de envio de credenciais de acesso.',
      article: 'como-configurar-envio-acesso',
      step: 1,
      selector: '.email-send-section'
    },
    {
      category: 'empresa/documentos',
      filename: '17-empresa-documentos-painel.png',
      url: '/login_cliente.html',
      description: 'Painel de Gestão de Documentos, Regras e Termos anexados ao exame.',
      article: 'como-anexar-documentos-e-termos',
      step: 1,
      selector: '#document-manager-section'
    },
    {
      category: 'empresa/documentos',
      filename: '18-empresa-documentos-anexo-modal.png',
      url: '/login_cliente.html',
      action: async (p) => {
        await p.click('#add-document-btn').catch(() => {});
        await p.waitForTimeout(300);
      },
      description: 'Modal de anexo de documento/termo com regras de aceite e devolução assinado.',
      article: 'como-anexar-documentos-e-termos',
      step: 2,
      selector: '#document-modal'
    },

    // ── Construtor e Assistente de Importação ───────────────────────────────
    {
      category: 'empresa/questoes',
      filename: '19-empresa-construtor-questoes.png',
      url: '/login_cliente.html',
      description: 'Área do construtor de questões com toolbar e opções de importação.',
      article: 'como-importar-questoes',
      step: 1,
      selector: '.question-import-card'
    },
    {
      category: 'empresa/importacao',
      filename: '20-empresa-importacao-assistente-etapa1.png',
      url: '/login_cliente.html',
      action: async (p) => {
        await p.click('#import-questions').catch(() => {});
        await p.waitForTimeout(300);
      },
      description: 'Etapa 1 do Assistente de Importação de Questões: escolha do formato de arquivo.',
      article: 'como-importar-questoes',
      step: 1,
      selector: '#qimp-modal-backdrop'
    },
    {
      category: 'empresa/importacao',
      filename: '21-empresa-importacao-assistente-etapa2-preview.png',
      url: '/login_cliente.html',
      action: async (p) => {
        await p.click('#import-questions').catch(() => {});
        await p.waitForTimeout(200);
        await p.click('#qimp-btn-step1-next').catch(() => {});
        await p.waitForTimeout(300);
      },
      description: 'Etapa 2 do Assistente: Pré-visualização e edição dos cartões de questões.',
      article: 'como-importar-questoes',
      step: 2,
      selector: '#qimp-modal-backdrop'
    },
    {
      category: 'empresa/importacao',
      filename: '22-empresa-importacao-assistente-etapa3-confirmacao.png',
      url: '/login_cliente.html',
      action: async (p) => {
        await p.click('#import-questions').catch(() => {});
        await p.waitForTimeout(200);
        await p.click('#qimp-btn-step1-next').catch(() => {});
        await p.waitForTimeout(200);
        await p.click('#qimp-btn-step2-next').catch(() => {});
        await p.waitForTimeout(300);
      },
      description: 'Etapa 3 do Assistente: Resumo e confirmação de inserção no teste.',
      article: 'como-importar-questoes',
      step: 3,
      selector: '#qimp-confirm-overlay'
    },
    {
      category: 'empresa/importacao',
      filename: '23-empresa-importacao-modelos-modal.png',
      url: '/login_cliente.html',
      action: async (p) => {
        await p.click('#btn-show-models').catch(() => {});
        await p.waitForTimeout(300);
      },
      description: 'Modal de download de modelos e especificação de formatos (Excel, Word, CSV, GIFT).',
      article: 'como-importar-questoes',
      step: 4,
      selector: '#models-modal'
    },

    // ── Monitoramento e Resultados ─────────────────────────────────────────
    {
      category: 'empresa/monitoramento',
      filename: '24-empresa-monitoramento-ao-vivo.png',
      url: '/login_cliente.html#monitoramento',
      description: 'Painel de monitoramento ao vivo de participantes realizando o exame.',
      article: 'como-acompanhar-o-exame-em-tempo-real',
      step: 1
    },
    {
      category: 'empresa/resultados',
      filename: '25-empresa-resultados-dashboard.png',
      url: '/login_cliente.html#resultados',
      description: 'Dashboard de Resultados com notas, métricas e estatísticas consolidadas.',
      article: 'como-visualizar-os-resultados',
      step: 1
    },

    // ── Área do Participante ───────────────────────────────────────────────
    {
      category: 'participante/acesso',
      filename: '26-participante-tela-inicial.png',
      url: '/participant_application.html',
      description: 'Tela inicial de acesso do participante com orientações do exame.',
      article: 'como-exigir-assinatura-antes-da-prova',
      step: 1
    },
    {
      category: 'participante/documentos',
      filename: '27-participante-documentos-pendentes.png',
      url: '/participant_application.html',
      description: 'Visualização de termos e documentos obrigatórios antes do início da prova.',
      article: 'como-exigir-assinatura-antes-da-prova',
      step: 2
    }
  ];

  for (const task of TASKS) {
    const fullUrl = `${BASE_URL}${task.url}`;
    const targetPath = path.join(OUTPUT_DIR, task.category, task.filename);

    try {
      console.log(`📸 Capturando: [${task.category}] ${task.filename}...`);
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await page.waitForTimeout(400);

      if (task.action) {
        await task.action(page);
      }

      if (task.selector) {
        const element = await page.$(task.selector);
        if (element) {
          await element.screenshot({ path: targetPath });
        } else {
          await page.screenshot({ path: targetPath, fullPage: false });
        }
      } else {
        await page.screenshot({ path: targetPath, fullPage: false });
      }

      // Adiciona cópia na pasta do artigo correspondente se especificado
      if (task.article) {
        const articleFolder = path.join(OUTPUT_DIR, 'artigos', task.article);
        if (fs.existsSync(articleFolder)) {
          const articlePath = path.join(articleFolder, task.filename);
          fs.copyFileSync(targetPath, articlePath);
        }
      }

      reportCaptured.push({
        file: `${task.category}/${task.filename}`,
        route: task.url,
        description: task.description,
        article: task.article,
        step: task.step
      });

    } catch (err) {
      console.error(`❌ Falha ao capturar ${task.filename}: ${err.message}`);
      reportFailed.push({
        file: `${task.category}/${task.filename}`,
        route: task.url,
        error: err.message
      });
    }
  }

  await browser.close();
}

// ── 4. Geração de Manifestos e Documentações ─────────────────────────────
function generateManifests() {
  console.log('📝 Gerando manifestos e relatórios de documentação...');

  // A. mapa-imagens-base-conhecimento.md
  let mdMap = `# Mapa Completo de Imagens da Base de Conhecimento\n\n`;
  mdMap += `Gerado automaticamente em: ${new Date().toLocaleString('pt-BR')}\n\n`;
  mdMap += `Total de capturas bem-sucedidas: ${reportCaptured.length}\n`;
  mdMap += `Total de falhas: ${reportFailed.length}\n\n`;
  mdMap += `---\n\n`;

  reportCaptured.forEach(item => {
    mdMap += `### ${item.file}\n`;
    mdMap += `- **Rota:** \`${item.route}\`\n`;
    mdMap += `- **Artigo Relacionado:** \`${item.article || 'Geral'}\` (Passo ${item.step || 1})\n`;
    mdMap += `- **Descrição:** ${item.description}\n`;
    mdMap += `- **Legenda Sugerida:** ${item.description}\n`;
    mdMap += `- **Texto Alternativo (alt):** Captura real da tela ${item.description}\n\n`;
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, 'mapa-imagens-base-conhecimento.md'), mdMap, 'utf-8');

  // B. manifesto-imagens.json
  const articlesMap = {};
  reportCaptured.forEach(item => {
    if (!item.article) return;
    if (!articlesMap[item.article]) articlesMap[item.article] = [];
    articlesMap[item.article].push({
      step: item.step || 1,
      file: item.file,
      caption: item.description,
      alt: `Captura de tela: ${item.description}`,
      route: item.route
    });
  });

  const manifestoJSON = {
    generatedAt: new Date().toISOString(),
    totalImages: reportCaptured.length,
    articles: Object.keys(articlesMap).map(slug => ({
      slug,
      images: articlesMap[slug]
    }))
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifesto-imagens.json'), JSON.stringify(manifestoJSON, null, 2), 'utf-8');

  // C. onde-colocar-as-imagens.md
  let mdLocations = `# Onde Colocar as Imagens no Projeto\n\n`;
  mdLocations += `Este guia orienta o destino final de cada imagem do pacote ZIP dentro da estrutura do projeto.\n\n`;
  mdLocations += `## Diretório Recomendado no Projeto:\n`;
  mdLocations += `\`front-end/assets/images/base-conhecimento/\`\n\n`;
  mdLocations += `| Imagem no ZIP | Artigo de Destino | Tag HTML Sugerida |\n`;
  mdLocations += `|:---|:---|:---|\n`;

  reportCaptured.forEach(item => {
    mdLocations += `| \`${item.file}\` | \`${item.article || 'Geral'}\` | \`<img src="./assets/images/base-conhecimento/${path.basename(item.file)}" alt="${item.description}">\` |\n`;
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, 'onde-colocar-as-imagens.md'), mdLocations, 'utf-8');

  // D. relatorios/falhas-captura.md
  let mdFailures = `# Relatório de Falhas de Captura\n\n`;
  if (reportFailed.length === 0) {
    mdFailures += `✅ **Nenhuma falha registrada!** Todas as capturas foram concluídas com 100% de sucesso.\n`;
  } else {
    mdFailures += `⚠️ Foram encontradas ${reportFailed.length} falha(s):\n\n`;
    reportFailed.forEach(f => {
      mdFailures += `- **Arquivo:** \`${f.file}\` | **Rota:** \`${f.route}\` | **Erro:** ${f.error}\n`;
    });
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'relatorios', 'falhas-captura.md'), mdFailures, 'utf-8');

  // E. README.md
  let mdReadme = `# Pacote de Imagens da Base de Conhecimento (Online Teste)\n\n`;
  mdReadme += `Este pacote foi gerado de forma 100% automatizada utilizando **Playwright** no ambiente local.\n\n`;
  mdReadme += `## Como Executar Novamente a Captura:\n`;
  mdReadme += `\`\`\`bash\n`;
  mdReadme += `npm run docs:screenshots\n`;
  mdReadme += `\`\`\`\n\n`;
  mdReadme += `## Conteúdo do Pacote:\n`;
  mdReadme += `- \`site-publico/\`: Capturas das páginas institucionais públicas.\n`;
  mdReadme += `- \`empresa/\`: Capturas dos módulos do painel da empresa.\n`;
  mdReadme += `- \`participante/\`: Capturas do ambiente do candidato.\n`;
  mdReadme += `- \`artigos/\`: Imagens organizadas por slug de artigo.\n`;
  mdReadme += `- \`mapa-imagens-base-conhecimento.md\`: Mapeamento detalhado.\n`;
  mdReadme += `- \`manifesto-imagens.json\`: Manifesto de importação em JSON.\n`;
  mdReadme += `- \`onde-colocar-as-imagens.md\`: Guia de integração HTML.\n`;
}

// ── 5. Empacotamento ZIP ──────────────────────────────────────────────────
function createZipArchive() {
  return new Promise((resolve, reject) => {
    console.log('📦 Criando arquivo base-conhecimento-imagens.zip...');
    const output = fs.createWriteStream(ZIP_OUTPUT);
    const archive = zipfile('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✅ ZIP criado: ${ZIP_OUTPUT} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(OUTPUT_DIR, 'base-conhecimento-imagens');
    archive.finalize();
  });
}

// Execute main
main().catch(err => {
  console.error('🔥 Erro na execução da automação:', err);
  process.exit(1);
});
