"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";
import type { RevealedItem } from "@/lib/types";
import { ItemRenderer } from "@/components/items/ItemRenderer";

type Props = {
  items: RevealedItem[];
  openedAt: string;
};

const TILTS = [-3.5, 1.8, -1.2, 3.1, -2.4, 2.7, -0.8];

export function EnvelopeSpread({ items, openedAt }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [focusedItem, setFocusedItem] = useState<RevealedItem | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = rootRef.current?.querySelectorAll<HTMLElement>("[data-spread-card]");
    if (!cards?.length) return;
    gsap.fromTo(
      cards,
      { y: 30, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out", stagger: 0.1, delay: 0.15 },
    );
  }, []);

  // Animate lightbox in/out
  useEffect(() => {
    const el = lightboxRef.current;
    if (!el) return;
    if (focusedItem) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: "power2.out" });
      gsap.fromTo(
        el.querySelector("[data-lightbox-card]"),
        { scale: 0.88, y: 20 },
        { scale: 1, y: 0, duration: 0.28, ease: "back.out(1.6)" },
      );
    }
  }, [focusedItem]);

  const closeLightbox = () => {
    const el = lightboxRef.current;
    if (!el) { setFocusedItem(null); return; }
    gsap.to(el, { opacity: 0, duration: 0.18, onComplete: () => setFocusedItem(null) });
  };

  const formattedDate = new Date(openedAt).toLocaleDateString(undefined, {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <>
      <div ref={rootRef}>
        <div className="text-center mb-10" style={{ color: "var(--color-muted)", fontSize: 13 }}>
          <span
            className="inline-block px-3 py-1 rounded-full border text-xs uppercase tracking-widest"
            style={{ borderColor: "var(--color-muted)" }}
          >
            Opened {formattedDate}
          </span>
        </div>

        <div className="mb-10 flex justify-center" data-spread-card>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/opened.png"
            alt="Opened envelope"
            width={360}
            height={360}
            draggable={false}
            style={{
              width: "min(360px, 82vw)",
              height: "auto",
              filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.18))",
            }}
          />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {items.map((item, i) => (
            <button
              type="button"
              key={item.id}
              data-spread-card
              aria-label={`View ${item.type} fullscreen`}
              onClick={() => setFocusedItem(item)}
              style={{
                transform: `rotate(${TILTS[i % TILTS.length]}deg)`,
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "zoom-in",
              }}
            >
              <ItemRenderer item={item} />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {focusedItem && (
        <div
          ref={lightboxRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 16px",
          }}
          onClick={closeLightbox}
        >
          {/* Stop clicks on the card itself from closing */}
          <div
            data-lightbox-card
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", maxWidth: 560, width: "100%" }}
          >
            <ItemRenderer item={focusedItem} />
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
    </>
  );
}
