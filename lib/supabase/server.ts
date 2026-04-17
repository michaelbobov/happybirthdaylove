import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client scoped to the current request's cookies.
 * Use this inside Server Components, Route Handlers, and Server Actions.
 * Still operates under the caller's session + RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes cookies.
          }
        },
      },
    },
  );
}
