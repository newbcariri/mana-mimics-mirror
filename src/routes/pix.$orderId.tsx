import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, CheckCircle2, Clock, ShieldCheck, Lock, Zap } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PixBanksTrust } from "@/components/pix-banks-trust";
import { supabase } from "@/integrations/supabase/client";
import { postPaymentApi } from "@/lib/payment-api";

export const Route = createFileRoute("/pix/$orderId")({
  component: PixPage,
  head: () => ({ meta: [{ title: "Pagamento PIX — FlexFit Brasil" }] }),
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PixPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [total, setTotal] = useState(0);
  const [payload, setPayload] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<string>("30:00");
  const [expired, setExpired] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      try {
        const res = await postPaymentApi<{
          qrCodeBase64: string;
          payload: string;
          value: number;
          expirationDate?: string;
          paymentId: string;
        }>("pix", { orderId });
        setTotal(res.value);
        setPayload(res.payload);
        setQrUrl(`data:image/png;base64,${res.qrCodeBase64}`);
        const FALLBACK_MS = 30 * 60 * 1000;
        const MAX_MS = 24 * 60 * 60 * 1000; // cap em 24h
        let exp = Date.now() + FALLBACK_MS;
        if (res.expirationDate) {
          // Aceita "YYYY-MM-DD HH:mm:ss" (Asaas) e ISO. Normaliza para ISO.
          const raw = String(res.expirationDate).trim();
          const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
          const parsed = new Date(iso).getTime();
          if (Number.isFinite(parsed)) {
            const diff = parsed - Date.now();
            if (diff > 0 && diff <= MAX_MS) exp = parsed;
          }
        }
        setExpiresAt(exp);
      } catch (e: any) {
        setError(e.message || "Erro ao gerar cobrança PIX");
        toast.error(e.message || "Erro ao gerar cobrança PIX");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, navigate]);

  // Countdown
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      if (diff <= 0) {
        setExpired(true);
        setRemaining("00:00");
        return;
      }
      setExpired(false);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      setRemaining(h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  // Poll status
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await postPaymentApi<{ status: string }>("order-summary", { orderId });
        if (res.status && res.status !== "aguardando_pagamento") {
          toast.success("Pagamento confirmado!");
          navigate({ to: "/pagamento-confirmado/$orderId", params: { orderId } });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [orderId, navigate]);

  const copy = async () => {
    if (expired) return;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    toast.success("Código PIX copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await postPaymentApi<{
        qrCodeBase64: string;
        payload: string;
        value: number;
        expirationDate?: string;
        paymentId: string;
      }>("pix", { orderId, regenerate: true });
      setPayload(res.payload);
      setQrUrl(`data:image/png;base64,${res.qrCodeBase64}`);
      const parsed = res.expirationDate ? new Date(String(res.expirationDate).replace(" ", "T")).getTime() : NaN;
      const exp = Number.isFinite(parsed) && parsed - Date.now() > 0 ? parsed : Date.now() + 30 * 60 * 1000;
      setExpiresAt(exp);
      setExpired(false);
      toast.success("Novo código PIX gerado");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar novo PIX");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="text-center py-20 text-muted-foreground">Gerando cobrança PIX...</div>
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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-pix/10 mb-3">
            <span className="text-pix font-bold text-lg">PIX</span>
          </div>
          <h1 className="text-3xl font-bold">Pague com PIX</h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-pix" /> Pagamento instantâneo e seguro
          </p>
        </div>

        {/* Timer */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-5 flex items-center justify-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Este código expira em</span>
          <span className="font-mono font-bold tabular-nums text-primary text-base">{remaining}</span>
        </div>

        <div className="border border-border rounded-xl p-6 bg-card shadow-sm">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Valor a pagar</div>
            <div className="text-4xl font-bold text-primary mt-1">{brl(total)}</div>
          </div>

          <div className="flex justify-center my-6">
            <div className="p-5 bg-white rounded-xl border-2 border-pix/30 shadow-md">
              {qrUrl && <img src={qrUrl} alt="QR Code PIX" className="w-72 h-72" />}
            </div>
          </div>

          <button
            onClick={copy}
            className="w-full h-13 py-3.5 bg-pix text-white rounded-md font-bold flex items-center justify-center gap-2 hover:opacity-90 transition text-base shadow-md"
          >
            {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? "Código copiado!" : "Copiar código PIX"}
          </button>

          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer text-center hover:text-foreground">Ver código copia-e-cola</summary>
            <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono break-all">{payload}</div>
          </details>

          <div className="mt-6 bg-muted/50 rounded-md p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="text-foreground font-semibold mb-1">Como pagar em 4 passos:</p>
            <p><strong className="text-foreground">1.</strong> Abra o app do seu banco</p>
            <p><strong className="text-foreground">2.</strong> Escolha pagar com PIX (QR Code ou copia-e-cola)</p>
            <p><strong className="text-foreground">3.</strong> Escaneie ou cole o código acima</p>
            <p><strong className="text-foreground">4.</strong> Confirme — esta página atualiza automaticamente ✓</p>
        </div>

        <div className="mt-5">
          <PixBanksTrust />
        </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-success" /> Compra segura
            </div>
            <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="w-4 h-4 text-success" /> SSL criptografado
            </div>
            <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
              <Zap className="w-4 h-4 text-success" /> Aprovação imediata
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/pedidos" className="text-sm text-muted-foreground hover:text-primary">
            Acompanhar pedido em "Meus Pedidos" →
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
