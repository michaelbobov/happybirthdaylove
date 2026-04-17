"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/";
      }}
      className="text-sm"
      style={{ color: "var(--color-muted)" }}
    >
      Sign out
    </button>
  );
}
