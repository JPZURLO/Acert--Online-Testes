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
6. Inicie a aplicação com `python server.py`.
7. Acesse `http://127.0.0.1:5500`.

Em produção, use um usuário MySQL com privilégios mínimos, configure `COOKIE_SECURE=true`, mantenha `FLASK_DEBUG=false` e sirva a aplicação exclusivamente por HTTPS.

## Segurança da autenticação

- O JWT é armazenado em cookie `HttpOnly` com `SameSite=Strict`.
- Tokens distinguem contas de participantes e empresas.
- Senhas legadas em texto puro são convertidas para hash no primeiro login válido.
- Segredos e credenciais são carregados exclusivamente pelo ambiente.

As credenciais que já apareceram no histórico do Git devem ser rotacionadas. Removê-las apenas da versão atual não invalida os valores antigos.
