import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { themeIdSchema } from "@/lib/schemas";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = themeIdSchema.safeParse(body?.themeId);
  if (!parsed.success) return NextResponse.json({ error: "bad theme" }, { status: 400 });

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("bundles")
    .update({ theme_id: parsed.data })
    .eq("id", id)
    .eq("sender_id", user.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
