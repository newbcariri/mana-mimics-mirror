// Webhook bridge → Make (Integromat) → Z-API (WhatsApp)
const WEBHOOK_URL = "https://hook.us2.make.com/97kfvstm35cn19l65c7b4onvtenwujba";

export type WebhookEventType =
  | "iniciar_checkout"
  | "add_carrinho"
  | "copiar_pix"
  | "pedido_criado"
  | "pagamento_aprovado";

export interface WebhookPayload {
  tipo_evento: WebhookEventType;
  produto: string;
  valor: number;
  nome_cliente?: string;
  telefone?: string;
}

const sent = new Set<string>();

export async function sendWebhookEvent(
  payload: WebhookPayload,
  opts: { dedupeKey?: string } = {},
): Promise<void> {
  try {
    const key = opts.dedupeKey ?? `${payload.tipo_evento}:${payload.produto}`;
    if (sent.has(key)) return;
    sent.add(key);

    // Persistência leve para eventos críticos (pedido/pagamento) entre reloads
    if (typeof window !== "undefined" && opts.dedupeKey) {
      const storeKey = `wh_sent:${opts.dedupeKey}`;
      if (window.localStorage.getItem(storeKey)) return;
      window.localStorage.setItem(storeKey, "1");
    }

    // Fire-and-forget: não bloqueia UX
    void fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: "no-cors",
    }).catch((err) => console.warn("[webhook] falhou", err));
  } catch (err) {
    console.warn("[webhook] erro", err);
  }
}

// Expor globalmente conforme solicitado
if (typeof window !== "undefined") {
  (window as any).sendWebhookEvent = sendWebhookEvent;
}
