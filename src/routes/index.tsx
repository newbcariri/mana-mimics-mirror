import { useEffect, useRef, useState } from "react";
import { Star, Check, ShieldCheck, Truck, Package, CreditCard, Plus, Zap, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PRODUCT, REVIEWS, UPSELL, COMBO_IMAGE } from "@/lib/product-data";
import { cart } from "@/lib/cart-store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { fbqTrack } from "@/lib/fbq";
import antesDepois from "@/assets/antes-depois.jpg";

export const Route = createFileRoute("/")({
  component: ProductPage,
});

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"} />
      ))}
    </div>
  );
}

const FAQ = [
  { q: "Funciona em qualquer embalagem?", a: "Sim! Funciona em sacos plásticos, embalagens de salgadinho, biscoito, café, congelados e mais. Compatível com a maioria dos tipos de plástico flexível." },
  { q: "Precisa de bateria?", a: "Funciona com 2 pilhas AA (não inclusas) e também pode ser carregada via cabo USB-C. Bateria dura semanas com uso normal." },
  { q: "Quanto tempo dura?", a: "Produto durável feito em ABS resistente, com vida útil estimada de mais de 2 anos com uso diário." },
  { q: "Quanto tempo para entrega?", a: "Envio em até 24h após confirmação do pagamento. Entrega de 3 a 10 dias úteis para todo o Brasil, com código de rastreio." },
];

function ProductPage() {
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(0);
  const [withUpsell, setWithUpsell] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const media = PRODUCT.images;

  useEffect(() => {
    fbqTrack(
      "ViewContent",
      { content_name: PRODUCT.name, content_type: "product", currency: "BRL", value: PRODUCT.pricePix },
      `viewcontent:${PRODUCT.name}`,
    );
  }, []);

  const total = PRODUCT.pricePix + (withUpsell ? UPSELL.price : 0);

  const handleBuy = () => {
    cart.add({
      productName: PRODUCT.name,
      color: "Padrão",
      topSize: "-",
      legSize: "-",
      quantity: 1,
      unitPrice: PRODUCT.pricePix,
      image: PRODUCT.images[0],
    });
    if (withUpsell) {
      cart.add({
        productName: UPSELL.name,
        color: "Padrão",
        topSize: "-",
        legSize: "-",
        quantity: 1,
        unitPrice: UPSELL.price,
        image: UPSELL.image,
      });
    }
    fbqTrack("AddToCart", {
      content_name: PRODUCT.name,
      content_type: "product",
      currency: "BRL",
      value: total,
    });
    toast.success("Adicionado ao carrinho!");
    navigate({ to: "/carrinho" });
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      {/* Top urgency bar */}
      <div className="bg-primary text-primary-foreground text-center text-xs sm:text-sm font-semibold py-2 px-4">
        🚚 Frete grátis para todo o Brasil · ⚡ Envio em 24h
      </div>

      <SiteHeader />

      {/* HERO — first fold */}
      <section className="max-w-6xl mx-auto px-4 pt-4 lg:pt-8 grid lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Gallery */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square bg-muted rounded-2xl overflow-hidden">
            <span className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Mais vendido
            </span>
            <img src={media[activeImg]} alt={PRODUCT.name} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {media.map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${activeImg === i ? "border-primary" : "border-border hover:border-foreground/30"}`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Buy panel */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Stars value={PRODUCT.rating} />
            <span className="font-semibold">{PRODUCT.rating}/5</span>
            <span className="text-muted-foreground">· +1.000 clientes satisfeitos</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
            Feche qualquer embalagem em segundos e evite desperdício
          </h1>
          <p className="text-base text-muted-foreground -mt-1">
            Mantenha seus alimentos frescos por muito mais tempo com a <strong className="text-foreground">{PRODUCT.name}</strong>.
          </p>

          {/* Price */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground line-through">De {formatBRL(PRODUCT.priceOriginal)}</span>
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">-{PRODUCT.pixDiscount}%</span>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">Por apenas</span>
              <span className="text-4xl sm:text-5xl font-extrabold text-primary leading-none">{formatBRL(PRODUCT.pricePix)}</span>
            </div>
            <div className="text-sm text-foreground/80 pt-1">
              💳 ou <strong>3x de {formatBRL(PRODUCT.installments.value)}</strong> sem juros no cartão
            </div>
            <div className="text-sm font-bold text-primary flex items-center gap-2 bg-primary/10 rounded-md px-3 py-2 mt-1">
              <Truck className="w-4 h-4" /> Frete grátis para todo o Brasil
            </div>
          </div>

          {/* Upsell checkbox */}
          <label
            className={`block cursor-pointer rounded-2xl border-2 p-3 sm:p-4 transition-all ${
              withUpsell ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-dashed border-primary/50 hover:border-primary"
            }`}
          >
            <div className="flex gap-3 items-start">
              <input
                type="checkbox"
                checked={withUpsell}
                onChange={e => setWithUpsell(e.target.checked)}
                className="mt-1 w-5 h-5 accent-[oklch(0.62_0.18_145)] shrink-0"
              />
              <img src={UPSELL.image} alt={UPSELL.name} className="w-16 h-16 rounded-lg object-cover bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">Adicionar {UPSELL.name}</span>
                  <span className="bg-primary text-primary-foreground text-[10px] font-extrabold px-2 py-0.5 rounded-full">+{formatBRL(UPSELL.price)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{UPSELL.description}</p>
              </div>
            </div>
          </label>

          {/* Combo block */}
          {withUpsell && (
            <div className="rounded-2xl overflow-hidden border-2 border-primary bg-primary/5">
              <div className="px-4 py-3 bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2">
                🔥 Kit completo de conservação
              </div>
              <div className="p-4 flex items-center gap-4">
                <img src={COMBO_IMAGE} alt="Kit completo" className="w-24 h-24 rounded-lg object-cover bg-muted" />
                <div>
                  <div className="font-bold text-sm">Seladora + Dispenser</div>
                  <p className="text-xs text-muted-foreground mt-1">Kit completo para conservar alimentos com mais eficiência.</p>
                  <div className="text-lg font-extrabold text-primary mt-1">Total: {formatBRL(total)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Buy button */}
          <button
            onClick={handleBuy}
            className="w-full h-14 bg-primary text-primary-foreground rounded-xl text-base sm:text-lg font-extrabold uppercase tracking-wide shadow-lg hover:bg-primary/90 active:scale-[0.99] transition-all"
          >
            🛒 Quero minha seladora agora
          </button>

          {/* Trust */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" /> Compra segura
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
              <Package className="w-4 h-4 text-primary shrink-0" /> Envio com rastreio
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
              <CreditCard className="w-4 h-4 text-primary shrink-0" /> Pix e cartão
            </div>
          </div>
        </div>
      </section>

      {/* ANTES x DEPOIS */}
      <section className="max-w-6xl mx-auto px-4 mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Veja a diferença</h2>
        <p className="text-center text-muted-foreground mt-2 max-w-xl mx-auto">
          Embalagens abertas estragam em horas. Com a Mini Seladora, seus alimentos duram dias a mais.
        </p>
        <div className="mt-6 rounded-2xl overflow-hidden border border-border">
          <img src={antesDepois} alt="Antes e depois" className="w-full h-auto" />
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="max-w-6xl mx-auto px-4 mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Por que todo mundo está comprando</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[
            { icon: "💰", title: "Evita desperdício", desc: "Conserva alimentos por muito mais tempo" },
            { icon: "⚡", title: "Sela em segundos", desc: "Rápida, prática, sem complicação" },
            { icon: "🤏", title: "Portátil", desc: "Cabe na palma da mão e na gaveta" },
            { icon: "✅", title: "Versátil", desc: "Funciona em vários tipos de plástico" },
          ].map(b => (
            <div key={b.title} className="rounded-2xl border border-border p-5 bg-card">
              <div className="text-3xl">{b.icon}</div>
              <div className="font-bold mt-2">{b.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AVALIAÇÕES */}
      <section className="max-w-6xl mx-auto px-4 mt-16" id="avaliacoes">
        <div className="flex items-center gap-3 justify-center">
          <Stars value={PRODUCT.rating} size={20} />
          <span className="font-bold text-lg">{PRODUCT.rating}/5</span>
          <span className="text-muted-foreground text-sm">({PRODUCT.reviewCount} avaliações)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mt-2">O que dizem nossos clientes</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {REVIEWS.slice(0, 6).map((r, i) => (
            <div key={i} className="rounded-2xl border border-border p-5 bg-card">
              <Stars value={r.rating} />
              <div className="font-bold mt-2">{r.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{r.text}</p>
              <div className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                  {r.name.split(" ").map(p => p[0]).join("").slice(0, 2)}
                </span>
                {r.name} · {r.date}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CONFIANÇA */}
      <section className="max-w-6xl mx-auto px-4 mt-16">
        <div className="rounded-2xl bg-muted p-6 sm:p-10 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: ShieldCheck, title: "Produto testado", desc: "Aprovado por mais de 1.000 clientes" },
            { icon: Truck, title: "Garantia de entrega", desc: "Reembolso se não chegar" },
            { icon: Zap, title: "Suporte ágil", desc: "Atendimento por WhatsApp em horário comercial" },
          ].map(b => (
            <div key={b.title} className="flex flex-col items-center gap-2">
              <b.icon className="w-8 h-8 text-primary" />
              <div className="font-bold">{b.title}</div>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Perguntas frequentes</h2>
        <div className="mt-6 divide-y divide-border border border-border rounded-2xl bg-card">
          {FAQ.map((f, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full text-left p-4 sm:p-5 flex items-start gap-3 hover:bg-muted/50"
            >
              <Plus
                className={`w-5 h-5 text-primary shrink-0 mt-0.5 transition-transform ${openFaq === i ? "rotate-45" : ""}`}
              />
              <div className="flex-1">
                <div className="font-semibold">{f.q}</div>
                {openFaq === i && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.a}</p>}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 mt-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">Comece a economizar hoje</h2>
        <p className="text-muted-foreground mt-2">Mais de 1.000 lares já resolveram o problema do desperdício.</p>
        <button
          onClick={handleBuy}
          className="mt-6 inline-flex items-center justify-center h-14 px-8 bg-primary text-primary-foreground rounded-xl text-base font-extrabold uppercase tracking-wide shadow-lg hover:bg-primary/90"
        >
          🛒 Quero minha seladora — {formatBRL(total)}
        </button>
        <div className="text-xs text-muted-foreground mt-3">🚚 Frete grátis · 🔒 Compra 100% segura</div>
      </section>

      <SiteFooter />

      {/* Sticky mobile buy bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-background/95 backdrop-blur border-t border-border p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <div className="leading-tight">
            <div className="text-[10px] text-muted-foreground line-through">{formatBRL(PRODUCT.priceOriginal)}</div>
            <div className="text-lg font-extrabold text-primary">{formatBRL(total)}</div>
          </div>
          <button
            onClick={handleBuy}
            className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-extrabold text-sm uppercase tracking-wide shadow-lg ring-2 ring-primary/30"
          >
            🛒 Comprar agora
          </button>
        </div>
      </div>
    </div>
  );
}
