import { ShieldCheck } from "lucide-react";

const BANKS: { name: string; bg: string; fg: string; short: string }[] = [
  { name: "Nubank", bg: "#8A05BE", fg: "#ffffff", short: "Nu" },
  { name: "Itaú", bg: "#EC7000", fg: "#0033A0", short: "Itaú" },
  { name: "Banco do Brasil", bg: "#FAE128", fg: "#0033A0", short: "BB" },
  { name: "Caixa", bg: "#0070AF", fg: "#F39200", short: "CAIXA" },
  { name: "Bradesco", bg: "#CC092F", fg: "#ffffff", short: "Bradesco" },
  { name: "Santander", bg: "#EC0000", fg: "#ffffff", short: "Santander" },
];

export function PixBanksTrust({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-success mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">
            Pagamento via PIX seguro
          </p>
          <p className="text-xs text-muted-foreground">
            Pague com seu banco favorito.
          </p>
        </div>
      </div>

      <div className={`flex ${compact ? "gap-1.5 overflow-x-auto" : "flex-wrap gap-2"}`}>
        {BANKS.map((b) => (
          <div
            key={b.name}
            title={b.name}
            className="flex items-center justify-center h-8 px-2.5 rounded-md text-[11px] font-bold shadow-sm shrink-0"
            style={{ backgroundColor: b.bg, color: b.fg }}
          >
            {b.short}
          </div>
        ))}
        <div className="flex items-center justify-center h-8 px-2.5 rounded-md bg-background border border-border text-[11px] font-semibold text-muted-foreground shrink-0">
          +outros
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-2.5 text-center">
        Compatível com todos os bancos via PIX
      </p>
    </div>
  );
}
