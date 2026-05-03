import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cart, useCart, cartTotal } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ShieldCheck, Lock, Mail, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — FlexFit Brasil" }] }),
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const onlyDigits = (s: string) => s.replace(/\D/g, "");

const signupSchema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  cpf: z.string().refine(v => onlyDigits(v).length === 11, "CPF deve ter 11 dígitos"),
  phone: z.string().refine(v => onlyDigits(v).length >= 10, "Telefone inválido"),
  cep: z.string().refine(v => onlyDigits(v).length === 8, "CEP deve ter 8 dígitos"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCart();
  const subtotal = cartTotal(items);
  const shipping = subtotal >= 199.9 ? 0 : 19.9;
  const total = subtotal + shipping;

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

  // auth form
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authLoading, setAuthLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", cpf: "", phone: "", cep: "", password: "" });

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

  useEffect(() => {
    loadSession();
  }, []);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const lookupCep = async (rawCep: string) => {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        setCepData(null);
        return;
      }
      setCepData(data);
      setAddress(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  // Auto-lookup when authed profile loads
  useEffect(() => {
    if (profile?.cep && !cepData) lookupCep(profile.cep);
  }, [profile]);

  // Auto-lookup signup CEP when 8 digits typed
  useEffect(() => {
    if (onlyDigits(form.cep).length === 8) lookupCep(form.cep);
  }, [form.cep]);

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
            cpf: onlyDigits(data.cpf),
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
    setPlacing(true);
    try {
      const inserts = items.map(i => ({
        user_id: userId,
        product_name: i.productName,
        color: i.color,
        top_size: i.topSize,
        legging_size: i.legSize,
        quantity: i.quantity,
        total: i.unitPrice * i.quantity,
        payment_method: payment,
        shipping_cep: profile.cep,
        shipping_address: address || null,
      }));
      const { error } = await supabase.from("orders").insert(inserts);
      if (error) throw error;
      cart.clear();
      toast.success("Pedido realizado com sucesso!");
      navigate({ to: "/pedidos" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar pedido");
    } finally {
      setPlacing(false);
    }
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
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Finalizar compra</h1>
        <p className="text-sm text-muted-foreground mb-8 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Ambiente 100% seguro e criptografado
        </p>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {!isAuthed ? (
              <section className="border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">1. Identificação</h2>
                </div>
                <div className="flex bg-muted rounded-lg p-1 mb-5">
                  <button type="button" onClick={() => setAuthMode("signup")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}>Sou novo cliente</button>
                  <button type="button" onClick={() => setAuthMode("login")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === "login" ? "bg-background shadow" : "text-muted-foreground"}`}>Já tenho conta</button>
                </div>
                <form onSubmit={handleAuth} className="space-y-3">
                  {authMode === "signup" && (
                    <Field icon={UserIcon} placeholder="Nome completo" value={form.full_name} onChange={v => update("full_name", v)} />
                  )}
                  <Field icon={Mail} type="email" placeholder="E-mail" value={form.email} onChange={v => update("email", v)} />
                  {authMode === "signup" && (
                    <>
                      <Field placeholder="CPF" value={form.cpf} onChange={v => update("cpf", v)} />
                      <Field placeholder="Telefone (com DDD)" value={form.phone} onChange={v => update("phone", v)} />
                      <Field placeholder="CEP de entrega" value={form.cep} onChange={v => update("cep", v)} />
                    </>
                  )}
                  <Field icon={Lock} type="password" placeholder="Senha" value={form.password} onChange={v => update("password", v)} />
                  <button disabled={authLoading} type="submit" className="w-full h-12 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 disabled:opacity-50">
                    {authLoading ? "Processando..." : authMode === "signup" ? "CONTINUAR" : "ENTRAR E CONTINUAR"}
                  </button>
                </form>
              </section>
            ) : (
              <>
                <section className="border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-success" />Seus dados</h2>
                    <span className="text-xs text-success">Confirmado</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <Info label="Nome" value={profile?.full_name} />
                    <Info label="E-mail" value={profile?.email} />
                    <Info label="CPF" value={profile?.cpf} />
                    <Info label="Telefone" value={profile?.phone} />
                    <Info label="CEP" value={profile?.cep} />
                  </div>
                </section>

                <section className="border border-border rounded-xl p-6">
                  <h2 className="font-bold mb-3">Endereço de entrega</h2>
                  <input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Rua, número, complemento, bairro, cidade/UF"
                    className="w-full h-12 px-4 border border-border rounded-md text-sm outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Entrega para o CEP <strong>{profile?.cep}</strong></p>
                </section>

                <section className="border border-border rounded-xl p-6">
                  <h2 className="font-bold mb-4">Forma de pagamento</h2>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer ${payment === "pix" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input type="radio" checked={payment === "pix"} onChange={() => setPayment("pix")} className="sr-only" />
                      <span className="inline-flex items-center justify-center w-12 h-7 rounded bg-pix text-white text-[10px] font-bold">PIX</span>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">PIX</div>
                        <div className="text-xs text-muted-foreground">5% de desconto · aprovação imediata</div>
                      </div>
                      <div className="font-bold text-primary">{brl(total)}</div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer ${payment === "cartao" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input type="radio" checked={payment === "cartao"} onChange={() => setPayment("cartao")} className="sr-only" />
                      <div className="w-12 h-7 rounded bg-foreground text-background text-[10px] font-bold flex items-center justify-center">CARD</div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">Cartão de crédito</div>
                        <div className="text-xs text-muted-foreground">Em até 12x sem juros</div>
                      </div>
                    </label>
                  </div>
                </section>
              </>
            )}
          </div>

          <aside className="bg-muted/40 rounded-xl p-6 h-fit sticky top-32 space-y-4">
            <h2 className="font-bold">Resumo</h2>
            <div className="space-y-3 max-h-64 overflow-auto">
              {items.map(i => (
                <div key={i.id} className="flex gap-3 text-sm">
                  <img src={i.image} alt="" className="w-14 h-18 object-cover rounded bg-background" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{i.productName}</div>
                    <div className="text-xs text-muted-foreground">{i.color} · T:{i.topSize}/L:{i.legSize} · x{i.quantity}</div>
                  </div>
                  <div className="font-semibold">{brl(i.unitPrice * i.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{shipping === 0 ? <span className="text-success font-semibold">Grátis</span> : brl(shipping)}</span></div>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-baseline">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">{brl(total)}</span>
            </div>
            <button onClick={placeOrder} disabled={placing || !isAuthed} className="w-full h-12 bg-success text-success-foreground rounded-md font-bold hover:bg-success/90 disabled:opacity-50">
              {placing ? "Processando..." : isAuthed ? "CONFIRMAR PEDIDO" : "Identifique-se para continuar"}
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <ShieldCheck className="w-4 h-4 text-success" /> Compra protegida
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
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

function Field({ icon: Icon, type = "text", placeholder, value, onChange }: { icon?: any; type?: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full h-12 ${Icon ? "pl-10" : "pl-4"} pr-4 border border-border rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20`}
      />
    </div>
  );
}
