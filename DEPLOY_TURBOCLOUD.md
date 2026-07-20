# Publicação na TurboCloud — onlineteste.com.br

## Estado verificado em 20/07/2026

- `onlineteste.com.br` aponta para `177.154.191.223`.
- `www` é CNAME do domínio principal.
- HTTPS responde corretamente.
- O conteúdo atual é um WordPress padrão (“My Blog”); faça backup antes de substituí-lo.
- SPF e DKIM existem. DMARC ainda não foi encontrado.

## 1. Backup antes da troca

No cPanel, abra **Backup/JetBackup** e gere um backup do site e do banco WordPress atuais. Não apague `public_html` sem confirmar que o backup pode ser restaurado.

## 2. Banco de produção

1. Em **MySQL Databases**, crie um banco e um usuário exclusivos para o sistema.
2. Conceda **ALL PRIVILEGES** a esse usuário somente nesse banco.
3. Cadastre `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no **Setup Python App**.
4. Com o virtualenv da aplicação ativado, execute:

```bash
cd ~/online_test_app
python scripts/bootstrap_production_database.py
python scripts/create_admin.py
python scripts/create_company.py
```

O instalador recusa qualquer banco que já contenha tabelas. Ele cria somente a estrutura, os planos padrão e os acessos informados nos dois comandos seguintes; nenhum participante, teste, resultado ou gravação de homologação é copiado.

## 3. Código da aplicação

Pelo Terminal do cPanel:

```bash
cd ~
git clone https://github.com/JPZURLO/Acert--Online-Testes.git online_test_app
cd online_test_app
```

Se a pasta já existir:

```bash
cd ~/online_test_app
git pull origin main
```

Não envie `.env`, `.git`, `node_modules`, backups SQL ou gravações para `public_html`.

## 4. Setup Python App

No cPanel, abra **Setup Python App** e crie a aplicação:

- Python: 3.11 ou 3.12
- Modo: Production
- Application root: `online_test_app`
- Application URL: `https://www.onlineteste.com.br/`
- Startup file: `passenger_wsgi.py`
- Entry point: `application`

Depois clique para instalar as dependências do `requirements.txt` no ambiente virtual criado pelo cPanel.

## 5. Variáveis de ambiente

Cadastre no **Setup Python App** as variáveis do arquivo `.env.production.example`. Valores obrigatórios:

- `APP_ENV=production`
- `COOKIE_SECURE=true`
- `APP_TRUSTED_HOSTS=onlineteste.com.br,www.onlineteste.com.br`
- `PUBLIC_BASE_URL=https://www.onlineteste.com.br`
- credenciais do banco criado no cPanel
- `JWT_SECRET` aleatório e exclusivo
- credenciais SMTP atualizadas

Nunca cole senhas em chamados públicos, Git ou conversas. Rotacione qualquer senha já compartilhada.

## 6. Pastas privadas

No Terminal:

```bash
mkdir -p ~/online_test_private/recordings
mkdir -p ~/online_test_private/uploads
chmod 700 ~/online_test_private
```

Troque `USUARIO_CPANEL` no modelo de variáveis pelo usuário real da hospedagem.

## 7. Migração e administrador

Com o ambiente virtual indicado pelo Setup Python App ativado:

```bash
cd ~/online_test_app
python scripts/migrate_company_operations.py
python scripts/migrate_password_hashes.py
```

Crie o administrador apenas se o banco de produção ainda não possuir um:

```bash
python scripts/create_admin.py
```

## 8. Manutenção das gravações

Mantenha `RECORDING_MAINTENANCE_ENABLED=false` no Passenger. Configure no Cron do cPanel, a cada 15 minutos, o Python do ambiente virtual executando:

```bash
cd /home/USUARIO_CPANEL/online_test_app && /home/USUARIO_CPANEL/virtualenv/online_test_app/3.11/bin/python scripts/run_recording_maintenance.py
```

O caminho exato do virtualenv aparece no topo da tela **Setup Python App**.

## 9. Reiniciar e validar

Clique em **Restart Application** e valide, nesta ordem:

1. `https://www.onlineteste.com.br/`
2. Login Empresa
3. Login Participante
4. Login Admin
5. Cadastro de participante e recebimento do e-mail
6. Criação e publicação de teste
7. Câmera, microfone e compartilhamento de tela
8. Gravação e download pela empresa
9. Chat, pausa, código de retomada e encerramento remoto

Se aparecer erro 500, consulte **Setup Python App → Logs** e o arquivo `stderr.log` da aplicação.