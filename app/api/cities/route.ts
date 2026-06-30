import { NextResponse } from "next/server";
import { sb } from "../../../lib/supabaseServer";

export async function GET() {
  const { data, error } = await sb
    .from("cities")
    .select("id, name, lat, lng")
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
