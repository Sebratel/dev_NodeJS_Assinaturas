# Assinaturas Sebratel

Gestão das assinaturas de e-mail corporativas do Gmail. O sistema lê os colaboradores do AD, aplica as regras criadas pelos admins (por nível, área, time, cargo) e monta a assinatura padronizada de cada pessoa. Depois grava essa assinatura no Gmail, pela tela ou automaticamente quando alguém entra ou muda no AD.

## Estado (v0.3)

| Parte | Situação |
|---|---|
| Leitura do AD | Local: AD ao vivo com o login do Windows (`DIRECTORY_SOURCE=windows`, a cada 5 min e pelo botão ↻). Servidor: LDAP (`ldap`) com conta só de leitura. A leitura por LDAP ainda não foi testada contra o AD. |
| Campos do AD | 0800 = General › Telephone number (só sai se for um 0800 válido). Ramal = Telephones › IP phone. Celular = Telephones › Mobile. B2B = Company "Sebratel Empresas". |
| Regras, motor e simulação | Prontos, com testes |
| Modelos de assinatura | Tela "Modelos": HTML com variáveis (`{{nome}}`, `{{#frase}}…{{/frase}}`) e prévia com pessoa real. A regra escolhe o modelo; sem escolha, vale o padrão. |
| Gravar no Gmail | Funciona: delegação autorizada (client ID `113892655020718818138`), só no endereço principal, em lote e com histórico. Desfaz a última gravação. Quem recebe: a lista de teste ou todos (Configurações › Google). |
| Gravação automática | Depois de cada leitura do AD, grava para quem entrou ou mudou. Acima do limite, espera aprovação na tela Monitoramento. |
| Login (SSO) | Google pelo Firebase (projeto `authentication-assinaturas`), token conferido na própria API. Só entra quem está em `AUTH_ADMIN_EMAILS`. Em desenvolvimento, `AUTH_ENABLED=false`. |
| Banco | Local: arquivo (sql.js). Produção: MariaDB, com as tabelas criadas por migration ao subir. |
| Observabilidade | Log em JSON (pino) com `requestId` e `userEmail`, um log por requisição, Elastic APM (`assinaturas-backend`). |
| Entrega | Uma imagem só (a API serve a tela), compose do Portainer e CI no GitHub Actions. O repositório ainda não tem remoto. |

## Rodar local

Pré-requisitos: Node 22+ e a máquina no domínio (para ler o AD com o seu login, sem senha).

```powershell
# 1. Exportar o AD (só leitura). O arquivo fica em data/ e não vai para o git.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\exportar-ad.ps1

# 2. API (http://127.0.0.1:3180/api). No .env: AUTH_ENABLED=false para rodar sem login.
cd api; copy .env.example .env; npm install; npm run build; npm start

# 3. Tela (http://127.0.0.1:5180)
cd web; npm install; npm run dev
```

Com `web/dist` gerado (`cd web; npm run build`), a própria API serve a tela em http://127.0.0.1:3180.

| Comando (em `api/`) | O que faz |
|---|---|
| `npm test` | Testes (Vitest), incluindo os de segurança do login |
| `npm run typecheck` | Tipos |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

No `web/`: `npx tsc -b`, `npm test`, `npm run build`.

## Como as regras funcionam

- Toda regra ativa cujas condições casam com a pessoa **se aplica**. As condições dentro de uma regra se combinam com "E"; os valores dentro de uma condição, com "OU".
- A assinatura tem 4 partes: **0800**, **contato** (celular corporativo, celular informado, ramal ou nenhum), **área ou time** antes do cargo e **frase**.
- Em cada parte, vence a regra de **prioridade maior**. Uma regra só mexe no que define: o resto vem das regras de prioridade menor.
- Se duas regras com a **mesma prioridade** decidirem diferente a mesma parte, o status fica **Conflito** e a tela aponta quais são as regras.
- O status de cada pessoa pode ser:
  - **Pronta:** tudo preenchido;
  - **Pendente:** falta dado (celular, ramal);
  - **Conflito;**
  - **Sem regra.**
- A simulação (`POST /api/v1/simulations`) mostra quem a regra pega e como os status mudam, antes de salvar.

As regras de 20/11/2026 vêm cadastradas na primeira subida (`api/src/modules/signature-rules/default-signature-rules.ts`).

## De onde vem cada campo

As **Configurações** definem o atributo do AD de cada campo. A origem pode ser trocada pela tela, sem mexer no código. Medido em 20/11/2026:

- `department` traz "Grupo Área - Time". A área e o time saem daí, com uma tabela de-para para juntar grafias diferentes.
- O nível sai da **1ª palavra do cargo** (`title`), pela tabela de sinônimos. O AD tem 205 grafias de cargo.
- Celular (`mobile`) e ramal (`ipPhone`) ainda estão vazios para boa parte das pessoas.
- `telephoneNumber` **não** é o telefone da pessoa: é o 0800.

## Login

Contrato entre a tela e a API (padrão `padrao-login-sso`):

- Toda chamada a `/api/v1/*` leva `Authorization: Bearer <ID token do Firebase>`. Só `/api/health` é pública.
- A API confere o token sem ir ao Google a cada pedido:
  - algoritmo RS256;
  - assinatura;
  - emissor e público do projeto;
  - validade;
  - e-mail verificado;
  - domínio `sebratel.com.br`;
  - e a lista `AUTH_ADMIN_EMAILS`.

  Os certificados do Google ficam em memória e numa cópia em `data/firebase-certs.json`, renovada a cada 6 h.
- `GET /api/v1/me` devolve `{ success, data: { email, name, authEnabled } }`.
- **401** (`AUTH_REQUIRED`, `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`): a tela renova o token e tenta de novo uma vez. Só sai se o 401 continuar.
- **403** (`AUTH_FORBIDDEN`): logado, mas sem acesso. A tela mostra a mensagem, sem pedir login de novo.
- **503** (`AUTH_UNAVAILABLE`): a API não conseguiu os certificados do Google. É oscilação: não desloga.
- O histórico de gravações guarda quem pediu em `requested_by`: o e-mail da pessoa, ou `AUTO` na gravação automática.

## Estrutura

```
api/   NestJS 12 (ESM) + TypeORM, um módulo por domínio
  auth/                   login: verificação do token, guard global, GET /v1/me
  directory/              leitura do AD (LDAP, Windows ou snapshot) e tradução para colaborador
  settings/               origem dos campos, sinônimos, de-para, frases, filtros
  signature-rules/        CRUD de regras (exclusão lógica)
  signature-templates/    modelos HTML
  signatures/             motor, HTML da assinatura, cobertura, simulação
  signature-applications/ gravação no Gmail em lote, histórico, desfazer
  automation/             gravação automática e aprovação
  phrase-profiles/        perfis de frase
  google-integration/     conta de serviço e estado da autorização
  migrations/             esquema do MariaDB
  apm.cjs                 preload do Elastic APM
web/   Vite + React 19 + Tailwind 4 + TanStack Query
scripts/exportar-ad.ps1   leitura do AD na máquina de dev
Dockerfile, docker-compose.portainer.yml, .github/workflows/ci.yml
```

API REST em `/api/v1/*` com o envelope `{ success, data, meta }`. O health check fica em `/api/health` (sem login, sem envelope).

**Banco:** migration nova = arquivo `api/src/migrations/{timestamp}-Nome.ts` + uma linha em `MIGRATIONS` (`api/src/config/database.config.ts`). Nunca edite uma migration que já rodou. Exceções registradas ao padrão de chave `id`: `settings` (chave `setting_key`) e `collaborator_overrides` (chave = id do colaborador no AD).

## Deploy no Portainer

Modelo padrão da empresa: o Portainer constrói a imagem direto do Git. O CI só valida, não publica nada.

### 1. Passos manuais, uma vez só

São os que sempre esquecem. Nenhum deles está no código.

1. **Firebase** [PADRÃO]. Projeto `authentication-assinaturas`, só deste sistema (nunca reaproveitar o de outro setor).
   1. Authentication › Sign-in method › **Google › Ativar**. Projeto novo vem com tudo desligado.
   2. Authentication › Settings › **Authorized domains**: adicionar o domínio do sistema. Só `localhost` vem liberado. Sem isso o login falha com `auth/unauthorized-domain`, e só no primeiro clique real.
   3. Configurações do projeto › Seus apps › **Web**: copiar `apiKey`, `authDomain` e `appId` para as variáveis `VITE_FIREBASE_*`.
   4. Google Cloud › Credenciais [RECOMENDADO]:
      - restringir a chave de API a Identity Toolkit e Token Service;
      - restringir os referenciadores HTTP ao domínio do sistema.
2. **MariaDB** [PADRÃO]. O usuário de leitura não enxerga banco novo, então crie o banco e dê o GRANT:

   ```sql
   CREATE DATABASE assinaturas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'assinaturas'@'%' IDENTIFIED BY '<senha forte>';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON assinaturas.* TO 'assinaturas'@'%';
   ```

   As tabelas são criadas pela migration na primeira subida. Sem `DROP`: desfazer migration é manual.
3. **AD** [PADRÃO]. Uma conta **só de leitura** para o LDAP. Atenção: hoje "Domain Users" está dentro de "Administrators", então qualquer conta do domínio é administradora. Trate essa senha como senha de admin até isso ser corrigido.
4. **Quem acessa**. Os e-mails em `AUTH_ADMIN_EMAILS`, separados por vírgula. Vazio = ninguém entra.
5. **Chave do Google**. No painel ela vai em `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`, de preferência em base64 (uma linha, sem aspas para escapar):

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\caminho\da\chave.json"))
   ```

### 2. Criar a stack

Em Portainer › Stacks › Add stack › **Repository**:

- **Nome da stack** = `name:` do compose = nome do repositório no GitHub em minúsculas. Hoje o compose diz `assinaturas`. Se o repositório tiver outro nome, troque o `name:` **antes** do primeiro deploy, porque renomear depois cria um volume novo e vazio.
- **Reference:** `refs/heads/main`.
- **Compose path:** `docker-compose.portainer.yml`.

Variáveis no painel **Environment** da stack. Segredo fica só ali, nunca no arquivo:

| Variável | Obrigatória | Valor / padrão | Segredo |
|---|---|---|---|
| `DB_HOST` | sim | servidor MariaDB | |
| `DB_USER` | sim | `assinaturas` | |
| `DB_PASSWORD` | sim | | **sim** |
| `DB_NAME` | não | `assinaturas` | |
| `AD_BIND_USER` | sim | conta só de leitura (ex.: `SEBRATEL\svc-assinaturas`) | |
| `AD_BIND_PASSWORD` | sim | | **sim** |
| `AD_URL`, `AD_BASE_DN` | não | `ldap://10.0.11.251`, `DC=corp,DC=sebratel,DC=com,DC=br` | |
| `AUTH_ADMIN_EMAILS` | sim | e-mails separados por vírgula | |
| `FIREBASE_PROJECT_ID` | não | `authentication-assinaturas` | |
| `VITE_FIREBASE_API_KEY` | sim | do app Web do Firebase (público por design) | |
| `VITE_FIREBASE_AUTH_DOMAIN` | sim | `authentication-assinaturas.firebaseapp.com` | |
| `VITE_FIREBASE_APP_ID` | sim | do app Web do Firebase | |
| `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` | sim | JSON da chave, em base64 | **sim** |
| `GOOGLE_DELEGATION_TEST_USER` | sim | um e-mail do domínio (só testa a delegação) | |
| `GOOGLE_APPLY_ALLOWLIST` | não | semente da lista de teste (só na 1ª subida) | |
| `APP_PORT` | não | `3180` (faixa Backend/API 3100–3199; confira com `docker ps`) | |
| `ELASTIC_APM_SERVER_URL` | não | `https://apm.sebratel.net.br`. Vazio desliga | |
| `ELASTIC_APM_ENVIRONMENT` | não | `production` (`staging` na stack de testes) | |

Já fixos no compose [PADRÃO]:

- `DB_TYPE=mariadb`, `DIRECTORY_SOURCE=ldap` e `HOST=0.0.0.0`;
- healthcheck em `http://127.0.0.1:3180/api/health` (nunca `localhost`);
- `mem_limit` de 1 GB sem swap e `restart: unless-stopped`;
- volume nomeado `data` para `/app/data` (bind mount é apagado no deploy por repositório).

`VITE_*` são gravadas no JavaScript **no build**. Mudou alguma, faça **Pull and redeploy** com rebuild; só reiniciar não muda nada.

### 3. Conferir depois do deploy

1. `http://<servidor>:3180/api/health` responde `"status":"ok"` com a versão.
2. A tela abre, o login com Google funciona e quem não está em `AUTH_ADMIN_EMAILS` vê "sem acesso".
3. No Kibana:
   - logs com `service: assinaturas-backend`;
   - no APM, o serviço `assinaturas-backend` no ambiente `production`.
4. Tela Monitoramento: a leitura do AD por LDAP aparece sem erro.

### 4. Voltar uma versão

- Redeploy da stack apontando para o commit ou tag anterior. O volume `data` e o banco continuam.
- Migration que já rodou não volta sozinha. Se a versão nova criou coluna ou tabela, a antiga em geral convive com elas. Se não convive, desfaça à mão o que a migration fez, com backup antes.

### 5. GitHub [PADRÃO]

- `.github/workflows/ci.yml` roda em PR e push para `main` e `staging`:
  - **API**: ESLint, Prettier, tipos, testes e build;
  - **Web**: ESLint, tipos, testes e build;
  - **imagem**: constrói, sobe a stack com um MariaDB descartável e confere health, tabelas da migration, 401 sem login e a tela servida.
- Proteção da `main`: PR com 1 aprovação, check obrigatório **`ci-ok`** (só ele), sem push direto nem force push.
- [RECOMENDADO], ainda não feito: job `validacoes` com `validate-compose.py` e `validate-version.py` da skill `cicd-deploy-backend`. Precisa do nome definitivo do repositório. Projeto novo começa a versão em `1.0.0`.

## Antes de produção

1. Criar o repositório no GitHub e acertar o `name:` do compose com o nome dele.
2. Fazer os passos manuais da seção **Deploy no Portainer**:
   - Firebase;
   - GRANT no MariaDB;
   - conta de leitura no AD;
   - `AUTH_ADMIN_EMAILS`.
3. Testar a leitura por LDAP contra o AD com a conta de leitura.
4. **Hospedar as imagens** num endereço público da empresa. Hoje elas vêm do `raw.githubusercontent` do repositório `dev_Sebratel_Images`.
5. Tela **"Minha assinatura"** para Direção e Gerência digitarem o próprio celular.
