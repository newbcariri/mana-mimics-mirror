import { createFileRoute } from "@tanstack/react-router";

// TEMPORÁRIO — REMOVER APÓS USAR
// Acesse: /api/public/reveal-key?token=SEU_TOKEN&name=SUPABASE_SERVICE_ROLE_KEY
// Defina o secret REVEAL_TOKEN no Lovable Cloud antes de usar.

const ALLOWED = new Set([
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "ASAAS_API_KEY",
  "ASAAS_WEBHOOK_TOKEN",
]);

export const Route = createFileRoute("/api/public/reveal-key")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expected = process.env.REVEAL_TOKEN;
        if (!expected) {
          return new Response("REVEAL_TOKEN não configurado", { status: 500 });
        }
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const name = url.searchParams.get("name") || "SUPABASE_SERVICE_ROLE_KEY";

        if (!token || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!ALLOWED.has(name)) {
          return new Response("Nome não permitido", { status: 400 });
        }
        const value = process.env[name];
        if (!value) {
          return new Response(`${name} não configurada`, { status: 404 });
        }
        return new Response(value, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
