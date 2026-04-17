"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type Props = {
  src: string;
  caption?: string;
  rotate?: number;
};

export function Polaroid({ src, caption, rotate = -3 }: Props) {
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={caption ?? ""}
        className="block max-w-[280px] max-h-[280px] object-cover"
        style={{ filter: "saturate(0.9) contrast(1.05)" }}
      />
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
