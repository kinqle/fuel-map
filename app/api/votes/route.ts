import { NextRequest, NextResponse } from "next/server";
import { sb } from "../../../lib/supabaseServer";

export async function GET(req: NextRequest) {
  const city_id   = req.nextUrl.searchParams.get("city_id")   ?? "";
  const city_name = req.nextUrl.searchParams.get("city_name") ?? "";

  // Сначала получаем IDs станций для этого города
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
  const { station_id, fuel, value, device_id } = await req.json();

  await sb.from("votes").delete()
    .eq("station_id", station_id).eq("fuel", fuel).eq("device_id", device_id);

  const { error } = await sb.from("votes")
    .insert({ station_id, fuel, value, device_id });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
