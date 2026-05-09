import { useState } from "react";
import { Truck, Loader2, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export function ShippingCalc({ freeShipping }: { freeShipping: boolean }) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<ViaCepResponse | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const digits = cep.replace(/\D/g, "");
    setError(null);
    setAddress(null);
    if (digits.length !== 8) {
      setError("CEP inválido. Digite os 8 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data: ViaCepResponse = await res.json();
      if (data.erro) {
        setError("CEP não encontrado. Verifique e tente novamente.");
      } else {
        setAddress(data);
      }
    } catch {
      setError("Não foi possível consultar o CEP. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Calcule o frete</span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          inputMode="numeric"
          maxLength={9}
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          className="flex-1 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="00000-000"
          aria-label="CEP"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 bg-foreground text-background rounded-md font-semibold text-sm disabled:opacity-60 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
        </button>
      </form>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {address && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-start gap-2 text-foreground/80">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              Entrega para: <strong>{address.localidade}/{address.uf}</strong>
              {address.bairro ? <span className="text-muted-foreground"> · {address.bairro}</span> : null}
            </span>
          </div>
          {freeShipping ? (
            <div className="flex items-center gap-2 text-success font-semibold bg-success/10 rounded-md px-3 py-2">
              <CheckCircle2 className="w-4 h-4" />
              🚚 Frete grátis aplicado na compra de 2 ou mais conjuntos
            </div>
          ) : (
            <div className="flex items-center justify-between bg-muted/60 rounded-md px-3 py-2">
              <span className="text-muted-foreground">Frete padrão</span>
              <strong className="text-foreground">R$ 19,90</strong>
            </div>
          )}
          <div className="text-xs text-muted-foreground">Prazo estimado: 7 a 15 dias úteis</div>
        </div>
      )}
    </div>
  );
}
