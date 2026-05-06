import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, CreditCard, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { createCardCharge, getOrderSummary } from "@/server/asaas.functions";

export const Route = createFileRoute("/cartao/$orderId")({
  component: CardPage,
  head: () => ({ meta: [{ title: "Pagamento Cartão — FlexFit Brasil" }] }),
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const onlyDigits = (s: string) => s.replace(/\D/g, "");

function formatCard(v: string) {
  return onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
function formatExp(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function CardPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const [holderName, setHolderName] = useState("");
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [ccv, setCcv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [addressNumber, setAddressNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      try {
        const [summary, prof] = await Promise.all([
          getOrderSummary({ data: { orderId } }),
          supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        ]);
        if (summary.status === "pago") {
          toast.success("Pedido já pago");
          navigate({ to: "/pedidos" });
          return;
        }
        setTotal(summary.total);
        setProfile(prof.data);
      } catch (e: any) {
        setError(e.message || "Erro ao carregar pedido");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const digits = onlyDigits(number);
    if (digits.length < 13) return toast.error("Número de cartão inválido");
    const expDigits = onlyDigits(exp);
    if (expDigits.length !== 4) return toast.error("Validade inválida (MM/AA)");
    if (ccv.length < 3) return toast.error("CVV inválido");
    if (!holderName.trim()) return toast.error("Informe o nome do titular");
    if (!addressNumber.trim()) return toast.error("Informe o número do endereço");

    setSubmitting(true);
    try {
      const res = await createCardCharge({
        data: {
          orderId,
          installmentCount: installments,
          remoteIp: "0.0.0.0",
          card: {
            holderName: holderName.trim(),
            number: digits,
            expiryMonth: expDigits.slice(0, 2),
            expiryYear: expDigits.slice(2),
            ccv,
          },
          holder: {
            name: profile.full_name,
            email: profile.email,
            cpfCnpj: profile.cpf,
            postalCode: profile.cep,
            addressNumber: addressNumber.trim(),
            phone: profile.phone,
          },
        },
      });
      if (res.paid) {
        toast.success("Pagamento aprovado!");
        navigate({ to: "/pedidos" });
      } else {
        toast.success("Pagamento em análise");
        navigate({ to: "/pedidos" });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar pagamento");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="text-center py-20 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <p className="text-destructive font-semibold mb-4">{error}</p>
          <Link to="/pedidos" className="text-sm text-primary underline">Voltar aos pedidos</Link>
        </div>
      </div>
    );
  }

  // installment options (no interest)
  const installOptions = Array.from({ length: 12 }, (_, i) => i + 1).map((n) => ({
    n,
    each: total / n,
  }));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Pagamento com cartão</h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" /> Ambiente seguro · seus dados são criptografados
          </p>
        </div>

        <div className="border border-border rounded-xl p-6 bg-card">
          <div className="text-center mb-6">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-4xl font-bold text-primary mt-1">{brl(total)}</div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Número do cartão</label>
              <div className="relative mt-1">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={number}
                  onChange={(e) => setNumber(formatCard(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  className="w-full h-12 pl-10 pr-4 border border-border rounded-md text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome impresso no cartão</label>
              <input
                autoComplete="cc-name"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                placeholder="COMO ESTÁ NO CARTÃO"
                className="mt-1 w-full h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Validade (MM/AA)</label>
                <input
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  value={exp}
                  onChange={(e) => setExp(formatExp(e.target.value))}
                  placeholder="MM/AA"
                  className="mt-1 w-full h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">CVV</label>
                <input
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={ccv}
                  onChange={(e) => setCcv(onlyDigits(e.target.value).slice(0, 4))}
                  placeholder="123"
                  className="mt-1 w-full h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Parcelamento</label>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="mt-1 w-full h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary bg-background"
              >
                {installOptions.map((o) => (
                  <option key={o.n} value={o.n}>
                    {o.n}x de {brl(o.each)} sem juros
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Número do endereço de cobrança</label>
              <input
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="Nº"
                className="mt-1 w-full h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">CEP: {profile?.cep}</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-success text-success-foreground rounded-md font-bold hover:bg-success/90 disabled:opacity-50"
            >
              {submitting ? "Processando..." : `PAGAR ${brl(total)}`}
            </button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <ShieldCheck className="w-4 h-4 text-success" /> Pagamento processado pela Asaas
            </div>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link to="/pedidos" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar aos pedidos
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
