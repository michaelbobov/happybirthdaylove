"use client";

import type { RevealedItem } from "@/lib/types";
import { TextNote } from "./TextNote";
import { Polaroid } from "./Polaroid";
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
  switch (payload.type) {
    case "text":
      return <TextNote html={payload.html} caption={meta.captionHint} />;
    case "image":
      return <Polaroid src={mediaUrl ?? ""} caption={payload.caption ?? meta.captionHint} />;
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
