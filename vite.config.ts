// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Detect Vercel build environment. When deploying on Vercel we disable the
// Cloudflare Workers plugin and switch the TanStack Start preset to `vercel`,
// which emits the Vercel Build Output API v3 (`.vercel/output`) format.
// Inside the Lovable sandbox / preview, neither flag is set, so the default
// Cloudflare preset is used as before.
const isVercel = !!process.env.VERCEL;

export default defineConfig({
  cloudflare: isVercel ? false : undefined,
  tanstackStart: isVercel ? { target: "vercel" } : undefined,
});
