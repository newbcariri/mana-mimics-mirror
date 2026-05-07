import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";

const PIXEL_ID = "1902524127096818";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

function loadPixel() {
  if (typeof window === "undefined") return;
  if (window.fbq) return;

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

  window.fbq("init", PIXEL_ID);
  if (import.meta.env.DEV) {
    console.log("[Meta Pixel] loaded with ID:", PIXEL_ID);
  }
}

export function MetaPixel() {
  const router = useRouter();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    loadPixel();

    const trackPageView = (path: string) => {
      if (lastPath.current === path) return;
      lastPath.current = path;
      window.fbq?.("track", "PageView");
      if (import.meta.env.DEV) {
        console.log("[Meta Pixel] PageView:", path);
      }
    };

    trackPageView(window.location.pathname);

    const unsub = router.subscribe("onResolved", ({ toLocation }) => {
      trackPageView(toLocation.pathname);
    });

    return () => {
      unsub();
    };
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
