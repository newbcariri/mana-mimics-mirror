import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Copy, CheckCircle2, ShieldCheck, Lock, Zap } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PixBanksTrust } from "@/components/pix-banks-trust";
import { supabase } from "@/integrations/supabase/client";
import { generatePixPayload } from "@/lib/pix";
import { sendWebhookEvent } from "@/lib/webhook";

export const Route = createFileRoute("/pix/$orderId")({
  component: PixPage,
  head: () => ({ meta: [{ title: "Pagamento PIX — Casa Resolve" }] }),
});

const PIX_KEY = "97464ea9-e6c0-43de-9a18-786a4e9a1ed8";
const PIX_NAME = "CASA RESOLVE";
const PIX_CITY = "SAO PAULO";

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

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      try {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .select("total")
          .eq("id", orderId)
          .single();
        if (orderErr || !order) throw orderErr || new Error("Pedido não encontrado");
        const value = Number(order.total);
        setTotal(value);

        const txid = orderId.replace(/-/g, "").slice(0, 25);
        const pix = generatePixPayload({
          key: PIX_KEY,
          name: PIX_NAME,
          city: PIX_CITY,
          amount: value,
          txid,
        });
        setPayload(pix);
        const dataUrl = await QRCode.toDataURL(pix, { width: 320, margin: 1 });
        setQrUrl(dataUrl);
      } catch (e: any) {
        setError(e.message || "Erro ao gerar cobrança PIX");
        toast.error(e.message || "Erro ao gerar cobrança PIX");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, navigate]);

  const copy = async () => {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    toast.success("Código PIX copiado");
    sendWebhookEvent(
      { tipo_evento: "copiar_pix", produto: "Pedido", valor: total },
      { dedupeKey: `copiar_pix:${orderId}` },
    );
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="text-center py-20 text-muted-foreground">Gerando QR Code PIX...</div>
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
            <Zap className="w-4 h-4 text-pix" /> Status: <strong className="text-foreground">Aguardando pagamento</strong>
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-5 text-sm text-center text-muted-foreground">
          Realize o pagamento via PIX para concluir seu pedido. Assim que o pagamento for identificado, seu pedido será processado automaticamente.
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
            <p><strong className="text-foreground">3.</strong> Escaneie o QR Code ou cole o código acima</p>
            <p><strong className="text-foreground">4.</strong> Confirme o pagamento ✓</p>
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
              <Zap className="w-4 h-4 text-success" /> Pagamento via PIX
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
