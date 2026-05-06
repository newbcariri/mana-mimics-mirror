import { useEffect, useState, useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  productName: string;
  color: string;
  topSize: string;
  legSize: string;
  quantity: number;
  unitPrice: number;
  image: string;
};

const KEY = "flexfit_cart";
let items: CartItem[] = [];
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch { items = []; }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach(l => l());
}

let loaded = false;
function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    load();
    loaded = true;
  }
}

export const cart = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  getSnapshot() { ensureLoaded(); return items; },
  add(item: Omit<CartItem, "id">) {
    ensureLoaded();
    const id = `${item.productName}-${item.color}-${item.topSize}-${item.legSize}`;
    const existing = items.find(i => i.id === id);
    if (existing) existing.quantity += item.quantity;
    else items = [...items, { ...item, id }];
    persist();
  },
  remove(id: string) {
    ensureLoaded();
    items = items.filter(i => i.id !== id);
    persist();
  },
  setQty(id: string, qty: number) {
    ensureLoaded();
    items = items.map(i => i.id === id ? { ...i, quantity: Math.max(1, qty) } : i);
    persist();
  },
  clear() { items = []; persist(); },
};

const EMPTY: CartItem[] = [];
export function useCart() {
  const snapshot = useSyncExternalStore(cart.subscribe, cart.getSnapshot, () => EMPTY);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated ? snapshot : EMPTY;
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
}
