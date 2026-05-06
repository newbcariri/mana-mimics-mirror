import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cart, useCart, cartTotal } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ShieldCheck, Lock, Mail, User as UserIcon, Tag, Clock, BadgeCheck, CreditCard, Star, Truck, Package } from "lucide-react";
import { maskCPF, maskPhone, maskCEP, onlyDigits } from "@/lib/checkout-utils";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout Seguro — FlexFit Brasil" }] }),
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const signupSchema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().refine(v => onlyDigits(v).length >= 10, "Telefone inválido"),
  cep: z.string().refine(v => onlyDigits(v).length === 8, "CEP deve ter 8 dígitos"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
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
  const _unitPrices: number[] = [];
  items.forEach(i => { for (let k = 0; k < i.quantity; k++) _unitPrices.push(i.unitPrice); });
  _unitPrices.sort((a, b) => b - a);
  const _pairs = Math.floor(_unitPrices.length / 2);
  const _leftover = _unitPrices.slice(_pairs * 2).reduce((s, v) => s + v, 0);
  const subtotal = _pairs > 0 ? _pairs * 109 + _leftover : subtotalRaw;
  const comboActive = totalQty >= 2;
  const shipping = comboActive ? 0 : subtotalRaw >= 199.9 ? 0 : 19.9;

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
  const [payment, setPayment] = useState<"pix" | "cartao">("pix");
  const [checking, setChecking] = useState(true);
  const [placing, setPlacing] = useState(false);

  // PIX has 5% extra discount
  const pixDiscount = useMemo(() => payment === "pix" ? Math.round((subtotal - couponDiscount) * 0.05 * 100) / 100 : 0, [payment, subtotal, couponDiscount]);
  const total = Math.max(0, subtotal - couponDiscount - pixDiscount + shipping);

  // auth form
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authLoading, setAuthLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", cep: "", password: "" });
  const [cpfFinal, setCpfFinal] = useState("");

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

  const update = (k: string, v: string) => {
    let val = v;
    if (k === "cpf") val = maskCPF(v);
    else if (k === "phone") val = maskPhone(v);
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
      if (authMode === "signup") {
        const data = signupSchema.parse(form);
        const { data: auth, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (auth.user) {
          const { error: pErr } = await supabase.from("profiles").insert({
            id: auth.user.id,
            full_name: data.full_name,
            email: data.email,
            cpf: "",
            phone: onlyDigits(data.phone),
            cep: onlyDigits(data.cep),
          });
          if (pErr) throw pErr;
        }
        toast.success("Conta criada! Continue sua compra.");
        await loadSession();
      } else {
        const data = loginSchema.parse(form);
        const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
        if (error) throw error;
        toast.success("Bem-vinda de volta!");
        await loadSession();
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || "Erro ao processar";
      toast.error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const placeOrder = async () => {
    if (items.length === 0) { toast.error("Carrinho vazio"); return; }
    if (!userId || !profile) return;
    if (!number.trim()) { toast.error("Informe o número do endereço"); return; }
    const needsCpf = !profile.cpf || onlyDigits(profile.cpf).length !== 11;
    if (needsCpf && onlyDigits(cpfFinal).length !== 11) {
      toast.error("Informe seu CPF para finalizar (necessário para nota fiscal)");
      return;
    }
    setPlacing(true);
    try {
      if (needsCpf) {
        await supabase.from("profiles").update({ cpf: onlyDigits(cpfFinal) }).eq("id", userId);
      }
      const rawLineTotals = items.map(i => i.unitPrice * i.quantity);
      const rawSum = rawLineTotals.reduce((s, v) => s + v, 0) || 1;
      // Apply combo + coupon + pix discount proportionally
      const finalGoodsTotal = subtotal - couponDiscount - pixDiscount;
      const lineTotals = rawLineTotals.map(v => Math.round((v / rawSum) * finalGoodsTotal * 100) / 100);
      const drift = Math.round((finalGoodsTotal - lineTotals.reduce((s, v) => s + v, 0)) * 100) / 100;
      if (lineTotals.length > 0) lineTotals[lineTotals.length - 1] = Math.round((lineTotals[lineTotals.length - 1] + drift) * 100) / 100;

      const inserts = items.map((i, idx) => ({
        user_id: userId,
        product_name: i.productName,
        color: i.color,
        top_size: i.topSize,
        legging_size: i.legSize,
        quantity: i.quantity,
        total: lineTotals[idx],
        payment_method: payment,
        shipping_cep: profile.cep,
        shipping_address: [address, number && `nº ${number}`, complement].filter(Boolean).join(", ") || null,
      }));
      const { data: inserted, error } = await supabase.from("orders").insert(inserts).select("id");
      if (error) throw error;
      cart.clear();
      toast.success("Pedido criado!");
      if (inserted && inserted[0]) {
        if (payment === "pix") navigate({ to: "/pix/$orderId", params: { orderId: inserted[0].id } });
        else navigate({ to: "/cartao/$orderId", params: { orderId: inserted[0].id } });
      } else navigate({ to: "/pedidos" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar pedido");
    } finally { setPlacing(false); }
  };

  if (checking) return <div className="min-h-screen bg-background"><SiteHeader /><div className="text-center py-20 text-muted-foreground">Carregando...</div></div>;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader />
        <div className="max-w-md mx-auto py-20 text-center">
          <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
          <Link to="/" className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-semibold">Voltar à loja</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const isAuthed = !!userId && !!profile;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <SiteHeader />

      {/* Urgency bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold">
          <Clock className="w-4 h-4" />
          Promoção termina em <span className="font-mono tabular-nums bg-white/15 px-2 py-0.5 rounded">{promoTime}</span>
        </div>
      </div>

      {/* Social proof bar */}
      <div className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] sm:text-xs">
          <span className="flex items-center gap-1 font-semibold">
            <span className="flex">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
            </span>
            <span className="ml-1">4.8/5</span>
            <span className="text-muted-foreground font-normal">(2.143 avaliações)</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground"><Package className="w-3.5 h-3.5 text-success" /> <strong className="text-foreground">+3.000</strong> pedidos entregues</span>
          <span className="flex items-center gap-1 text-muted-foreground"><Truck className="w-3.5 h-3.5 text-success" /> Frete grátis acima de R$ 199</span>
          <span className="flex items-center gap-1 text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5 text-success" /> Compra 100% segura</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
        <h1 className="text-2xl lg:text-3xl font-bold mb-1">Finalizar compra</h1>
        <p className="text-xs lg:text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <Lock className="w-4 h-4 text-success" /> Pagamento protegido · SSL 256-bit · Dados criptografados
        </p>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
          {/* LEFT */}
          <div className="space-y-5">
            {!isAuthed ? (
              <section className="border border-border rounded-xl p-5 lg:p-6 bg-card">
                <h2 className="font-bold mb-4 flex items-center gap-2"><UserIcon className="w-5 h-5 text-primary" />Identificação</h2>
                <div className="flex bg-muted rounded-lg p-1 mb-5">
                  <button type="button" onClick={() => setAuthMode("signup")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}>Sou novo cliente</button>
                  <button type="button" onClick={() => setAuthMode("login")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === "login" ? "bg-background shadow" : "text-muted-foreground"}`}>Já tenho conta</button>
                </div>
                <form onSubmit={handleAuth} className="space-y-3">
                  {authMode === "signup" && (
                    <Field icon={UserIcon} placeholder="Nome completo" value={form.full_name} onChange={v => update("full_name", v)} valid={form.full_name.trim().length >= 3} />
                  )}
                  <Field icon={Mail} type="email" placeholder="E-mail" value={form.email} onChange={v => update("email", v)} valid={/.+@.+\..+/.test(form.email)} />
                  {authMode === "signup" && (
                    <>
                      <Field placeholder="Telefone (com DDD)" value={form.phone} onChange={v => update("phone", v)} valid={onlyDigits(form.phone).length >= 10} />
                      <Field placeholder="CEP de entrega" value={form.cep} onChange={v => update("cep", v)} valid={onlyDigits(form.cep).length === 8} />
                      {cepLoading && <p className="text-xs text-muted-foreground">Buscando endereço...</p>}
                      {cepData && (
                        <p className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {cepData.logradouro}, {cepData.bairro} — {cepData.localidade}/{cepData.uf}
                        </p>
                      )}
                    </>
                  )}
                  <Field icon={Lock} type="password" placeholder="Senha" value={form.password} onChange={v => update("password", v)} valid={form.password.length >= 8} />
                  <button disabled={authLoading} type="submit" className="w-full h-12 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 disabled:opacity-50 transition">
                    {authLoading ? "Processando..." : authMode === "signup" ? "CONTINUAR" : "ENTRAR E CONTINUAR"}
                  </button>
                </form>
              </section>
            ) : (
              <>
                <section className="border border-border rounded-xl p-5 lg:p-6 bg-card">
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

                <section className="border border-border rounded-xl p-5 lg:p-6 bg-card">
                  <h2 className="font-bold mb-4">Endereço de entrega</h2>
                  {cepLoading && <p className="text-xs text-muted-foreground mb-2">Buscando endereço pelo CEP...</p>}
                  {cepData && (
                    <div className="bg-success/10 border border-success/20 rounded-md p-3 mb-3 text-sm flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium">{cepData.logradouro}</div>
                        <div className="text-muted-foreground text-xs">{cepData.bairro} — {cepData.localidade}/{cepData.uf}</div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <input value={number} onChange={e => setNumber(e.target.value)} placeholder="Número" className="h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    <input value={complement} onChange={e => setComplement(e.target.value)} placeholder="Complemento (opcional)" className="col-span-2 h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                </section>

                <section className="border border-border rounded-xl p-5 lg:p-6 bg-card">
                  <h2 className="font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Forma de pagamento</h2>

                  {/* Tabs */}
                  <div className="flex border-b border-border mb-5">
                    <button type="button" onClick={() => setPayment("pix")} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${payment === "pix" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-10 h-6 rounded bg-pix text-white text-[10px] font-bold">PIX</span>
                        PIX
                      </span>
                    </button>
                    <button type="button" onClick={() => setPayment("cartao")} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${payment === "cartao" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Cartão
                      </span>
                    </button>
                  </div>

                  {payment === "pix" ? (
                    <div className="bg-pix/5 border border-pix/20 rounded-lg p-4 text-sm">
                      <div className="font-semibold mb-1 text-foreground">Pagamento instantâneo e seguro</div>
                      <p className="text-muted-foreground text-xs">5% de desconto · aprovação imediata. O QR Code será gerado na próxima etapa.</p>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-4 text-sm">
                      <div className="font-semibold mb-1">Cartão de crédito</div>
                      <p className="text-muted-foreground text-xs">Em até 12x sem juros · Visa, Master, Elo e Amex. Os dados do cartão são preenchidos na próxima etapa.</p>
                    </div>
                  )}
                </section>

                {/* Trust badges */}
                <section className="grid grid-cols-3 gap-3 text-center">
                  <TrustBadge icon={ShieldCheck} title="Compra Segura" subtitle="Garantia total" />
                  <TrustBadge icon={Lock} title="SSL Seguro" subtitle="Criptografia 256-bit" />
                  <TrustBadge icon={BadgeCheck} title="Dados Protegidos" subtitle="LGPD compliance" />
                </section>
              </>
            )}
          </div>

          {/* RIGHT — sticky summary */}
          <aside className="bg-card border border-border rounded-xl p-5 lg:p-6 h-fit lg:sticky lg:top-24 space-y-4 shadow-sm">
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
                    <div className="text-xs text-muted-foreground">{i.color} · T:{i.topSize}/L:{i.legSize}</div>
                  </div>
                  <div className="font-semibold whitespace-nowrap">{brl(i.unitPrice * i.quantity)}</div>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="border-t border-border pt-3">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2"><Tag className="w-3 h-3" /> Cupom de desconto</label>
              <div className="flex gap-2">
                <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="DIGITE O CUPOM" className="flex-1 h-10 px-3 border border-border rounded-md text-sm outline-none focus:border-primary uppercase" disabled={!!couponApplied} />
                {couponApplied ? (
                  <button onClick={() => { setCouponApplied(null); setCoupon(""); }} className="px-3 h-10 text-xs font-semibold text-destructive border border-border rounded-md hover:bg-muted">Remover</button>
                ) : (
                  <button onClick={applyCoupon} className="px-4 h-10 text-xs font-bold text-primary border border-primary rounded-md hover:bg-primary/5">APLICAR</button>
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
                {payment === "cartao" && <div className="text-[11px] text-muted-foreground">ou 12x de {brl(total / 12)}</div>}
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
        <div className="fixed lg:hidden bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-40 shadow-2xl">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-primary">{brl(total)}</span>
          </div>
          <button onClick={placeOrder} disabled={placing} className="w-full h-12 bg-success text-success-foreground rounded-md font-bold hover:bg-success/90 disabled:opacity-50 flex items-center justify-center gap-2">
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
    <div className="border border-border rounded-lg p-3 bg-card">
      <Icon className="w-5 h-5 text-success mx-auto mb-1" />
      <div className="text-[11px] font-bold">{title}</div>
      <div className="text-[10px] text-muted-foreground">{subtitle}</div>
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
        className={`w-full h-12 ${Icon ? "pl-10" : "pl-4"} ${showCheck ? "pr-10" : "pr-4"} border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 transition ${showCheck ? "border-success" : "border-border focus:border-primary"}`}
      />
      {showCheck && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />}
    </div>
  );
}
