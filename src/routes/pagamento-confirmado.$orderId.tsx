import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Package, Truck, Mail, Copy, ShoppingBag, FileText } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { fbqTrack } from "@/lib/fbq";

export const Route = createFileRoute("/pagamento-confirmado/$orderId")({
  component: SuccessPage,
  head: () => ({ meta: [{ title: "Pagamento confirmado — FlexFit Brasil" }] }),
});

const brl = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function SuccessPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }

      const { data: order } = await supabase
        .from("orders").select("*").eq("id", orderId).single();
      if (!order) { setLoading(false); return; }

      const ts = new Date(order.created_at).getTime();
      const { data: siblings } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("created_at", new Date(ts - 5000).toISOString())
        .lte("created_at", new Date(ts + 5000).toISOString());

      const { data: prof } = await supabase
        .from("profiles").select("*").eq("id", session.user.id).single();

      setOrders(siblings && siblings.length > 0 ? siblings : [order]);
      setProfile(prof);
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

  if (!orders.length) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <p className="text-destructive font-semibold mb-4">Pedido não encontrado</p>
          <Link to="/pedidos" className="text-sm text-primary underline">Ver meus pedidos</Link>
        </div>
      </div>
    );
  }

  const total = orders.reduce((s, o) => s + Number(o.total), 0);
  const main = orders[0];
  const orderNumber = main.id.slice(0, 8).toUpperCase();
  const paymentMethod = main.payment_method === "pix" ? "PIX" : "Cartão de crédito";

  // Purchase — somente em pagamento confirmado, deduplicado por orderId
  useEffect(() => {
    if (!main || main.status !== "pago") return;
    fbqTrack(
      "Purchase",
      {
        content_name: orders.map(o => o.product_name).join(", "),
        content_type: "product",
        currency: "BRL",
        value: total,
        num_items: orders.reduce((s, o) => s + Number(o.quantity || 1), 0),
        order_id: main.id,
      },
      `purchase:${main.id}`,
    );
  }, [main?.id, main?.status, total]);

  // Estimated delivery: +7 to +12 business days
  const today = new Date();
  const minDelivery = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const maxDelivery = new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const copyOrderNumber = async () => {
    await navigator.clipboard.writeText(orderNumber);
    toast.success("Número do pedido copiado");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4 animate-in zoom-in duration-500">
            <CheckCircle2 className="w-12 h-12 text-success" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold">Pagamento confirmado!</h1>
          <p className="text-muted-foreground mt-2">
            Recebemos seu pagamento e seu pedido já está em preparação.
          </p>
        </div>

        {/* Order summary */}
        <div className="border border-border rounded-xl bg-card overflow-hidden mb-4">
          <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Número do pedido</div>
              <div className="font-mono font-bold text-base mt-0.5">#{orderNumber}</div>
            </div>
            <button
              onClick={copyOrderNumber}
              className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar
            </button>
          </div>

          <div className="px-6 py-5 space-y-3 border-b border-border">
            {orders.map((o, i) => (
              <div key={o.id} className="flex items-start justify-between gap-4 text-sm">
                <div className="flex-1">
                  <div className="font-semibold">{o.product_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Cor: {o.color} · Top: {o.top_size} · Calça: {o.legging_size} · Qtd: {o.quantity}
                  </div>
                </div>
                <div className="font-semibold">{brl(Number(o.total))}</div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 space-y-2 text-sm border-b border-border">
            <div className="flex justify-between text-muted-foreground">
              <span>Forma de pagamento</span>
              <span className="text-foreground font-medium">{paymentMethod}</span>
            </div>
            {main.asaas_payment_id && (
              <div className="flex justify-between text-muted-foreground">
                <span>ID da transação</span>
                <span className="text-foreground font-mono text-xs">{main.asaas_payment_id}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Status</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-bold">
                <CheckCircle2 className="w-3 h-3" /> PAGO
              </span>
            </div>
          </div>

          <div className="px-6 py-4 flex justify-between items-center bg-muted/20">
            <span className="text-sm text-muted-foreground">Total pago</span>
            <span className="text-2xl font-bold text-primary">{brl(total)}</span>
          </div>
        </div>

        {/* Delivery */}
        <div className="border border-border rounded-xl bg-card p-6 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Previsão de entrega</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Entre <strong className="text-foreground">{fmtDate(minDelivery)}</strong> e{" "}
                <strong className="text-foreground">{fmtDate(maxDelivery)}</strong>
              </div>
              {profile?.cep && (
                <div className="text-xs text-muted-foreground mt-2">
                  Endereço: {main.shipping_address || "—"} · CEP {main.shipping_cep}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="border border-border rounded-xl bg-card p-6 mb-6">
          <div className="font-semibold mb-4">Próximos passos</div>
          <div className="space-y-4">
            <Step
              icon={<Mail className="w-4 h-4" />}
              title="E-mail de confirmação"
              desc={`Enviamos os detalhes do pedido para ${profile?.email || "seu e-mail"}.`}
            />
            <Step
              icon={<Package className="w-4 h-4" />}
              title="Preparação"
              desc="Seu pedido será separado e embalado em até 1 dia útil."
            />
            <Step
              icon={<Truck className="w-4 h-4" />}
              title="Código de rastreio"
              desc="Você receberá o código de rastreio assim que o pedido for postado."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate({ to: "/pedidos" })}
            className="h-12 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" /> Ver meus pedidos
          </button>
          <button
            onClick={() => navigate({ to: "/" })}
            className="h-12 border border-border rounded-md font-bold hover:bg-muted flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" /> Continuar comprando
          </button>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function Step({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 text-sm">
        <div className="font-semibold">{title}</div>
        <div className="text-muted-foreground text-xs mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
