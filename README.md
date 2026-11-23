# Assinaturas Sebratel

Gestão das assinaturas de e-mail corporativas do Gmail. O sistema lê os colaboradores do AD, aplica as regras criadas pelos admins (por nível, área, time, cargo) e monta a assinatura padronizada de cada pessoa. A gravação automática no Gmail entra quando o Google Workspace autorizar a conta de serviço.

## Estado (v0.2, local)

| Parte | Situação |
|---|---|
| Leitura do AD | Local: AD ao vivo com o login do Windows (`DIRECTORY_SOURCE=windows`, a cada 5 min e pelo botão ↻). A leitura direta por LDAP (`ldap`), para o servidor, está escrita mas ainda não foi testada contra o AD. |
| Campos do AD | 0800 = General › Telephone number (só sai se for um 0800 válido). Ramal = Telephones › IP phone. Celular = Telephones › Mobile. |
| Regras, motor e simulação | Prontos, com testes |
| Modelos de assinatura | Tela "Modelos": HTML com variáveis (`{{nome}}`, `{{#frase}}…{{/frase}}`) e prévia com pessoa real. A regra escolhe o modelo; sem escolha, vale o padrão. |
| Gravar no Gmail | Funciona: delegação autorizada (client ID `113892655020718818138`), só no endereço principal, em lote e com histórico. Desfaz a última gravação. Em teste: só grava para quem está em `GOOGLE_APPLY_ALLOWLIST`. |
| Login (SSO) | Não tem. A API só escuta em 127.0.0.1 |
| Banco | Arquivo local (sql.js). MariaDB já configurável, mas ainda sem migrations |

## Rodar local

Pré-requisitos: Node 22+ e a máquina no domínio (para exportar o AD com o seu login, sem senha).

```powershell
# 1. Exportar o AD (só leitura). O arquivo fica em data/ e não vai para o git.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\exportar-ad.ps1

# 2. API (http://127.0.0.1:3180/api)
cd api; copy .env.example .env; npm install; npm run build; npm start

# 3. Tela (http://127.0.0.1:5180)
cd web; npm install; npm run dev
```

Testes da API: `cd api; npm test`. Tipos: `npm run typecheck` (API) e `npx tsc -b` (web).

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
- Celular (`mobile`), ramal (`ipPhone`) e segmento B2B (`extensionAttribute1`) estão **vazios** no AD. O time vai criar esses campos.
- `telephoneNumber` **não** é o telefone da pessoa: é o 0800 para todos.

## Estrutura

```
api/   NestJS 12 (ESM) + TypeORM, um módulo por domínio
  directory/          leitura do AD (LDAP ou snapshot) e tradução para colaborador
  settings/           origem dos campos, sinônimos, de-para, frases, filtros
  signature-rules/    CRUD de regras (exclusão lógica)
  signatures/         motor, HTML da assinatura, cobertura, simulação
  google-integration/ estado da autorização
web/   Vite + React 19 + Tailwind 4 + TanStack Query
scripts/exportar-ad.ps1
```

API REST em `/api/v1/*` com o envelope `{ success, data, meta }`. O health check fica em `/api/health`.

## Antes de produção

1. Ter uma **conta só de leitura no AD** e trocar `DIRECTORY_SOURCE` para `ldap`. Hoje toda conta do domínio é administradora, porque "Domain Users" está dentro de "Administrators": tratar essa senha como senha de admin.
2. Receber a **autorização do superadmin** e implementar a gravação com a API do Gmail (`users.settings.sendAs.patch`).
3. **Login com Google:** criar um projeto Firebase só deste sistema e definir quem é admin.
4. Tela **"Minha assinatura"** para Direção e Gerência digitarem o próprio celular.
5. **Hospedar as imagens** num endereço público da empresa. Hoje elas vêm do `raw.githubusercontent` do repositório `dev_Sebratel_Images`.
6. **Banco:** MariaDB com migrations e o GRANT do banco novo.
7. **Entrega:** Dockerfile, compose do Portainer e CI.
