import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { MetaPixel } from "@/components/meta-pixel";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">A página que você procura não existe.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Voltar para Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "facebook-domain-verification", content: "5907opeinrjc89nr1wgg1gu928g7w3" },
      { title: "Casa Resolve | Mini Seladora Portátil — Feche Embalagens em Segundos" },
      { name: "description", content: "Mini Seladora Portátil que fecha qualquer embalagem em segundos. Mantenha seus alimentos frescos por muito mais tempo. R$ 49,90 com frete grátis." },
      { name: "author", content: "Casa Resolve" },
      { property: "og:title", content: "Casa Resolve | Mini Seladora Portátil — Feche Embalagens em Segundos" },
      { property: "og:description", content: "Mini Seladora Portátil que fecha qualquer embalagem em segundos. R$ 49,90 com frete grátis." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Casa Resolve | Mini Seladora Portátil" },
      { name: "twitter:description", content: "Feche qualquer embalagem em segundos e evite desperdício. R$ 49,90 com frete grátis." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0a5abc95-a6c0-4ba1-ba5b-a52f0cf7ebe0/id-preview-a3da1f8e--2a636371-c8fa-4899-9425-e477791feabf.lovable.app-1778036461420.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0a5abc95-a6c0-4ba1-ba5b-a52f0cf7ebe0/id-preview-a3da1f8e--2a636371-c8fa-4899-9425-e477791feabf.lovable.app-1778036461420.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://connect.facebook.net" },
      { rel: "preconnect", href: "https://www.googletagmanager.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap" },
    ],
    scripts: [
      {
        children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('set','autoConfig',false,'2469959593452830');fbq('init','2469959593452830');fbq('track','PageView');window.__metaPixelLoaded=true;window.__metaPixelLastPath=location.pathname;`,
      },
      {
        src: "https://www.googletagmanager.com/gtag/js?id=G-SXL0L3Q6CJ",
        async: true,
      },
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','G-SXL0L3Q6CJ',{send_page_view:true});window.__gaLastPath=location.pathname+location.search;`,
      },
      {
        children: `(function(c,l,a,r,i,t,y){if(c[i])return;c[i]=function(){(c[i].q=c[i].q||[]).push(arguments)};t=l.createElement(a);t.async=1;t.src="https://www.clarity.ms/tag/"+r;y=l.getElementsByTagName(a)[0];y.parentNode.insertBefore(t,y);})(window,document,"script","wqxivdl8we","clarity");`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() { return (<><MetaPixel /><Outlet /><WhatsAppFab /><Toaster position="top-center" richColors /></>); }
