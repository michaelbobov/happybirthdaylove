"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ItemRenderer } from "@/components/items/ItemRenderer";
import type { CollectedItem } from "./page";
import type { ItemType } from "@/lib/types";

const FILTER_LABELS: Partial<Record<ItemType | "all", string>> = {
  all:        "Everything",
  text:       "Letters",
  image:      "Photos",
  gif:        "GIFs",
  giftcard:   "Gift cards",
  money_note: "Cash",
  audio:      "Voice",
};

export function GlobalCollection({ items }: { items: CollectedItem[] }) {
  const [filter, setFilter] = useState<"all" | ItemType>("all");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState<CollectedItem | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const availableTypes = Array.from(new Set(items.map((i) => i.type))) as ItemType[];
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = (filter === "all" ? items : items.filter((i) => i.type === filter)).filter((item) => {
    if (!normalizedQuery) return true;
    return [
      item.bundleTitle,
      item.envelopeTitle,
      item.type,
      new Date(item.openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });

  const photos = filtered.filter((i) => i.type === "image" || i.type === "gif");
  const others = filtered.filter((i) => i.type !== "image" && i.type !== "gif");

  // Animate cards whenever filter changes
  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll<HTMLElement>("[data-card]");
    if (!cards?.length) return;
    gsap.fromTo(
      cards,
      { y: 20, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "power3.out", stagger: 0.05 },
    );
  }, [filter, query]);

  // Lightbox entrance
  useEffect(() => {
    const el = lightboxRef.current;
    if (!el || !focused) return;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(
      el.querySelector("[data-lb-inner]"),
      { scale: 0.88, y: 16 },
      { scale: 1, y: 0, duration: 0.28, ease: "back.out(1.5)" },
    );
  }, [focused]);

  const closeLightbox = () => {
    const el = lightboxRef.current;
    if (!el) { setFocused(null); return; }
    gsap.to(el, { opacity: 0, duration: 0.16, onComplete: () => setFocused(null) });
  };

  return (
    <main className="app-screen flex-1 mx-auto max-w-5xl w-full px-6 pb-12">
      <Link
        href="/inbox"
        className="inline-flex items-center gap-2 text-sm"
        style={{ color: "var(--color-muted)" }}
      >
        <ArrowLeft size={14} /> Back to inbox
      </Link>

      <div className="mt-6">
        <h1 className="font-display text-4xl md:text-5xl" style={{ color: "var(--color-ink)" }}>
          Everything you&rsquo;ve received
        </h1>
        <p className="mt-2 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
          {items.length} {items.length === 1 ? "item" : "items"} across all your envelopes
        </p>
      </div>

      <div className="paper mt-6 rounded-[var(--radius-lg)] p-4" style={{ boxShadow: "0 8px 22px var(--color-shadow)" }}>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-muted)" }}>
          Find a Keepsake
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by bundle, envelope, or date…"
            className="rounded-full px-4 py-2.5 text-sm normal-case tracking-normal bg-white/70"
            style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
          />
        </label>
      </div>

      {/* Filter tabs */}
      {availableTypes.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
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

      <div ref={gridRef} className="mt-10">
        {/* Photo grid */}
        {photos.length > 0 && (
          <div>
            {filter === "all" && others.length > 0 && (
              <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-muted)" }}>
                Photos
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {photos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-card
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
                  <PhotoThumb item={item} />
                  {/* Bundle + envelope label */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "20px 8px 6px",
                      background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                      color: "#fff",
                      fontSize: 10,
                      textAlign: "left",
                      lineHeight: 1.3,
                    }}
                  >
                    <div style={{ opacity: 0.75 }}>{item.bundleTitle}</div>
                    <div>{item.envelopeTitle}</div>
                    <div style={{ opacity: 0.75 }}>
                      Opened {new Date(item.openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Non-photo items */}
        {others.length > 0 && (
          <div className={photos.length > 0 && filter === "all" ? "mt-12" : ""}>
            {filter === "all" && photos.length > 0 && (
              <div className="text-xs uppercase tracking-widest mb-6" style={{ color: "var(--color-muted)" }}>
                Letters & more
              </div>
            )}
            <div className="flex flex-col gap-10 items-center">
              {others.map((item) => (
                <div key={item.id} data-card className="w-full">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                      {item.envelopeTitle}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--color-muted)", opacity: 0.6 }}>
                      · {item.bundleTitle} · Opened {new Date(item.openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <ItemRenderer item={item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="py-20 text-center font-hand text-xl" style={{ color: "var(--color-muted)" }}>
            Nothing here yet.
          </div>
        )}
      </div>

      {/* Lightbox */}
      {focused && (
        <div
          ref={lightboxRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.82)",
            display: "flex",
            flexDirection: "column",
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
            <div className="mt-3 text-center" style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              {focused.envelopeTitle} · {focused.bundleTitle} ·{" "}
              <Link
                href={`/b/${focused.bundleToken}/e/${focused.envelopeId}`}
                className="underline"
                style={{ color: "rgba(255,255,255,0.55)" }}
                onClick={(e) => e.stopPropagation()}
              >
                view envelope
              </Link>
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
    </main>
  );
}

function PhotoThumb({ item }: { item: CollectedItem }) {
  if (item.type === "image" && item.mediaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.mediaUrl} alt="" draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    );
  }
  if (item.type === "gif" && item.payload.type === "gif") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.payload.url} alt="" draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    );
  }
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--color-surface)",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
      🖼
    </div>
  );
}
