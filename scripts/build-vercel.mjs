// Pós-build: monta o Vercel Build Output API v3 a partir do output do
// TanStack Start (dist/client + dist/server). Vercel Edge Function envolve
// o handler `fetch` exportado pelo server entry.
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const outDir = resolve(root, ".vercel/output");
const staticDir = resolve(outDir, "static");
const fnDir = resolve(outDir, "functions/ssr.func");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(fnDir, { recursive: true });

// Estáticos do cliente
const clientDir = resolve(root, "dist/client");
if (!existsSync(clientDir)) {
  throw new Error("dist/client não existe — rode `vite build` antes.");
}
cpSync(clientDir, staticDir, { recursive: true });

// Bundle SSR vai dentro da função
const serverDir = resolve(root, "dist/server");
if (!existsSync(serverDir)) {
  throw new Error("dist/server não existe — rode `vite build` antes.");
}
cpSync(serverDir, fnDir, { recursive: true });

// Entry da Edge Function: re-exporta o handler default (objeto com .fetch)
writeFileSync(
  resolve(fnDir, "index.mjs"),
  `import server from "./server.js";\nexport default async function handler(request, ctx) {\n  return server.fetch(request, {}, ctx);\n}\n`
);

writeFileSync(
  resolve(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "edge",
      entrypoint: "index.mjs",
    },
    null,
    2
  )
);

writeFileSync(
  resolve(fnDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2)
);

// Config raiz: servir estáticos pelo filesystem, demais rotas vão para SSR
writeFileSync(
  resolve(outDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/ssr" },
      ],
    },
    null,
    2
  )
);

console.log("[vercel] Build Output gerado em .vercel/output");
