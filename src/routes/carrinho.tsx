import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Gift, Truck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cart, useCart, cartTotal } from "@/lib/cart-store";

export const Route = createFileRoute("/carrinho")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Meu Carrinho — FlexFit Brasil" }] }),
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COMBO_PAIR_PRICE = 109.0; // 2 unidades por R$ 109,00

function CartPage() {
  const items = useCart();
  const navigate = useNavigate();
  const subtotalRaw = cartTotal(items);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  // Combo: a cada 2 unidades (do produto de maior valor primeiro) = R$ 109,00
  // Unidades excedentes mantêm o preço unitário original.
  const unitPrices: number[] = [];
  items.forEach(i => {
    for (let k = 0; k < i.quantity; k++) unitPrices.push(i.unitPrice);
  });
  unitPrices.sort((a, b) => b - a);
  const pairs = Math.floor(unitPrices.length / 2);
  const leftover = unitPrices.slice(pairs * 2).reduce((s, v) => s + v, 0);
  const subtotal = pairs > 0 ? pairs * COMBO_PAIR_PRICE + leftover : subtotalRaw;
  const discount = Math.max(0, subtotalRaw - subtotal);

  const comboActive = totalQty >= 2;
  const shipping = comboActive ? 0 : subtotalRaw >= 199.9 ? 0 : subtotalRaw > 0 ? 19.9 : 0;
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

        {/* Banner de promoção COMBO 2 UNIDADES */}
        <div className={`mb-6 rounded-2xl border-2 overflow-hidden ${comboActive ? "border-success bg-success/10" : "border-primary bg-primary/5"}`}>
          <div className="p-5 flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${comboActive ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}`}>
              <Gift className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${comboActive ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}`}>
                  {comboActive ? "Promoção aplicada" : "Oferta exclusiva"}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" /> Frete grátis incluso</span>
              </div>
              <h2 className="font-extrabold text-lg sm:text-xl mt-1.5 leading-tight">
                LEVE 2 UNIDADES POR <span className="text-primary">{brl(COMBO_PAIR_PRICE)}</span>
                <span className="text-sm font-semibold text-muted-foreground"> + Frete Grátis</span>
              </h2>
              {comboActive ? (
                <p className="text-sm text-success font-semibold mt-1 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> Você economizou {brl(discount + (subtotalRaw >= 199.9 ? 0 : 19.9))} neste pedido!
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-foreground/80">
                    Falta apenas <strong>1 unidade</strong> para liberar o desconto e o frete grátis.
                  </p>
                  <button
                    onClick={() => cart.setQty(items[0].id, items[0].quantity + 1)}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 text-xs font-bold hover:bg-primary/90"
                  >
                    <Plus className="w-3.5 h-3.5" /> ADICIONAR +1 E ECONOMIZAR
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-3">
            {items.map(i => (
              <div key={i.id} className="flex gap-4 border border-border rounded-xl p-4">
                <img src={i.image} alt="" className="w-24 h-32 object-cover rounded-md bg-muted" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{i.productName}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Cor: {i.color} · Top: {i.topSize} · Legging: {i.legSize}
                  </div>
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

          <aside className="bg-muted/40 rounded-xl p-6 h-fit space-y-4 sticky top-32">
            <h2 className="font-bold text-lg">Resumo do pedido</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className={discount > 0 ? "line-through text-muted-foreground" : ""}>{brl(subtotalRaw)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-success font-semibold">
                  <span>Desconto Combo 2un</span><span>− {brl(discount)}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className={shipping === 0 ? "text-success font-semibold" : ""}>{shipping === 0 ? "Grátis" : brl(shipping)}</span></div>
              {!comboActive && shipping > 0 && (
                <div className="text-xs text-muted-foreground">Adicione +1 unidade e ganhe frete grátis + desconto especial</div>
              )}
            </div>
            <div className="border-t border-border pt-4 flex justify-between items-baseline">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">{brl(total)}</span>
            </div>
            <button onClick={() => navigate({ to: "/checkout" })} className="w-full h-12 bg-success text-success-foreground rounded-md font-bold hover:bg-success/90 flex items-center justify-center gap-2">
              FINALIZAR COMPRA <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-primary">← Continuar comprando</Link>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
