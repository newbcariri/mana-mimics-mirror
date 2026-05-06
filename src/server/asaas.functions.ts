import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachAuthHeader } from "./auth-client-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ASAAS_BASE = "https://api.asaas.com/v3";

async function asaas(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada");
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
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

export const createPixCharge = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Fetch the order
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (oErr || !order) throw new Error("Pedido não encontrado");
    if (order.user_id !== userId) throw new Error("Não autorizado");

    // Sum sibling orders from same checkout (within 5s window)
    const ts = new Date(order.created_at).getTime();
    const { data: siblings } = await supabaseAdmin
      .from("orders")
      .select("id, total, asaas_payment_id, created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(ts - 5000).toISOString())
      .lte("created_at", new Date(ts + 5000).toISOString());

    const group = siblings && siblings.length > 0 ? siblings : [order];
    const totalValue = group.reduce((s, x) => s + Number(x.total), 0);

    // If already has charge, just fetch QR code
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

    // Get profile
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, cpf, phone")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Perfil não encontrado");

    const customerId = await getOrCreateCustomer(profile as any);

    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

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

    // Save payment id on every order in this checkout group
    const ids = group.map((g) => g.id);
    await supabaseAdmin
      .from("orders")
      .update({ asaas_payment_id: payment.id })
      .in("id", ids);

    return {
      qrCodeBase64: qr.encodedImage as string,
      payload: qr.payload as string,
      value: totalValue,
      expirationDate: qr.expirationDate as string | undefined,
      paymentId: payment.id as string,
    };
  });

export const getOrderSummary = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: order, error } = await supabaseAdmin
      .from("orders").select("*").eq("id", data.orderId).single();
    if (error || !order) throw new Error("Pedido não encontrado");
    if (order.user_id !== userId) throw new Error("Não autorizado");

    const ts = new Date(order.created_at).getTime();
    const { data: siblings } = await supabaseAdmin
      .from("orders")
      .select("id, total, created_at, status, asaas_payment_id")
      .eq("user_id", userId)
      .gte("created_at", new Date(ts - 5000).toISOString())
      .lte("created_at", new Date(ts + 5000).toISOString());

    const group = siblings && siblings.length > 0 ? siblings : [order];
    const totalValue = group.reduce((s, x) => s + Number(x.total), 0);
    return {
      total: totalValue,
      status: order.status as string,
      hasCharge: !!order.asaas_payment_id,
    };
  });

export const createCardCharge = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .inputValidator((data: {
    orderId: string;
    installmentCount: number;
    remoteIp: string;
    card: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    holder: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode: string;
      addressNumber: string;
      phone: string;
    };
  }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders").select("*").eq("id", data.orderId).single();
    if (oErr || !order) throw new Error("Pedido não encontrado");
    if (order.user_id !== userId) throw new Error("Não autorizado");

    const ts = new Date(order.created_at).getTime();
    const { data: siblings } = await supabaseAdmin
      .from("orders")
      .select("id, total, asaas_payment_id, created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(ts - 5000).toISOString())
      .lte("created_at", new Date(ts + 5000).toISOString());

    const group = siblings && siblings.length > 0 ? siblings : [order];
    const totalValue = group.reduce((s, x) => s + Number(x.total), 0);

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles").select("full_name, email, cpf, phone")
      .eq("id", userId).single();
    if (pErr || !profile) throw new Error("Perfil não encontrado");

    const customerId = await getOrCreateCustomer(profile as any);
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const installmentCount = Math.max(1, Math.min(12, Math.floor(data.installmentCount || 1)));

    const body: any = {
      customer: customerId,
      billingType: "CREDIT_CARD",
      dueDate,
      description: `Pedido ${order.id.slice(0, 8).toUpperCase()}`,
      externalReference: order.id,
      remoteIp: data.remoteIp,
      creditCard: {
        holderName: data.card.holderName,
        number: data.card.number.replace(/\s/g, ""),
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

    const payment = await asaas("/payments", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const paymentId = payment.id as string;
    const status = payment.status as string;

    // Confirmed/received → mark all sibling orders paid
    const ids = group.map((g) => g.id);
    const isPaid = status === "CONFIRMED" || status === "RECEIVED";
    await supabaseAdmin
      .from("orders")
      .update({
        asaas_payment_id: paymentId,
        ...(isPaid ? { status: "pago" } : {}),
      })
      .in("id", ids);

    return {
      paymentId,
      status,
      paid: isPaid,
      installmentCount,
      value: totalValue,
    };
  });
