# Deploy na Vercel

Este projeto é desenvolvido no Lovable (TanStack Start) e pode ser hospedado na Vercel via GitHub.

## Como funciona

- A Vercel hospeda apenas o frontend.
- O checkout chama o backend publicado do Lovable em `https://mana-mimics-mirror.lovable.app`.
- Os secrets de pagamento e banco ficam somente no Lovable Cloud; não cadastre `SUPABASE_SERVICE_ROLE_KEY` na Vercel.

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
- `VITE_API_BASE_URL` = `https://mana-mimics-mirror.lovable.app`

> Não configure secrets de servidor na Vercel. O backend usado pelo checkout é o Lovable.

### 4. Atualizar webhook do Asaas
Use esta URL no Asaas:
`https://mana-mimics-mirror.lovable.app/api/public/asaas-webhook`

### 5. Deploys automáticos
Cada push no GitHub (vindo do Lovable ou direto) dispara redeploy.
