"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ItemRenderer } from "@/components/items/ItemRenderer";
import type { ThemeId } from "@/lib/themes";
import type { CollectionItem } from "@/app/api/collection/[token]/route";
import type { ItemType } from "@/lib/types";

const FILTER_LABELS: Record<string, string> = {
  all:        "All",
  text:       "Letters",
  image:      "Photos",
  gif:        "GIFs",
  giftcard:   "Gift cards",
  money_note: "Cash",
  audio:      "Voice",
};

type Props = {
  token: string;
  themeId: string;
  bundleTitle: string;
};

export function CollectionHub({ token, themeId, bundleTitle }: Props) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ItemType>("all");
  const [focused, setFocused] = useState<CollectionItem | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/collection/${token}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setLoading(false);
      });
  }, [token]);

  // Animate grid items on load or filter change
  useEffect(() => {
    if (loading) return;
    const cards = gridRef.current?.querySelectorAll<HTMLElement>("[data-collection-card]");
    if (!cards?.length) return;
    gsap.fromTo(
      cards,
      { y: 24, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "power3.out", stagger: 0.06 },
    );
  }, [loading, filter]);

  // Lightbox open animation
  useEffect(() => {
    const el = lightboxRef.current;
    if (!el || !focused) return;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
    gsap.fromTo(
      el.querySelector("[data-lb-inner]"),
      { scale: 0.88, y: 18 },
      { scale: 1, y: 0, duration: 0.28, ease: "back.out(1.5)" },
    );
  }, [focused]);

  const closeLightbox = () => {
    const el = lightboxRef.current;
    if (!el) { setFocused(null); return; }
    gsap.to(el, { opacity: 0, duration: 0.16, onComplete: () => setFocused(null) });
  };

  const availableTypes = Array.from(new Set(items.map((i) => i.type))) as ItemType[];
  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  // Group photos/polaroids into a visual gallery; everything else listed
  const photoTypes: ItemType[] = ["image", "gif"];
  const photos = filtered.filter((i) => photoTypes.includes(i.type));
  const others = filtered.filter((i) => !photoTypes.includes(i.type));

  return (
    <ThemeProvider themeId={themeId as ThemeId} as="main" className="app-screen paper grain flex-1 min-h-screen">
      <div className="mx-auto max-w-5xl px-6 pb-10">
        <Link
          href={`/b/${token}`}
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: "var(--color-muted)" }}
        >
          <ArrowLeft size={14} /> Back to bundle
        </Link>

        <div className="mt-6 text-center">
          <div className="text-xs uppercase tracking-[0.22em] mb-1" style={{ color: "var(--color-muted)" }}>
            Everything from
          </div>
          <h1 className="font-display text-4xl md:text-5xl" style={{ color: "var(--color-ink)" }}>
            {bundleTitle}
          </h1>
        </div>

        {/* Filter tabs */}
        {availableTypes.length > 1 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {(["all", ...availableTypes] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="rounded-full px-4 py-1.5 text-xs border transition-colors"
                style={{
                  background: filter === f ? "var(--color-ink)" : "transparent",
                  color: filter === f ? "var(--color-bg)" : "var(--color-ink)",
                  borderColor: "var(--color-ink)",
                }}
              >
                {FILTER_LABELS[f] ?? f}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="mt-20 text-center font-hand text-xl" style={{ color: "var(--color-muted)" }}>
            Opening your keepsakes…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="mt-20 text-center font-hand text-xl" style={{ color: "var(--color-muted)" }}>
            Nothing here yet — open an envelope first.
          </div>
        )}

        <div ref={gridRef}>
          {/* Photo gallery grid */}
          {photos.length > 0 && (
            <div className="mt-10">
              {filter === "all" && (
                <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-muted)" }}>
                  Photos
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-collection-card
                    aria-label={`View photo from ${item.envelopeTitle}`}
                    onClick={() => setFocused(item)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "zoom-in",
                      borderRadius: "var(--radius-md, 8px)",
                      overflow: "hidden",
                      aspectRatio: "1",
                      position: "relative",
                    }}
                  >
                    <PhotoThumbnail item={item} />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "6px 8px",
                        background: "linear-gradient(transparent, rgba(0,0,0,0.45))",
                        color: "#fff",
                        fontSize: 11,
                        textAlign: "left",
                        fontFamily: "var(--font-hand)",
                      }}
                    >
                      {item.envelopeTitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Other items as cards */}
          {others.length > 0 && (
            <div className="mt-10 flex flex-col gap-8 items-center">
              {filter === "all" && photos.length > 0 && (
                <div className="self-start text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                  Everything else
                </div>
              )}
              {others.map((item) => (
                <div
                  key={item.id}
                  data-collection-card
                  className="w-full"
                >
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-muted)" }}>
                    {item.envelopeTitle}
                  </div>
                  <ItemRenderer item={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for photos */}
      {focused && (
        <div
          ref={lightboxRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 16px",
          }}
          onClick={closeLightbox}
        >
          <div
            data-lb-inner
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", maxWidth: 580, width: "100%" }}
          >
            <ItemRenderer item={focused} />
            <div
              className="mt-2 text-center font-hand text-sm"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              from: {focused.envelopeTitle}
            </div>
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="Close"
              style={{
                position: "absolute",
                top: -16,
                right: -16,
                background: "rgba(0,0,0,0.55)",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}

function PhotoThumbnail({ item }: { item: CollectionItem }) {
  if (item.type === "image" && item.mediaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.mediaUrl}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  if (item.type === "gif" && item.payload.type === "gif") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.payload.url}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  // Fallback placeholder
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
      🖼
    </div>
  );
}
