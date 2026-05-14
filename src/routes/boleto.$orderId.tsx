import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, CheckCircle2, Clock, ShieldCheck, Lock, Barcode, Download } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { postPaymentApi } from "@/lib/payment-api";

export const Route = createFileRoute("/boleto/$orderId")({
  component: BoletoPage,
  head: () => ({ meta: [{ title: "Pagamento por Boleto — FlexFit Brasil" }] }),
});

const brl = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatDueDate(d?: string) {
  if (!d) return "";
  const raw = d.includes("T") ? d : `${d}T00:00:00`;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

function BoletoPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [total, setTotal] = useState(0);
  const [identificationField, setIdentificationField] = useState("");
  const [bankSlipUrl, setBankSlipUrl] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string>("aguardando_pagamento");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      try {
        const res = await postPaymentApi<{
          paymentId: string;
          value: number;
          bankSlipUrl?: string;
          identificationField?: string;
          dueDate?: string;
        }>("boleto", { orderId });
        setTotal(res.value);
        setIdentificationField(res.identificationField || "");
        setBankSlipUrl(res.bankSlipUrl);
        setDueDate(res.dueDate);
      } catch (e: any) {
        const msg = e?.message || "Erro ao gerar boleto";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Polling status — confirma pagamento até 2 dias úteis
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await postPaymentApi<{ total: number; status: string; hasCharge: boolean }>(
          "order-summary",
          { orderId },
        );
        if (cancelled) return;
        setStatus(res.status);
        if (res.status === "pago") {
          navigate({ to: "/pagamento-confirmado/$orderId", params: { orderId } });
        }
      } catch (e) {
        // ignore polling errors
      }
    };
    const t = setInterval(check, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [orderId, navigate]);

  const copyLine = async () => {
    if (!identificationField) return;
    try {
      await navigator.clipboard.writeText(identificationField);
      setCopied(true);
      toast.success("Linha digitável copiada!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Barcode className="w-6 h-6 text-primary" /> Pague com Boleto
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          Pedido #{orderId.slice(0, 8).toUpperCase()}
        </p>

        {loading && (
          <div className="border border-border rounded-xl p-6 bg-card text-center text-muted-foreground">
            Gerando seu boleto...
          </div>
        )}

        {!loading && error && (
          <div className="border border-destructive/40 bg-destructive/5 rounded-xl p-6 text-sm">
            <p className="font-semibold text-destructive mb-2">Erro ao gerar boleto</p>
            <p className="text-muted-foreground">{error}</p>
            <Link to="/checkout" className="inline-block mt-4 text-primary font-semibold text-sm">Voltar ao checkout</Link>
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="border border-border rounded-xl p-5 bg-card mb-4">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm text-muted-foreground">Valor a pagar</span>
                <span className="text-2xl font-bold text-primary">{brl(total)}</span>
              </div>
              {dueDate && (
                <div className="flex items-center justify-between text-sm border-t border-border pt-3">
                  <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Vencimento</span>
                  <span className="font-semibold">{formatDueDate(dueDate)}</span>
                </div>
              )}
            </section>

            {identificationField && (
              <section className="border border-border rounded-xl p-5 bg-card mb-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linha digitável</label>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs sm:text-sm font-mono break-all">
                  {identificationField}
                </div>
                <button
                  onClick={copyLine}
                  className="mt-3 w-full h-12 bg-primary text-primary-foreground rounded-md font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition"
                >
                  {copied ? (<><CheckCircle2 className="w-4 h-4" /> Copiado!</>) : (<><Copy className="w-4 h-4" /> Copiar linha digitável</>)}
                </button>
              </section>
            )}

            {bankSlipUrl && (
              <section className="border border-border rounded-xl p-5 bg-card mb-4 space-y-3">
                <a
                  href={bankSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 border-2 border-primary text-primary rounded-md font-bold flex items-center justify-center gap-2 hover:bg-primary/5 transition"
                >
                  <Download className="w-4 h-4" /> Visualizar / Baixar boleto (PDF)
                </a>
              </section>
            )}

            <section className="border border-border rounded-xl p-5 bg-muted/40 text-sm space-y-2">
              <p className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Após o pagamento, a confirmação pode levar até <strong>2 dias úteis</strong>.</span>
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-success mt-0.5 shrink-0" />
                <span>Seu pedido fica como <strong>“Aguardando pagamento”</strong> e é atualizado automaticamente para <strong>“Pago”</strong> assim que o boleto for compensado.</span>
              </p>
              <p className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-success mt-0.5 shrink-0" />
                <span>Pagamento processado de forma segura.</span>
              </p>
            </section>

            <div className="mt-6 text-center text-xs text-muted-foreground">
              Status atual: <strong className="text-foreground">{status === "pago" ? "Pago" : "Aguardando pagamento"}</strong>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
