import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Check, Play } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VideoModal } from "@/components/video-modal";
import { cart, useCart, cartTotal } from "@/lib/cart-store";
import { UPSELL } from "@/lib/product-data";
import { toast } from "sonner";
import dispenserVideo from "@/assets/dispenser-demo.mp4";
import dispenser1 from "@/assets/dispenser-1.png";
import dispenser2 from "@/assets/dispenser-2.png";
import dispenser3 from "@/assets/dispenser-3.png";
import { sendWebhookEvent } from "@/lib/webhook";

const DISPENSER_GALLERY = [dispenser1, dispenser2, dispenser3];

export const Route = createFileRoute("/carrinho")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Meu Carrinho — Casa Resolve" }] }),
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CartPage() {
  const items = useCart();
  const navigate = useNavigate();
  const [showDispenserVideo, setShowDispenserVideo] = useState(false);
  const subtotal = cartTotal(items);
  const shipping = 0; // frete grátis sempre
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
            <p className="text-muted-foreground mt-2">Adicione um produto para começar.</p>
            <Link to="/" className="inline-block mt-6 bg-primary text-primary-foreground rounded-md px-6 py-3 font-semibold">Continuar comprando</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Meu Carrinho</h1>

        <div className="mb-6 rounded-2xl border-2 border-primary bg-primary/10 p-4 flex items-center gap-3">
          <Truck className="w-6 h-6 text-primary shrink-0" />
          <div className="text-sm font-semibold">Frete grátis garantido para todo o Brasil 🚚</div>
        </div>

        {(() => {
          const hasUpsell = items.some(i => i.productName === UPSELL.name);
          const addUpsell = () => {
            cart.add({
              productName: UPSELL.name,
              color: "Padrão",
              topSize: "-",
              legSize: "-",
              quantity: 1,
              unitPrice: UPSELL.price,
              image: UPSELL.image,
            });
            toast.success("Dispenser adicionado ao kit!");
          };
          return hasUpsell ? (
            <div className="mb-6 rounded-2xl border-2 border-primary bg-primary/15 p-4 shadow-sm ring-1 ring-primary/30 transition">
              <div className="flex items-center gap-3 mb-3">
                <Check className="w-6 h-6 text-primary shrink-0" />
                <div className="text-sm font-bold">✔ Kit completo selecionado</div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                {DISPENSER_GALLERY.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setShowDispenserVideo(true)}
                    className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-white border border-primary/40 group snap-start"
                    aria-label="Ver como funciona o dispenser"
                  >
                    <img src={src} alt={`${UPSELL.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </span>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2 text-center">▶ Toque nas imagens para ver como funciona</div>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border-2 border-border hover:border-primary bg-muted/30 hover:bg-primary/5 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-extrabold">🔥 Aproveite e leve também</div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x mb-3">
                {DISPENSER_GALLERY.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setShowDispenserVideo(true)}
                    className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-white border border-border group snap-start"
                    aria-label="Ver como funciona o dispenser"
                  >
                    <img src={src} alt={`${UPSELL.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </span>
                    {idx === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-bold text-center py-0.5">
                        Ver vídeo
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mb-3">{UPSELL.name} — conserva ainda mais seus alimentos</div>
              <button
                onClick={addUpsell}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl px-5 text-sm font-extrabold whitespace-nowrap hover:bg-primary/90 active:scale-[0.99] shadow-md ring-2 ring-primary/20 inline-flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar ao pedido por +{brl(UPSELL.price)}
              </button>
            </div>
          );
        })()}

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-3">
            {items.map(i => (
              <div key={i.id} className="flex gap-4 border border-border rounded-xl p-4">
                {i.productName === UPSELL.name ? (
                  <button
                    type="button"
                    onClick={() => setShowDispenserVideo(true)}
                    className="relative w-24 h-24 rounded-md overflow-hidden bg-muted shrink-0 group"
                    aria-label="Ver como funciona o dispenser"
                  >
                    <img src={i.image} alt="" className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/50 transition">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </span>
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-bold text-center py-0.5">
                      Ver vídeo
                    </span>
                  </button>
                ) : (
                  <img src={i.image} alt="" className="w-24 h-24 object-cover rounded-md bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{i.productName}</div>
                  <div className="text-sm text-muted-foreground mt-1">{brl(i.unitPrice)} · un</div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-border rounded-md">
                      <button onClick={() => cart.setQty(i.id, i.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted"><Minus className="w-3 h-3" /></button>
                      <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                      <button onClick={() => cart.setQty(i.id, i.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted"><Plus className="w-3 h-3" /></button>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{brl(i.unitPrice * i.quantity)}</div>
                      <button onClick={() => cart.remove(i.id)} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1 ml-auto">
                        <Trash2 className="w-3 h-3" /> Remover
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="bg-muted/40 rounded-xl p-6 h-fit space-y-4 lg:sticky lg:top-32">
            <h2 className="font-bold text-lg">Resumo do pedido</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className="text-primary font-semibold">Grátis</span></div>
            </div>
            <div className="border-t border-border pt-4 flex justify-between items-baseline">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">{brl(total)}</span>
            </div>
            <button onClick={() => navigate({ to: "/checkout" })} className="w-full h-12 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 flex items-center justify-center gap-2">
              FINALIZAR COMPRA <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-primary">← Continuar comprando</Link>
          </aside>
        </div>
      </div>
      <SiteFooter />
      <VideoModal
        open={showDispenserVideo}
        src={dispenserVideo}
        onClose={() => setShowDispenserVideo(false)}
      />
    </div>
  );
}
