import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";

export type GalleryItem = { type: "video" | "image"; src: string };

type Props = {
  items: GalleryItem[];
  alt?: string;
  badge?: string;
};

export function ProductGallery({ items, alt = "", badge }: Props) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // Sync swipe (scroll) -> active
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isSyncing.current) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== active && i >= 0 && i < items.length) setActive(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [active, items.length]);

  // Sync active -> scroll position (when thumbnail clicked)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const target = active * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 4) {
      isSyncing.current = true;
      el.scrollTo({ left: target, behavior: "smooth" });
      window.setTimeout(() => (isSyncing.current = false), 400);
    }
  }, [active]);

  const go = (dir: 1 | -1) => {
    setActive(a => (a + dir + items.length) % items.length);
  };

  // Keyboard nav inside zoom
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoom]);

  return (
    <div className="flex flex-col gap-3 items-center w-full">
      {/* Main viewport — swipeable on mobile */}
      <div
        className="relative w-full max-w-[480px] mx-auto rounded-[18px] overflow-hidden shadow-xl bg-white"
        style={{ aspectRatio: "1 / 1" }}
      >
        {badge && (
          <span className="absolute top-3 left-3 z-20 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {badge}
          </span>
        )}

        <div
          ref={trackRef}
          className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((m, i) => (
            <div
              key={i}
              className="relative shrink-0 w-full h-full snap-center flex items-center justify-center bg-white"
            >
              {m.type === "video" ? (
                <video
                  src={m.src}
                  autoPlay={i === active}
                  loop
                  muted
                  playsInline
                  controls
                  preload={i === active ? "auto" : "metadata"}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setZoom(true)}
                  className="w-full h-full flex items-center justify-center cursor-zoom-in"
                  aria-label="Ampliar imagem"
                >
                  <img
                    src={m.src}
                    alt={alt}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="max-w-full max-h-full object-contain"
                  />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Arrows (desktop) */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Próxima"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots (mobile) */}
        {items.length > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 z-10 sm:hidden">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-primary" : "w-1.5 bg-white/70"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-5 gap-2 w-full max-w-[480px]">
        {items.map((m, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Ver mídia ${i + 1}`}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 bg-white transition-all ${
              active === i ? "border-primary shadow-md ring-2 ring-primary/30" : "border-border hover:border-foreground/40"
            }`}
          >
            {m.type === "video" ? (
              <>
                <video
                  src={m.src}
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover bg-black"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <Play className="w-5 h-5 text-white fill-white" />
                </span>
              </>
            ) : (
              <img
                src={m.src}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-contain p-1"
              />
            )}
          </button>
        ))}
      </div>

      {/* Zoom modal (images only) */}
      {zoom && items[active].type === "image" && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setZoom(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(false); }}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
          {items.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                aria-label="Anterior"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); go(1); }}
                aria-label="Próxima"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={items[active].src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
