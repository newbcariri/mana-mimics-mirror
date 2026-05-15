import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { PixBanksTrust } from "@/components/pix-banks-trust";
import { SiteFooter } from "@/components/site-footer";
import { cart, useCart, cartTotal } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ShieldCheck, Lock, Mail, User as UserIcon, Tag, BadgeCheck, CreditCard, Star, Truck, Package } from "lucide-react";
import { maskPhone, maskCEP, onlyDigits } from "@/lib/checkout-utils";
import { fbqTrack } from "@/lib/fbq";
import { sendWebhookEvent } from "@/lib/webhook";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout Seguro — Casa Resolve" }] }),
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const guestSchema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(100),
  email: z.string().trim().max(255).optional().or(z.literal("")).refine(v => !v || /.+@.+\..+/.test(v), "E-mail inválido"),
  phone: z.string().refine(v => onlyDigits(v).length >= 10, "Telefone inválido"),
  cep: z.string().refine(v => onlyDigits(v).length === 8, "CEP deve ter 8 dígitos"),
  number: z.string().trim().min(1, "Informe o número"),
});

// Promo countdown — 30 min from first visit (per session)
function usePromoTimer() {
  const [remaining, setRemaining] = useState(30 * 60);
  useEffect(() => {
    const KEY = "flexfit_promo_deadline";
    let dl = Number(sessionStorage.getItem(KEY));
    if (!dl || dl < Date.now()) {
      dl = Date.now() + 30 * 60 * 1000;
      sessionStorage.setItem(KEY, String(dl));
    }
    const tick = () => setRemaining(Math.max(0, Math.floor((dl - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCart();
  const promoTime = usePromoTimer();

  const subtotalRaw = cartTotal(items);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = subtotalRaw;
  const comboActive = false;
  const shipping = 0;

  // Coupon
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);
  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (code === "FLEX10") {
      const discount = Math.round(subtotal * 0.10 * 100) / 100;
      setCouponApplied({ code, discount });
      toast.success("Cupom aplicado! 10% de desconto");
    } else {
      toast.error("Cupom inválido");
    }
  };
  const couponDiscount = couponApplied?.discount ?? 0;

  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [cepData, setCepData] = useState<{ logradouro?: string; bairro?: string; localidade?: string; uf?: string } | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const payment = "pix" as const;
  const [checking, setChecking] = useState(true);
  const [placing, setPlacing] = useState(false);

  // No PIX discount: combo price is already the final price
  const pixDiscount = 0;
  const total = Math.max(0, subtotal - couponDiscount + shipping);

  // guest checkout form
  const [authLoading, setAuthLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", cep: "", number: "", complement: "" });

  const loadSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(data);
    } else {
      setUserId(null);
      setProfile(null);
    }
    setChecking(false);
  };

  useEffect(() => { loadSession(); }, []);

  // InitiateCheckout — uma vez por sessão quando o carrinho não está vazio
  useEffect(() => {
    if (items.length === 0) return;
    const productNames = items.map(i => i.productName).join(", ");
    fbqTrack(
      "InitiateCheckout",
      {
        content_name: productNames,
        content_type: "product",
        currency: "BRL",
        value: subtotalRaw,
        num_items: totalQty,
      },
      "initiatecheckout",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const update = (k: string, v: string) => {
    let val = v;
    if (k === "phone") val = maskPhone(v);
    else if (k === "cep") val = maskCEP(v);
    setForm(f => ({ ...f, [k]: val }));
  };

  const lookupCep = async (rawCep: string) => {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado"); setCepData(null); return; }
      setCepData(data);
      setAddress(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
    } catch { toast.error("Erro ao buscar CEP"); }
    finally { setCepLoading(false); }
  };

  useEffect(() => { if (profile?.cep && !cepData) lookupCep(profile.cep); }, [profile]);
  useEffect(() => { if (onlyDigits(form.cep).length === 8) lookupCep(form.cep); }, [form.cep]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const data = guestSchema.parse(form);
      // Guest checkout — sign in anonymously to get a user_id for the order
      const { data: auth, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      const uid = auth.user?.id;
      if (!uid) throw new Error("Falha ao iniciar sessão de compra");

      const { error: pErr } = await supabase.from("profiles").insert({
        id: uid,
        full_name: data.full_name,
        email: data.email || null,
        phone: onlyDigits(data.phone),
        cep: onlyDigits(data.cep),
        number: data.number,
        complement: form.complement || null,
      } as any);
      if (pErr) throw pErr;
      if (data.number) setNumber(data.number);
      if (form.complement) setComplement(form.complement);
      await loadSession();
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || "Erro ao processar";
      toast.error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Prefill número/complemento a partir do perfil quando disponível
  useEffect(() => {
    if (profile) {
      if (profile.number && !number) setNumber(profile.number);
      if (profile.complement && !complement) setComplement(profile.complement);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const placeOrder = async () => {
    if (items.length === 0) { toast.error("Carrinho vazio"); return; }
    if (!userId || !profile) return;
    if (!number.trim()) { toast.error("Informe o número do endereço"); return; }
    setPlacing(true);
    try {
      // Atualiza perfil com endereço se necessário
      const profileUpdate: any = {};
      if (number && profile.number !== number) profileUpdate.number = number;
      if (complement !== (profile.complement || "")) profileUpdate.complement = complement || null;
      if (cepData) {
        if (!profile.street && cepData.logradouro) profileUpdate.street = cepData.logradouro;
        if (!profile.neighborhood && cepData.bairro) profileUpdate.neighborhood = cepData.bairro;
        if (!profile.city && cepData.localidade) profileUpdate.city = cepData.localidade;
        if (!profile.state && cepData.uf) profileUpdate.state = cepData.uf;
      }
      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate).eq("id", userId);
      }

      // Distribui o TOTAL FINAL proporcionalmente entre os itens (para auditoria),
      // mas o pedido é único.
      const rawLineTotals = items.map(i => i.unitPrice * i.quantity);
      const rawSum = rawLineTotals.reduce((s, v) => s + v, 0) || 1;
      const lineTotals = rawLineTotals.map(v => Math.round((v / rawSum) * subtotal * 100) / 100);
      const drift = Math.round((subtotal - lineTotals.reduce((s, v) => s + v, 0)) * 100) / 100;
      if (lineTotals.length > 0) lineTotals[lineTotals.length - 1] = Math.round((lineTotals[lineTotals.length - 1] + drift) * 100) / 100;

      const itemsCount = items.reduce((s, i) => s + i.quantity, 0);
      const firstItem = items[0];

      const { data: orderRow, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          // Compatibilidade com colunas antigas — guarda o primeiro item como resumo.
          product_name: firstItem.productName,
          color: firstItem.color,
          top_size: firstItem.topSize,
          legging_size: firstItem.legSize,
          quantity: itemsCount,
          subtotal,
          shipping,
          discount: couponDiscount,
          items_count: itemsCount,
          total,
          payment_method: payment,
          shipping_cep: profile.cep,
          shipping_address: cepData?.logradouro || profile.street || null,
          shipping_number: number,
          shipping_complement: complement || null,
          shipping_neighborhood: cepData?.bairro || profile.neighborhood || null,
          shipping_city: cepData?.localidade || profile.city || null,
          shipping_state: cepData?.uf || profile.state || null,
        } as any)
        .select("id")
        .single();
      if (orderErr || !orderRow) throw orderErr || new Error("Erro ao criar pedido");

      const orderId = orderRow.id as string;

      // Insere itens
      const itemsInsert = items.map((i, idx) => ({
        order_id: orderId,
        product_name: i.productName,
        color: i.color,
        top_size: i.topSize,
        legging_size: i.legSize,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        subtotal: lineTotals[idx],
        image: i.image || null,
      }));
      const { error: itemsErr } = await supabase.from("order_items" as any).insert(itemsInsert);
      if (itemsErr) console.error("order_items insert error", itemsErr);

      // Histórico inicial
      await supabase.from("order_history" as any).insert([
        { order_id: orderId, status: "criado", note: "Pedido criado" },
        { order_id: orderId, status: "aguardando_pagamento", note: "Aguardando pagamento" },
      ]);

      cart.clear();
      toast.success("Pedido criado!");
      sendWebhookEvent(
        {
          tipo_evento: "pedido_criado",
          produto: firstItem.productName,
          valor: Number(total.toFixed(2)),
          nome_cliente: profile?.full_name || form.full_name || "",
          telefone: profile?.phone || onlyDigits(form.phone) || "",
        },
        { dedupeKey: `pedido_criado:${orderId}` },
      );
      navigate({ to: "/pix/$orderId", params: { orderId } });
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar pedido");
    } finally { setPlacing(false); }
  };

  if (checking) return <div className="min-h-screen overflow-x-hidden bg-background"><SiteHeader /><div className="px-4 pt-8 pb-20 text-center text-muted-foreground">Carregando...</div></div>;

  if (items.length === 0) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-background"><SiteHeader />
        <div className="max-w-md mx-auto px-4 pt-8 pb-20 text-center">
          <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
          <Link to="/" className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-semibold">Voltar à loja</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const isAuthed = !!userId && !!profile;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-32 lg:pb-0">
      <SiteHeader />

      {/* Social proof bar */}
      <div className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-5 gap-y-1.5 text-[11px] sm:text-xs">
          <span className="hidden sm:flex items-center gap-1 font-semibold">
            <span className="flex">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
            </span>
            <span className="ml-1">4.8/5</span>
            <span className="text-muted-foreground font-normal">(2.143 avaliações)</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground whitespace-nowrap"><Package className="w-3.5 h-3.5 text-success" /> <strong className="text-foreground">+3.000</strong> entregues</span>
          <span className="hidden min-[380px]:flex items-center gap-1 text-muted-foreground whitespace-nowrap"><Truck className="w-3.5 h-3.5 text-success" /> Frete grátis</span>
          <span className="flex items-center gap-1 text-muted-foreground whitespace-nowrap"><ShieldCheck className="w-3.5 h-3.5 text-success" /> Compra 100% segura</span>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 pt-6 pb-6 lg:pt-10 lg:pb-10">
        <h1 className="text-2xl lg:text-3xl font-bold mb-1 mt-3 leading-tight">Finalizar compra</h1>
        <p className="text-xs lg:text-sm text-muted-foreground mb-5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Lock className="w-4 h-4 text-success shrink-0" /> <span>Pagamento protegido</span><span>·</span><span>Dados criptografados</span>
        </p>

        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_400px] gap-5 lg:gap-8">
          {/* LEFT */}
          <div className="min-w-0 space-y-4 lg:space-y-5">
            {!isAuthed ? (
              <section className="w-full max-w-full border border-border rounded-xl p-4 lg:p-6 bg-card">
                <h2 className="font-bold mb-1 flex items-center gap-2"><UserIcon className="w-5 h-5 text-primary" />Seus dados para entrega</h2>
                <p className="text-xs text-muted-foreground mb-4">Preencha e finalize — sem cadastro, sem senha.</p>
                <form onSubmit={handleAuth} className="space-y-3">
                  <Field icon={UserIcon} placeholder="Nome completo" value={form.full_name} onChange={v => update("full_name", v)} valid={form.full_name.trim().length >= 3} />
                  <Field icon={Mail} type="email" placeholder="E-mail (opcional)" value={form.email} onChange={v => update("email", v)} valid={form.email.length === 0 || /.+@.+\..+/.test(form.email)} />
                  <Field placeholder="Telefone (com DDD)" value={form.phone} onChange={v => update("phone", v)} valid={onlyDigits(form.phone).length >= 10} />
                  <Field placeholder="CEP de entrega" value={form.cep} onChange={v => update("cep", v)} valid={onlyDigits(form.cep).length === 8} />
                  {cepLoading && <p className="text-xs text-muted-foreground">Buscando endereço...</p>}
                  {cepData && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {cepData.logradouro}, {cepData.bairro} — {cepData.localidade}/{cepData.uf}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field placeholder="Número" value={form.number} onChange={v => update("number", v)} valid={form.number.trim().length > 0} />
                    <div className="sm:col-span-2">
                      <Field placeholder="Complemento (opcional)" value={form.complement} onChange={v => update("complement", v)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] sm:text-xs font-semibold text-muted-foreground pt-2">
                    <span className="flex items-center gap-1">🔒 Compra 100% segura</span>
                    <span className="flex items-center gap-1">🚚 Envio em até 24h</span>
                    <span className="flex items-center gap-1">💳 Pagamento protegido</span>
                  </div>

                  <button disabled={authLoading} type="submit" className="w-full h-12 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 disabled:opacity-50 transition">
                    {authLoading ? "Processando..." : "IR PARA PAGAMENTO"}
                  </button>
                  <p className="text-center text-xs text-muted-foreground">Você não precisa criar conta para comprar</p>
                </form>
              </section>
            ) : (
              <>
                <section className="w-full max-w-full border border-border rounded-xl p-4 lg:p-6 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-success" />Seus dados</h2>
                    <span className="text-[11px] text-success font-semibold uppercase tracking-wide">Confirmado</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <Info label="Nome" value={profile?.full_name} />
                    <Info label="E-mail" value={profile?.email} />
                    <Info label="Telefone" value={profile?.phone ? maskPhone(profile.phone) : ""} />
                    <Info label="CEP" value={profile?.cep ? maskCEP(profile.cep) : ""} />
                  </div>
                </section>

                <section className="w-full max-w-full border border-border rounded-xl p-4 lg:p-6 bg-card">
                  <h2 className="font-bold mb-4">Endereço de entrega</h2>
                  {cepLoading && <p className="text-xs text-muted-foreground mb-2">Buscando endereço pelo CEP...</p>}
                  {cepData && (
                    <div className="bg-success/10 border border-success/20 rounded-md p-3 mb-3 text-sm flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium">{cepData.logradouro}</div>
                        <div className="text-muted-foreground text-xs">{cepData.bairro} — {cepData.localidade}/{cepData.uf}</div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <input value={number} onChange={e => setNumber(e.target.value)} placeholder="Número" className="w-full min-w-0 h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    <input value={complement} onChange={e => setComplement(e.target.value)} placeholder="Complemento (opcional)" className="w-full min-w-0 sm:col-span-2 h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                </section>

                <section className="w-full max-w-full border border-border rounded-xl p-4 lg:p-6 bg-card">
                  <h2 className="font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Forma de pagamento</h2>

                  <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5 mb-4">
                    <span className="inline-flex items-center justify-center w-12 h-7 rounded bg-pix text-white text-[11px] font-bold">PIX</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">Pagamento via PIX</div>
                      <div className="text-[11px] text-muted-foreground">QR Code gerado na próxima etapa · Aprovação imediata</div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>

                  <div className="space-y-3">
                    <div className="bg-pix/5 border border-pix/20 rounded-lg p-4 text-sm">
                      <div className="font-semibold mb-1 text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-success" /> Pagamento instantâneo e seguro
                      </div>
                      <p className="text-muted-foreground text-xs">Após finalizar o pedido você verá o QR Code e o código copia-e-cola para pagar pelo seu banco.</p>
                    </div>
                    <PixBanksTrust compact />
                  </div>
                </section>

                {/* Trust badges */}
                <section className="grid grid-cols-1 min-[380px]:grid-cols-3 gap-2 sm:gap-3 text-center">
                  <TrustBadge icon={ShieldCheck} title="Compra 100% segura" subtitle="" />
                  <TrustBadge icon={Lock} title="Pagamento protegido" subtitle="" />
                  <TrustBadge icon={BadgeCheck} title="Dados criptografados" subtitle="" />
                </section>
              </>
            )}
          </div>

          {/* RIGHT — sticky summary */}
          <aside className="w-full max-w-full min-w-0 bg-card border border-border rounded-xl p-4 lg:p-6 h-fit lg:sticky lg:top-24 space-y-4 shadow-sm">
            <h2 className="font-bold flex items-center justify-between">
              Resumo do pedido
              <span className="text-[11px] text-success font-semibold flex items-center gap-1"><Lock className="w-3 h-3" /> Compra segura</span>
            </h2>

            <div className="space-y-3 max-h-72 overflow-auto pr-1">
              {items.map(i => (
                <div key={i.id} className="flex gap-3 text-sm">
                  <div className="relative shrink-0">
                    <img src={i.image} alt="" className="w-14 h-18 object-cover rounded bg-muted" />
                    <span className="absolute -top-1 -right-1 bg-foreground text-background text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{i.quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{i.productName}</div>
                    <div className="text-xs text-muted-foreground">Qtd: {i.quantity}</div>
                  </div>
                  <div className="font-semibold whitespace-nowrap">{brl(i.unitPrice * i.quantity)}</div>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="border-t border-border pt-3">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2"><Tag className="w-3 h-3" /> Cupom de desconto</label>
              <div className="flex gap-2 min-w-0">
                <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="DIGITE O CUPOM" className="min-w-0 flex-1 h-10 px-3 border border-border rounded-md text-sm outline-none focus:border-primary uppercase" disabled={!!couponApplied} />
                {couponApplied ? (
                  <button onClick={() => { setCouponApplied(null); setCoupon(""); }} className="shrink-0 px-3 h-10 text-xs font-semibold text-destructive border border-border rounded-md hover:bg-muted">Remover</button>
                ) : (
                  <button onClick={applyCoupon} className="shrink-0 px-3 sm:px-4 h-10 text-xs font-bold text-primary border border-primary rounded-md hover:bg-primary/5">APLICAR</button>
                )}
              </div>
              {couponApplied && (
                <p className="text-xs text-success mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Cupom <strong>{couponApplied.code}</strong> aplicado</p>
              )}
            </div>

            <div className="border-t border-border pt-3 space-y-1.5 text-sm">
              {comboActive && subtotalRaw !== subtotal && (
                <div className="flex justify-between text-success">
                  <span>Promoção (2 unidades)</span>
                  <span className="font-semibold">−{brl(subtotalRaw - subtotal)}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-success"><span>Cupom</span><span className="font-semibold">−{brl(couponDiscount)}</span></div>
              )}
              {pixDiscount > 0 && (
                <div className="flex justify-between text-success"><span>Desconto PIX (5%)</span><span className="font-semibold">−{brl(pixDiscount)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{shipping === 0 ? <span className="text-success font-semibold">Grátis</span> : brl(shipping)}</span></div>
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-baseline">
              <span className="font-semibold">Total</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{brl(total)}</div>
              </div>
            </div>

            <button onClick={placeOrder} disabled={placing || !isAuthed} className="hidden lg:flex w-full h-13 py-3.5 bg-success text-success-foreground rounded-md font-bold hover:bg-success/90 disabled:opacity-50 items-center justify-center gap-2 text-base shadow-md transition">
              {placing ? "Processando..." : isAuthed ? <>Finalizar Compra <Lock className="w-4 h-4" /></> : "Identifique-se para continuar"}
            </button>

            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <ShieldCheck className="w-4 h-4 text-success" /> Seus dados estão protegidos
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {isAuthed && (
        <div className="fixed lg:hidden bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-40 shadow-2xl pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-primary">{brl(total)}</span>
          </div>
          <button onClick={placeOrder} disabled={placing} className="w-full min-h-12 h-12 bg-success text-success-foreground rounded-md font-bold hover:bg-success/90 disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-md">
            {placing ? "Processando..." : <>Finalizar Compra <Lock className="w-4 h-4" /></>}
          </button>
        </div>
      )}

      <div className="hidden lg:block"><SiteFooter /></div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}

function TrustBadge({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="border border-border rounded-lg p-2.5 sm:p-3 bg-card">
      <Icon className="w-5 h-5 text-success mx-auto mb-1" />
      <div className="text-[11px] font-bold leading-tight">{title}</div>
      {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

function Field({ icon: Icon, type = "text", placeholder, value, onChange, valid }: { icon?: any; type?: string; placeholder: string; value: string; onChange: (v: string) => void; valid?: boolean }) {
  const showCheck = valid && value.length > 0;
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full min-w-0 h-12 ${Icon ? "pl-10" : "pl-4"} ${showCheck ? "pr-10" : "pr-4"} border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 transition ${showCheck ? "border-success" : "border-border focus:border-primary"}`}
      />
      {showCheck && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />}
    </div>
  );
}
