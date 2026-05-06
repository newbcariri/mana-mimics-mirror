import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock, CreditCard, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { postPaymentApi } from "@/lib/payment-api";
import { detectBrand, brandLabel, luhnValid, maskCardNumber, maskExp, onlyDigits } from "@/lib/checkout-utils";

export const Route = createFileRoute("/cartao/$orderId")({
  component: CardPage,
  head: () => ({ meta: [{ title: "Pagamento Cartão — FlexFit Brasil" }] }),
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const BRAND_COLORS: Record<string, string> = {
  visa: "bg-[#1A1F71] text-white",
  mastercard: "bg-[#EB001B] text-white",
  amex: "bg-[#2E77BC] text-white",
  elo: "bg-foreground text-background",
  hipercard: "bg-[#B3131B] text-white",
  diners: "bg-[#0079BE] text-white",
  discover: "bg-[#FF6000] text-white",
  unknown: "bg-muted text-muted-foreground",
};

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const brand = useMemo(() => detectBrand(number), [number]);
  const cardValid = useMemo(() => luhnValid(number), [number]);
  const expValid = useMemo(() => {
    const d = onlyDigits(exp);
    if (d.length !== 4) return false;
    const mm = parseInt(d.slice(0, 2), 10);
    const yy = parseInt(d.slice(2), 10);
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const yearFull = 2000 + yy;
    const last = new Date(yearFull, mm, 0, 23, 59, 59);
    return last >= now;
  }, [exp]);
  const cvvValid = ccv.length >= 3;
  const nameValid = holderName.trim().split(" ").length >= 2;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      try {
        const [summary, prof] = await Promise.all([
          postPaymentApi<{ total: number; status: string; hasCharge: boolean }>("order-summary", { orderId }),
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
    setTouched({ number: true, name: true, exp: true, ccv: true, addr: true });
    if (!profile) return;
    if (!cardValid) return toast.error("Número de cartão inválido");
    if (!nameValid) return toast.error("Informe o nome completo do titular");
    if (!expValid) return toast.error("Validade inválida ou cartão vencido");
    if (!cvvValid) return toast.error("CVV inválido");
    if (!addressNumber.trim()) return toast.error("Informe o número do endereço");

    const expDigits = onlyDigits(exp);
    setSubmitting(true);
    try {
      const res = await postPaymentApi<{ paid: boolean }>("card", {
        orderId,
        installmentCount: installments,
        remoteIp: "0.0.0.0",
        card: {
          holderName: holderName.trim(),
          number: onlyDigits(number),
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
      });
      if (res.paid) {
        toast.success("Pagamento aprovado!");
        navigate({ to: "/pagamento-confirmado/$orderId", params: { orderId } });
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
    return <div className="min-h-screen bg-background"><SiteHeader /><div className="text-center py-20 text-muted-foreground">Carregando...</div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader />
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <p className="text-destructive font-semibold mb-4">{error}</p>
          <Link to="/pedidos" className="text-sm text-primary underline">Voltar aos pedidos</Link>
        </div>
      </div>
    );
  }

  const installOptions = Array.from({ length: 12 }, (_, i) => i + 1).map((n) => ({ n, each: total / n }));

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Pagamento com cartão</h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-success" /> Ambiente seguro · dados criptografados
          </p>
        </div>

        <div className="border border-border rounded-xl p-6 bg-card shadow-sm">
          <div className="text-center mb-6">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-4xl font-bold text-primary mt-1">{brl(total)}</div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Card number */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Número do cartão</label>
              <div className="relative mt-1">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={number}
                  onChange={(e) => setNumber(maskCardNumber(e.target.value))}
                  onBlur={() => setTouched(t => ({ ...t, number: true }))}
                  placeholder="0000 0000 0000 0000"
                  className={`w-full h-12 pl-10 pr-24 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 transition ${touched.number && !cardValid && number ? "border-destructive" : cardValid ? "border-success" : "border-border focus:border-primary"}`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {brand !== "unknown" && (
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${BRAND_COLORS[brand]}`}>{brandLabel(brand).toUpperCase()}</span>
                  )}
                  {cardValid && <CheckCircle2 className="w-4 h-4 text-success" />}
                </div>
              </div>
              {touched.number && !cardValid && number && (
                <p className="text-[11px] text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Número de cartão inválido</p>
              )}
            </div>

            {/* Holder name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome impresso no cartão</label>
              <div className="relative mt-1">
                <input
                  autoComplete="cc-name"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                  onBlur={() => setTouched(t => ({ ...t, name: true }))}
                  placeholder="COMO ESTÁ NO CARTÃO"
                  className={`w-full h-12 px-4 pr-10 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 transition ${touched.name && !nameValid && holderName ? "border-destructive" : nameValid ? "border-success" : "border-border focus:border-primary"}`}
                />
                {nameValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />}
              </div>
            </div>

            {/* Exp + CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Validade</label>
                <div className="relative mt-1">
                  <input
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={exp}
                    onChange={(e) => setExp(maskExp(e.target.value))}
                    onBlur={() => setTouched(t => ({ ...t, exp: true }))}
                    placeholder="MM/AA"
                    className={`w-full h-12 px-4 pr-10 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 transition ${touched.exp && !expValid && exp ? "border-destructive" : expValid ? "border-success" : "border-border focus:border-primary"}`}
                  />
                  {expValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">CVV</label>
                <div className="relative mt-1">
                  <input
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={ccv}
                    onChange={(e) => setCcv(onlyDigits(e.target.value).slice(0, 4))}
                    onBlur={() => setTouched(t => ({ ...t, ccv: true }))}
                    placeholder="123"
                    className={`w-full h-12 px-4 pr-10 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 transition ${touched.ccv && !cvvValid && ccv ? "border-destructive" : cvvValid ? "border-success" : "border-border focus:border-primary"}`}
                  />
                  {cvvValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />}
                </div>
              </div>
            </div>

            {/* Installments */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Parcelamento</label>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="mt-1 w-full h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
              >
                {installOptions.map((o) => (
                  <option key={o.n} value={o.n}>{o.n}x de {brl(o.each)} sem juros</option>
                ))}
              </select>
            </div>

            {/* Address number */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Número do endereço de cobrança</label>
              <input
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="Nº"
                className="mt-1 w-full h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-muted-foreground mt-1">CEP: {profile?.cep}</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="hidden lg:flex w-full h-13 py-3.5 bg-success text-success-foreground rounded-md font-bold hover:bg-success/90 disabled:opacity-50 items-center justify-center gap-2 text-base shadow-md transition"
            >
              {submitting ? "Processando..." : <>Finalizar Compra <Lock className="w-4 h-4" /></>}
            </button>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground text-center">
                <ShieldCheck className="w-4 h-4 text-success" /> Compra segura
              </div>
              <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground text-center">
                <Lock className="w-4 h-4 text-success" /> SSL 256-bit
              </div>
              <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground text-center">
                <CheckCircle2 className="w-4 h-4 text-success" /> Dados protegidos
              </div>
            </div>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link to="/pedidos" className="text-sm text-muted-foreground hover:text-primary">← Voltar aos pedidos</Link>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed lg:hidden bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-40 shadow-2xl">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="text-xl font-bold text-primary">{brl(total)}</span>
        </div>
        <button onClick={submit as any} disabled={submitting} className="w-full h-12 bg-success text-success-foreground rounded-md font-bold hover:bg-success/90 disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? "Processando..." : <>Finalizar Compra <Lock className="w-4 h-4" /></>}
        </button>
      </div>

      <div className="hidden lg:block"><SiteFooter /></div>
    </div>
  );
}
