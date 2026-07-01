import { NextRequest, NextResponse } from "next/server";
import { sb } from "../../../lib/supabaseServer";
import { getIpHash, checkRateLimit, isSuspiciousIp } from "../../../lib/rateLimit";

const VALID_FUELS = new Set(["ai92", "ai95", "ai98", "diesel", "gas"]);
const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const city_id   = req.nextUrl.searchParams.get("city_id")   ?? "";
  const city_name = req.nextUrl.searchParams.get("city_name") ?? "";

  const { data: stData } = await sb
    .from("stations")
    .select("id")
    .or(`city.eq.${city_id},city.eq.${city_name}`);

  const ids = (stData ?? []).map((s: { id: string }) => s.id);
  if (ids.length === 0) return NextResponse.json([]);

  const { data, error } = await sb
    .from("votes")
    .select("*")
    .in("station_id", ids)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  // Валидация тела запроса
  let body: { station_id?: unknown; fuel?: unknown; value?: unknown; device_id?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const { station_id, fuel, value, device_id } = body;
  if (
    typeof station_id !== "string" || !UUID_RE.test(station_id) ||
    typeof fuel       !== "string" || !VALID_FUELS.has(fuel)    ||
    typeof value      !== "string" || (value !== "yes" && value !== "no") ||
    typeof device_id  !== "string" || !UUID_RE.test(device_id)
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Защита от ботов: не больше 10 голосов в минуту с одного IP
  const ipHash = getIpHash(req);
  if (!checkRateLimit(ipHash, 60_000, 10)) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }
  // Защита от ботов: слишком много разных device_id с одного IP — подозрительно
  if (isSuspiciousIp(ipHash, device_id)) {
    return NextResponse.json({ error: "suspicious" }, { status: 429 });
  }

  await sb.from("votes").delete()
    .eq("station_id", station_id).eq("fuel", fuel).eq("device_id", device_id);

  const { error } = await sb.from("votes")
    .insert({ station_id, fuel, value, device_id });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
