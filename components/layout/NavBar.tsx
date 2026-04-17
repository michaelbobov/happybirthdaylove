import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function NavBar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <nav className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
      <Link href="/" className="font-display text-2xl" style={{ color: "var(--color-ink)" }}>
        Enveloped
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <Link href="/dashboard" style={{ color: "var(--color-ink)" }}>
              Bundles
            </Link>
            <Link href="/inbox" style={{ color: "var(--color-ink)" }}>
              Inbox
            </Link>
            <Link
              href="/create"
              className="rounded-full px-3 py-1.5"
              style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
            >
              New
            </Link>
            <SignOutButton />
          </>
        ) : (
          <Link
            href="/sign-in"
            className="rounded-full px-3 py-1.5"
            style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
