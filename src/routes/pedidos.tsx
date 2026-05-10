import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { Package, LogOut, ChevronRight, User } from "lucide-react";

export const Route = createFileRoute("/pedidos")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Meus Pedidos — FlexFit Brasil" }] }),
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  aguardando_pagamento: { label: "Aguardando pagamento", cls: "bg-yellow-100 text-yellow-800" },
  pago: { label: "Pago", cls: "bg-green-100 text-green-800" },
  em_separacao: { label: "Em separação", cls: "bg-blue-100 text-blue-800" },
  enviado: { label: "Enviado", cls: "bg-indigo-100 text-indigo-800" },
  entregue: { label: "Entregue", cls: "bg-emerald-100 text-emerald-800" },
  cancelado: { label: "Cancelado", cls: "bg-red-100 text-red-800" },
};

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
            {profile && <p className="text-sm text-muted-foreground mt-1">Olá, {profile.full_name?.split(" ")[0]}!</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/minha-conta" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <User className="w-4 h-4" /> Minha conta
            </Link>
            <button onClick={logout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
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
            {orders.map(o => {
              const status = STATUS_LABEL[o.status] || { label: o.status, cls: "bg-muted text-muted-foreground" };
              const itemsCount = o.items_count || o.quantity || 1;
              return (
                <Link
                  key={o.id}
                  to="/pedido/$orderId"
                  params={{ orderId: o.id }}
                  className="block border border-border rounded-xl p-5 hover:border-primary transition group"
                >
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">Pedido #{o.id.slice(0, 8).toUpperCase()}</div>
                      <div className="font-semibold mt-1">
                        {itemsCount} {itemsCount > 1 ? "itens" : "item"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(o.created_at).toLocaleString("pt-BR")} · via {o.payment_method?.toUpperCase?.() || "PIX"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{brl(Number(o.total))}</div>
                      <span className={`inline-block mt-1 text-[10px] uppercase font-bold tracking-wide ${status.cls} px-2 py-1 rounded`}>
                        {status.label}
                      </span>
                      <div className="text-xs text-primary mt-2 flex items-center justify-end gap-1 group-hover:gap-2 transition-all">
                        Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
