import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const ASAAS_BASE = "https://api.asaas.com/v3";

type Order = Database["public"]["Tables"]["orders"]["Row"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function getServerEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurada`);
  return value;
}

function createSupabaseAdmin() {
  return createClient<Database>(getServerEnv("SUPABASE_URL"), getServerEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function requireUserId(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Não autorizado");

  const supabase = createClient<Database>(
    getServerEnv("SUPABASE_URL"),
    getServerEnv("SUPABASE_PUBLISHABLE_KEY"),
    {
      global: { headers: { Authorization: authHeader } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Não autorizado");
  return data.claims.sub;
}

async function asaas(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: getServerEnv("ASAAS_API_KEY"),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = body?.errors?.[0]?.description || body?.message || `Asaas ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

async function getOrCreateCustomer(profile: { full_name: string; email: string; cpf: string; phone: string }) {
  const cpf = profile.cpf.replace(/\D/g, "");
  const found = await asaas(`/customers?cpfCnpj=${cpf}`);
  if (found?.data?.[0]?.id) return found.data[0].id;
  const created = await asaas("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: profile.full_name,
      email: profile.email,
      cpfCnpj: cpf,
      mobilePhone: profile.phone.replace(/\D/g, ""),
    }),
  });
  return created.id;
}

async function getOrderGroup(orderId: string, userId: string) {
  const supabaseAdmin = createSupabaseAdmin();
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error("Pedido não encontrado");
  if (order.user_id !== userId) throw new Error("Não autorizado");

  const ts = new Date(order.created_at).getTime();
  const { data: siblings } = await supabaseAdmin
    .from("orders")
    .select("id, total, asaas_payment_id, created_at, status")
    .eq("user_id", userId)
    .gte("created_at", new Date(ts - 5000).toISOString())
    .lte("created_at", new Date(ts + 5000).toISOString());

  const group = (siblings && siblings.length > 0 ? siblings : [order]) as Pick<Order, "id" | "total" | "asaas_payment_id" | "created_at" | "status">[];
  const totalValue = group.reduce((sum, item) => sum + Number(item.total), 0);
  return { order, group, totalValue };
}

async function getProfile(userId: string) {
  const supabaseAdmin = createSupabaseAdmin();
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email, cpf, phone, cep")
    .eq("id", userId)
    .single();
  if (error || !profile) throw new Error("Perfil não encontrado");
  return profile;
}

async function handleOrderSummary(data: any, userId: string) {
  const { order, totalValue } = await getOrderGroup(data.orderId, userId);
  return { total: totalValue, status: order.status as string, hasCharge: !!order.asaas_payment_id };
}

async function handlePix(data: any, userId: string) {
  const supabaseAdmin = createSupabaseAdmin();
  const { order, group, totalValue } = await getOrderGroup(data.orderId, userId);
  if (order.asaas_payment_id) {
    const qr = await asaas(`/payments/${order.asaas_payment_id}/pixQrCode`);
    return {
      qrCodeBase64: qr.encodedImage as string,
      payload: qr.payload as string,
      value: totalValue,
      expirationDate: qr.expirationDate as string | undefined,
      paymentId: order.asaas_payment_id as string,
    };
  }

  const profile = await getProfile(userId);
  const customerId = await getOrCreateCustomer(profile);
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const payment = await asaas("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: Number(totalValue.toFixed(2)),
      dueDate,
      description: `Pedido ${order.id.slice(0, 8).toUpperCase()}`,
      externalReference: order.id,
    }),
  });
  const qr = await asaas(`/payments/${payment.id}/pixQrCode`);
  await supabaseAdmin.from("orders").update({ asaas_payment_id: payment.id }).in("id", group.map((item) => item.id));
  return {
    qrCodeBase64: qr.encodedImage as string,
    payload: qr.payload as string,
    value: totalValue,
    expirationDate: qr.expirationDate as string | undefined,
    paymentId: payment.id as string,
  };
}

async function handleCard(data: any, userId: string) {
  const supabaseAdmin = createSupabaseAdmin();
  const { order, group, totalValue } = await getOrderGroup(data.orderId, userId);
  const profile = await getProfile(userId);
  const customerId = await getOrCreateCustomer(profile);
  const installmentCount = Math.max(1, Math.min(12, Math.floor(data.installmentCount || 1)));
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const body: any = {
    customer: customerId,
    billingType: "CREDIT_CARD",
    dueDate,
    description: `Pedido ${order.id.slice(0, 8).toUpperCase()}`,
    externalReference: order.id,
    remoteIp: data.remoteIp || "0.0.0.0",
    creditCard: {
      holderName: data.card.holderName,
      number: String(data.card.number).replace(/\s/g, ""),
      expiryMonth: data.card.expiryMonth,
      expiryYear: data.card.expiryYear.length === 2 ? `20${data.card.expiryYear}` : data.card.expiryYear,
      ccv: data.card.ccv,
    },
    creditCardHolderInfo: {
      name: data.holder.name,
      email: data.holder.email,
      cpfCnpj: data.holder.cpfCnpj.replace(/\D/g, ""),
      postalCode: data.holder.postalCode.replace(/\D/g, ""),
      addressNumber: data.holder.addressNumber || "0",
      phone: data.holder.phone.replace(/\D/g, ""),
    },
  };
  if (installmentCount > 1) {
    body.installmentCount = installmentCount;
    body.totalValue = Number(totalValue.toFixed(2));
  } else {
    body.value = Number(totalValue.toFixed(2));
  }
  const payment = await asaas("/payments", { method: "POST", body: JSON.stringify(body) });
  const isPaid = payment.status === "CONFIRMED" || payment.status === "RECEIVED";
  await supabaseAdmin
    .from("orders")
    .update({ asaas_payment_id: payment.id, ...(isPaid ? { status: "pago" } : {}) })
    .in("id", group.map((item) => item.id));
  return { paymentId: payment.id as string, status: payment.status as string, paid: isPaid, installmentCount, value: totalValue };
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const action = params._splat;
          const data = await request.json();
          const userId = await requireUserId(request);
          if (action === "pix") return json(await handlePix(data, userId));
          if (action === "card") return json(await handleCard(data, userId));
          if (action === "order-summary") return json(await handleOrderSummary(data, userId));
          return json({ error: "Endpoint não encontrado" }, 404);
        } catch (error: any) {
          const message = error?.message || "Erro interno";
          return json({ error: message }, message === "Não autorizado" ? 401 : 500);
        }
      },
    },
  },
});