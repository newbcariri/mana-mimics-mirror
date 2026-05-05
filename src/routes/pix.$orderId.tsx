import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, CheckCircle2, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { generatePixPayload } from "@/lib/pix";

export const Route = createFileRoute("/pix/$orderId")({
  component: PixPage,
  head: () => ({ meta: [{ title: "Pagamento PIX — FlexFit Brasil" }] }),
});

const PIX_KEY = "c1b24169-a0c4-4d3b-908a-02fa61c3e117";
const BENEFICIARIO = "61.900.733 PATRICIA RAFAELA DO O";
const CNPJ = "61.900.733/0001-77";
const BANCO = "ASAAS INSTITUIÇÃO DE PAGAMENTOS S.A.";
const MERCHANT_NAME = "PATRICIA RAFAELA DO O";
const MERCHANT_CITY = "BRASILIA";

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PixPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [payload, setPayload] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      // Fetch all orders sharing this checkout (same user, same created_at minute)
      const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (!o) { toast.error("Pedido não encontrado"); navigate({ to: "/pedidos" }); return; }
      // Group: orders created in same checkout (within 5s)
      const { data: group } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", o.user_id)
        .gte("created_at", new Date(new Date(o.created_at).getTime() - 5000).toISOString())
        .lte("created_at", new Date(new Date(o.created_at).getTime() + 5000).toISOString());
      const orders = group || [o];
      const sumTotal = orders.reduce((s, x) => s + Number(x.total), 0);
      setOrder(o);
      setTotal(sumTotal);
      const p = generatePixPayload({
        key: PIX_KEY,
        name: MERCHANT_NAME,
        city: MERCHANT_CITY,
        amount: sumTotal,
        txid: "***",
      });
      setPayload(p);
      const url = await QRCode.toDataURL(p, { width: 320, margin: 1, errorCorrectionLevel: "M" });
      setQrUrl(url);
      setLoading(false);
    })();
  }, [orderId, navigate]);

  // Poll status
  useEffect(() => {
    if (!order) return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("orders").select("status").eq("id", orderId).single();
      if (data && data.status !== "aguardando_pagamento") {
        toast.success("Pagamento confirmado!");
        navigate({ to: "/pedidos" });
      }
    }, 5000);
    return () => clearInterval(t);
  }, [order, orderId, navigate]);

  const copy = async () => {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    toast.success("Código PIX copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="text-center py-20 text-muted-foreground">Gerando QR Code...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Pague com PIX</h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" /> Aguardando pagamento · confirmação automática
          </p>
        </div>

        <div className="border border-border rounded-xl p-6 bg-card">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Valor a pagar</div>
            <div className="text-4xl font-bold text-primary mt-1">{brl(total)}</div>
          </div>

          <div className="flex justify-center my-6">
            <div className="p-4 bg-white rounded-xl border-2 border-border">
              {qrUrl && <img src={qrUrl} alt="QR Code PIX" className="w-64 h-64" />}
            </div>
          </div>

          <button
            onClick={copy}
            className="w-full h-12 bg-primary text-primary-foreground rounded-md font-bold flex items-center justify-center gap-2 hover:bg-primary/90"
          >
            {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? "Copiado!" : "Copiar código PIX"}
          </button>

          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer text-center">Ver código copia-e-cola</summary>
            <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono break-all">{payload}</div>
          </details>

          <div className="mt-6 border-t border-border pt-4 space-y-2 text-sm">
            <div className="font-semibold mb-2">Dados do beneficiário</div>
            <Row label="Nome" value={BENEFICIARIO} />
            <Row label="CNPJ" value={CNPJ} />
            <Row label="Banco" value={BANCO} />
          </div>

          <div className="mt-6 bg-muted/50 rounded-md p-4 text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Como pagar:</strong></p>
            <p>1. Abra o app do seu banco e escolha pagar com PIX</p>
            <p>2. Escaneie o QR Code ou cole o código copia-e-cola</p>
            <p>3. Confirme o valor e finalize o pagamento</p>
            <p>4. Esta página será atualizada automaticamente após a confirmação</p>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 flex-wrap">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}
