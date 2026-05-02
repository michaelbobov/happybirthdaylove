"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2, Check } from "lucide-react";

type Props = {
  bundleId: string;
  onAdd: (storageKey: string, durationSec: number) => Promise<void> | void;
  onCancel: () => void;
};

type RecordState = "idle" | "recording" | "preview" | "uploading";

export function VoiceRecorder({ bundleId, onAdd, onCancel }: Props) {
  const [state, setState] = useState<RecordState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        setBlobUrl(URL.createObjectURL(b));
        setState("preview");
      };

      recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setErr("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const discard = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlob(null); setBlobUrl(null);
    setState("idle"); setSeconds(0); setPlaying(false);
  };

  const upload = async () => {
    if (!blob) return;
    setState("uploading");
    const form = new FormData();
    form.append("file", blob, "voice-note.webm");
    form.append("bundleId", bundleId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) { setErr(json.error ?? "Upload failed"); setState("preview"); return; }
    await onAdd(json.storageKey, seconds);
  };

  // File upload fallback
  const uploadFile = async (file: File) => {
    setState("uploading");
    const form = new FormData();
    form.append("file", file);
    form.append("bundleId", bundleId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) { setErr(json.error ?? "Upload failed"); setState("idle"); return; }
    await onAdd(json.storageKey, 0);
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {state === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={startRecording}
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "var(--color-accent)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            }}
          >
            <Mic size={28} />
          </button>
          <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Tap to record</div>
          <div style={{ color: "var(--color-muted)", fontSize: 11, opacity: 0.7 }}>or</div>
          <label style={{ cursor: "pointer", color: "var(--color-muted)", fontSize: 12, textDecoration: "underline" }}>
            Upload a file
            <input type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          </label>
        </div>
      )}

      {state === "recording" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          {/* Pulse animation */}
          <div style={{ position: "relative", width: 72, height: 72 }}>
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              background: "var(--color-accent)", opacity: 0.2,
              animation: "pulse 1.4s ease-in-out infinite",
            }} />
            <button
              type="button"
              onClick={stopRecording}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "var(--color-seal)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", position: "relative",
              }}
            >
              <Square size={22} fill="currentColor" />
            </button>
          </div>
          <div style={{ color: "var(--color-accent)", fontVariantNumeric: "tabular-nums", fontSize: 22, fontWeight: 600 }}>
            {fmt(seconds)}
          </div>
          <div style={{ color: "var(--color-muted)", fontSize: 12 }}>Recording — tap to stop</div>
        </div>
      )}

      {state === "preview" && blobUrl && (
        <>
          <audio ref={audioRef} src={blobUrl} onEnded={() => setPlaying(false)} />
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(255,255,255,0.6)", borderRadius: 12, padding: "12px 16px",
            border: "1px solid rgba(0,0,0,0.06)",
          }}>
            <button type="button" onClick={togglePlay}
              style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-ink)",
                border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", flexShrink: 0 }}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--color-ink)", fontSize: 13, fontWeight: 500 }}>Voice note</div>
              <div style={{ color: "var(--color-muted)", fontSize: 11 }}>{fmt(seconds)}</div>
            </div>
            <button type="button" onClick={discard}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 4 }}>
              <Trash2 size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onCancel}
              style={{ borderRadius: 999, padding: "8px 16px", fontSize: 13, background: "none",
                border: "1px solid var(--color-muted)", cursor: "pointer", color: "var(--color-ink)" }}>
              Cancel
            </button>
            <button type="button" onClick={upload}
              style={{ borderRadius: 999, padding: "8px 18px", fontSize: 13, background: "var(--color-ink)",
                border: "none", cursor: "pointer", color: "var(--color-bg)", display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={14} /> Add voice note
            </button>
          </div>
        </>
      )}

      {state === "uploading" && (
        <div style={{ textAlign: "center", color: "var(--color-muted)", fontSize: 13, padding: 16 }}>
          Uploading…
        </div>
      )}

      {err && <div style={{ color: "var(--color-seal)", fontSize: 12 }}>{err}</div>}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.35); opacity: 0.08; }
        }
      `}</style>
    </div>
  );
}
