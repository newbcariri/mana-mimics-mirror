export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
}

export function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskCardNumber(v: string) {
  const d = onlyDigits(v).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function maskExp(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export type CardBrand = "visa" | "mastercard" | "amex" | "elo" | "hipercard" | "diners" | "discover" | "unknown";

export function detectBrand(num: string): CardBrand {
  const n = onlyDigits(num);
  if (!n) return "unknown";
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(n)) return "elo";
  if (/^(606282|3841)/.test(n)) return "hipercard";
  if (/^(36|30[0-5]|3095|38|39)/.test(n)) return "diners";
  if (/^(6011|65|64[4-9])/.test(n)) return "discover";
  return "unknown";
}

export function luhnValid(num: string) {
  const d = onlyDigits(num);
  if (d.length < 13) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function brandLabel(b: CardBrand): string {
  return b === "unknown" ? "" : b.charAt(0).toUpperCase() + b.slice(1);
}
