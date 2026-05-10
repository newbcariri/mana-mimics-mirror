import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User as UserIcon, MapPin, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/conta")({
  component: AccountPage,
  head: () => ({ meta: [{ title: "Minha Conta — FlexFit Brasil" }] }),
});

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const signupSchema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  cpf: z.string().refine(v => onlyDigits(v).length === 11, "CPF deve ter 11 dígitos"),
  phone: z.string().refine(v => onlyDigits(v).length >= 10, "Telefone inválido"),
  cep: z.string().refine(v => onlyDigits(v).length === 8, "CEP deve ter 8 dígitos"),
  number: z.string().trim().min(1, "Informe o número da residência"),
  complement: z.string().optional(),
  street: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function AccountPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    cpf: "",
    phone: "",
    cep: "",
    number: "",
    complement: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
    password: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/pedidos" });
    });
  }, [navigate]);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const lookupCep = async (rawCep: string) => {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado"); return; }
      setForm(f => ({
        ...f,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));
    } catch { toast.error("Erro ao buscar CEP"); }
    finally { setCepLoading(false); }
  };

  useEffect(() => { if (onlyDigits(form.cep).length === 8) lookupCep(form.cep); }, [form.cep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
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
            street: data.street || null,
            number: data.number,
            complement: data.complement || null,
            neighborhood: data.neighborhood || null,
            city: data.city || null,
            state: data.state || null,
          } as any);
          if (pErr) throw pErr;
        }
        toast.success("Conta criada com sucesso!");
        navigate({ to: "/checkout" });
      } else {
        const data = loginSchema.parse(form);
        const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
        if (error) throw error;
        toast.success("Bem-vinda de volta!");
        navigate({ to: "/pedidos" });
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || "Erro ao processar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex bg-muted rounded-lg p-1 mb-6">
            <button onClick={() => setMode("login")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${mode === "login" ? "bg-background shadow" : "text-muted-foreground"}`}>Entrar</button>
            <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}>Criar conta</button>
          </div>

          <h1 className="text-2xl font-bold mb-1">{mode === "login" ? "Acessar minha conta" : "Crie sua conta"}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" ? "Acompanhe seus pedidos e histórico." : "Cadastre-se para finalizar a compra."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field icon={UserIcon} placeholder="Nome completo" value={form.full_name} onChange={v => update("full_name", v)} />
            )}
            <Field icon={Mail} type="email" placeholder="E-mail" value={form.email} onChange={v => update("email", v)} />
            {mode === "signup" && (
              <>
                <Field placeholder="CPF" value={form.cpf} onChange={v => update("cpf", v)} />
                <Field placeholder="Telefone (com DDD)" value={form.phone} onChange={v => update("phone", v)} />
                <Field placeholder="CEP de entrega" value={form.cep} onChange={v => update("cep", v)} />
                {cepLoading && <p className="text-xs text-muted-foreground">Buscando endereço...</p>}
                {form.street && (
                  <div className="bg-success/10 border border-success/20 rounded-md p-3 text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">{form.street}</div>
                      <div className="text-muted-foreground text-xs">{form.neighborhood} — {form.city}/{form.state}</div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Field placeholder="Número" value={form.number} onChange={v => update("number", v)} />
                  <div className="col-span-2">
                    <Field placeholder="Complemento (opcional)" value={form.complement} onChange={v => update("complement", v)} />
                  </div>
                </div>
              </>
            )}
            <Field icon={Lock} type="password" placeholder="Senha (mínimo 6 caracteres)" value={form.password} onChange={v => update("password", v)} />

            <button disabled={loading} type="submit" className="w-full h-12 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Processando..." : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            <Link to="/" className="hover:text-primary">← Voltar para a loja</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
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
