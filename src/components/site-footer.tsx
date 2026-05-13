import { Truck, ShieldCheck, CreditCard, Lock } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background mt-20">
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {[
            { icon: Truck, title: "Frete Grátis", desc: "Para todo o Brasil" },
            { icon: ShieldCheck, title: "Compra Segura", desc: "Site 100% protegido com SSL" },
            { icon: CreditCard, title: "Pix e Cartão", desc: "Pagamento facilitado" },
            { icon: Lock, title: "Garantia", desc: "7 dias para troca ou devolução" },
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
        © 2026 Casa Resolve — casaresolveonline.com.br · Todos os direitos reservados.
      </div>
    </footer>
  );
}
