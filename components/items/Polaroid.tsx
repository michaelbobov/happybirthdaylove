"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { TextBlock } from "@/lib/types";

type Props = {
  src: string;
  caption?: string;
  rotate?: number;
  textBlocks?: TextBlock[];
  filter?: string;
  fit?: string;
};

export function Polaroid({ src, caption, rotate = -3, textBlocks = [], filter = "none", fit = "cover" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { y: -120, rotation: rotate * 3, opacity: 0, scale: 1.1 },
      { y: 0, rotation: rotate, opacity: 1, scale: 1, duration: 0.9, ease: "back.out(1.4)" },
    );
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      gsap.to(el, {
        rotationY: dx * 10,
        rotationX: -dy * 10,
        duration: 0.4,
        ease: "power2.out",
      });
    };
    const onLeave = () => {
      gsap.to(el, { rotationY: 0, rotationX: 0, duration: 0.5, ease: "power2.out" });
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [rotate]);

  return (
    <div
      ref={ref}
      className="inline-block bg-white p-3 pb-14 relative"
      style={{
        boxShadow: "0 20px 40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)",
        transformStyle: "preserve-3d",
      }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption ?? ""}
          className="block"
          style={{
            width: 280,
            height: fit === "contain" ? 220 : 230,
            objectFit: fit === "contain" ? "contain" : "cover",
            background: "#f6f0e4",
            filter: photoFilterCss(filter),
          }}
        />
        {textBlocks.map((block) => (
          <div
            key={block.id}
            style={{
              position: "absolute",
              left: `${block.x}%`,
              top: `${block.y}%`,
              transform: "translate(-50%, -50%)",
              maxWidth: "88%",
              textAlign: "center",
              fontFamily: block.fontFamily,
              fontSize: block.fontSize,
              color: block.color,
              fontWeight: block.bold ? 700 : 400,
              fontStyle: block.italic ? "italic" : "normal",
              lineHeight: 1.15,
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              textShadow: "0 1px 5px rgba(0,0,0,0.55)",
              pointerEvents: "none",
            }}
          >
            {block.text}
          </div>
        ))}
      </div>
      {caption ? (
        <div
          className="absolute left-0 right-0 bottom-3 text-center font-hand text-xl"
          style={{ color: "#2a2a2a" }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
}

export function photoFilterCss(filter: string | undefined) {
  switch (filter) {
    case "warm":
      return "sepia(0.18) saturate(1.12) contrast(1.04)";
    case "mono":
      return "grayscale(1) contrast(1.08)";
    case "dreamy":
      return "saturate(0.82) contrast(0.95) brightness(1.08)";
    case "vivid":
      return "saturate(1.28) contrast(1.08)";
    default:
      return "saturate(0.9) contrast(1.05)";
  }
}
