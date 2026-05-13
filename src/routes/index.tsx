import { useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Heart, Share2, Truck, Plus, Minus, Check, ShieldCheck, Award, Droplets, Zap, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ShippingCalc } from "@/components/shipping-calc";
import { SiteFooter } from "@/components/site-footer";
import { PRODUCT, REVIEWS } from "@/lib/product-data";
import { cart } from "@/lib/cart-store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { fbqTrack } from "@/lib/fbq";

export const Route = createFileRoute("/")({
  component: ProductPage,
});

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"} />
      ))}
    </div>
  );
}

const PRODUCT_VIDEO = "https://manalinda.cdn.magazord.com.br/img/2025/09/produto/6044/conjunto-basico-poliamida-marrom-escuro.mp4";

function ProductPage() {
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [topSize, setTopSize] = useState<string | null>(null);
  const [legSize, setLegSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState(false);
  const [secondOpen, setSecondOpen] = useState(false);
  const [secondColor, setSecondColor] = useState(0);
  const [secondTopSize, setSecondTopSize] = useState<string | null>(null);
  const [secondLegSize, setSecondLegSize] = useState<string | null>(null);

  const initials = (name: string) => name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  // ViewContent — somente uma vez por sessão por produto
  useEffect(() => {
    fbqTrack(
      "ViewContent",
      {
        content_name: PRODUCT.name,
        content_type: "product",
        currency: "BRL",
        value: PRODUCT.pricePix,
      },
      `viewcontent:${PRODUCT.name}`,
    );
  }, []);

  const flashSelection = () => {
    selectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(true);
    window.setTimeout(() => setHighlight(false), 2500);
  };

  const addToCartAndGo = (items: Array<{ colorIdx: number; topSize: string; legSize: string; quantity: number }>) => {
    let totalQty = 0;
    items.forEach(it => {
      const c = PRODUCT.colors[it.colorIdx];
      cart.add({
        productName: PRODUCT.name,
        color: c.name,
        topSize: it.topSize,
        legSize: it.legSize,
        quantity: it.quantity,
        unitPrice: PRODUCT.pricePix,
        image: c.img,
      });
      totalQty += it.quantity;
    });
    fbqTrack("AddToCart", {
      content_name: PRODUCT.name,
      content_type: "product",
      currency: "BRL",
      value: PRODUCT.pricePix * totalQty,
    });
    toast.success("Adicionado ao carrinho!");
    navigate({ to: "/carrinho" });
  };

  const handleBuy = () => {
    if (!topSize || !legSize) {
      toast.error("Selecione o tamanho e a cor para continuar");
      flashSelection();
      return;
    }
    if (qty >= 2) {
      setSecondColor(selectedColor);
      setSecondTopSize(topSize);
      setSecondLegSize(legSize);
      setSecondOpen(true);
      return;
    }
    addToCartAndGo([{ colorIdx: selectedColor, topSize, legSize, quantity: qty }]);
  };

  const confirmSecondUnit = () => {
    if (!secondTopSize || !secondLegSize) {
      toast.error("Selecione o tamanho da 2ª unidade");
      return;
    }
    setSecondOpen(false);
    addToCartAndGo([
      { colorIdx: selectedColor, topSize: topSize!, legSize: legSize!, quantity: 1 },
      { colorIdx: secondColor, topSize: secondTopSize, legSize: secondLegSize, quantity: 1 },
    ]);
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Urgency banner - mobile focus */}
      <div className="bg-primary text-primary-foreground text-center text-xs sm:text-sm font-semibold py-2 px-4">
        ⏰ Promoção por tempo limitado · ⚠️ Estoque limitado · 🚚 Frete grátis na compra de 2 ou mais conjuntos
      </div>

      <SiteHeader />

      {/* Social proof bar */}
      <div className="hidden sm:block bg-muted/40 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm">
          <span className="text-yellow-500">⭐⭐⭐⭐⭐</span>
          <span className="font-semibold">4.8/5</span>
          <span className="text-muted-foreground">· +3.000 clientes satisfeitos</span>
        </div>
      </div>

      {/* Breadcrumb - hide on mobile to reduce distraction */}
      <div className="hidden sm:block max-w-7xl mx-auto px-4 py-4 text-xs text-muted-foreground">
        <a href="#" className="hover:text-primary">Home</a>
        <span className="mx-2">›</span>
        <a href="#" className="hover:text-primary">Conjuntos</a>
        <span className="mx-2">›</span>
        <span className="text-foreground">{PRODUCT.name}</span>
      </div>

      {/* Product main */}
      <section className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-10">
        {/* Gallery */}
        {(() => {
          const color = PRODUCT.colors[selectedColor];
          const gallery = (color as any).gallery as string[] | undefined;
          const imgs = gallery && gallery.length ? gallery : [color.img];
          const media: Array<{ type: "video" | "image"; src: string; poster?: string }> = [
            ...imgs.map(src => ({ type: "image" as const, src })),
            { type: "video", src: PRODUCT_VIDEO, poster: color.img },
          ];
          const current = media[activeImg] ?? media[0];
          return (
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-[80px_1fr] gap-2 lg:gap-3">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
            {media.map((m, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`relative shrink-0 w-16 lg:w-auto aspect-[3/4] rounded-md overflow-hidden border-2 transition-all ${activeImg === i ? "border-primary" : "border-border hover:border-foreground/30"}`}
              >
                <img
                  src={m.poster ?? m.src}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover bg-muted"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = PRODUCT.images[0]; }}
                />
                {m.type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-[3/4]">
            <span className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full">ESTÁ ACABANDO!</span>
            <button className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:text-primary"><Heart className="w-4 h-4" /></button>
            {current.type === "video" ? (
              <video src={current.src} poster={current.poster} controls autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={current.src} alt={PRODUCT.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = PRODUCT.images[0]; }} className="w-full h-full object-cover" />
            )}
            <button onClick={() => setActiveImg((activeImg - 1 + media.length) % media.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setActiveImg((activeImg + 1) % media.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
          );
        })()}

        {/* Info */}
        <div className="flex flex-col gap-4 lg:gap-0 lg:block lg:space-y-5">
          {/* Rating */}
          <div className="order-1 lg:order-none flex items-center gap-2 lg:gap-3 text-sm flex-wrap">
            <Stars value={PRODUCT.rating} />
            <span className="font-semibold">{PRODUCT.rating}/5</span>
            <span className="text-muted-foreground">({PRODUCT.reviewCount}) avaliações</span>
            <a href="#avaliacoes" className="hidden sm:inline text-primary hover:underline">Faça uma avaliação</a>
          </div>

          {/* H1 — smaller on mobile */}
          <h1 className="order-2 lg:order-none text-lg sm:text-2xl md:text-4xl font-bold tracking-tight leading-tight">Conjunto fitness que modela o corpo e não marca</h1>
          <p className="order-3 lg:order-none hidden sm:block text-base text-muted-foreground -mt-1">Conforto, ajuste perfeito e <strong className="text-foreground">zero transparência</strong> — veste como uma segunda pele.</p>
          <div className="order-12 lg:order-none text-xs text-muted-foreground -mt-1">{PRODUCT.name}</div>

          {/* Proof badges — pushed below buy on mobile */}
          <div className="order-11 lg:order-none grid grid-cols-3 gap-2 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1.5 bg-success/10 text-success font-semibold px-2 py-1.5 rounded-md">
              <Check className="w-3.5 h-3.5 shrink-0" /> +1.000 pedidos enviados
            </div>
            <div className="flex items-center gap-1.5 bg-success/10 text-success font-semibold px-2 py-1.5 rounded-md">
              <Check className="w-3.5 h-3.5 shrink-0" /> Clientes em todo o Brasil
            </div>
            <div className="flex items-center gap-1.5 bg-success/10 text-success font-semibold px-2 py-1.5 rounded-md">
              <Check className="w-3.5 h-3.5 shrink-0" /> 98% recomendam
            </div>
          </div>

          {/* Stock urgency — desktop in place; on mobile pushed down */}
          <div className="order-13 lg:order-none flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive font-semibold px-2.5 py-1 rounded-full">⚠️ Estoque limitado</span>
            <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 font-semibold px-2.5 py-1 rounded-full">⏰ Promoção por tempo limitado</span>
          </div>

          {/* Price — high priority on mobile */}
          <div className="order-4 lg:order-none bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-3.5 sm:p-5 space-y-1.5 sm:space-y-2 shadow-sm">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground line-through">De {formatBRL(PRODUCT.priceOriginal)}</span>
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">-{PRODUCT.pixDiscount}%</span>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-base font-bold text-destructive">🔥 HOJE por</span>
              <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary leading-none">{formatBRL(PRODUCT.pricePix)}</span>
              <span className="inline-flex items-center justify-center px-2 h-6 rounded bg-pix text-white font-bold text-[10px]">PIX</span>
            </div>
            <div className="text-sm text-foreground/80 pt-2 border-t border-primary/20">
              💳 ou <strong>{formatBRL(PRODUCT.priceCard)}</strong> no cartão em até <strong>{PRODUCT.installments.count}x</strong> de <strong>{formatBRL(PRODUCT.installments.value)}</strong> sem juros
            </div>
            <div className="text-sm font-bold text-success flex items-center gap-1.5 bg-success/10 rounded-md px-3 py-2 mt-2">
              🚚 Frete grátis na compra de 2 ou mais conjuntos
            </div>
            <div className="text-xs text-success font-semibold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Ganhe até {formatBRL(PRODUCT.cashback)} de cashback
            </div>
          </div>

          {/* Color picker */}
          <div className="order-5 lg:order-none">
            <div className="text-sm font-semibold mb-2">Cor: <span className="text-muted-foreground font-normal">{PRODUCT.colors[selectedColor].name}</span></div>
            <div className="flex flex-wrap gap-2">
              {PRODUCT.colors.map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => { setSelectedColor(i); setActiveImg(0); }}
                  title={c.name}
                  aria-label={`Cor ${c.name}`}
                  className={`w-12 h-16 rounded-md overflow-hidden border-2 transition-all ${selectedColor === i ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"}`}
                >
                  <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div ref={selectionRef} className={`order-6 lg:order-none border-2 border-dashed rounded-lg p-3 sm:p-4 bg-muted/30 transition-all duration-300 scroll-mt-24 ${highlight ? "border-primary ring-4 ring-primary/40 animate-pulse bg-primary/5" : "border-border"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold uppercase tracking-wide">
                Selecione o tamanho <span className="text-primary">*</span>
              </div>
              <a href="#tabela-medidas" className="text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80">
                Tabela de medidas
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <div>
                <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Top</div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  {PRODUCT.sizes.map(s => (
                    <button
                      key={s}
                      onClick={() => setTopSize(s)}
                      aria-label={`Tamanho do top ${s}`}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-md border text-sm font-semibold transition-all ${topSize === s ? "bg-foreground text-background border-foreground" : "border-border bg-background hover:border-foreground"}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Legging</div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  {PRODUCT.sizes.map(s => (
                    <button
                      key={s}
                      onClick={() => setLegSize(s)}
                      aria-label={`Tamanho da legging ${s}`}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-md border text-sm font-semibold transition-all ${legSize === s ? "bg-foreground text-background border-foreground" : "border-border bg-background hover:border-foreground"}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Offer selector — combo */}
          <div className="order-7 lg:order-none">
            <div className="text-sm font-bold uppercase tracking-wide mb-2">Escolha sua oferta</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQty(1)}
                className={`text-left rounded-lg border-2 p-3 transition-all ${qty < 2 ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-foreground/30"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">1 unidade</span>
                  <span className="text-xs text-muted-foreground">{formatBRL(PRODUCT.priceOriginal)}</span>
                </div>
                <div className="text-lg font-extrabold text-primary mt-0.5">{formatBRL(PRODUCT.pricePix)}</div>
                <div className="text-[11px] text-muted-foreground">no PIX · economize 50%</div>
              </button>
              <button
                type="button"
                onClick={() => setQty(2)}
                className={`relative text-left rounded-lg border-2 p-3 transition-all ${qty >= 2 ? "border-success bg-success/10 ring-2 ring-success/30" : "border-success/40 hover:border-success"}`}
              >
                <span className="absolute -top-2 right-2 bg-success text-success-foreground text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Melhor oferta</span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">2 unidades</span>
                  <span className="text-xs text-muted-foreground line-through">{formatBRL(PRODUCT.pricePix * 2)}</span>
                </div>
                <div className="text-lg font-extrabold text-success mt-0.5">{formatBRL(109)}</div>
                <div className="text-[11px] text-success font-semibold">R$ 54,50 cada · 🚚 Frete grátis</div>
              </button>
            </div>
          </div>

          {/* Qty + Buy */}
          <div className="order-8 lg:order-none flex gap-2 sm:gap-3 pt-2">
            <div className="flex items-center border border-border rounded-md">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Diminuir" className="w-10 h-14 flex items-center justify-center hover:bg-muted"><Minus className="w-4 h-4" /></button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} aria-label="Aumentar" className="w-10 h-14 flex items-center justify-center hover:bg-muted"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={handleBuy} className="flex-1 h-14 bg-success text-success-foreground rounded-md font-extrabold text-sm sm:text-base hover:bg-success/90 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-success/30 ring-2 ring-success/30">🛒 COMPRAR AGORA</button>
            <button aria-label="Compartilhar" className="hidden sm:flex w-12 h-14 border border-border rounded-md items-center justify-center hover:bg-muted"><Share2 className="w-4 h-4" /></button>
          </div>

          {/* Trust signals — right under buy button */}
          <div className="order-9 lg:order-none grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: "🔒", label: "Compra 100% segura" },
              { icon: "💳", label: "Pix ou cartão" },
              { icon: "🚚", label: "Envio com rastreio" },
              { icon: "🔁", label: "Troca garantida" },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-1.5 p-2 bg-muted/60 rounded-md">
                <span className="text-base leading-none">{t.icon}</span>
                <span className="text-[11px] font-semibold leading-tight">{t.label}</span>
              </div>
            ))}
          </div>

          {/* Live scarcity */}
          <div className="order-10 lg:order-none flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive font-semibold px-2.5 py-1 rounded-full">🔥 47 vendidos hoje</span>
            <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 font-semibold px-2.5 py-1 rounded-full">📦 Estoque limitado para envio imediato</span>
          </div>

          <div className="order-14 lg:order-none text-center text-xs font-semibold text-destructive bg-destructive/10 rounded-md px-3 py-2">
            ⚠️ Estoque limitado — pode esgotar a qualquer momento
          </div>

          {/* Shipping calc */}
          <div className="order-15 lg:order-none">
            <ShippingCalc freeShipping={qty >= 2} />
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-7xl mx-auto px-4 mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">Tecnologia que veste como uma segunda pele</h2>
          <p className="text-muted-foreground mt-2">Feita pra acompanhar cada movimento, do treino ao dia a dia.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: ShieldCheck, ...PRODUCT.features[0] },
            { icon: Zap, ...PRODUCT.features[1] },
            { icon: Droplets, ...PRODUCT.features[2] },
            { icon: Award, ...PRODUCT.features[3] },
          ].map(f => (
            <div key={f.title} className="bg-muted/50 rounded-xl p-6 hover:bg-muted transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="font-bold mb-1">{f.title}</div>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Description */}
      <section className="max-w-7xl mx-auto px-4 mt-20 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Descrição do produto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cheio de estilo, este conjunto de poliamida proporciona <strong className="text-foreground">ALTA SUSTENTAÇÃO</strong> e <strong className="text-foreground">COMPRESSÃO</strong>, garantindo conforto e liberdade de movimento. Perfeito para treinos ao ar livre, conta com <strong className="text-foreground">PROTEÇÃO UV 50+</strong> e <strong className="text-foreground">TECNOLOGIA DRY</strong>, que facilita a evaporação do suor, mantendo sua temperatura regulada mesmo nos dias mais quentes. O grande diferencial? <strong className="text-foreground">TRANSPARÊNCIA ZERO</strong>, para que você treine com máxima confiança.
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-2">Para quais ocasiões usar o conjunto?</h3>
            <p className="text-muted-foreground leading-relaxed">Perfeito para treinos moderados, pilates, yoga, caminhadas, além de poder compor looks casuais ou esportivos do dia a dia. Top e legging podem ser usados juntos ou misturados com outras peças.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">Como cuidar do conjunto</h3>
            <p className="text-muted-foreground leading-relaxed">Lave à mão ou em ciclo delicado com água fria e sabão neutro. Evite alvejantes, não use secadora, seque à sombra e nunca passe com ferro de alta temperatura.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">O que vem na caixa?</h3>
            <p className="text-muted-foreground">1 Legging Básica Vermelha + 1 Top Básico Vermelho.</p>
          </div>
        </div>

        {/* Specs sidebar */}
        <aside className="bg-muted/50 rounded-xl p-6 h-fit">
          <h3 className="font-bold mb-4">Características</h3>
          <dl className="space-y-3 text-sm">
            {PRODUCT.specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 pb-3 border-b border-border last:border-0 last:pb-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>

      {/* Size chart */}
      <section id="tabela-medidas" className="max-w-7xl mx-auto px-4 mt-20 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-6">Tabela de Medidas</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-semibold">Tamanho</th>
                <th className="text-left p-4 font-semibold">Busto (cm)</th>
                <th className="text-left p-4 font-semibold">Cintura (cm)</th>
                <th className="text-left p-4 font-semibold">Quadril (cm)</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT.sizeChart.map((r, i) => (
                <tr key={r.size} className={i % 2 ? "bg-muted/30" : ""}>
                  <td className="p-4 font-bold text-primary">{r.size}</td>
                  <td className="p-4">{r.bust}</td>
                  <td className="p-4">{r.waist}</td>
                  <td className="p-4">{r.hip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reviews */}
      <section id="avaliacoes" className="max-w-7xl mx-auto px-4 mt-20">
        <div className="grid lg:grid-cols-[300px_1fr] gap-10">
          <div className="bg-muted/50 rounded-xl p-6 h-fit text-center">
            <div className="text-5xl font-bold">{PRODUCT.rating}</div>
            <div className="flex justify-center my-2"><Stars value={PRODUCT.rating} size={20} /></div>
            <div className="text-sm text-muted-foreground">Baseado em {PRODUCT.reviewCount} avaliações</div>
            <div className="space-y-2 mt-6 text-left">
              {[5, 4, 3, 2, 1].map(s => {
                const pct = s === 5 ? 86 : s === 4 ? 11 : s === 3 ? 2 : s === 2 ? 1 : 0;
                return (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    <span className="w-4">{s}★</span>
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                  </div>
                );
              })}
            </div>
            <button className="w-full mt-6 bg-primary text-primary-foreground rounded-md py-2.5 font-semibold text-sm hover:bg-primary/90">Faça uma avaliação</button>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">O que nossas clientes dizem</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {REVIEWS.map(r => (
                <article key={r.name} className="border border-border rounded-xl p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {initials(r.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{r.name}</div>
                      <div className="flex items-center gap-2">
                        <Stars value={r.rating} size={12} />
                        <span className="text-xs text-muted-foreground">{r.date}</span>
                      </div>
                    </div>
                    <span className="bg-success/10 text-success text-[10px] font-semibold px-2 py-1 rounded">✓ Compra verificada</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{r.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{r.text}</p>
                  {r.photo && (
                    <button
                      type="button"
                      onClick={() => setLightbox(r.photo!)}
                      className="block rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <img
                        src={r.photo}
                        alt={`Foto enviada por ${r.name}`}
                        loading="lazy"
                        className="w-20 h-20 object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                      />
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 mt-20">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Perguntas frequentes</h2>
        <div className="space-y-3">
          {[
            { q: "O conjunto fica transparente?", a: "Não. O tecido em poliamida de alta gramatura tem cobertura total e foi testado para garantir zero transparência, mesmo em movimentos como agachamento." },
            { q: "Qual tamanho devo escolher?", a: "Use a tabela de medidas acima como referência (busto, cintura e quadril). Se estiver entre dois tamanhos, recomendamos o maior para mais conforto na legging." },
            { q: "Quanto tempo demora a entrega?", a: "Enviamos em até 1 dia útil após a confirmação do pagamento. O prazo de entrega varia de 3 a 10 dias úteis conforme sua região, com código de rastreio enviado por e-mail." },
            { q: "Posso trocar se não servir?", a: "Sim. Você tem 7 dias após o recebimento para solicitar troca de tamanho ou devolução, conforme o Código de Defesa do Consumidor." },
            { q: "Como faço o pagamento?", a: "Aceitamos PIX (com aprovação imediata) e cartão de crédito em até 12x sem juros. Toda a compra é 100% segura e criptografada." },
          ].map((f, i) => (
            <details key={i} className="group rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-4 font-semibold">
                <span>{f.q}</span>
                <Plus className="w-4 h-4 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {secondOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setSecondOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-success uppercase tracking-wider">2ª unidade</div>
                <div className="font-bold text-base">Escolha a cor da segunda unidade</div>
              </div>
              <button
                onClick={() => setSecondOpen(false)}
                aria-label="Fechar"
                className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div>
                <div className="text-sm font-semibold mb-2">
                  Cor: <span className="text-muted-foreground font-normal">{PRODUCT.colors[secondColor].name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT.colors.map((c, i) => (
                    <button
                      key={c.name}
                      onClick={() => setSecondColor(i)}
                      title={c.name}
                      aria-label={`Cor ${c.name}`}
                      className={`w-12 h-16 rounded-md overflow-hidden border-2 transition-all ${secondColor === i ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"}`}
                    >
                      <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Top</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRODUCT.sizes.map(s => (
                      <button
                        key={s}
                        onClick={() => setSecondTopSize(s)}
                        className={`w-11 h-11 rounded-md border text-sm font-semibold transition-all ${secondTopSize === s ? "bg-foreground text-background border-foreground" : "border-border bg-background hover:border-foreground"}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Legging</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRODUCT.sizes.map(s => (
                      <button
                        key={s}
                        onClick={() => setSecondLegSize(s)}
                        className={`w-11 h-11 rounded-md border text-sm font-semibold transition-all ${secondLegSize === s ? "bg-foreground text-background border-foreground" : "border-border bg-background hover:border-foreground"}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-success/10 text-success text-xs font-semibold rounded-md px-3 py-2 text-center">
                🚚 Frete grátis · 2 conjuntos por {formatBRL(109)}
              </div>

              <button
                onClick={confirmSecondUnit}
                className="w-full h-12 bg-success text-success-foreground rounded-md font-extrabold text-sm hover:bg-success/90 active:scale-[0.98] transition-all shadow-md ring-2 ring-success/30"
              >
                ✅ Confirmar e ir para o checkout
              </button>
            </div>
          </div>
        </div>
      )}


      <SiteFooter />

      {/* Sticky mobile buy bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t border-border px-3 py-2.5 flex items-center gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.12)]">
        <div className="shrink-0">
          <div className="text-[10px] text-muted-foreground line-through leading-none">{formatBRL(PRODUCT.priceOriginal)}</div>
          <div className="text-base font-bold text-primary leading-tight">{formatBRL(PRODUCT.pricePix)}<span className="text-[10px] font-normal text-muted-foreground ml-1">PIX</span></div>
        </div>
        <button
          onClick={handleBuy}
          className="flex-1 h-12 bg-success text-success-foreground rounded-md font-extrabold text-sm hover:bg-success/90 active:scale-[0.98] transition-all shadow-md ring-2 ring-success/30"
        >
          🛒 COMPRAR AGORA
        </button>
      </div>
    </div>
  );
}
