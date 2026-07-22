(function () {
  "use strict";

  const STORAGE_KEY = "onlineTesteLanguage";
  const PORTUGUESE = "pt-BR";
  const ENGLISH = "en";

  const translations = {
    "Home": "Home",
    "Sobre Nós": "About Us",
    "Sobre nós": "About us",
    "Soluções": "Solutions",
    "Planos": "Plans",
    "Contato": "Contact",
    "Login Participantes": "Participant Login",
    "Login Empresa": "Company Login",
    "Admin": "Admin",
    "Institucional": "Company",
    "Política de Privacidade": "Privacy Policy",
    "Perguntas frequentes": "Frequently asked questions",
    "© 2026 Online Teste. Todos os direitos reservados.": "© 2026 Online Teste. All rights reserved.",
    "Avaliações online simples, práticas e seguras para empresas e participantes.": "Simple, practical and secure online assessments for companies and participants.",
    "Fale conosco pelo WhatsApp": "Contact us on WhatsApp",
    "Online Teste - Página inicial": "Online Teste - Home page",
    "Navegação principal": "Main navigation",

    "Centro de Testes": "Testing Center",
    "Avaliações online simples, seguras e": "Simple, secure online assessments",
    "com a sua marca": "with your brand",
    "Crie, aplique e acompanhe testes em uma plataforma completa para sua organização.": "Create, deliver and track tests on a complete platform for your organization.",
    "Quero conhecer": "Learn more",
    "Acessar plataforma": "Access platform",
    "Solicitar acesso": "Request access",
    "Tudo em um só lugar": "Everything in one place",
    "Uma experiência completa de avaliação": "A complete assessment experience",
    "Do primeiro cadastro à análise final, sua equipe trabalha com clareza e agilidade.": "From initial registration to final analysis, your team works with clarity and agility.",
    "Crie avaliações": "Create assessments",
    "Monte testes personalizados, organize questões e publique quando estiver pronto.": "Build customized tests, organize questions and publish when ready.",
    "Gerencie participantes": "Manage participants",
    "Cadastre pessoas, acompanhe acessos e mantenha todas as informações organizadas.": "Register people, track access and keep all information organized.",
    "Analise resultados": "Analyze results",
    "Visualize indicadores e transforme os resultados em decisões mais inteligentes.": "View indicators and turn results into smarter decisions.",
    "Pronto para transformar suas avaliações?": "Ready to transform your assessments?",
    "Conheça uma plataforma criada para simplificar todo o processo.": "Discover a platform built to simplify the entire process.",
    "Fale com um especialista": "Talk to a specialist",
    "Online Teste | Avaliações online simples e seguras": "Online Teste | Simple and secure online assessments",
    "ATIVAÇÃO SEGURA": "SECURE ACTIVATION",
    "Crie sua senha": "Create your password",
    "Validando seu convite de acesso...": "Validating your access invitation...",
    "Nova senha": "New password",
    "Confirme a nova senha": "Confirm your new password",
    "Use pelo menos 12 caracteres, com letra maiúscula, minúscula e número.": "Use at least 12 characters with an uppercase letter, a lowercase letter and a number.",
    "Ativar meu acesso": "Activate my access",
    "Ir para o login da empresa": "Go to company login",
    "Ativar acesso | Online Teste": "Activate access | Online Teste",
    "Avaliação publicada": "Published assessment",
    "+10 mil": "10k+",
    "Prévia do painel da plataforma": "Platform dashboard preview",
    "avaliações realizadas": "assessments delivered",
    "de disponibilidade": "uptime",
    "Suporte": "Support",
    "especializado para sua equipe": "specialized for your team",
    "especializado": "specialized",
    "Segurança": "Security",
    "em cada acesso": "with every access",

    "Sobre a Online Teste": "About Online Teste",
    "Nosso propósito é impulsionar pessoas e organizações por meio de avaliações inteligentes.": "Our purpose is to empower people and organizations through intelligent assessments.",
    "O Centro de Testes Online Teste, parte do Grupo ACerT – Academia Brasileira de Certificações e Treinamentos, foi desenvolvido para transformar a forma como avaliações são realizadas. Nosso objetivo é oferecer soluções modernas e eficazes para órgãos certificadores, instituições de ensino, universidades corporativas, empresas e agências de emprego. Com foco em agilidade, confiabilidade e acessibilidade, proporcionamos resultados rápidos e precisos, sempre com um excelente custo-benefício. Acreditamos que avaliações de qualidade são a base para impulsionar carreiras, negócios e educação.": "The Online Teste Testing Center, part of the ACerT Group – Brazilian Academy of Certifications and Training, was developed to transform how assessments are conducted. Our goal is to provide modern and effective solutions for certification bodies, educational institutions, corporate universities, companies and recruitment agencies. Focused on agility, reliability and accessibility, we deliver fast and accurate results with excellent value. We believe quality assessments are the foundation for advancing careers, businesses and education.",
    "O que nos guia": "What guides us",
    "Valores presentes em cada entrega": "Values reflected in every delivery",
    "Confiança": "Trust",
    "Relações transparentes e uma plataforma confiável.": "Transparent relationships and a reliable platform.",
    "Inovação": "Innovation",
    "Evolução constante para simplificar processos.": "Continuous evolution to simplify processes.",
    "Excelência": "Excellence",
    "Cuidado com cada detalhe da experiência.": "Care in every detail of the experience.",
    "Transparência": "Transparency",
    "Comunicação clara em todas as etapas.": "Clear communication at every stage.",
    "Nossa trajetória": "Our journey",
    "Tecnologia que acompanha o crescimento da sua organização": "Technology that grows with your organization",
    "Evoluímos ouvindo clientes e participantes para entregar uma solução cada vez mais completa.": "We evolve by listening to clients and participants to deliver an increasingly complete solution.",
    "Começamos com um propósito claro": "We started with a clear purpose",
    "Simplificar a aplicação de testes online.": "Simplify online test delivery.",
    "Crescemos junto com nossos clientes": "We grow alongside our clients",
    "Novos recursos nasceram de necessidades reais.": "New features were born from real needs.",
    "Seguimos olhando para o futuro": "We keep looking ahead",
    "Segurança, personalização e inteligência em evolução contínua.": "Security, customization and intelligence in continuous evolution.",
    "Sobre Nós | Online Teste": "About Us | Online Teste",

    "Soluções Online Teste": "Online Teste Solutions",
    "Soluções completas para cada etapa da avaliação": "Complete solutions for every assessment stage",
    "Mais autonomia para sua equipe, uma experiência melhor para o participante e dados claros para orientar decisões.": "More autonomy for your team, a better participant experience and clear data to guide decisions.",
    "Tudo o que sua organização precisa": "Everything your organization needs",
    "Recursos conectados para transformar avaliações complexas em um fluxo simples.": "Connected features that turn complex assessments into a simple workflow.",
    "Provas personalizadas": "Customized tests",
    "Crie questões, organize seções e ajuste a avaliação à sua necessidade.": "Create questions, organize sections and tailor the assessment to your needs.",
    "Aplicação segura": "Secure delivery",
    "Controle acessos, períodos de disponibilidade e regras de aplicação.": "Control access, availability periods and delivery rules.",
    "Relatórios detalhados": "Detailed reports",
    "Acompanhe desempenho individual e indicadores gerais em um só lugar.": "Track individual performance and overall indicators in one place.",
    "Personalização": "Customization",
    "Leve a identidade visual da sua organização para toda a experiência.": "Bring your organization's visual identity to the entire experience.",
    "Como funciona": "How it works",
    "Da criação ao resultado em três etapas": "From creation to results in three steps",
    "Configure": "Configure",
    "Defina informações, questões, aparência e regras da avaliação.": "Define information, questions, appearance and assessment rules.",
    "Convide": "Invite",
    "Cadastre participantes e compartilhe o acesso com segurança.": "Register participants and securely share access.",
    "Acompanhe": "Track",
    "Veja resultados e indicadores assim que as respostas forem enviadas.": "View results and indicators as soon as answers are submitted.",
    "Tipos de testes aplicados": "Types of tests delivered",
    "Avaliações para diferentes objetivos": "Assessments for different goals",
    "Testes institucionais": "Institutional tests",
    "Exames de Certificação": "Certification exams",
    "Testes de Recrutamento": "Recruitment tests",
    "Estrutura da avaliação": "Assessment structure",
    "Segurança, autonomia e resultados em um só ambiente": "Security, autonomy and results in one environment",
    "Reconhecimento facial para maior segurança": "Facial recognition for greater security",
    "Monitoramento em tempo real via Dashboard": "Real-time monitoring via dashboard",
    "Correção automática de questões objetivas": "Automatic grading of objective questions",
    "Resultados imediatos para tomada de decisões rápidas": "Immediate results for faster decisions",
    "Gravação disponível para download e arquivamento": "Recording available for download and archiving",
    "Personalização completa com a marca do cliente": "Complete customization with the client's brand",
    "Inclusão e gerenciamento de testes pelo cliente": "Test creation and management by the client",
    "Controle total de participantes pelo cliente": "Full participant control by the client",
    "Preparada para integrar ao seu ecossistema": "Ready to integrate with your ecosystem",
    "Conecte processos e simplifique o acesso de sua equipe.": "Connect processes and simplify access for your team.",
    "Integração flexível com sistemas e fluxos internos.": "Flexible integration with internal systems and workflows.",
    "Acesso centralizado, prático e seguro para sua organização.": "Centralized, convenient and secure access for your organization.",
    "As condições são personalizadas de acordo com o volume, os recursos e as necessidades de cada organização.": "Terms are customized according to each organization's volume, features and needs.",
    "Encontre a solução ideal para sua equipe": "Find the ideal solution for your team",
    "Converse com um especialista e conheça as possibilidades.": "Talk to a specialist and explore the possibilities.",
    "Soluções | Online Teste": "Solutions | Online Teste",

    "Planos Online Teste": "Online Teste Plans",
    "Uma solução que acompanha cada fase da sua organização": "A solution that supports every stage of your organization",
    "Escolha o conjunto de recursos mais adequado e solicite uma proposta personalizada para sua necessidade.": "Choose the most suitable set of features and request a proposal tailored to your needs.",
    "Encontre o plano ideal": "Find the ideal plan",
    "Todos os planos oferecem uma experiência segura, simples e preparada para evoluir.": "All plans provide a secure, simple experience designed to grow.",
    "Essencial": "Essential",
    "Para organizações que buscam uma solução ágil e segura para aplicar suas avaliações online.": "For organizations seeking an agile and secure solution to deliver online assessments.",
    "Criação de avaliações": "Assessment creation",
    "Cadastro de participantes": "Participant registration",
    "Correção automática": "Automatic grading",
    "Relatórios essenciais": "Essential reports",
    "Suporte por e-mail": "Email support",
    "Solicitar proposta": "Request a proposal",
    "Mais escolhido": "Most popular",
    "Pró": "Pro",
    "Para empresas que demandam maior controle, relatórios avançados e personalização visual.": "For companies that require greater control, advanced reports and visual customization.",
    "Todos os recursos do Essencial": "All Essential features",
    "Identidade visual personalizada": "Customized visual identity",
    "Relatórios avançados": "Advanced reports",
    "Gestão ampliada de usuários": "Expanded user management",
    "Suporte prioritário": "Priority support",
    "Para grandes operações que exigem escala, integrações via API e atendimento exclusivo.": "For large operations requiring scale, API integrations and exclusive service.",
    "Todos os recursos do Pró": "All Pro features",
    "Volume personalizado": "Customized volume",
    "Integrações via API": "API integrations",
    "Acesso SSO": "SSO access",
    "Atendimento dedicado": "Dedicated service",
    "Plano Flex": "Flex Plan",
    "Para demandas pontuais ou sazonais de testes e avaliações, com validade ilimitada.": "For occasional or seasonal testing and assessment needs, with no expiration date.",
    "Sem mensalidade ou assinatura": "No monthly fee or subscription",
    "Créditos sem prazo de validade": "Credits with no expiration date",
    "Recursos do plano Pró inclusos": "Pro plan features included",
    "Ativação imediata pós-compra": "Immediate activation after purchase",
    "Precisa de ajuda para escolher?": "Need help choosing?",
    "Nossa equipe entende seu cenário e recomenda a melhor configuração.": "Our team understands your situation and recommends the best setup.",
    "Conversar com a equipe": "Talk to our team",
    "Planos | Online Teste": "Plans | Online Teste",

    "Fale com a Online Teste": "Talk to Online Teste",
    "Estamos prontos para": "We are ready to",
    "ajudar você.": "help you.",
    "Converse com nossa equipe para tirar dúvidas, conhecer a plataforma ou encontrar a melhor solução para sua organização.": "Talk to our team to ask questions, explore the platform or find the best solution for your organization.",
    "Conversar no WhatsApp": "Chat on WhatsApp",
    "Enviar e-mail": "Send email",
    "Atendimento comercial": "Sales support",
    "Segunda a sexta-feira": "Monday to Friday",
    "das 9h às 18h": "9 a.m. to 6 p.m.",
    "Responderemos o mais breve possível.": "We will reply as soon as possible.",
    "Canais de atendimento": "Contact channels",
    "Escolha como prefere falar com a gente": "Choose how you prefer to contact us",
    "Nossa equipe está disponível para orientar você em cada etapa.": "Our team is available to guide you at every stage.",
    "Telefone": "Phone",
    "Ligar agora →": "Call now →",
    "Iniciar conversa →": "Start chat →",
    "E-mail comercial": "Sales email",
    "Enviar mensagem →": "Send message →",
    "Correspondências": "Mailing address",
    "Onde estamos": "Where we are",
    "Abrir no Google Maps ↗": "Open in Google Maps ↗",
    "Quer conhecer a plataforma?": "Would you like to explore the platform?",
    "Veja como a Online Teste pode simplificar as avaliações da sua organização.": "See how Online Teste can simplify your organization's assessments.",
    "Conhecer soluções →": "Explore solutions →",
    "Contato | Online Teste": "Contact | Online Teste",

    "Central de dúvidas": "Help center",
    "Conheça os principais recursos, públicos e regras da plataforma Online Teste.": "Learn about the main features, audiences and rules of the Online Teste platform.",
    "O que é a plataforma Online Teste?": "What is the Online Teste platform?",
    "O Online Teste é uma plataforma completa e em nuvem para criação, aplicação e acompanhamento de exames, simulados e avaliações online. Ela foi desenhada para que organizações tenham total autonomia na gestão de seus processos avaliativos com agilidade, segurança e precisão.": "Online Teste is a complete cloud platform for creating, delivering and tracking exams, mock tests and online assessments. It was designed to give organizations full autonomy to manage their assessment processes with agility, security and accuracy.",
    "Quem pode utilizar a plataforma?": "Who can use the platform?",
    "O sistema atende a organizações que necessitam aplicar avaliações e exames oficiais de forma estruturada e com alto nível de controle, como:": "The system serves organizations that need to deliver official assessments and exams in a structured, highly controlled manner, including:",
    "Órgãos Certificadores e Entidades de Classe:": "Certification Bodies and Professional Associations:",
    "Departamentos de Recursos Humanos e Recrutadoras:": "Human Resources Departments and Recruiters:",
    "Instituições de Ensino e Faculdades:": "Educational Institutions and Colleges:",
    "Como funciona a personalização visual com a minha marca?": "How does visual customization with my brand work?",
    "Nos planos Pró e Enterprise, a plataforma opera sob o modelo de identidade visual personalizada. Seus candidatos e alunos realizam as provas em um ambiente com o logotipo, as cores e os cabeçalhos da sua organização, fortalecendo a autoridade da sua marca.": "On Pro and Enterprise plans, the platform uses a customized visual identity. Your candidates and students take tests in an environment featuring your organization's logo, colors and headers, strengthening your brand authority.",
    "A plataforma é segura contra fraudes?": "Is the platform secure against fraud?",
    "Sim. O Online Teste conta com recursos de segurança e controle de navegação, como restrição de janelas, controle do tempo de realização, randomização de perguntas e opções de resposta, além do registro completo de acessos de cada participante para ajudar a garantir a integridade da aplicação.": "Yes. Online Teste includes security and browsing controls such as window restrictions, time limits, randomized questions and answer choices, as well as complete participant access logs to help ensure assessment integrity.",
    "Como funciona o descarte de dados e a conformidade com a LGPD?": "How do data disposal and LGPD compliance work?",
    "A plataforma adota controles de acesso, armazenamento e descarte de dados alinhados à LGPD. As gravações ficam disponíveis para a empresa contratante pelo período de retenção definido no plano — atualmente configurável, com padrão de cinco dias — e são eliminadas automaticamente após o prazo operacional de aviso. Os demais dados seguem os prazos contratuais e legais aplicáveis.": "The platform adopts access, storage and data disposal controls aligned with Brazil's LGPD. Recordings remain available to the contracting company for the retention period defined in the plan—currently configurable, with a five-day default—and are automatically deleted after the operational notice period. Other data follows the applicable contractual and legal retention periods.",
    "O que é o Plano Flex e quais são suas vantagens?": "What is the Flex Plan and what are its benefits?",
    "O Plano Flex é o modelo pré-pago da plataforma. Em vez de uma mensalidade recorrente, a organização adquire um pacote fechado de créditos, com mínimo de 20 licenças de exames, que não possuem prazo de validade. É ideal para demandas pontuais ou sazonais de testes.": "The Flex Plan is the platform's prepaid model. Instead of a recurring monthly fee, the organization purchases a credit package with a minimum of 20 exam licenses and no expiration date. It is ideal for occasional or seasonal testing needs.",
    "para aplicação de exames oficiais de certificação profissional e exames de admissão.": "for official professional certification and admission exams.",
    "para testes técnicos de contratação, avaliações de conformidade e testes de competência no recrutamento e seleção.": "for technical hiring tests, compliance assessments and competency tests in recruitment and selection.",
    "para exames acadêmicos, provas de nivelamento e vestibulares online.": "for academic exams, placement tests and online entrance exams.",
    "Perguntas frequentes | Online Teste": "Frequently asked questions | Online Teste",

    "TRANSPARÊNCIA E SEGURANÇA": "TRANSPARENCY AND SECURITY",
    "Entenda como tratamos informações pessoais e utilizamos cookies em nossos serviços.": "Understand how we process personal information and use cookies in our services.",
    "Sua privacidade é importante para nós": "Your privacy is important to us",
    "É política do Centro de Testes respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site Online Teste e em outros sites que possuímos e operamos.": "It is the Testing Center's policy to respect your privacy regarding any information we may collect on the Online Teste website and other websites we own and operate.",
    "Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemos isso por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando as informações e como elas serão usadas.": "We request personal information only when we truly need it to provide a service. We do so through fair and lawful means, with your knowledge and consent. We also explain why we collect the information and how it will be used.",
    "Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.": "We retain collected information only for as long as necessary to provide the requested service. When we store data, we protect it using commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.",
    "Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.": "We do not publicly share personally identifiable information or share it with third parties, except when required by law.",
    "O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e as práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.": "Our website may link to external websites that are not operated by us. Please be aware that we have no control over their content and practices and cannot accept responsibility for their respective privacy policies.",
    "Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que talvez não possamos fornecer alguns dos serviços desejados.": "You are free to decline our request for personal information, understanding that we may then be unable to provide some requested services.",
    "O uso continuado do nosso site será considerado como aceitação de nossas práticas em torno de privacidade e informações pessoais. Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco.": "Continued use of our website will be considered acceptance of our privacy and personal information practices. If you have questions about how we handle user data and personal information, please contact us.",
    "Política de Cookies do Centro de Testes": "Testing Center Cookie Policy",
    "O que são cookies?": "What are cookies?",
    "Como usamos os cookies?": "How do we use cookies?",
    "Desativar cookies": "Disabling cookies",
    "Cookies que definimos": "Cookies we set",
    "Cookies relacionados à conta": "Account-related cookies",
    "Cookies relacionados ao login": "Login-related cookies",
    "Cookies relacionados a boletins por e-mail": "Email newsletter-related cookies",
    "Cookies relacionados ao processamento de pedidos": "Order processing-related cookies",
    "Cookies relacionados a formulários": "Form-related cookies",
    "Cookies de terceiros": "Third-party cookies",
    "Mais informações": "More information",
    "Dúvidas sobre privacidade?": "Questions about privacy?",
    "Esta política é efetiva a partir de setembro de 2020.": "This policy is effective as of September 2020.",
    "Política de Privacidade | Online Teste": "Privacy Policy | Online Teste",
    "Nesta política": "In this policy",
    "Privacidade": "Privacy",
    "Política de Cookies": "Cookie Policy",
    "Como é prática comum em quase todos os sites profissionais, este site usa cookies, que são pequenos arquivos baixados no seu computador, para melhorar sua experiência. Esta página descreve quais informações eles coletam, como as usamos e por que às vezes precisamos armazenar esses cookies. Também explicamos como você pode impedir que esses cookies sejam armazenados; no entanto, isso pode reduzir ou prejudicar determinados elementos da funcionalidade do site.": "As is common practice with almost all professional websites, this site uses cookies, which are small files downloaded to your computer, to improve your experience. This page describes what information they collect, how we use it and why we sometimes need to store these cookies. We also explain how you can prevent them from being stored; however, this may reduce or impair certain parts of the site's functionality.",
    "Utilizamos cookies por vários motivos, detalhados abaixo. Infelizmente, na maioria dos casos, não existem opções padrão do setor para desativar os cookies sem desativar completamente a funcionalidade e os recursos que eles adicionam ao site. É recomendável que você mantenha todos os cookies se não tiver certeza se precisa ou não deles, caso sejam usados para fornecer um serviço que você utiliza.": "We use cookies for several reasons, detailed below. Unfortunately, in most cases there are no industry-standard options for disabling cookies without completely disabling the functionality and features they add to the site. We recommend keeping all cookies enabled if you are unsure whether you need them, in case they are used to provide a service you use.",
    "Você pode impedir a configuração de cookies ajustando as configurações do seu navegador. Consulte a ajuda do navegador para saber como fazer isso. Esteja ciente de que a desativação de cookies afetará a funcionalidade deste e de muitos outros sites que você visita.": "You can prevent cookies from being set by adjusting your browser settings. See your browser's help section for instructions. Be aware that disabling cookies will affect the functionality of this and many other websites you visit.",
    "A desativação de cookies geralmente resultará na desativação de determinadas funcionalidades e recursos deste site. Portanto, é recomendável que você não os desative.": "Disabling cookies will usually also disable certain features and functionality of this site. Therefore, we recommend that you do not disable them.",
    "Se você criar uma conta conosco, usaremos cookies para o gerenciamento do processo de inscrição e administração geral. Esses cookies geralmente serão excluídos quando você sair do sistema, porém, em alguns casos, poderão permanecer posteriormente para lembrar as preferências do site ao sair.": "If you create an account with us, we will use cookies to manage the registration process and general administration. These cookies are usually deleted when you sign out, although in some cases they may remain to remember your site preferences after signing out.",
    "Utilizamos cookies quando você está conectado, para que possamos lembrar dessa ação. Isso evita que você precise fazer login sempre que visitar uma nova página. Esses cookies são normalmente removidos ou limpos quando você efetua logout, garantindo que apenas usuários autenticados acessem recursos e áreas restritas.": "We use cookies while you are signed in so that we can remember this. This prevents you from having to sign in whenever you visit a new page. These cookies are normally removed or cleared when you sign out, ensuring that only authenticated users can access restricted features and areas.",
    "Este site oferece serviços de assinatura de boletim informativo ou e-mail, e os cookies podem ser usados para lembrar se você já está registrado e se devemos mostrar determinadas notificações válidas apenas para usuários inscritos ou não inscritos.": "This site offers newsletter or email subscription services, and cookies may be used to remember whether you are already registered and whether certain notifications should be shown only to subscribed or unsubscribed users.",
    "Este site oferece facilidades de comércio eletrônico ou pagamento, e alguns cookies são essenciais para garantir que seu pedido seja lembrado entre as páginas, para que possamos processá-lo adequadamente.": "This site offers e-commerce or payment facilities, and some cookies are essential to ensure your order is remembered between pages so that we can process it properly.",
    "Quando você envia dados por meio de um formulário, como os encontrados nas páginas de contato ou nos formulários de comentários, os cookies podem ser configurados para lembrar os detalhes do usuário para correspondência futura.": "When you submit data through a form, such as those on contact pages or comment forms, cookies may be set to remember your details for future correspondence.",
    "Em alguns casos especiais, também usamos cookies fornecidos por terceiros confiáveis. A seção a seguir detalha quais cookies de terceiros você pode encontrar neste site.": "In some special cases, we also use cookies provided by trusted third parties. The following section details which third-party cookies you may encounter on this site.",
    "Este site usa o Google Analytics, uma das soluções de análise mais difundidas e confiáveis da Web, para nos ajudar a entender como você usa o site e como podemos melhorar sua experiência. Esses cookies podem rastrear itens como quanto tempo você permanece no site e as páginas visitadas, para que possamos continuar produzindo conteúdo relevante.": "This site uses Google Analytics, one of the most widespread and trusted analytics solutions on the web, to help us understand how you use the site and how we can improve your experience. These cookies may track items such as how long you spend on the site and the pages you visit, so that we can continue producing relevant content.",
    "Para mais informações sobre cookies do Google Analytics, consulte a página oficial do Google Analytics.": "For more information about Google Analytics cookies, please visit the official Google Analytics page.",
    "As análises de terceiros são usadas para rastrear e medir o uso do site, permitindo que continuemos produzindo conteúdo atrativo. Esses cookies podem rastrear itens como o tempo que você passa no site ou as páginas visitadas, ajudando-nos a entender como melhorar a sua experiência.": "Third-party analytics are used to track and measure site usage, allowing us to continue producing engaging content. These cookies may track items such as the time you spend on the site or the pages you visit, helping us understand how to improve your experience.",
    "Periodicamente, testamos novos recursos e fazemos alterações sutis na maneira como o site se apresenta. Durante esses testes, os cookies podem ser usados para garantir que você receba uma experiência consistente, enquanto entendemos quais otimizações os usuários mais apreciam.": "From time to time, we test new features and make subtle changes to how the site is presented. During these tests, cookies may be used to ensure you receive a consistent experience while we determine which improvements users value most.",
    "À medida que vendemos produtos, é importante entendermos as estatísticas sobre quantos visitantes realmente compram. Esse é o tipo de dado que esses cookies rastreiam. Isso nos permite fazer previsões de negócios com precisão, analisar custos de publicidade e produtos e garantir o melhor preço possível.": "As we sell products, it is important to understand statistics about how many visitors actually make a purchase. This is the type of data these cookies track. It enables us to make accurate business forecasts, analyze advertising and product costs and ensure the best possible pricing.",
    "Esperamos que esta política esteja clara. Como mencionado anteriormente, se houver algo que você não tenha certeza se precisa ou não, geralmente é mais seguro manter os cookies ativados, caso interaja com um dos recursos que utiliza em nosso site.": "We hope this policy is clear. As mentioned earlier, if there is something you are unsure whether you need, it is generally safer to keep cookies enabled in case you interact with one of the features you use on our site.",
    "Entre em contato pelo e-mail": "Contact us by email at",

    "ACESSO EMPRESARIAL": "BUSINESS ACCESS",
    "Comece com o plano certo para sua operação.": "Start with the right plan for your operation.",
    "Envie os dados da sua empresa. Nossa equipe analisará a solicitação e entrará em contato para liberar o acesso.": "Send your company details. Our team will review the request and contact you to grant access.",
    "Envie sua solicitação": "Submit your request",
    "Informe os dados de contato e a necessidade.": "Provide your contact details and needs.",
    "Análise administrativa": "Administrative review",
    "O pedido será avaliado com segurança.": "The request will be securely reviewed.",
    "Liberação do acesso": "Access approval",
    "Você receberá as orientações por e-mail ou WhatsApp.": "You will receive instructions by email or WhatsApp.",
    "SOLICITAÇÃO DE CADASTRO": "REGISTRATION REQUEST",
    "Dados da empresa": "Company details",
    "Campos marcados com * são obrigatórios.": "Fields marked with * are required.",
    "Nome do responsável *": "Contact name *",
    "Empresa *": "Company *",
    "E-mail profissional *": "Business email *",
    "Telefone/WhatsApp *": "Phone/WhatsApp *",
    "Plano de interesse": "Plan of interest",
    "Quero uma recomendação": "I would like a recommendation",
    "Como pretende utilizar a plataforma?": "How do you plan to use the platform?",
    "Autorizo o contato e o tratamento destes dados para análise da solicitação.": "I authorize contact and the processing of this data to review my request.",
    "Enviar solicitação": "Submit request",
    "Solicitação enviada!": "Request submitted!",
    "Seu pedido entrou na fila de análise. Nossa equipe entrará em contato pelos dados informados.": "Your request has entered the review queue. Our team will contact you using the details provided.",
    "Voltar para a página inicial": "Back to home page",
    "Voltar ao site": "Back to website",
    "Solicitar acesso | Online Teste": "Request access | Online Teste",
    "Enviando...": "Sending...",
    "Não foi possível enviar a solicitação.": "The request could not be sent.",
    "Seu pedido foi salvo no painel, mas o aviso por e-mail falhou. Nossa equipe ainda poderá visualizar a solicitação.": "Your request was saved in the dashboard, but the email notification failed. Our team can still view the request.",
    "Seu pedido entrou na fila de análise e o aviso foi enviado à nossa equipe comercial.": "Your request entered the review queue and our sales team was notified.",
    "Não foi possível conectar ao servidor.": "Unable to connect to the server.",

    "LOGIN PARTICIPANTE": "PARTICIPANT LOGIN",
    "LOGIN INSTITUIÇÃO": "COMPANY LOGIN",
    "Mostrar Senha": "Show password",
    "Entrar": "Sign in",
    "Esqueci a Senha": "Forgot password",
    "CONSOLE ADMINISTRATIVO": "ADMINISTRATIVE CONSOLE",
    "Controle a operação com segurança.": "Manage operations securely.",
    "Gerencie solicitações, clientes, planos e licenças em uma área exclusiva.": "Manage requests, clients, plans and licenses in a dedicated area.",
    "ACESSO RESTRITO": "RESTRICTED ACCESS",
    "Entrar como administrador": "Sign in as administrator",
    "Use a conta administrativa criada no servidor.": "Use the administrator account created on the server.",
    "E-mail": "Email",
    "Senha": "Password",
    "Mostrar senha": "Show password",
    "Entrar no painel": "Open dashboard"
    ,"Tela de Login": "Login | Online Teste",
    "Admin | Online Teste": "Admin | Online Teste",
    "Autenticação separada dos clientes": "Authentication separated from client accounts",
    "Controle de bloqueios e validade": "Blocking and expiration control",
    "Recursos definidos por plano": "Features defined by plan",
    "Entrando...": "Signing in...",
    "O servidor de login não respondeu corretamente. Reinicie o sistema e tente novamente.": "The login server did not respond correctly. Restart the system and try again.",
    "Não foi possível entrar. Confira os dados informados.": "Unable to sign in. Check the information provided.",
    "Login realizado com sucesso!": "Login successful!",
    "Erro no login": "Login error",
    "Erro desconhecido.": "Unknown error.",
    "O servidor administrativo não respondeu corretamente.": "The administration server did not respond correctly.",
    "Não foi possível entrar.": "Unable to sign in."
  };

  Object.assign(translations, window.ONLINE_TESTE_I18N_EXTRA || {});

  const placeholders = {
    "Email": "Email",
    "Senha": "Password",
    "Seu nome completo": "Your full name",
    "Nome da empresa": "Company name",
    "nome@empresa.com.br": "name@company.com",
    "Quantidade de participantes, frequência dos testes e objetivo": "Number of participants, test frequency and objective",
    "Sua senha": "Your password"
  };

  function getLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY) === ENGLISH ? ENGLISH : PORTUGUESE;
    } catch (_error) {
      return PORTUGUESE;
    }
  }

  function setLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (_error) {
      // The selector still works for the current navigation when storage is unavailable.
    }
    window.location.reload();
  }

  function preserveSpacing(value, replacement) {
    const start = value.match(/^\s*/)[0];
    const end = value.match(/\s*$/)[0];
    return start + replacement + end;
  }

  function translateDynamicText(value) {
    const rules = [
      [/^(\d+) solicitaç(?:ão|ões)$/, "$1 request(s)"],
      [/^(\d+) participantes?$/, "$1 participant(s)"],
      [/^(\d+) resultados?$/, "$1 result(s)"],
      [/^(\d+) avaliações no período$/, "$1 assessments in this period"],
      [/^(\d+) avaliações?$/, "$1 assessment(s)"],
      [/^(\d+) questões?$/, "$1 question(s)"],
      [/^(\d+) pontos?$/, "$1 point(s)"],
      [/^(\d+) ocorrências?$/, "$1 incident(s)"],
      [/^(\d+) fragmentos enviados$/, "$1 chunks uploaded"],
      [/^(\d+) de (\d+) participantes? concluíram$/, "$1 of $2 participant(s) completed"],
      [/^(\d+) teste(?:s)? cadastrado(?:s)?$/, "$1 registered test(s)"],
      [/^(\d+) participante(?:s)? aprovado(?:s)?$/, "$1 approved participant(s)"],
      [/^(\d+) por página$/, "$1 per page"],
      [/^(\d+) MB armazenados$/, "$1 MB stored"]
    ];
    for (const rule of rules) {
      if (rule[0].test(value)) return value.replace(rule[0], rule[1]);
    }
    return null;
  }

  function translateTextNode(node) {
    const value = node.nodeValue;
    const key = value.trim();
    const replacement = translations[key] || translateDynamicText(key);
    if (key && replacement) {
      node.nodeValue = preserveSpacing(value, replacement);
    }
  }

  function translateElementAttributes(element) {
    ["placeholder", "title", "aria-label"].forEach(function (attribute) {
      const value = element.getAttribute && element.getAttribute(attribute);
      if (!value) return;
      const replacement = placeholders[value] || translations[value];
      if (replacement) element.setAttribute(attribute, replacement);
    });
  }

  function translateTree(root) {
    if (getLanguage() !== ENGLISH || !root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    translateElementAttributes(root);
    root.querySelectorAll("*").forEach(translateElementAttributes);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const tag = node.parentElement && node.parentElement.tagName;
        return ["SCRIPT", "STYLE", "NOSCRIPT"].includes(tag)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
  }

  function selectorMarkup(language, floating) {
    const isEnglish = language === ENGLISH;
    return (
      '<div class="ot-language-selector' + (floating ? ' ot-language-floating' : '') + '">' +
        '<button class="ot-language-trigger" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="ot-language-menu" aria-label="' + (isEnglish ? 'Change language' : 'Alterar idioma') + '">' +
          '<span aria-hidden="true">🌐</span><span class="ot-language-flag" aria-hidden="true">' + (isEnglish ? '🇺🇸' : '🇧🇷') + '</span>' +
          '<span class="ot-language-code">' + (isEnglish ? 'EN' : 'PT') + '</span><span class="ot-language-chevron" aria-hidden="true">⌄</span>' +
        '</button>' +
        '<div class="ot-language-menu" id="ot-language-menu" role="menu">' +
          '<button type="button" role="menuitem" data-language="pt-BR"><span aria-hidden="true">🇧🇷</span><span>Português (Brasil)</span>' + (!isEnglish ? '<b aria-hidden="true">✓</b>' : '') + '</button>' +
          '<button type="button" role="menuitem" data-language="en"><span aria-hidden="true">🇺🇸</span><span>English</span>' + (isEnglish ? '<b aria-hidden="true">✓</b>' : '') + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function installSelector(language) {
    if (document.querySelector(".ot-language-selector")) return;
    const navList = document.querySelector(".public-navigation > .public-nav-list");
    let host;
    if (navList) {
      host = document.createElement("li");
      host.className = "ot-language-nav-item";
      host.innerHTML = selectorMarkup(language, false);
      navList.appendChild(host);
    } else {
      const internalTopbar = document.querySelector(".admin-topbar, .topbar, .candidate-account");
      if (internalTopbar) {
        host = document.createElement("div");
        host.className = "ot-language-internal";
        host.innerHTML = selectorMarkup(language, false);
        const accountArea = internalTopbar.querySelector(".admin-profile, .account-area, #candidate-logout");
        internalTopbar.insertBefore(host, accountArea || null);
      } else {
      host = document.createElement("div");
      host.innerHTML = selectorMarkup(language, true);
      document.body.appendChild(host.firstElementChild);
      }
    }

    const selector = document.querySelector(".ot-language-selector");
    const trigger = selector.querySelector(".ot-language-trigger");
    const close = function () {
      selector.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    };
    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      const open = selector.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", String(open));
    });
    selector.querySelectorAll("[data-language]").forEach(function (button) {
      button.addEventListener("click", function () { setLanguage(button.dataset.language); });
    });
    document.addEventListener("click", function (event) {
      if (!selector.contains(event.target)) close();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });
  }

  function start() {
    const language = getLanguage();
    document.documentElement.lang = language;
    installSelector(language);
    if (language === ENGLISH) {
      translateTree(document.body);
      if (translations[document.title]) document.title = translations[document.title];
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(translateTree);
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
