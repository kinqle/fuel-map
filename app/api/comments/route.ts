import { NextRequest, NextResponse } from "next/server";
import { sb } from "../../../lib/supabaseServer";

export async function GET(req: NextRequest) {
  const station_id = req.nextUrl.searchParams.get("station_id") ?? "";
  const since      = req.nextUrl.searchParams.get("since") ?? new Date(0).toISOString();
  const limit      = parseInt(req.nextUrl.searchParams.get("limit") ?? "60");

  const { data: cData, error } = await sb
    .from("comments")
    .select("*")
    .eq("station_id", station_id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!cData?.length) return NextResponse.json({ comments: [], reactions: [] });

  const ids = cData.map((c: { id: string }) => c.id);
  const { data: rData } = await sb
    .from("comment_reactions")
    .select("comment_id, device_id, type")
    .in("comment_id", ids);

  return NextResponse.json({ comments: cData, reactions: rData ?? [] });
}

export async function POST(req: NextRequest) {
  const { station_id, device_id, author_name, category, body } = await req.json();

  const { error } = await sb.from("comments").insert({
    station_id, device_id, author_name, category,
    body: body || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
