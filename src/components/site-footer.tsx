import { Instagram, Facebook, Youtube, Truck, ShieldCheck, CreditCard, Lock } from "lucide-react";

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
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-display font-extrabold text-xl mb-4"><span className="text-primary">FLEX</span>FIT</div>
          <p className="text-background/60 text-xs leading-relaxed">Moda fitness de alta performance, feita pra mulheres que treinam, transpiram e não abrem mão do estilo.</p>
          <div className="flex gap-3 mt-4">
            <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-colors"><Instagram className="w-4 h-4" /></a>
            <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-colors"><Facebook className="w-4 h-4" /></a>
            <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary transition-colors"><Youtube className="w-4 h-4" /></a>
          </div>
        </div>
        {[
          { title: "Institucional", links: ["Quem somos", "Trabalhe conosco", "Política de privacidade", "Termos de uso"] },
          { title: "Atendimento", links: ["Central de ajuda", "Trocas e devoluções", "Rastrear pedido", "Fale conosco"] },
          { title: "Categorias", links: ["Conjuntos", "Leggings", "Tops", "Shorts", "Promoções"] },
        ].map(c => (
          <div key={c.title}>
            <div className="font-semibold mb-4">{c.title}</div>
            <ul className="space-y-2 text-background/60 text-xs">
              {c.links.map(l => <li key={l}><a href="#" className="hover:text-primary">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-background/50">
        © 2026 FlexFit Brasil — Todos os direitos reservados.
      </div>
    </footer>
  );
}
