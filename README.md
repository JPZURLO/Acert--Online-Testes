# Sistema de Criação e Gestão de Provas

Plataforma para criação e gerenciamento de provas, certificações e testes de recrutamento.

## Tecnologias

- Frontend: HTML, CSS e JavaScript
- Backend: Python, Flask e JWT
- Banco de dados: MySQL

## Configuração local

1. Crie e ative um ambiente virtual Python.
2. Instale as dependências com `pip install -r requirements.txt`.
3. Copie `.env.example` para `.env` e preencha as credenciais locais.
4. Gere `JWT_SECRET` com uma chave aleatória longa e exclusiva.
5. Execute, em ordem, os arquivos SQL da pasta `migrations` no banco.
6. Se ainda existirem senhas legadas, execute `python scripts/migrate_password_hashes.py` uma única vez.
7. Inicie a aplicação com `python server.py`.
8. Acesse `http://127.0.0.1:5500`.

## Checklist obrigatório de produção

- Rotacione qualquer credencial que já tenha aparecido no histórico Git.
- Use `APP_ENV=production`, `COOKIE_SECURE=true` e `FLASK_DEBUG=false`.
- Configure `APP_TRUSTED_HOSTS` somente com os domínios reais da aplicação.
- Sirva a aplicação exclusivamente por HTTPS usando um servidor WSGI e proxy reverso.
- Use um usuário MySQL com privilégios mínimos e configure `DB_SSL_CA` quando o banco for remoto.
- Mantenha `ALLOW_LEGACY_PLAINTEXT_PASSWORDS=false`.
- Proteja e monitore backups, logs e exportações de dados pessoais.

## Proteções implementadas

- JWT em cookie `HttpOnly`, `SameSite=Strict` e `Secure` obrigatório em produção.
- Proteção CSRF por token de dupla submissão ou validação estrita de origem.
- Limite de tentativas de login por conta e endereço de origem.
- Cabeçalhos CSP, anti-clickjacking, `nosniff`, política de referência e permissões.
- Limite global de tamanho das requisições.
- Separação de dados por empresa e consultas SQL parametrizadas.
- Bloqueio de executáveis, arquivos compactados e `node_modules` na rota pública.

O limitador embutido protege uma única instância. Em implantação com vários processos ou servidores, use também rate limiting centralizado no proxy/API gateway com Redis ou serviço equivalente.
