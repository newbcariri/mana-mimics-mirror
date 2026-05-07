// Helpers para Meta Pixel (fbq) com deduplicação por chave em sessionStorage.

type FbqEvent =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase";

const DEDUPE_KEY = "flexfit_fbq_sent";

function getSent(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(DEDUPE_KEY) || "{}");
  } catch {
    return {};
  }
}

function markSent(key: string) {
  if (typeof window === "undefined") return;
  const m = getSent();
  m[key] = true;
  try {
    sessionStorage.setItem(DEDUPE_KEY, JSON.stringify(m));
  } catch {}
}

export function fbqTrack(event: FbqEvent, params?: Record<string, unknown>, dedupeKey?: string) {
  if (typeof window === "undefined") return;
  if (dedupeKey) {
    const sent = getSent();
    if (sent[dedupeKey]) return;
    markSent(dedupeKey);
  }
  const fn: any = (window as any).fbq;
  if (!fn) {
    // Tenta novamente quando o pixel carregar
    setTimeout(() => {
      const f: any = (window as any).fbq;
      if (f) f("track", event, params || {});
      if (import.meta.env.DEV) console.log("[Meta Pixel] (deferred)", event, params);
    }, 800);
    return;
  }
  fn("track", event, params || {});
  if (import.meta.env.DEV) console.log("[Meta Pixel] track", event, params);
}
