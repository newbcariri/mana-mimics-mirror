import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Package, Users, ShoppingBag, LogOut, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Painel Admin — FlexFit Brasil" }] }),
});

const brl = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_OPTIONS = [
  { value: "aguardando_pagamento", label: "Aguardando pagamento", color: "bg-orange-100 text-orange-800" },
  { value: "pago", label: "Pago", color: "bg-emerald-100 text-emerald-800" },
  { value: "em_separacao", label: "Em separação", color: "bg-yellow-100 text-yellow-800" },
  { value: "enviado", label: "Enviado", color: "bg-purple-100 text-purple-800" },
  { value: "entregue", label: "Entregue", color: "bg-green-100 text-green-800" },
];

function statusMeta(status: string) {
  return (
    STATUS_OPTIONS.find((s) => s.value === status) ||
    // legacy fallback
    { value: status, label: status.replace(/_/g, " "), color: "bg-gray-100 text-gray-800" }
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "customers">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      const { data: roles } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id);
      const isAdmin = (roles as any[] | null)?.some((r) => r.role === "admin");
      if (!isAdmin) {
        toast.error("Acesso restrito ao administrador");
        navigate({ to: "/" });
        return;
      }
      await loadData();
      setLoading(false);
    })();
  }, [navigate]);

  async function loadData() {
    const [{ data: o }, { data: p }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    setOrders(o || []);
    setCustomers(p || []);
  }

  async function updateStatus(orderId: string, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    toast.success("Status atualizado");
  }

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const stats = {
    total: orders.length,
    revenue: orders.reduce((s, o) => s + Number(o.total), 0),
    customers: customers.length,
    pending: orders.filter((o) => o.status !== "entregue").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="max-w-7xl mx-auto px-4 py-12 text-muted-foreground">
          Carregando painel...
        </div>
      </div>
    );
  }

  const customerMap = new Map(customers.map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteHeader />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie pedidos e clientes
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Pedidos" value={stats.total.toString()} />
          <StatCard icon={<Package className="w-5 h-5" />} label="Pendentes" value={stats.pending.toString()} />
          <StatCard icon={<Users className="w-5 h-5" />} label="Clientes" value={stats.customers.toString()} />
          <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Receita" value={brl(stats.revenue)} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-4">
          <TabBtn active={tab === "orders"} onClick={() => setTab("orders")}>
            Pedidos ({orders.length})
          </TabBtn>
          <TabBtn active={tab === "customers"} onClick={() => setTab("customers")}>
            Clientes ({customers.length})
          </TabBtn>
        </div>

        {tab === "orders" ? (
          <>
            {/* Filter */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                Todos
              </FilterChip>
              {STATUS_OPTIONS.map((s) => (
                <FilterChip
                  key={s.value}
                  active={filter === s.value}
                  onClick={() => setFilter(s.value)}
                >
                  {s.label}
                </FilterChip>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                Nenhum pedido encontrado
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((o) => {
                  const customer = customerMap.get(o.user_id);
                  const meta = statusMeta(o.status);
                  return (
                    <article
                      key={o.id}
                      className="bg-card border border-border rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-[260px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              Pedido #{o.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wide px-2 py-1 rounded ${meta.color}`}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <div className="font-semibold mt-1">{o.product_name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Cor: {o.color} · Top: {o.top_size} · Legging: {o.legging_size} · Qtd: {o.quantity}
                          </div>
                          {customer && (
                            <div className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
                              <div className="font-medium text-foreground">{customer.full_name}</div>
                              <div>{customer.email} · {customer.phone}</div>
                              <div>CPF: {customer.cpf} · CEP: {o.shipping_cep}</div>
                              {o.shipping_address && <div>Endereço: {o.shipping_address}</div>}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {new Date(o.created_at).toLocaleString("pt-BR")} · via {o.payment_method.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary mb-2">{brl(o.total)}</div>
                          {o.status === "aguardando_pagamento" && (
                            <button
                              onClick={() => updateStatus(o.id, "pago")}
                              className="block w-full mb-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wide px-3 py-2 rounded hover:bg-emerald-700"
                            >
                              Confirmar pagamento
                            </button>
                          )}
                          <div className="relative inline-block">
                            <select
                              value={STATUS_OPTIONS.find(s => s.value === o.status) ? o.status : "aguardando_pagamento"}
                              onChange={(e) => updateStatus(o.id, e.target.value)}
                              className="appearance-none bg-background border border-border rounded-md pl-3 pr-8 py-2 text-sm font-medium cursor-pointer hover:border-primary"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Telefone</th>
                    <th className="px-4 py-3 font-semibold">CPF</th>
                    <th className="px-4 py-3 font-semibold">CEP</th>
                    <th className="px-4 py-3 font-semibold">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{c.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.cpf}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.cep}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente cadastrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar para a loja
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border text-muted-foreground hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}
