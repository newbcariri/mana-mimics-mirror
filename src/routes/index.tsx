import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Heart, Share2, Truck, Plus, Minus, Check, ShieldCheck, Award, Droplets, Zap, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PRODUCT, REVIEWS } from "@/lib/product-data";
import { cart } from "@/lib/cart-store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

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

  const initials = (name: string) => name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  const handleBuy = () => {
    if (!topSize || !legSize) {
      toast.error("Selecione o tamanho do top e da legging");
      return;
    }
    const c = PRODUCT.colors[selectedColor];
    cart.add({
      productName: PRODUCT.name,
      color: c.name,
      topSize, legSize, quantity: qty,
      unitPrice: PRODUCT.pricePix,
      image: c.img,
    });
    toast.success("Adicionado ao carrinho!");
    navigate({ to: "/carrinho" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-muted-foreground">
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
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div className="flex flex-col gap-2">
            {media.map((m, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`relative aspect-[3/4] rounded-md overflow-hidden border-2 transition-all ${activeImg === i ? "border-primary" : "border-border hover:border-foreground/30"}`}
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
              <img src={current.src} alt={PRODUCT.name} className="w-full h-full object-cover" />
            )}
            <button onClick={() => setActiveImg((activeImg - 1 + media.length) % media.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setActiveImg((activeImg + 1) % media.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
          );
        })()}

        {/* Info */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 text-sm">
            <Stars value={PRODUCT.rating} />
            <span className="text-muted-foreground">({PRODUCT.reviewCount}) avaliações</span>
            <span className="text-muted-foreground">•</span>
            <a href="#avaliacoes" className="text-primary hover:underline">Faça uma avaliação</a>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{PRODUCT.name}</h1>

          {/* Price */}
          <div className="bg-muted/50 rounded-xl p-5 space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground line-through">{formatBRL(PRODUCT.priceOriginal)}</span>
              <span className="text-3xl md:text-4xl font-bold text-primary">{formatBRL(PRODUCT.pricePix)}</span>
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">-{PRODUCT.pixDiscount}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center justify-center w-10 h-6 rounded bg-pix text-white font-bold text-[10px]">PIX</span>
              <span className="text-muted-foreground">à vista no PIX</span>
            </div>
            <div className="text-sm text-muted-foreground pt-2 border-t border-border">
              <span className="line-through">{formatBRL(PRODUCT.priceCard)}</span>
              <span className="ml-2">no cartão em até <strong className="text-foreground">{PRODUCT.installments.count}x</strong> de <strong className="text-foreground">{formatBRL(PRODUCT.installments.value)}</strong> sem juros</span>
            </div>
            <div className="text-xs text-success font-semibold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Ganhe até {formatBRL(PRODUCT.cashback)} de cashback
            </div>
          </div>

          {/* Color picker */}
          <div>
            <div className="text-sm font-semibold mb-2">Cor: <span className="text-muted-foreground font-normal">{PRODUCT.colors[selectedColor].name}</span></div>
            <div className="flex flex-wrap gap-2">
              {PRODUCT.colors.map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => { setSelectedColor(i); setActiveImg(0); }}
                  title={c.name}
                  className={`w-12 h-16 rounded-md overflow-hidden border-2 transition-all ${selectedColor === i ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"}`}
                >
                  <img src={c.img} alt={c.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="text-sm font-semibold mb-2">Top:</div>
              <div className="flex gap-2">
                {PRODUCT.sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setTopSize(s)}
                    className={`w-12 h-12 rounded-md border text-sm font-semibold transition-all ${topSize === s ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground"}`}
                  >{s}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Legging:</div>
              <div className="flex gap-2">
                {PRODUCT.sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setLegSize(s)}
                    className={`w-12 h-12 rounded-md border text-sm font-semibold transition-all ${legSize === s ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground"}`}
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Qty + Buy */}
          <div className="flex gap-3 pt-2">
            <div className="flex items-center border border-border rounded-md">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-12 flex items-center justify-center hover:bg-muted"><Minus className="w-4 h-4" /></button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-10 h-12 flex items-center justify-center hover:bg-muted"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={handleBuy} className="flex-1 h-12 bg-success text-success-foreground rounded-md font-bold hover:bg-success/90 transition-colors">COMPRAR</button>
            <button className="w-12 h-12 border border-border rounded-md flex items-center justify-center hover:bg-muted"><Share2 className="w-4 h-4" /></button>
          </div>

          {/* Shipping calc */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Calcule o frete</span>
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" placeholder="00000-000" />
              <button className="px-5 bg-foreground text-background rounded-md font-semibold text-sm">OK</button>
            </div>
          </div>

          {/* Trust */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: ShieldCheck, label: "Compra segura" },
              { icon: Truck, label: "Frete rápido" },
              { icon: Check, label: "Troca em 30 dias" },
            ].map(t => (
              <div key={t.label} className="flex flex-col items-center text-center gap-1 p-3 bg-muted/50 rounded-md">
                <t.icon className="w-5 h-5 text-primary" />
                <span className="text-[11px] font-medium">{t.label}</span>
              </div>
            ))}
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
      <section className="max-w-7xl mx-auto px-4 mt-20">
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
                    <img src={r.photo} alt={r.name} className="w-12 h-12 rounded-full object-cover" />
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
                  <img src={r.photo} alt="" className="w-20 h-20 rounded-md object-cover" />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
