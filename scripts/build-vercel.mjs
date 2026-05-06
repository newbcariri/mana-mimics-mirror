// Pós-build: monta o Vercel Build Output API v3 a partir do output do
// TanStack Start (dist/client + dist/server). Empacota o server entry com
// esbuild para que dependências externas (h3-v2, @tanstack/*) sejam embutidas
// no bundle servido pela função Node da Vercel.
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { build as esbuild } from "esbuild";

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

// Bundle SSR
const serverEntry = resolve(root, "dist/server/server.js");
if (!existsSync(serverEntry)) {
  throw new Error("dist/server/server.js não existe — rode `vite build` antes.");
}

await esbuild({
  entryPoints: [serverEntry],
  outfile: resolve(fnDir, "server.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  logLevel: "warning",
  banner: {
    js: "import { createRequire as __vercelCR } from 'module'; const require = __vercelCR(import.meta.url);",
  },
});

// Launcher Node.js da Vercel: recebe (req, res) Node clássicos. Convertemos
// para Web Request, chamamos o handler `fetch` do TanStack Start e devolvemos
// a Response como stream Node.
writeFileSync(
  resolve(fnDir, "index.mjs"),
  `import { Readable } from "node:stream";
import server from "./server.mjs";

export default async function handler(req, res) {
  try {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const url = new URL(req.url, proto + "://" + host);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else if (value !== undefined) {
        headers.set(key, value);
      }
    }

    const init = { method: req.method, headers };
    if (req.method && req.method !== "GET" && req.method !== "HEAD") {
      init.body = Readable.toWeb(req);
      init.duplex = "half";
    }

    const request = new Request(url, init);
    const response = await server.fetch(request, {}, {});

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("[ssr] handler error:", error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}
`
);

writeFileSync(
  resolve(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
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
