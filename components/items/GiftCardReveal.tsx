"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Copy, Check, Gift } from "lucide-react";

type Props = {
  vendor: string;
  code: string;
  note?: string;
  redeemUrl?: string;
  amount?: { amount: number; currency: string };
};

/**
 * A gift-card reveal. Starts as a branded card with a "scratch to reveal" overlay.
 * Dragging/clicking the overlay erases it. Once fully revealed, the card tilts
 * the code forward and exposes copy + redeem buttons.
 */
export function GiftCardReveal({ vendor, code, note, redeemUrl, amount }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const progress = useRef(0);
  const erasing = useRef(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { y: 40, opacity: 0, rotationX: -20 },
      { y: 0, opacity: 1, rotationX: 0, duration: 0.9, ease: "power3.out" },
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#c2b280");
    grad.addColorStop(0.5, "#8f7a4a");
    grad.addColorStop(1, "#c2b280");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("scratch to reveal", w / 2, h / 2);
  }, []);

  const scratchAt = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    // cheap fill-ratio check
    progress.current += 1;
    if (progress.current % 12 === 0) {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let cleared = 0;
      for (let i = 3; i < img.length; i += 16) if (img[i] === 0) cleared++;
      const ratio = cleared / (img.length / 16);
      if (ratio > 0.45) {
        // sweep the rest away
        gsap.to(canvas, {
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
          onComplete: () => setRevealed(true),
        });
        const card = cardRef.current;
        if (card) {
          gsap.to(card, { rotationY: 8, duration: 0.4, yoyo: true, repeat: 1, ease: "power2.inOut" });
        }
      }
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    const card = cardRef.current;
    if (card) gsap.fromTo(card, { scale: 1 }, { scale: 1.04, duration: 0.12, yoyo: true, repeat: 1 });
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={cardRef}
        className="relative rounded-2xl overflow-hidden w-[360px] h-[220px] select-none"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #3a2a5a 100%)",
          color: "#f2ead3",
          boxShadow: "0 24px 50px rgba(0,0,0,0.35)",
        }}
      >
        <div className="absolute top-5 left-6 flex items-center gap-2 text-sm uppercase tracking-widest opacity-80">
          <Gift size={16} /> {vendor}
        </div>
        {amount ? (
          <div className="absolute top-5 right-6 text-right">
            <div className="text-xs uppercase opacity-60">value</div>
            <div className="text-lg font-semibold">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: amount.currency,
              }).format(amount.amount)}
            </div>
          </div>
        ) : null}
        <div className="absolute inset-x-6 bottom-14 top-20 flex items-center justify-center">
          <div
            className="font-mono text-2xl tracking-[0.25em] text-center w-full"
            style={{ letterSpacing: "0.22em" }}
          >
            {code}
          </div>
        </div>
        {note ? (
          <div
            className="absolute left-6 right-6 bottom-5 text-xs opacity-75 font-hand"
            style={{ fontSize: 14 }}
          >
            {note}
          </div>
        ) : null}
        {!revealed ? (
          <canvas
            ref={canvasRef}
            width={720}
            height={440}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              erasing.current = true;
              (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
              scratchAt(e);
            }}
            onPointerMove={(e) => {
              if (erasing.current) scratchAt(e);
            }}
            onPointerUp={() => (erasing.current = false)}
          />
        ) : null}
      </div>
      {revealed ? (
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-bg)",
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied!" : "Copy code"}
          </button>
          {redeemUrl ? (
            <a
              href={redeemUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-full text-sm border"
              style={{
                borderColor: "var(--color-ink)",
                color: "var(--color-ink)",
              }}
            >
              Redeem →
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
