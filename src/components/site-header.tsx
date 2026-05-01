import { Link } from "@tanstack/react-router";
import { User, ShoppingBag } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      {/* Top bar */}
      <div className="bg-foreground text-background text-[11px] sm:text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center">
          <span><strong>FRETE GRÁTIS</strong> ACIMA DE R$199,90 PARA TODO O BRASIL</span>
          <span className="hidden md:inline">ATÉ <strong>12x SEM JUROS</strong> NO CARTÃO</span>
          <span className="hidden lg:inline"><strong>5% DE DESCONTO</strong> NO PIX</span>
        </div>
      </div>
      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="font-display font-extrabold text-xl sm:text-2xl tracking-tight">
            <span className="text-primary">FLEX</span>FIT
          </div>
          <span className="hidden sm:block text-[9px] uppercase tracking-[0.2em] text-muted-foreground border-l border-border pl-2">Brasil<br/>Fitness Wear</span>
        </Link>
        <div className="flex items-center gap-4 ml-auto">
          <button className="flex items-center gap-2 text-sm">
            <User className="w-5 h-5" />
            <span className="hidden sm:inline text-xs"><span className="font-semibold">Entre</span> ou <span className="font-semibold">Cadastre-se</span></span>
          </button>
          <button className="relative flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 text-xs font-semibold">
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">MEU CARRINHO</span>
            <span className="absolute -top-1 -right-1 bg-foreground text-background w-5 h-5 rounded-full text-[10px] flex items-center justify-center">0</span>
          </button>
        </div>
      </div>
    </header>
  );
}
