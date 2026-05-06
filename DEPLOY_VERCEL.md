# Deploy na Vercel

Este projeto é desenvolvido no Lovable (TanStack Start) e pode ser hospedado na Vercel via GitHub.

## Como funciona

- `vite.config.ts` detecta `process.env.VERCEL` e troca o preset de build de Cloudflare Workers para Vercel automaticamente.
- Todas as `createServerFn` viram funções serverless da Vercel — nenhuma rota precisa ser reescrita.
- Lovable Cloud (Supabase) continua sendo o backend de banco/auth/storage. Funciona normalmente de qualquer host.

## Passo a passo

### 1. Conectar GitHub no Lovable
**Connectors → GitHub → Connect project** (sync bidirecional automático).

### 2. Importar o repo na Vercel
**vercel.com → New Project → Import Git Repository**. A Vercel detecta o `vercel.json` e o `.vercel/output` gerado pelo build.

### 3. Configurar variáveis de ambiente

Em **Vercel → Project Settings → Environment Variables**, adicione (escopos: Production + Preview + Development):

**Públicas (frontend, prefixo `VITE_`):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

**Servidor (secrets):**
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`

> Os valores estão no painel do Lovable Cloud (Supabase). O `.env` do Lovable não vai junto com o GitHub — precisa cadastrar manualmente.

### 4. Atualizar webhook do Asaas
Após o primeiro deploy, troque a URL no painel do Asaas para:
`https://<seu-projeto>.vercel.app/api/public/asaas-webhook`

### 5. Deploys automáticos
Cada push no GitHub (vindo do Lovable ou direto) dispara redeploy.
