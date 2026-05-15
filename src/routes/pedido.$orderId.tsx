import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { Package, MapPin, CreditCard, Truck, Clock, ChevronLeft, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/pedido/$orderId")({
  component: OrderDetailPage,
  head: () => ({ meta: [{ title: "Detalhes do Pedido — FlexFit Brasil" }] }),
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  criado: { label: "Pedido criado", cls: "bg-muted text-muted-foreground" },
  aguardando_pagamento: { label: "Aguardando pagamento", cls: "bg-yellow-100 text-yellow-800" },
  pago: { label: "Pago", cls: "bg-green-100 text-green-800" },
  em_separacao: { label: "Em separação", cls: "bg-blue-100 text-blue-800" },
  enviado: { label: "Enviado", cls: "bg-indigo-100 text-indigo-800" },
  entregue: { label: "Entregue", cls: "bg-emerald-100 text-emerald-800" },
  cancelado: { label: "Cancelado", cls: "bg-red-100 text-red-800" },
};

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      const [o, it, hi] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        (supabase as any).from("order_items").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
        (supabase as any).from("order_history").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
      ]);
      setOrder(o.data);
      setItems(it.data || []);
      setHistory(hi.data || []);
      setLoading(false);
    })();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="text-center py-20 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <p className="font-semibold mb-4">Pedido não encontrado</p>
          <Link to="/pedidos" className="text-sm text-primary underline">Voltar aos pedidos</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const status = STATUS_LABEL[order.status] || { label: order.status, cls: "bg-muted text-muted-foreground" };
  const subtotal = Number(order.subtotal ?? order.total);
  const shipping = Number(order.shipping ?? 0);
  const discount = Number(order.discount ?? 0);
  const total = Number(order.total);

  const fallbackItems = items.length > 0 ? items : [{
    id: "fallback",
    product_name: order.product_name,
    color: order.color,
    top_size: order.top_size,
    legging_size: order.legging_size,
    quantity: order.quantity,
    unit_price: total / Math.max(1, order.quantity),
    subtotal: total,
    image: null,
  }];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/pedidos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar aos pedidos
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Pedido #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(order.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <span className={`text-xs uppercase font-bold tracking-wide ${status.cls} px-3 py-1.5 rounded`}>
            {status.label}
          </span>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            {/* Items */}
            <section className="border border-border rounded-xl p-5 bg-card">
              <h2 className="font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Itens do pedido</h2>
              <div className="space-y-3">
                {fallbackItems.map((it: any) => (
                  <div key={it.id} className="flex gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                    {it.image && <img src={it.image} alt="" className="w-16 h-20 object-cover rounded bg-muted shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{it.product_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Cor: {it.color} · Top: {it.top_size} · Legging: {it.legging_size}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Qtd: {it.quantity} × {brl(Number(it.unit_price))}
                      </div>
                    </div>
                    <div className="text-right font-semibold whitespace-nowrap">
                      {brl(Number(it.subtotal))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Address */}
            <section className="border border-border rounded-xl p-5 bg-card">
              <h2 className="font-bold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Endereço de entrega</h2>
              <div className="text-sm space-y-1">
                {order.shipping_address && (
                  <div>
                    {order.shipping_address}
                    {order.shipping_number && `, nº ${order.shipping_number}`}
                  </div>
                )}
                {order.shipping_complement && <div className="text-muted-foreground">{order.shipping_complement}</div>}
                {(order.shipping_neighborhood || order.shipping_city) && (
                  <div className="text-muted-foreground">
                    {order.shipping_neighborhood}{order.shipping_neighborhood && order.shipping_city ? " — " : ""}
                    {order.shipping_city}{order.shipping_state ? `/${order.shipping_state}` : ""}
                  </div>
                )}
                <div className="text-muted-foreground">CEP: {order.shipping_cep}</div>
              </div>
            </section>

            {/* Tracking */}
            {order.tracking_code && (
              <section className="border border-border rounded-xl p-5 bg-card">
                <h2 className="font-bold mb-2 flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Rastreio</h2>
                <p className="text-sm">Código: <strong>{order.tracking_code}</strong></p>
              </section>
            )}

            {/* History */}
            {history.length > 0 && (
              <section className="border border-border rounded-xl p-5 bg-card">
                <h2 className="font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Histórico</h2>
                <ol className="space-y-3">
                  {history.map((h) => (
                    <li key={h.id} className="flex gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">{(STATUS_LABEL[h.status]?.label) || h.note || h.status}</div>
                        <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="border border-border rounded-xl p-5 bg-card h-fit space-y-3">
            <h2 className="font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Resumo</h2>
            <div className="text-sm space-y-1.5 border-t border-border pt-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-success"><span>Desconto</span><span>−{brl(discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{shipping === 0 ? <span className="text-success font-semibold">Grátis</span> : brl(shipping)}</span></div>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">{brl(total)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Pagamento: <strong className="text-foreground">{order.payment_method?.toUpperCase?.() || "PIX"}</strong>
            </div>
            {order.status === "aguardando_pagamento" && (
              <Link
                to="/pix/$orderId"
                params={{ orderId: order.id }}
                className="block w-full text-center bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-bold hover:bg-primary/90"
              >
                Pagar com PIX
              </Link>
            )}
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
