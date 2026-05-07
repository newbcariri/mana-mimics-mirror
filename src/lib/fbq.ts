// Helpers para Meta Pixel (fbq) com deduplicação.
// - Eventos comuns: dedupe por sessionStorage (uma vez por sessão).
// - Purchase: dedupe por localStorage (persiste entre refresh / abas).

type FbqEvent =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase";

const SESSION_KEY = "flexfit_fbq_sent";
const PERSIST_KEY = "flexfit_fbq_sent_persist";

function readMap(storage: Storage | null, key: string): Record<string, true> {
  if (!storage) return {};
  try {
    return JSON.parse(storage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function writeMap(storage: Storage | null, key: string, m: Record<string, true>) {
  if (!storage) return;
  try { storage.setItem(key, JSON.stringify(m)); } catch {}
}

function getStorage(persist: boolean): Storage | null {
  if (typeof window === "undefined") return null;
  return persist ? window.localStorage : window.sessionStorage;
}

function getKey(persist: boolean) {
  return persist ? PERSIST_KEY : SESSION_KEY;
}

function isSent(dedupeKey: string, persist: boolean) {
  const map = readMap(getStorage(persist), getKey(persist));
  return !!map[dedupeKey];
}

function markSent(dedupeKey: string, persist: boolean) {
  const storage = getStorage(persist);
  const key = getKey(persist);
  const map = readMap(storage, key);
  map[dedupeKey] = true;
  writeMap(storage, key, map);
}

export type FbqOptions = {
  /** Chave de deduplicação. Se já enviada, ignora. */
  dedupeKey?: string;
  /** Persiste a deduplicação entre refresh/abas (use para Purchase). */
  persist?: boolean;
  /** eventID para correspondência com Conversion API (server-side). */
  eventID?: string;
};

export function fbqTrack(
  event: FbqEvent,
  params?: Record<string, unknown>,
  options?: FbqOptions | string,
) {
  if (typeof window === "undefined") return;
  const opts: FbqOptions =
    typeof options === "string" ? { dedupeKey: options } : (options || {});

  if (opts.dedupeKey && isSent(opts.dedupeKey, !!opts.persist)) return;

  const send = () => {
    const fn: any = (window as any).fbq;
    if (!fn) return false;
    if (opts.eventID) {
      fn("track", event, params || {}, { eventID: opts.eventID });
    } else {
      fn("track", event, params || {});
    }
    if (import.meta.env.DEV) {
      console.log("[Meta Pixel] track", event, params, opts.eventID ? { eventID: opts.eventID } : "");
    }
    return true;
  };

  const ok = send();
  if (!ok) {
    // Pixel ainda não carregou — tenta novamente.
    setTimeout(() => { send(); }, 1000);
  }

  if (opts.dedupeKey) markSent(opts.dedupeKey, !!opts.persist);
}
