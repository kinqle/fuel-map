import { NextRequest, NextResponse } from "next/server";
import { sb } from "../../../lib/supabaseServer";

export async function POST(req: NextRequest) {
  const { action, comment_id, device_id, type } = await req.json();

  if (action === "delete") {
    await sb.from("comment_reactions").delete()
      .eq("comment_id", comment_id).eq("device_id", device_id).eq("type", type);
  } else {
    await sb.from("comment_reactions")
      .upsert({ comment_id, device_id, type });
  }

  return NextResponse.json({ ok: true });
}
