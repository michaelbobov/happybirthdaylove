"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function ShareLinkClient({
  token,
  hasPassphrase,
  disabled = false,
}: {
  token: string;
  hasPassphrase: boolean;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/b/${token}`
      : `/b/${token}`;

  const copy = async () => {
    if (disabled) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div
        className="paper rounded-full px-5 py-3 font-mono text-sm break-all max-w-full"
        style={{ color: "var(--color-ink)", border: "1px solid var(--color-muted)" }}
      >
        {url}
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm"
        style={{
          background: "var(--color-ink)",
          color: "var(--color-bg)",
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : disabled ? "Finish checklist first" : "Copy link"}
      </button>
      {hasPassphrase ? (
        <p className="text-xs mt-2" style={{ color: "var(--color-muted)" }}>
          They&rsquo;ll need the passphrase you set before opening anything.
        </p>
      ) : null}
    </div>
  );
}
