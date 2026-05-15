import { useEffect, useState } from "react";
import { Star, ShieldCheck, Truck, Package, CreditCard, Plus, Zap, Play } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductGallery, type GalleryItem } from "@/components/product-gallery";
import { VideoModal } from "@/components/video-modal";
import { PRODUCT, REVIEWS, UPSELL } from "@/lib/product-data";
import { cart } from "@/lib/cart-store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { fbqTrack } from "@/lib/fbq";
import { sendWebhookEvent } from "@/lib/webhook";
import antesDepois from "@/assets/antes-depois.jpg";
import seladoraPrincipal from "@/assets/seladora-principal.jpeg";
import seladoraVideo from "@/assets/seladora-demo.mp4";
import seladoraVideo2 from "@/assets/seladora-demo-2.mp4";
import dispenserVideo from "@/assets/dispenser-demo.mp4";

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
  
  const [withUpsell, setWithUpsell] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showDispenserVideo, setShowDispenserVideo] = useState(false);

  const media: GalleryItem[] = [
    { type: "image", src: seladoraPrincipal },
    { type: "video", src: seladoraVideo },
    { type: "video", src: seladoraVideo2 },
    ...PRODUCT.images.map(src => ({ type: "image" as const, src })),
  ];

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
    sendWebhookEvent({ tipo_evento: "iniciar_checkout", produto: PRODUCT.name, valor: PRODUCT.pricePix });
    sendWebhookEvent({ tipo_evento: "add_carrinho", produto: PRODUCT.name, valor: PRODUCT.pricePix });
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
        <ProductGallery items={media} alt={PRODUCT.name} badge="Mais vendido" />

        {/* Buy panel */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Stars value={PRODUCT.rating} />
            <span className="font-semibold">{PRODUCT.rating}/5</span>
            <span className="text-muted-foreground">· +1.000 clientes satisfeitos</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
            Nunca mais jogue comida fora por causa de embalagem aberta
          </h1>
          <p className="text-base text-muted-foreground -mt-1">
            Com a <strong className="text-foreground">{PRODUCT.name}</strong> você sela qualquer embalagem em segundos e mantém seus alimentos frescos por <strong className="text-foreground">até 5x mais tempo</strong> — sem desperdício e sem gastar mais.
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1.5 w-fit">
            ⏳ Restam poucas unidades em estoque
          </div>

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
              💳 ou <strong>{formatBRL(PRODUCT.pricePix)} em 1x no cartão</strong>
            </div>
            <div className="text-sm font-bold text-primary flex items-center gap-2 bg-primary/10 rounded-md px-3 py-2 mt-1">
              <Truck className="w-4 h-4" /> Frete grátis para todo o Brasil
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-1">
                🔥 Estoque limitado
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">
                📦 Envio em até 24h
              </span>
            </div>
          </div>

          {/* Upsell — Kit completo (destaque máximo) */}
          <div
            className={`relative rounded-2xl border-2 transition-all overflow-hidden ${
              withUpsell ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-primary/60 bg-primary/[0.03]"
            }`}
          >
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              ⭐ Melhor escolha
            </div>
            <div className="px-4 pt-4 pb-1 font-extrabold text-sm sm:text-base">
              🔥 Evite desperdício de verdade com o kit completo
            </div>
            <div className="px-4 pb-4">
              {/* ÁREA 2 — clique aqui abre o vídeo, NÃO mexe no checkbox */}
              <button
                type="button"
                onClick={() => setShowDispenserVideo(true)}
                className="w-full text-left flex gap-3 items-center group"
                aria-label="Ver vídeo do dispenser"
              >
                <span className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0 block">
                  <img src={UPSELL.image} alt="Dispenser de papel filme" className="w-full h-full object-cover" />
                  <span className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/50 transition">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </span>
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-bold text-center py-0.5">
                    Ver vídeo
                  </span>
                </span>
                <span className="flex-1 min-w-0 block">
                  <span className="block text-xs sm:text-sm text-foreground/80 leading-snug">
                    Use a <strong>seladora + dispenser</strong> e conserve seus alimentos por muito mais tempo.
                  </span>
                  <span className="mt-2 flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground line-through">De {formatBRL(PRODUCT.priceOriginal + UPSELL.price)}</span>
                    <span className="text-lg font-extrabold text-primary">Por {formatBRL(PRODUCT.pricePix + UPSELL.price)}</span>
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    Seladora {formatBRL(PRODUCT.pricePix)} + Dispenser {formatBRL(UPSELL.price)}
                  </span>
                </span>
              </button>

              {/* ÁREA 1 — clique em qualquer lugar marca/desmarca o checkbox */}
              <label
                className={`mt-3 flex items-center gap-3 rounded-xl border-2 px-3 py-3 cursor-pointer select-none transition active:scale-[0.99] ${
                  withUpsell ? "border-primary bg-primary/10" : "border-dashed border-primary/50 bg-background hover:bg-primary/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={withUpsell}
                  onChange={e => setWithUpsell(e.target.checked)}
                  className="w-5 h-5 accent-[oklch(0.62_0.18_145)] shrink-0 cursor-pointer"
                />
                <span className="text-sm font-bold flex-1">
                  {withUpsell ? "✔ Kit completo selecionado" : `Adicionar dispenser por +${formatBRL(UPSELL.price)}`}
                </span>
              </label>
            </div>
          </div>

          {/* Buy button (secondary — main CTA is the sticky bar on mobile) */}
          <button
            onClick={handleBuy}
            className="w-full h-14 bg-primary text-primary-foreground rounded-xl text-base sm:text-lg font-extrabold uppercase tracking-wide shadow-lg ring-2 ring-primary/30 hover:brightness-105 active:scale-[0.99] transition-all"
          >
            🛒 COMPRAR AGORA
          </button>
          <div className="text-center text-xs text-muted-foreground -mt-2">
            🔒 Pagamento 100% seguro · 🚚 Frete grátis · ✅ Garantia de 7 dias
          </div>

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

      {/* DOR DO CLIENTE */}
      <section className="max-w-3xl mx-auto px-4 mt-16">
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-red-700">
            Você se identifica com isso?
          </h2>
          <ul className="mt-5 space-y-3 text-sm sm:text-base text-foreground/90">
            {[
              "Abre um pacote de café, biscoito ou salgadinho e em 2 dias está velho",
              "Joga comida fora toda semana porque a embalagem ficou aberta",
              "Tenta fechar com nó, prendedor ou elástico — e nunca funciona direito",
              "Gasta dinheiro repondo alimentos que poderiam ter durado muito mais",
            ].map(t => (
              <li key={t} className="flex items-start gap-3">
                <span className="text-red-500 font-bold mt-0.5">✗</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="text-center mt-6 font-bold text-foreground">
            A <span className="text-primary">Mini Seladora Portátil</span> resolve isso de uma vez por todas.
          </p>
        </div>
      </section>

      {/* ANTES x DEPOIS */}
      <section className="max-w-5xl mx-auto px-2 sm:px-4 mt-16">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center px-2">
          Veja a diferença em segundos
        </h2>
        <div className="mt-5 rounded-2xl overflow-hidden shadow-xl">
          <img
            src={antesDepois}
            alt="Comparação antes e depois usando a Mini Seladora"
            className="w-full h-auto block"
          />
        </div>
        <p className="text-center text-muted-foreground mt-4 max-w-xl mx-auto px-4 text-sm sm:text-base">
          Feche suas embalagens e evite desperdício com praticidade.
        </p>
      </section>

      {/* BENEFÍCIOS — bullet points */}
      <section className="max-w-3xl mx-auto px-4 mt-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center">
          O que você ganha com a Mini Seladora
        </h2>
        <ul className="mt-6 space-y-3 bg-card border border-border rounded-2xl p-5 sm:p-6">
          {[
            "Conserva alimentos frescos por até 5x mais tempo",
            "Sela qualquer embalagem plástica em 2 segundos",
            "Economiza dinheiro evitando desperdício de comida",
            "Cabe na palma da mão — leva pra qualquer lugar",
            "Funciona com pilhas AA ou cabo USB-C",
            "Fácil de usar — qualquer pessoa consegue",
          ].map(b => (
            <li key={b} className="flex items-start gap-3 text-sm sm:text-base">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">✓</span>
              <span className="font-medium">{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-center">
          <button
            onClick={handleBuy}
            className="inline-flex items-center justify-center h-14 px-8 bg-primary text-primary-foreground rounded-xl text-base font-extrabold uppercase tracking-wide shadow-lg ring-2 ring-primary/30"
          >
            🛒 COMPRAR AGORA — {formatBRL(PRODUCT.pricePix)}
          </button>
          <div className="text-xs text-muted-foreground mt-2">🚚 Frete grátis · 🔥 Restam poucas unidades</div>
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

      {/* GARANTIA */}
      <section className="max-w-3xl mx-auto px-4 mt-16">
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold">Garantia incondicional de 7 dias</h3>
          <p className="text-sm sm:text-base text-foreground/80 mt-2 max-w-lg mx-auto">
            Se você não amar a Mini Seladora, devolvemos <strong>100% do seu dinheiro</strong>. Sem perguntas, sem burocracia. O risco é todo nosso.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 mt-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold">Garanta a sua antes que acabe</h2>
        <p className="text-muted-foreground mt-2">Mais de 1.000 lares já resolveram o problema do desperdício.</p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1.5">
          🔥 Restam poucas unidades em estoque
        </div>
        <div className="mt-4 text-sm">
          <span className="text-muted-foreground line-through">De {formatBRL(PRODUCT.priceOriginal)}</span>{" "}
          <span className="font-extrabold text-primary text-2xl align-middle">por {formatBRL(total)}</span>
        </div>
        <button
          onClick={handleBuy}
          className="mt-4 inline-flex items-center justify-center h-14 px-8 bg-primary text-primary-foreground rounded-xl text-base font-extrabold uppercase tracking-wide shadow-lg ring-2 ring-primary/30 hover:brightness-105"
        >
          🛒 COMPRAR AGORA
        </button>
        <div className="text-xs text-muted-foreground mt-3">🚚 Frete grátis · 🔒 Compra 100% segura · ✅ Garantia de 7 dias</div>
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
            🛒 COMPRAR AGORA
          </button>
        </div>
      </div>

      <VideoModal
        open={showDispenserVideo}
        src={dispenserVideo}
        onClose={() => setShowDispenserVideo(false)}
      />
    </div>
  );
}
