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
      { name: "facebook-domain-verification", content: "hibnvy385jscn0sa5pyii4nmpmavf9" },
      { title: "FlexFit Store | Conjunto Fitness Premium que Modela o Corpo (Poliamida)" },
      { name: "description", content: "Conjunto fitness premium em poliamida que modela o corpo. Alta compressão, proteção UV 50+, tecnologia Dry. A partir de R$ 59,90 no PIX." },
      { name: "author", content: "FlexFit Store" },
      { property: "og:title", content: "FlexFit Store | Conjunto Fitness Premium que Modela o Corpo (Poliamida)" },
      { property: "og:description", content: "Conjunto fitness premium em poliamida que modela o corpo. Alta compressão, proteção UV 50+, tecnologia Dry. A partir de R$ 59,90 no PIX." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FlexFit Store | Conjunto Fitness Premium que Modela o Corpo (Poliamida)" },
      { name: "twitter:description", content: "Conjunto fitness premium em poliamida que modela o corpo. Alta compressão, proteção UV 50+, tecnologia Dry. A partir de R$ 59,90 no PIX." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0a5abc95-a6c0-4ba1-ba5b-a52f0cf7ebe0/id-preview-a3da1f8e--2a636371-c8fa-4899-9425-e477791feabf.lovable.app-1778036461420.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0a5abc95-a6c0-4ba1-ba5b-a52f0cf7ebe0/id-preview-a3da1f8e--2a636371-c8fa-4899-9425-e477791feabf.lovable.app-1778036461420.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap" },
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
