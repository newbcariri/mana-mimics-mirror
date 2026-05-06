## Objetivo

Tornar o projeto deployável na Vercel via GitHub, mantendo a arquitetura atual (TanStack Start + `createServerFn` + Lovable Cloud como banco/auth). **Nenhuma rota precisa ser reescrita** — `createServerFn` vira função serverless da Vercel automaticamente quando o preset correto está configurado.

## Mudanças no código

### 1. Trocar preset de deploy: Cloudflare Workers → Vercel

**`vite.config.ts`** — passar `target: "vercel"` (ou equivalente) para o config do Lovable:
```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
export default defineConfig({
  tanstackStart: { target: "vercel" },
});
```

**Remover `wrangler.jsonc`** — específico do Cloudflare, irrelevante na Vercel.

### 2. Adicionar `vercel.json` (opcional, mas recomendado)

```json
{
  "framework": null,
  "buildCommand": "npm run build",
  "outputDirectory": ".vercel/output"
}
```
TanStack Start com preset `vercel` gera automaticamente a estrutura `.vercel/output` (Build Output API v3) — a Vercel reconhece sem config extra. Incluir `vercel.json` só para travar o comportamento.

### 3. Variáveis de ambiente

Hoje (Lovable Cloud) você tem injetadas:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`

**Você precisa cadastrar TODAS manualmente** no painel Vercel → Project Settings → Environment Variables (escopos: Production + Preview). O `.env` do Lovable não é versionado e não vai com o GitHub.

### 4. Webhook Asaas

A URL muda: `https://<seu-projeto>.vercel.app/api/public/asaas-webhook`. Você atualiza no painel do Asaas após o primeiro deploy.

### 5. O que NÃO muda

- `src/routes/pix.$orderId.tsx` continua importando `createPixCharge` de `@/server/asaas.functions` — isso está correto e seguro. O Vite strippa o handler do bundle do cliente.
- `src/server/asaas.functions.ts`, `asaas-webhook.ts`, `client.server.ts` — sem alterações.
- Lovable Cloud (Supabase) continua sendo o backend de banco/auth/storage — só é uma API HTTPS, funciona de qualquer host.

## Fluxo de deploy depois de pronto

1. Conectar projeto ao GitHub via **Connectors → GitHub** no Lovable (sync bidirecional automático).
2. Na Vercel: **New Project → Import** o repositório do GitHub.
3. Cadastrar todas as env vars listadas acima.
4. Deploy. Cada `git push` (vindo do Lovable ou direto) dispara redeploy automático.
5. Atualizar webhook do Asaas para a URL Vercel.

## Riscos / pontos de atenção

- **Preset `vercel`**: confirmo a sintaxe exata do `@lovable.dev/vite-tanstack-config` ao implementar (pode ser `target`, `preset` ou config no `tanstackStart`). Se a wrapper do Lovable não expor essa opção, faço fallback adicionando `@tanstack/react-start` direto no `vite.config.ts` com o adapter Vercel oficial.
- **Preview do Lovable pode quebrar** depois da mudança, já que o sandbox do Lovable espera o preset Cloudflare. Posso configurar build condicional (`process.env.VERCEL ? "vercel" : "cloudflare"`) para manter os dois funcionando.
- **Edge functions do Lovable Cloud**: você não tem nenhuma — toda lógica está em `createServerFn`/server routes, então nada a migrar.

## Resumo do que vou entregar

- `vite.config.ts` ajustado para preset Vercel (com fallback para Cloudflare se rodar no Lovable)
- `wrangler.jsonc` removido
- `vercel.json` criado
- `README` curto com checklist de env vars + passo a passo Vercel
- Zero mudança em código de aplicação (rotas, server functions, frontend)
