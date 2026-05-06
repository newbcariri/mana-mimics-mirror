import { supabase } from "@/integrations/supabase/client";

export async function postPaymentApi<T>(action: "pix" | "card" | "order-summary", body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "https://mana-mimics-mirror.lovable.app";
  const response = await fetch(`${API_BASE}/api/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || text || "Erro ao processar pagamento");
  }

  return payload as T;
}