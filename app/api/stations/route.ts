import { NextRequest, NextResponse } from "next/server";
import { sb } from "../../../lib/supabaseServer";

export async function GET(req: NextRequest) {
  const city_id   = req.nextUrl.searchParams.get("city_id")   ?? "";
  const city_name = req.nextUrl.searchParams.get("city_name") ?? "";

  const { data, error } = await sb
    .from("stations")
    .select("id, name, brand, brand_id, short, lat, lng, address, city")
    .or(`city.eq.${city_id},city.eq.${city_name}`)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
