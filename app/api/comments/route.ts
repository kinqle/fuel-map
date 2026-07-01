import { NextRequest, NextResponse } from "next/server";
import { sb } from "../../../lib/supabaseServer";
import { getIpHash, checkRateLimit } from "../../../lib/rateLimit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  let body: { station_id?: unknown; device_id?: unknown; author_name?: unknown; category?: unknown; body?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const { station_id, device_id, author_name, category, body: text } = body;
  if (
    typeof station_id  !== "string" || !UUID_RE.test(station_id) ||
    typeof device_id   !== "string" || !UUID_RE.test(device_id)  ||
    typeof author_name !== "string" || author_name.trim().length < 1 || author_name.length > 50 ||
    typeof category    !== "string" || category.length < 1
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Не больше 3 комментариев в минуту с одного IP
  const ipHash = getIpHash(req);
  if (!checkRateLimit(`comment:${ipHash}`, 60_000, 3)) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  const bodyStr = typeof text === "string" ? text.slice(0, 2000) || null : null;

  const { error } = await sb.from("comments").insert({
    station_id, device_id,
    author_name: author_name.trim().slice(0, 50),
    category,
    body: bodyStr,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
