import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in — Enveloped" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="app-screen relative flex-1 flex items-center justify-center px-6 pb-16 overflow-hidden">
      <AmbientDecor />
      <div className="relative z-10 w-full max-w-md">
        {/* Postage stamp corner — tilted, perforated feel via radial-gradient border */}
        <div
          aria-hidden="true"
          className="absolute -top-6 -right-4 z-10 select-none"
          style={{ transform: "rotate(8deg)" }}
        >
          <div
            className="flex flex-col items-center justify-center"
            style={{
              width: 78,
              height: 92,
              padding: "6px 8px",
              background: "var(--color-surface)",
              color: "var(--color-seal)",
              boxShadow: "0 6px 14px var(--color-shadow)",
              // Perforated edge: tiny dots punched around the stamp
              backgroundImage:
                "radial-gradient(circle at 6px 6px, var(--color-bg) 3px, transparent 3.5px)",
              backgroundSize: "12px 12px",
              backgroundPosition: "-6px -6px",
            }}
          >
            <div
              className="font-display leading-none"
              style={{ fontSize: 30, color: "var(--color-seal)" }}
            >
              ♡
            </div>
            <div
              className="mt-1 text-[9px] uppercase tracking-[0.18em] text-center"
              style={{ color: "var(--color-ink)", opacity: 0.75 }}
            >
              Env&shy;eloped
            </div>
            <div
              className="text-[8px] tracking-widest"
              style={{ color: "var(--color-muted)" }}
            >
              · 2026 ·
            </div>
          </div>
        </div>

        {/* Main stationery card */}
        <div
          className="paper grain relative overflow-hidden rounded-[var(--radius-lg)] px-8 py-10 sm:px-10 sm:py-12"
          style={{
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.5) inset, 0 22px 50px var(--color-shadow)",
            border: "1px solid rgba(139,116,85,0.25)",
          }}
        >
          {/* Faint cancellation arc behind the header — nods to a postmark */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-16 rounded-full"
            style={{
              width: 220,
              height: 220,
              border: "1px dashed var(--color-muted)",
              opacity: 0.2,
            }}
          />

          <div
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{ color: "var(--color-muted)" }}
          >
            No. 001 · Sign in
          </div>

          <h1
            className="font-display mt-2 leading-[0.95]"
            style={{
              fontSize: "clamp(2.75rem, 6vw, 3.75rem)",
              color: "var(--color-ink)",
            }}
          >
            Welcome
            <br />
            <span style={{ color: "var(--color-seal)" }}>back.</span>
          </h1>

          <p
            className="mt-3 text-base font-hand"
            style={{ color: "var(--color-muted)" }}
          >
            Continue with Google, or we&rsquo;ll email you a link.
          </p>

          {/* Hairline flourish under subtitle */}
          <div
            aria-hidden="true"
            className="mt-5 h-px w-16"
            style={{
              background:
                "linear-gradient(to right, var(--color-muted), transparent)",
              opacity: 0.6,
            }}
          />

          {error === "auth" && (
            <div
              className="mt-5 rounded-[var(--radius-md)] p-3 text-sm"
              style={{
                background: "rgba(217, 79, 58, 0.08)",
                border: "1px solid rgba(217, 79, 58, 0.3)",
                color: "var(--color-ink)",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                That link didn&rsquo;t work.
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-muted)",
                  lineHeight: 1.5,
                }}
              >
                Magic links must be opened in the same browser you requested them
                from — if you tapped it from your Gmail app, it may have opened
                somewhere else. Try <b>Continue with Google</b> below, or request
                a fresh link and click it from the same browser.
              </div>
            </div>
          )}

          <SignInForm />

          <div
            className="mt-8 pt-5 text-xs font-hand"
            style={{
              color: "var(--color-muted)",
              borderTop: "1px dashed rgba(139,116,85,0.35)",
            }}
          >
            <span style={{ color: "var(--color-seal)", fontWeight: 600 }}>
              P.S.
            </span>{" "}
            first time here? Signing in will tuck a fresh account into your name.
          </div>
        </div>
      </div>
    </main>
  );
}

function AmbientDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none"
    >
      {/* Soft halo behind the card */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: 720,
          height: 720,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.55), transparent 70%)",
          filter: "blur(8px)",
        }}
      />

      {/* Airmail red/blue striped edge — left viewport */}
      <div
        className="absolute left-0 top-0 h-full w-3 hidden md:block"
        style={{
          background:
            "repeating-linear-gradient(135deg, var(--color-seal) 0 10px, transparent 10px 18px, #2c4a86 18px 28px, transparent 28px 36px)",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute right-0 top-0 h-full w-3 hidden md:block"
        style={{
          background:
            "repeating-linear-gradient(135deg, var(--color-seal) 0 10px, transparent 10px 18px, #2c4a86 18px 28px, transparent 28px 36px)",
          opacity: 0.5,
        }}
      />

      {/* Tilted mini envelope — top-left */}
      <MiniEnvelope
        className="absolute hidden sm:block"
        style={{
          top: "14%",
          left: "8%",
          transform: "rotate(-14deg)",
          animation: "sign-float-a 7s ease-in-out infinite",
        }}
      />

      {/* Tilted mini envelope — bottom-right */}
      <MiniEnvelope
        className="absolute hidden sm:block"
        flap="open"
        style={{
          bottom: "12%",
          right: "9%",
          transform: "rotate(12deg)",
          animation: "sign-float-b 8s ease-in-out infinite",
        }}
      />

      {/* "Par Avion" stamp block — bottom-left */}
      <div
        className="absolute hidden md:flex items-center gap-2 rounded-sm"
        style={{
          bottom: "10%",
          left: "7%",
          padding: "6px 10px",
          transform: "rotate(-6deg)",
          border: "1.5px solid var(--color-seal)",
          color: "var(--color-seal)",
          fontFamily: "var(--font-display-warm)",
          fontSize: 14,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          background: "rgba(246,236,217,0.35)",
        }}
      >
        ✈ Par Avion
      </div>

      {/* Handwritten "start here" + arrow — top, pointing at card */}
      <div
        className="absolute hidden lg:block"
        style={{
          top: "18%",
          right: "calc(50% + 240px)",
          color: "var(--color-muted)",
          fontFamily: "var(--font-hand-warm)",
          fontSize: 20,
          transform: "rotate(-6deg)",
        }}
      >
        start here
        <svg
          width="70"
          height="38"
          viewBox="0 0 70 38"
          fill="none"
          style={{
            display: "block",
            marginLeft: 30,
            marginTop: 2,
            color: "var(--color-muted)",
          }}
        >
          <path
            d="M2 6 C 20 4, 42 10, 60 26"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M54 20 L 60 26 L 52 30"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Scattered confetti specks */}
      <Speck top="22%" left="24%" color="var(--color-seal)" />
      <Speck top="76%" left="22%" color="var(--color-accent)" />
      <Speck top="28%" right="22%" color="var(--color-accent)" />
      <Speck top="72%" right="26%" color="var(--color-seal)" />
      <Speck top="46%" left="6%" color="var(--color-muted)" size={5} />
      <Speck top="54%" right="6%" color="var(--color-muted)" size={5} />

      <style>{`
        @keyframes sign-float-a {
          0%, 100% { transform: rotate(-14deg) translateY(0); }
          50%      { transform: rotate(-12deg) translateY(-8px); }
        }
        @keyframes sign-float-b {
          0%, 100% { transform: rotate(12deg) translateY(0); }
          50%      { transform: rotate(14deg) translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

function MiniEnvelope({
  className,
  style,
  flap = "closed",
}: {
  className?: string;
  style?: React.CSSProperties;
  flap?: "closed" | "open";
}) {
  return (
    <div className={className} style={style}>
      <div
        style={{
          position: "relative",
          width: 96,
          height: 62,
          background: "var(--color-surface)",
          border: "1px solid var(--color-muted)",
          borderRadius: 4,
          boxShadow: "0 10px 22px var(--color-shadow)",
        }}
      >
        {/* Flap */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath:
              flap === "open"
                ? "polygon(0 0, 50% 55%, 100% 0, 100% 10%, 50% 65%, 0 10%)"
                : "polygon(0 0, 50% 58%, 100% 0, 100% 2%, 50% 60%, 0 2%)",
            background:
              flap === "open" ? "var(--color-paper)" : "var(--color-muted)",
            opacity: flap === "open" ? 1 : 0.35,
          }}
        />
        {/* Wax seal dot */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "58%",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--color-seal)",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
          }}
        />
      </div>
    </div>
  );
}

function Speck({
  top,
  left,
  right,
  color,
  size = 7,
}: {
  top?: string;
  left?: string;
  right?: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        top,
        left,
        right,
        width: size,
        height: size,
        background: color,
        opacity: 0.55,
      }}
    />
  );
}
