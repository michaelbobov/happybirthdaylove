import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS.
 * ONLY use from trusted server code (Route Handlers, Server Actions) after you've
 * already enforced the caller's permissions. Never expose this key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service role configuration");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
