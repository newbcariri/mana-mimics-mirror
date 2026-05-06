import { Link } from "@tanstack/react-router";
import { User, ShoppingBag, Package, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";

// Promo deadline: 1 day and 17 hours from the moment the user first loads the site (persisted)
function getPromoDeadline() {
  if (typeof window === "undefined") return Date.now() + (1 * 24 + 17) * 3600 * 1000;
  const KEY = "promo_deadline_v1";
  const stored = window.localStorage.getItem(KEY);
  if (stored) {
    const n = parseInt(stored, 10);
    if (!Number.isNaN(n) && n > Date.now()) return n;
  }
  const deadline = Date.now() + (1 * 24 + 17) * 3600 * 1000;
  window.localStorage.setItem(KEY, String(deadline));
  return deadline;
}

function useCountdown() {
  const [mounted, setMounted] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const d = getPromoDeadline();
    setDeadline(d);
    setNow(Date.now());
    setMounted(true);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, deadline - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, mounted };
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="bg-background/15 rounded px-1.5 py-0.5 text-sm sm:text-base font-bold tabular-nums min-w-[2ch] text-center">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[8px] sm:text-[9px] uppercase tracking-wider mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

export function SiteHeader() {
  const items = useCart();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const { days, hours, minutes, seconds, mounted } = useCountdown();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="bg-foreground text-background">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 sm:gap-4 text-center">
          <Clock className="w-4 h-4 shrink-0 text-primary" />
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide">Promoção termina em</span>
          <div className="flex items-center gap-1.5 sm:gap-2" suppressHydrationWarning>
            {mounted ? (
              <>
                <CountdownBox value={days} label="dias" />
                <span className="font-bold opacity-60">:</span>
                <CountdownBox value={hours} label="hrs" />
                <span className="font-bold opacity-60">:</span>
                <CountdownBox value={minutes} label="min" />
                <span className="font-bold opacity-60">:</span>
                <CountdownBox value={seconds} label="seg" />
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="font-display font-extrabold text-xl sm:text-2xl tracking-tight">
            <span className="text-primary">FLEX</span>FIT
          </div>
          <span className="hidden sm:block text-[9px] uppercase tracking-[0.2em] text-muted-foreground border-l border-border pl-2">Brasil<br/>Fitness Wear</span>
        </Link>
        <div className="flex items-center gap-4 ml-auto">
          {authed ? (
            <Link to="/pedidos" className="flex items-center gap-2 text-sm hover:text-primary">
              <Package className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-semibold">Meus Pedidos</span>
            </Link>
          ) : (
            <Link to="/conta" className="flex items-center gap-2 text-sm hover:text-primary">
              <User className="w-5 h-5" />
              <span className="hidden sm:inline text-xs"><span className="font-semibold">Entre</span> ou <span className="font-semibold">Cadastre-se</span></span>
            </Link>
          )}
          <Link to="/carrinho" className="relative flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 text-xs font-semibold hover:bg-primary/90">
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">MEU CARRINHO</span>
            <span className="absolute -top-1 -right-1 bg-foreground text-background w-5 h-5 rounded-full text-[10px] flex items-center justify-center">{count}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
