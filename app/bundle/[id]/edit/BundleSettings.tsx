"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { updateBundle } from "@/app/actions/bundles";

type Props = {
  bundleId: string;
  initial: {
    coverMessage: string;
    recipientName: string;
    recipientEmail: string;
    hasPassphrase: boolean;
  };
};

export function BundleSettings({ bundleId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [coverMessage, setCoverMessage]   = useState(initial.coverMessage);
  const [recipientName, setRecipientName] = useState(initial.recipientName);
  const [recipientEmail, setRecipientEmail] = useState(initial.recipientEmail);
  const [passphrase, setPassphrase]       = useState("");
  const [showPass, setShowPass]           = useState(false);
  const [hasPass, setHasPass]             = useState(initial.hasPassphrase);
  const [saveState, setSaveState]         = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirst = useRef(true);

  const save = async (clearPassphrase = false) => {
    setSaveState("saving");
    await updateBundle({
      id: bundleId,
      coverMessage,
      recipientName,
      recipientEmail,
      passphrase: passphrase || undefined,
      clearPassphrase,
    });
    if (clearPassphrase) setHasPass(false);
    if (passphrase) { setHasPass(true); setPassphrase(""); }
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1800);
  };

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(), 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverMessage, recipientName, recipientEmail]);

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer",
          fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em",
          color: "var(--color-muted)", padding: 0,
        }}
      >
        Bundle settings
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>

          {/* Save indicator */}
          {saveState !== "idle" && (
            <div style={{ fontSize: 10, color: "var(--color-muted)", textAlign: "right" }}>
              {saveState === "saving" ? "Saving…" : "Saved ✓"}
            </div>
          )}

          {/* Cover message */}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={labelSx}>Cover message</span>
            <textarea
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              placeholder="Shown when your recipient first opens the bundle…"
              rows={3}
              style={{
                ...inputSx, resize: "vertical", fontFamily: "var(--font-hand)", fontSize: 14,
                lineHeight: 1.5,
              }}
            />
          </label>

          {/* Recipient name */}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={labelSx}>Recipient name</span>
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Alex"
              style={inputSx}
            />
          </label>

          {/* Recipient email */}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={labelSx}>Recipient email</span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="they'll claim the bundle at this address"
              style={inputSx}
            />
          </label>

          {/* Passphrase */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={labelSx}>
              Passphrase {hasPass && <span style={{ color: "var(--color-accent)", marginLeft: 4 }}>✓ set</span>}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={hasPass ? "Enter to change…" : "Require a secret phrase…"}
                  style={{ ...inputSx, width: "100%", boxSizing: "border-box", paddingRight: 32 }}
                />
                <button type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide passphrase" : "Show passphrase"}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 2,
                  }}>
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {passphrase && (
                <button type="button" onClick={() => save()}
                  style={{
                    borderRadius: 8, padding: "0 10px", fontSize: 12, cursor: "pointer",
                    background: "var(--color-ink)", border: "none", color: "var(--color-bg)", whiteSpace: "nowrap",
                  }}>
                  Set
                </button>
              )}
              {hasPass && !passphrase && (
                <button type="button" onClick={() => save(true)}
                  style={{
                    borderRadius: 8, padding: "0 10px", fontSize: 12, cursor: "pointer",
                    background: "none", border: "1px solid var(--color-muted)", color: "var(--color-muted)", whiteSpace: "nowrap",
                  }}>
                  Remove
                </button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

const labelSx: React.CSSProperties = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-muted)",
};

const inputSx: React.CSSProperties = {
  borderRadius: 8, background: "rgba(255,255,255,0.6)", padding: "7px 10px",
  border: "1px solid rgba(0,0,0,0.12)", color: "var(--color-ink)", outline: "none",
  fontSize: 12, width: "100%", boxSizing: "border-box",
};
