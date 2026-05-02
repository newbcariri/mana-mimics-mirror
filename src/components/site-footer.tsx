import { Truck, ShieldCheck, CreditCard, Lock } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background mt-20">
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {[
            { icon: Truck, title: "Frete Grátis", desc: "Acima de R$199,90 para todo Brasil" },
            { icon: ShieldCheck, title: "Compra Segura", desc: "Site 100% protegido com SSL" },
            { icon: CreditCard, title: "Até 12x sem juros", desc: "No cartão de crédito" },
            { icon: Lock, title: "Troca Garantida", desc: "30 dias para trocar sua peça" },
          ].map(b => (
            <div key={b.title} className="flex items-center gap-3">
              <b.icon className="w-8 h-8 text-primary shrink-0" />
              <div>
                <div className="font-semibold">{b.title}</div>
                <div className="text-xs text-background/60">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="py-6 text-center text-xs text-background/50">
        © 2026 FlexFit Brasil — Todos os direitos reservados.
      </div>
    </footer>
  );
}
