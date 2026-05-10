import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { User, MapPin, Save, ChevronLeft, CheckCircle2 } from "lucide-react";
import { maskCEP, maskCPF, maskPhone, onlyDigits } from "@/lib/checkout-utils";

export const Route = createFileRoute("/minha-conta")({
  component: MyAccountPage,
  head: () => ({ meta: [{ title: "Minha Conta — FlexFit Brasil" }] }),
});

function MyAccountPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>({
    full_name: "", email: "", cpf: "", phone: "", cep: "",
    street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/conta" }); return; }
      setUserId(session.user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (data) setProfile({ ...profile, ...data });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const lookupCep = async (rawCep: string) => {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado"); return; }
      setProfile((p: any) => ({
        ...p,
        street: data.logradouro || p.street,
        neighborhood: data.bairro || p.neighborhood,
        city: data.localidade || p.city,
        state: data.uf || p.state,
      }));
    } catch { toast.error("Erro ao buscar CEP"); }
    finally { setCepLoading(false); }
  };

  const update = (k: string, v: string) => {
    let val = v;
    if (k === "cep") val = maskCEP(v);
    else if (k === "phone") val = maskPhone(v);
    setProfile((p: any) => ({ ...p, [k]: val }));
  };

  const save = async () => {
    if (!userId) return;
    if (!profile.full_name?.trim()) return toast.error("Informe seu nome");
    if (onlyDigits(profile.phone || "").length < 10) return toast.error("Telefone inválido");
    if (onlyDigits(profile.cep || "").length !== 8) return toast.error("CEP inválido");
    if (!profile.number?.trim()) return toast.error("Informe o número da residência");

    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: profile.full_name,
        phone: onlyDigits(profile.phone),
        cep: onlyDigits(profile.cep),
        street: profile.street || null,
        number: profile.number,
        complement: profile.complement || null,
        neighborhood: profile.neighborhood || null,
        city: profile.city || null,
        state: profile.state || null,
      } as any).eq("id", userId);
      if (error) throw error;
      toast.success("Dados atualizados");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="text-center py-20 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/pedidos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-3xl font-bold mb-1">Minha Conta</h1>
        <p className="text-sm text-muted-foreground mb-6">Gerencie seus dados pessoais e endereço de entrega.</p>

        <section className="border border-border rounded-xl p-5 bg-card mb-5">
          <h2 className="font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Dados pessoais</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome completo" value={profile.full_name} onChange={(v) => update("full_name", v)} />
            <Field label="E-mail" value={profile.email} onChange={() => {}} disabled />
            <Field label="CPF" value={profile.cpf ? maskCPF(profile.cpf) : ""} onChange={() => {}} disabled />
            <Field label="Telefone" value={profile.phone ? maskPhone(profile.phone) : ""} onChange={(v) => update("phone", v)} />
          </div>
        </section>

        <section className="border border-border rounded-xl p-5 bg-card mb-5">
          <h2 className="font-bold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Endereço de entrega</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Field label="CEP" value={profile.cep ? maskCEP(profile.cep) : ""} onChange={(v) => { update("cep", v); if (onlyDigits(v).length === 8) lookupCep(v); }} />
              {cepLoading && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
            </div>
            <div className="sm:col-span-2">
              <Field label="Rua / Logradouro" value={profile.street || ""} onChange={(v) => update("street", v)} />
            </div>
            <Field label="Número" value={profile.number || ""} onChange={(v) => update("number", v)} />
            <div className="sm:col-span-2">
              <Field label="Complemento (opcional)" value={profile.complement || ""} onChange={(v) => update("complement", v)} />
            </div>
            <Field label="Bairro" value={profile.neighborhood || ""} onChange={(v) => update("neighborhood", v)} />
            <Field label="Cidade" value={profile.city || ""} onChange={(v) => update("city", v)} />
            <Field label="UF" value={profile.state || ""} onChange={(v) => update("state", v.toUpperCase().slice(0, 2))} />
          </div>
          <div className="mt-3 text-xs text-success flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Este é o endereço usado por padrão no checkout.
          </div>
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full sm:w-auto h-12 px-6 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 w-full h-11 px-3 border border-border rounded-md text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted/40 disabled:cursor-not-allowed"
      />
    </div>
  );
}
