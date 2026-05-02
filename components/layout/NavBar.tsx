import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function NavBar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <nav className="absolute left-1/2 top-0 z-30 w-full max-w-6xl -translate-x-1/2 px-4 pt-5 sm:px-6 sm:pt-6">
      <div
        className="paper mx-auto flex items-center justify-between gap-3 rounded-full px-3 py-2 sm:px-4"
        style={{
          border: "1px solid rgba(139,116,85,0.22)",
          boxShadow: "0 10px 30px rgba(72,47,24,0.10), inset 0 1px 0 rgba(255,255,255,0.62)",
          backgroundColor: "rgba(246,236,217,0.74)",
        }}
      >
        <Link
          href="/"
          className="group inline-flex min-w-0 items-center gap-2 rounded-full px-2 py-1"
          style={{ color: "var(--color-ink)" }}
        >
          <span
            aria-hidden="true"
            className="hidden h-8 w-8 shrink-0 rotate-[-8deg] items-center justify-center rounded-full border sm:inline-flex"
            style={{
              borderColor: "rgba(160,40,34,0.35)",
              color: "var(--color-seal)",
              fontFamily: "var(--font-display-warm)",
              fontSize: 19,
            }}
          >
            ♡
          </span>
          <span className="font-display text-2xl leading-none sm:text-[1.7rem]">
            Openwhen
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 text-sm sm:gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className="rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/45" style={{ color: "var(--color-ink)" }}>
                Bundles
              </Link>
              <Link href="/inbox" className="rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/45" style={{ color: "var(--color-ink)" }}>
                Inbox
              </Link>
              <Link
                href="/create"
                className="rounded-full px-3 py-1.5"
                style={{ background: "var(--color-seal)", color: "var(--color-bg)", boxShadow: "0 4px 12px rgba(160,40,34,0.18)" }}
              >
                New
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.14em]"
              style={{
                background: "var(--color-seal)",
                color: "var(--color-bg)",
                boxShadow: "0 4px 12px rgba(160,40,34,0.18)",
              }}
            >
              Sign in
            </Link>
          )}
        </div>
    </div>
    </nav>
  );
}
