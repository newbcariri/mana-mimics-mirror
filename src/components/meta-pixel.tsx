import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

const PIXEL_ID = "1902524127096818";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    __metaPixelLoaded?: boolean;
    __metaPixelLastPath?: string | null;
    __metaPixelUnsub?: () => void;
  }
}

function loadPixel() {
  if (typeof window === "undefined") return;
  if (window.__metaPixelLoaded) return;
  window.__metaPixelLoaded = true;

  /* eslint-disable */
  // @ts-ignore - Meta Pixel base code
  !(function (f: any, b, e, v, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  // Desabilita eventos automáticos do Pixel (clicks em botões viram "Subscribe", etc).
  // Precisa ser chamado ANTES do init para ter efeito.
  window.fbq("set", "autoConfig", false, PIXEL_ID);
  window.fbq("init", PIXEL_ID);
  if (import.meta.env.DEV) {
    console.log("[Meta Pixel] loaded with ID:", PIXEL_ID);
  }
}

function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  if (window.__metaPixelLastPath === path) return;
  window.__metaPixelLastPath = path;
  window.fbq?.("track", "PageView");
  if (import.meta.env.DEV) {
    console.log("[Meta Pixel] PageView:", path);
  }
}

export function MetaPixel() {
  const router = useRouter();

  useEffect(() => {
    loadPixel();
    trackPageView(window.location.pathname);

    // Garante uma única subscrição global mesmo com StrictMode/remounts.
    if (window.__metaPixelUnsub) return;
    const unsub = router.subscribe("onResolved", ({ toLocation }) => {
      trackPageView(toLocation.pathname);
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
