import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

const PIXEL_ID = "2469959593452830";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    __metaPixelLoaded?: boolean;
    __metaPixelLastPath?: string | null;
    __metaPixelUnsub?: () => void;
    __gaLastPath?: string | null;
  }
}

const GA_ID = "G-SXL0L3Q6CJ";

function trackPageView(path: string, fullPath: string) {
  if (typeof window === "undefined") return;

  if (window.__metaPixelLastPath !== path) {
    window.__metaPixelLastPath = path;
    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView");
      if (import.meta.env.DEV) console.log("[Meta Pixel] PageView:", path);
    }
  }

  if (window.__gaLastPath !== fullPath) {
    window.__gaLastPath = fullPath;
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: fullPath,
        page_location: window.location.href,
        page_title: typeof document !== "undefined" ? document.title : undefined,
        send_to: GA_ID,
      });
      if (import.meta.env.DEV) console.log("[GA4] page_view:", fullPath);
    }
  }
}

/**
 * O script base do Pixel é injetado no <head> via __root.tsx (head().scripts).
 * Aqui apenas rastreamos PageView em mudanças de rota client-side (SPA).
 */
export function MetaPixel() {
  const router = useRouter();

  useEffect(() => {
    if (window.__metaPixelUnsub) return;
    const unsub = router.subscribe("onResolved", ({ toLocation }) => {
      trackPageView(toLocation.pathname, toLocation.pathname + (toLocation.searchStr || ""));
    });
    window.__metaPixelUnsub = unsub;
  }, [router]);

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
