import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { Package, LogOut } from "lucide-react";

export const Route = createFileRoute("/pedidos")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Meus Pedidos — FlexFit Brasil" }] }),
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      const [{ data: o }, { data: p }] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      ]);
      setOrders(o || []);
      setProfile(p);
      setLoading(false);
    })();
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Meus Pedidos</h1>
            {profile && <p className="text-sm text-muted-foreground mt-1">Olá, {profile.full_name.split(" ")[0]}!</p>}
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : orders.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Você ainda não fez pedidos</p>
            <Link to="/" className="inline-block mt-4 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-semibold">Começar a comprar</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <article key={o.id} className="border border-border rounded-xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Pedido #{o.id.slice(0, 8).toUpperCase()}</div>
                    <div className="font-semibold mt-1">{o.product_name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Cor: {o.color} · Top: {o.top_size} · Legging: {o.legging_size} · Qtd: {o.quantity}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(o.created_at).toLocaleString("pt-BR")} · CEP: {o.shipping_cep}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{brl(o.total)}</div>
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wide bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {o.status.replace(/_/g, " ")}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">via {o.payment_method.toUpperCase()}</div>
                    {o.status === "aguardando_pagamento" && o.payment_method === "pix" && (
                      <Link
                        to="/pix/$orderId"
                        params={{ orderId: o.id }}
                        className="inline-block mt-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded hover:bg-primary/90"
                      >
                        Pagar com PIX
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
