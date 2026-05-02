"use client";

import type { RevealedItem } from "@/lib/types";
import type { TextBlock } from "@/lib/types";
import { TextNote } from "./TextNote";
import { Polaroid, photoFilterCss } from "./Polaroid";
import { TicketStub } from "./TicketStub";
import { GifCard } from "./GifCard";
import { GiftCardReveal } from "./GiftCardReveal";
import { MoneyBurst } from "./MoneyBurst";
import { AudioNote } from "./AudioNote";

/**
 * Renders a revealed item based on its payload type.
 * Used inside EnvelopeOpener's content slot, after the server returns decrypted items.
 */
export function ItemRenderer({ item }: { item: RevealedItem }) {
  const { payload, meta, mediaUrl } = item;
  const visibleCaption = meta.captionMode === "hidden" || meta.captionMode === "onPhoto"
    ? undefined
    : payload.type === "image"
      ? payload.caption ?? meta.captionHint
      : undefined;
  switch (payload.type) {
    case "text":
      return <TextNote payload={payload} caption={meta.captionHint} />;
    case "image":
      if (meta.frame === "ticket") {
        return <TicketStub src={mediaUrl ?? ""} caption={payload.caption ?? meta.captionHint} />;
      }
      if (meta.frame === "plain") {
        return (
          <PlainPhoto
            src={mediaUrl ?? ""}
            caption={visibleCaption}
            textBlocks={payload.textBlocks}
            filter={meta.filter}
            fit={meta.fit}
          />
        );
      }
      return <Polaroid src={mediaUrl ?? ""} caption={visibleCaption} textBlocks={payload.textBlocks} filter={meta.filter} fit={meta.fit} />;
    case "gif":
      return <GifCard url={payload.url} caption={payload.caption} />;
    case "giftcard":
      return (
        <GiftCardReveal
          vendor={payload.vendor}
          code={payload.code}
          note={payload.note}
          redeemUrl={payload.redeemUrl}
          amount={meta.publicAmount}
        />
      );
    case "money_note":
      return (
        <MoneyBurst
          amount={payload.amount}
          currency={payload.currency}
          instructions={payload.instructions}
          link={payload.link}
        />
      );
    case "audio":
      return <AudioNote src={mediaUrl ?? ""} durationSec={payload.durationSec} />;
  }
}

function PlainPhoto({
  src,
  caption,
  textBlocks = [],
  filter,
  fit = "cover",
}: {
  src: string;
  caption?: string;
  textBlocks?: TextBlock[];
  filter?: string;
  fit?: string;
}) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", boxShadow: "0 18px 36px rgba(0,0,0,0.22)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption ?? ""}
          style={{
            display: "block",
            width: 340,
            height: 300,
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
      {caption ? <div className="font-hand text-xl" style={{ color: "var(--color-muted)" }}>{caption}</div> : null}
    </div>
  );
}
