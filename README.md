# Assinaturas Sebratel

Gestão das assinaturas de e-mail corporativas do Gmail. O sistema lê os colaboradores do AD, aplica as regras criadas pelos admins (por nível, área, time, cargo) e monta a assinatura padronizada de cada pessoa. Depois grava essa assinatura no Gmail, pela tela ou automaticamente quando alguém entra ou muda no AD.

## Estado (1.4.0)

| Parte | Situação |
|---|---|
| Leitura do AD | Local: AD ao vivo com o login do Windows (`DIRECTORY_SOURCE=windows`, a cada 5 min e pelo botão ↻). Servidor: LDAP (`ldap`) com conta só de leitura. Sem a conta (`AD_BIND_*` vazios), a API sobe com a lista vazia e o Monitoramento mostra o aviso. A leitura por LDAP ainda não foi testada contra o AD. |
| Campos do AD | 0800 = General › Telephone number (só sai se for um 0800 válido). Ramal = Telephones › IP phone. Celular = Telephones › Mobile. B2B = Company "Sebratel Empresas". |
| Regras, motor e simulação | Prontos, com testes |
| Modelos de assinatura | Tela "Modelos": HTML com variáveis (`{{nome}}`, `{{#frase}}…{{/frase}}`) e prévia com pessoa real. A regra escolhe o modelo; sem escolha, vale o padrão. |
| Gravar no Gmail | Funciona: delegação autorizada (client ID `113892655020718818138`), só no endereço principal, em lote e com histórico. Desfaz a última gravação. Só o perfil **Master** grava, desfaz e liga a automação. |
| Gravação automática | Depois de cada leitura do AD, grava para quem entrou ou mudou. Acima do limite, espera aprovação na tela Monitoramento. |
| Hub Apps | Abre **dentro do Hub Apps** (app "Gestor de Assinaturas - Sebratel", `gestor-assinaturas.sebratel.net.br`): o Hub passa um token de 5 min, a API troca por uma sessão de 8 h. Com `HUB_ONLY=true`, só master entra direto; os demais pelo Hub. |
| Login (SSO) | Google pelo Firebase (projeto `sistema-gestor-assinatur-9be62`), token conferido na própria API. Toda conta @sebratel.com.br entra como **Visualizador**. Editor e Master são dados na tela **Usuários**, e quem está em `AUTH_ADMIN_EMAILS` é master fixo. Em desenvolvimento, `AUTH_ENABLED=false` (entra como Master). |
| Banco | Local: arquivo (sql.js). Produção: MariaDB, com as tabelas criadas por migration ao subir. |
| Observabilidade | Log em JSON (pino) com `requestId` e `userEmail`, um log por requisição, Elastic APM (`assinaturas-backend`). O nginx do frontend também loga em JSON (`assinaturas-frontend`) e repassa o `requestId`. |
| Entrega | Um repositório, dois containers na mesma stack: `frontend` (nginx com as telas, porta 3080) repassa `/api` para o `backend` (API, sem porta no servidor). CI no GitHub Actions. Repositório `Sebratel/dev_NodeJS_Assinaturas` (privado), branches `staging` e `main`. Stack de produção criada em 23/11/2026. |

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

No local, o Vite (5180) repassa `/api` para a API (3180). Em produção quem faz esse papel é o nginx do container `frontend`.

| Comando (em `api/`) | O que faz |
|---|---|
| `npm test` | Testes (Vitest), incluindo os de segurança do login |
| `npm run typecheck` | Tipos |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

No `web/`: `npx tsc -b`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`. Sem login no local: `VITE_AUTH_ENABLED=false` no `web/.env` (igual ao `AUTH_ENABLED=false` da API).

O web usa TypeScript 6.0, não o 7: o typescript-eslint só aceita versões abaixo de 6.1. O Prettier do web segue o padrão de frontend (`semi: false`, `trailingComma: es5`), diferente do da API.

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
  - e o perfil: `AUTH_ADMIN_EMAILS` (master fixo), a tabela `users` (tela Usuários) ou, para o resto do domínio, Visualizador.

  Os certificados do Google ficam em memória e numa cópia em `data/firebase-certs.json`, renovada a cada 6 h.
- `GET /api/v1/me` devolve `{ success, data: { email, name, authEnabled } }`.
- **401** (`AUTH_REQUIRED`, `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`): a tela renova o token e tenta de novo uma vez. Só sai se o 401 continuar.
- **403** (`AUTH_FORBIDDEN`): logado, mas sem acesso (conta fora do domínio ou e-mail não verificado). A tela mostra a mensagem, sem pedir login de novo.
- **403** (`ROLE_FORBIDDEN`): tem acesso, mas o perfil não alcança a ação. A tela mostra a mensagem e segue normal.
- **503** (`AUTH_UNAVAILABLE`): a API não conseguiu os certificados do Google. É oscilação: não desloga.
- O histórico de gravações guarda quem pediu em `requested_by`: o e-mail da pessoa, ou `AUTO` na gravação automática.

### Perfis de acesso (1.2.0)

| Perfil | Pode |
|---|---|
| Visualizador | **Toda conta @sebratel.com.br, sem cadastro.** Ver tudo, simular regras e pré-visualizar modelos. Sincronizar o AD (↻). |
| Editor | + regras, modelos, frases por time e perfis de frase, de-para de times, níveis do cargo, celular informado. |
| Master | + gravar no Gmail (aplicar, desfazer), automação, origem dos campos do AD, filtros do diretório, teste da delegação e a tela **Usuários**. |

- A API confere o perfil em cada rota (`@RequireRole`; sem ele, basta estar logado). A tela só esconde o que daria 403.
- A tela Usuários guarda só quem tem mais que Visualizador; incluir alguém como Visualizador é recusado.
- Ninguém muda o próprio perfil nem se remove. Remover é exclusão lógica: a pessoa volta a Visualizador, e incluir de novo restaura a linha.
- Substitui a antiga **lista de teste** (`apply-scope`, `GOOGLE_APPLY_ALLOWLIST`): quem limita a gravação agora é o perfil Master. A linha `apply-scope` fica no banco sem uso.

### Entrada pelo Hub Apps (1.3.0)

Segue o guia "Apps embutidos no Hub" (modelo do Data Hub). Fluxo:

1. A pessoa clica no card do Hub. O Hub abre `/app/:id`: um quadro com `https://gestor-assinaturas.sebratel.net.br/?sso_token=…`.
2. Antes de montar a tela (`web/src/main.tsx` → `services/hub-session.ts`), o token sai da URL e vai para `POST /api/v1/auth/hub`.
3. A API (`auth/hub-sso.service.ts`) confere o token e devolve uma sessão própria de 8 h, que fica no `sessionStorage` do quadro. Uma aba aberta direto no sistema não herda essa sessão.
4. Toda chamada usa a sessão (Bearer). O perfil é lido de novo a cada pedido na tela Usuários: quem é removido perde o acesso na hora, mesmo com sessão.

O que a API confere no token do Hub:
- HS256 com `HUB_SSO_SECRET` (o `SSO_JWT_SECRET` do Hub);
- vencimento;
- `appId` = `HUB_APP_ID`, porque o segredo é o mesmo para todos os apps do Hub;
- e-mail @sebratel.com.br;
- uso único.

A sessão é assinada com chave derivada: o token do Hub não vale como sessão e a sessão não vale como token do Hub.

- **Quem entra:** toda a organização, como Visualizador (o card do Hub fica sem restrição). Editor e Master vêm da tela **Usuários**, também para quem entra pelo Hub.
- **`HUB_ONLY=true`:** o login com Google na própria página responde 403 `HUB_ONLY` para quem não é master. A tela mostra "Acesse pelo Hub Apps" com o link (`target="_top"`). O master continua entrando direto: é a porta de emergência se o Hub cair. Sem `HUB_SSO_SECRET`/`HUB_APP_ID`, o `HUB_ONLY` é ignorado, para não trancar todo mundo.
- **Quadro:** o nginx do frontend manda `Content-Security-Policy: frame-ancestors 'self' https://hub-apps.sebratel.net.br https://hub-apps-staging.sebratel.net.br`. Fica no nginx do sistema, porque o NPM ignora `add_header` na aba Advanced.
- **Rotas públicas:** `GET /api/v1/auth/config` (`hubOnly`, `hubEnabled`, `hubUrl`) e `POST /api/v1/auth/hub`.

## Estrutura

```
api/   NestJS 12 (ESM) + TypeORM, um módulo por domínio
  auth/                   login: verificação do token, entrada pelo Hub (hub-sso), guard global com perfil mínimo, GET /v1/me
  users/                  tela Usuários: perfis Master, Editor e Visualizador
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
web/   Vite + React 19 + Tailwind 4 + TanStack Query; casca do padroes-frontend §16
  src/components/layout/  topo, menu lateral, sino, perfil, cabeçalho de página, portão do login
  src/services/           chamadas à API (api-client com token e renovação) e Firebase Auth
scripts/exportar-ad.ps1   leitura do AD na máquina de dev
Dockerfile                imagem do backend (API)
Dockerfile.frontend       imagem do frontend (build do Vite num nginx sem root)
docker/nginx-frontend.conf  telas, rotas da SPA, repasse de /api para o backend, log em JSON
docker-compose.portainer.yml, .github/workflows/ci.yml
```

API REST em `/api/v1/*` com o envelope `{ success, data, meta }`. O health check fica em `/api/health` (sem login, sem envelope).

**Banco:** migration nova = arquivo `api/src/migrations/{timestamp}-Nome.ts` + uma linha em `MIGRATIONS` (`api/src/config/database.config.ts`). Nunca edite uma migration que já rodou. Exceções registradas ao padrão de chave `id`: `settings` (chave `setting_key`) e `collaborator_overrides` (chave = id do colaborador no AD).

## Deploy no Portainer

Modelo padrão da empresa: o Portainer constrói a imagem direto do Git. O CI só valida, não publica nada.

### 1. Passos manuais, uma vez só

São os que sempre esquecem. Nenhum deles está no código.

1. **Firebase** [PADRÃO]. Projeto `sistema-gestor-assinatur-9be62` (criado no console em 23/11/2026), só deste sistema (nunca reaproveitar o de outro setor). O app Web já existe; o Analytics que o console sugere não é usado.
   Conferir de fora, sem console: `GET https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=<VITE_FIREBASE_API_KEY>` devolve os domínios autorizados e os provedores ativos.
   1. Authentication › Sign-in method › **Google › Ativar**. Projeto novo vem com tudo desligado.
   2. Authentication › Settings › **Authorized domains**: adicionar o domínio do sistema (`gestor-assinaturas.sebratel.net.br`), usado pelo master no login direto. Só `localhost` vem liberado. Sem isso o login falha com `auth/unauthorized-domain`, e só no primeiro clique real.
   3. Configurações do projeto › Seus apps › **Web**: copiar `apiKey`, `authDomain` e `appId` para as variáveis `VITE_FIREBASE_*`.
   4. Google Cloud › Credenciais [RECOMENDADO]:
      - restringir a chave de API a Identity Toolkit e Token Service;
      - restringir os referenciadores HTTP ao domínio do sistema.
2. **MariaDB** [PADRÃO]. O usuário de leitura não enxerga banco novo, então crie o banco e dê o GRANT:

   Convenção do MariaDB corporativo (10.0.11.171): banco `DB_<Sistema>` e conta própria da aplicação, só nele (como o `hs_app` do Health Score). Rodar com `admin_master`, que é quem cria banco e usuário:

   ```sql
   CREATE DATABASE DB_Assinaturas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'assinaturas_app'@'%' IDENTIFIED BY '<senha forte>';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON DB_Assinaturas.* TO 'assinaturas_app'@'%';
   FLUSH PRIVILEGES;
   ```

   O DDL é necessário porque a migration roda ao subir. Sem `DROP`: desfazer migration é manual. Staging usa outro banco (ex.: `DB_Assinaturas_Staging`) com o mesmo GRANT.
3. **AD** [PADRÃO]. Uma conta **só de leitura** para o LDAP. Atenção: hoje "Domain Users" está dentro de "Administrators", então qualquer conta do domínio é administradora. Trate essa senha como senha de admin até isso ser corrigido.
4. **Quem acessa**. Os e-mails em `AUTH_ADMIN_EMAILS` (separados por vírgula) são **masters fixos**: sempre entram e não podem ser rebaixados pela tela. Toda conta do domínio entra como Visualizador; Editores e outros Masters são dados na tela **Usuários**.
5. **Chave do Google**. No painel ela vai em `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`, de preferência em base64 (uma linha, sem aspas para escapar):

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\caminho\da\chave.json"))
   ```

### 2. Criar a stack

Em Portainer › Stacks › Add stack › **Repository**:

| | Staging | Produção |
|---|---|---|
| Portainer | `portainer-staging.sebratel.net.br` | `portainer-prod.sebratel.net.br` |
| Nome da stack | `dev_nodejs_assinaturas` | `dev_nodejs_assinaturas` |
| Reference | `refs/heads/staging` | `refs/heads/main` |
| `ELASTIC_APM_ENVIRONMENT` | `staging` | `production` |
| Banco | separado do de produção | `assinaturas` |

- **Repositório:** `https://github.com/Sebratel/dev_NodeJS_Assinaturas` (privado). Marque *Authentication* com um token do GitHub **só de leitura** neste repositório.
- **Nome da stack** = `name:` do compose = nome do repositório em minúsculas (o CI confere). Renomear depois cria um volume novo e vazio.
- **Compose path:** `docker-compose.portainer.yml`.
- **Dois containers:** `frontend` publica a **porta 3080** (a mesma nos dois ambientes); `backend` não publica porta, só é alcançado pelo frontend na rede interna da stack. A 3080 foi conferida livre em PROD e STAGING (planilha `Portas_Containers_Portainer_Sebratel` e `docker ps` dos dois servidores) em 23/11/2026; registrar nas duas abas: `frontend` → 3080 (Frontend / Web UI) e `backend` → sem porta exposta (Backend / API).
- O proxy (NPM) do domínio aponta para `<servidor>:3080`.
- Em staging, deixe a gravação na **lista de teste** (Configurações › Google): a conta de serviço grava no Gmail de verdade, em qualquer ambiente.

Variáveis no painel **Environment** da stack. Segredo fica só ali, nunca no arquivo:

| Variável | Obrigatória | Valor / padrão | Segredo |
|---|---|---|---|
| `DB_HOST` | sim | `10.0.11.171` (MariaDB corporativo) | |
| `DB_USER` | sim | `assinaturas_app` | |
| `DB_PASSWORD` | sim | | **sim** |
| `DB_NAME` | não | `DB_Assinaturas` (staging: `DB_Assinaturas_Staging`) | |
| `AD_BIND_USER` | para ler o AD | conta só de leitura (ex.: `SEBRATEL\svc-assinaturas`). Vazio: a API sobe, sem colaboradores | |
| `AD_BIND_PASSWORD` | para ler o AD | | **sim** |
| `AD_URL`, `AD_BASE_DN` | não | `ldap://10.0.11.251`, `DC=corp,DC=sebratel,DC=com,DC=br` | |
| `AUTH_ADMIN_EMAILS` | sim | masters fixos, separados por vírgula (os demais na tela Usuários) | |
| `HUB_SSO_SECRET` | para o Hub | o **mesmo** valor do `SSO_JWT_SECRET` da stack do Hub Apps | **sim** |
| `HUB_APP_ID` | não | `16651205-0436-4ed8-80b1-d7ab4da9e48a` (id do app no `DB_Hub_Apps`) | |
| `HUB_ONLY` | não | `false`. `true` só depois de testar a entrada pelo Hub | |
| `FIREBASE_PROJECT_ID` | não | `sistema-gestor-assinatur-9be62` | |
| `VITE_FIREBASE_API_KEY` | sim | do app Web do Firebase (público por design) | |
| `VITE_FIREBASE_AUTH_DOMAIN` | não | `sistema-gestor-assinatur-9be62.firebaseapp.com` | |
| `VITE_FIREBASE_APP_ID` | sim | do app Web do Firebase | |
| `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` | sim | JSON da chave, em base64 | **sim** |
| `GOOGLE_DELEGATION_TEST_USER` | sim | um e-mail do domínio (só testa a delegação) | |
| `APP_PORT` | não | `3080`: porta do frontend no servidor (faixa Frontend / Web UI 3000–3099; confira com `docker ps`) | |
| `ELASTIC_APM_SERVER_URL` | não | `https://apm.sebratel.net.br`. Vazio desliga | |
| `ELASTIC_APM_ENVIRONMENT` | não | `production` (`staging` na stack de testes) | |

Já fixos no compose [PADRÃO]:

- `DB_TYPE=mariadb`, `DIRECTORY_SOURCE=ldap` e `HOST=0.0.0.0`;
- healthcheck do backend em `http://127.0.0.1:3180/api/health` e do frontend em `http://127.0.0.1:8080/healthz` (nunca `localhost`);
- o frontend só sobe depois do backend saudável (`depends_on: service_healthy`);
- `pull_policy: build` nas duas imagens: elas nascem do build, então *Re-pull image* pode ficar ligado (sem isso o deploy falha com "pull access denied for assinaturas-frontend");
- `mem_limit` sem swap (backend 1 GB, frontend 128 MB) e `restart: unless-stopped`;
- volume nomeado `data` para `/app/data` (bind mount é apagado no deploy por repositório).

`VITE_*` são gravadas no JavaScript **no build**. Mudou alguma, faça **Pull and redeploy** com rebuild; só reiniciar não muda nada.

### 3. Conferir depois do deploy

1. Pelo Hub Apps: o card "Gestor de Assinaturas" abre o sistema dentro do Hub, já logado. `curl -sI https://gestor-assinaturas.sebratel.net.br/ | grep -i content-security` mostra o `frame-ancestors` do Hub.
1. `http://<servidor>:3080/api/health` (pelo frontend) responde `"status":"ok"` com a versão. `directory.ok: false` = conta do AD faltando ou errada (o motivo está no Monitoramento).
2. A tela abre, o login funciona, uma conta qualquer do domínio entra como Visualizador e uma conta de fora do domínio vê "sem acesso".
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
  - **Web**: ESLint, Prettier, tipos, testes e build;
  - **imagem**: constrói as duas imagens, sobe a stack com um MariaDB descartável e sem a conta do AD, e confere pelo frontend: health, aviso do AD, backend sem porta publicada, tabelas da migration, 401 sem login e as rotas da tela;
  - **validacoes**: `validate-version.py` e `validate-compose.py --strict-ports` (scripts da skill em `.github/scripts/`).
- Fluxo: trabalho na `staging` (deploy de staging) → PR para a `main` (produção).
- Proteção da `main` [PADRÃO]: PR com 1 aprovação, check obrigatório **`ci-ok`** (só ele), sem push direto nem force push. **Não disponível hoje**: a org está no plano Free, que não aplica regra de proteção em repositório privado. Até assinar o Team, a regra vale por combinado.

### 6. Versão [PADRÃO]

- A versão do sistema fica no `package.json` da raiz e é a mesma em `api/`, `web/`, nos locks e no `${APP_VERSION:-X.Y.Z}` do compose. Ela aparece no `/api/health` e nas imagens do Portainer (`assinaturas-frontend:X.Y.Z` e `assinaturas-backend:X.Y.Z`).
- Mudar: `npm run version:set -- X.Y.Z` (na raiz). Todo commit que sobe para um ambiente precisa de versão **maior** que a que está lá; o CI recusa igual ou menor.

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
