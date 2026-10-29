# Manual de Operação e Deploy TurboCloud — Guia para Antigravity & Desenvolvedores

Este documento serve como diretriz oficial para o assistente **Antigravity (ou desenvolvedor)** que estiver operando o projeto no ambiente do cliente ou na máquina local. Ele detalha a arquitetura, regras de segurança, procedimentos de teste e o fluxo exato para empacotar e publicar atualizações na **TurboCloud (cPanel / Passenger)**.

---

## 1. Arquitetura da Aplicação na TurboCloud

* **Hospedagem**: TurboCloud (cPanel / CloudLinux com Phusion Passenger).
* **Domínio de Produção**: `https://www.onlineteste.com.br`
* **Diretório da Aplicação no Servidor**: `~/online_test_app` (ou o configurado no **Setup Python App** do cPanel).
* **Entrypoint WSGI**: `app_wsgi.py` (ou `passenger_wsgi.py`). O Flask expõe o objeto `application = app` envelopado com `werkzeug.middleware.proxy_fix.ProxyFix` para terminação HTTPS correta.
* **Frontend**: HTML, CSS e JavaScript puros localizados em `front-end/`, servidos diretamente pelo backend Flask.
* **Armazenamento Privado**: Gravações e uploads são salvos fora da raiz pública, em `~/online_test_private/recordings` e `~/online_test_private/uploads` (permissão `chmod 700`).

---

## 2. Regras Essenciais para o Antigravity

Sempre que você (Antigravity) for solicitado a fazer modificações ou gerar um pacote de deploy:

1. **Executar a Suíte de Testes Automatizados**:
   Antes de qualquer geração de pacote ou deploy, rode sempre:
   ```bash
   python -m unittest discover -s tests
   ```
   *Se houver qualquer falha ou erro, **NÃO gere o ZIP** até que todos os testes passem com 100% de sucesso.*

2. **Integridade de Senhas e Segredos**:
   * **NUNCA** inclua arquivos `.env`, senhas reais de banco de dados ou tokens JWT dentro do ZIP ou no Git.
   * As variáveis de ambiente de produção devem ser configuradas exclusivamente na interface **Setup Python App** do cPanel da TurboCloud.

3. **Migrations de Banco de Dados**:
   * Toda alteração de estrutura no banco MySQL deve ter um script `.sql` numerado em `migrations/` (ex: `023_create_webrtc_signals.sql`).
   * Informe ao usuário quais migrations precisam ser rodadas na produção caso uma nova migration tenha sido criada.

4. **Preservar Arquivos Críticos de Produção**:
   * O ZIP gerado **NÃO** deve conter: `.git`, `tests/`, `__pycache__`, `node_modules`, `.venv`, `.vscode`, `tmp/`, nem arquivos de mídia ou arquivos `.zip` anteriores.

---

## 3. Como Gerar o ZIP de Produção Automaticamente

O projeto possui um script automatizado e portável em `scripts/build_production_zip.py`.

### Comando para gerar:
```bash
python scripts/build_production_zip.py
```

### O que este script faz:
* Varre a árvore do projeto mantendo a estrutura exata exigida pelo cPanel.
* Inclui: todos os módulos `.py` da raiz (`server.py`, `app_wsgi.py`, `participants_api.py`, etc.), pasta `front-end/`, `migrations/`, `scripts/` e `requirements.txt`.
* Exclui automaticamente lixo, caches, arquivos `.env`, pastas de testes e arquivos compactados.
* Salva o pacote pronto na raiz do projeto com o nome:
  **`deploy_turbocloud_producao.zip`**
* Imprime no terminal o tamanho em MB, quantidade de arquivos e o hash SHA-256 para conferência.

*(Opcional: Para especificar outro nome de arquivo: `python scripts/build_production_zip.py --output "pacote_customizado.zip"`)*

---

## 4. Passo a Passo do Deploy na TurboCloud (cPanel)

Quando o usuário/cliente for aplicar o arquivo ZIP na hospedagem:

### Passo 1: Backup Preventivo
No cPanel, acesse **JetBackup** ou **Backup** e gere uma cópia de segurança antes de sobrescrever arquivos em produção.

### Passo 2: Upload e Extração do ZIP
1. Acesse o **Gerenciador de Arquivos** do cPanel.
2. Navegue até a pasta da aplicação: `/home/USUARIO_CPANEL/online_test_app`.
3. Clique em **Carregar** e envie o arquivo `deploy_turbocloud_producao.zip`.
4. Clique com o botão direito no arquivo enviado e selecione **Extrair (Extract)** no próprio diretório `online_test_app`.
5. Apague o arquivo `.zip` da hospedagem após extrair.

### Passo 3: Executar Migrations (Se Houver)
Se a atualização incluir novas migrations SQL:
1. Abra o **Terminal** do cPanel.
2. Ative o virtualenv da aplicação (caminho visível no Setup Python App):
   ```bash
   cd ~/online_test_app
   source ~/virtualenv/online_test_app/3.11/bin/activate
   ```
3. Execute o script ou importe a migration correspondente:
   ```bash
   # Exemplo para aplicar migration específica via script ou mysql
   python scripts/migrate_company_units.py
   python scripts/migrate_participant_exam_schedule.py
   ```

### Passo 4: Reiniciar a Aplicação (Passenger)
Para que as alterações de código Python entrem em vigor:
1. No cPanel, abra **Setup Python App**.
2. Na linha da aplicação `online_test_app`, clique no botão **Restart Application** (ícone circular de recarregar).
3. *(Alternativa via Terminal)*:
   ```bash
   touch ~/online_test_app/tmp/restart.txt
   ```

### Passo 5: Checklist de Validação Pós-Deploy
Acesse `https://www.onlineteste.com.br` e valide:
1. [ ] Página inicial carrega sem erros 500.
2. [ ] Login da Empresa (`login_cliente.html`) responde e autentica.
3. [ ] Login do Participante (`login.html`) responde e autentica.
4. [ ] Painel Administrativo (`Admin.html`) carrega normalmente.
5. [ ] Cadastro e listagem de participantes funcionam com os novos campos.
6. [ ] Câmera e WebRTC de monitoramento operam normalmente.
