import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "../../../lib/supabase";
import { getFuelVerdict } from "../../../lib/votes";
import { FUELS, BRAND_COLORS } from "../../../lib/constants";
import type { FuelId, FuelVotes } from "../../../lib/types";

interface StationRow {
  id: string;
  name: string;
  brand_id: string | null;
  short: string;
  address: string | null;
  city: string;
}

interface VoteRow {
  station_id: string;
  fuel: string;
  value: string;
  device_id: string;
  created_at: string;
}

const EMPTY_FUEL: FuelVotes = { yes: 0, no: 0, yesW: 0, noW: 0, myVote: null, lastAt: null };

async function loadStation(id: string): Promise<StationRow | null> {
  const { data } = await supabase
    .from("stations")
    .select("id, name, brand_id, short, address, city")
    .eq("id", id)
    .single();
  return data as StationRow | null;
}

async function loadFuelStatus(stationId: string): Promise<Partial<Record<FuelId, FuelVotes>>> {
  const { data } = await supabase
    .from("votes")
    .select("fuel, value, device_id, created_at")
    .eq("station_id", stationId)
    .order("created_at", { ascending: false });

  if (!data?.length) return {};

  const deduped = new Map<string, VoteRow>();
  for (const v of data as VoteRow[]) {
    const key = `${v.fuel}:${v.device_id}`;
    if (!deduped.has(key)) deduped.set(key, v);
  }

  const grouped: Partial<Record<FuelId, FuelVotes>> = {};
  for (const v of deduped.values()) {
    const fuel = v.fuel as FuelId;
    if (!grouped[fuel]) grouped[fuel] = { ...EMPTY_FUEL };
    const e = grouped[fuel]!;
    const ageSec = (Date.now() - new Date(v.created_at).getTime()) / 1000;
    const w = Math.exp(-ageSec / 10800);
    if (v.value === "yes") { e.yes++; e.yesW += w; }
    else                    { e.no++;  e.noW  += w; }
    if (!e.lastAt || v.created_at > e.lastAt) e.lastAt = v.created_at;
  }
  return grouped;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const station = await loadStation(id);
  if (!station) return { title: "АЗС не найдена" };

  return {
    title: `${station.name} — FuelMap`,
    description: `Актуальная информация о наличии топлива на ${station.name}${station.address ? `, ${station.address}` : ""}`,
    openGraph: {
      title: `${station.name} — FuelMap`,
      description: "Проверь наличие топлива перед поездкой",
      type: "website",
    },
  };
}

export default async function StationPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [station, fuelStatus] = await Promise.all([
    loadStation(id),
    loadFuelStatus(id),
  ]);

  if (!station) notFound();

  const color = BRAND_COLORS[station.brand_id ?? ""] ?? "#6366f1";

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0f0f13",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    }}>
      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 400,
        background: "linear-gradient(180deg,#16161e 0%,#0f0f13 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: "28px 24px 32px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        {/* Brand dot + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: `${color}20`,
            border: `1.5px solid ${color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>⛽</div>
          <div>
            <div style={{ color: "#ffffff", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {station.name}
            </div>
            {station.address && (
              <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginTop: 4 }}>
                {station.address}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 20 }} />

        {/* Fuel status rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {FUELS.map(({ id: fid, label, color: fc }) => {
            const fd      = fuelStatus[fid] ?? EMPTY_FUEL;
            const verdict = getFuelVerdict(fd);
            return (
              <div key={fid} style={{
                display: "flex", alignItems: "center",
                padding: "12px 14px", borderRadius: 12,
                background: `${verdict.color}10`,
                border: `1px solid ${verdict.color}25`,
                gap: 12,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: fc, boxShadow: `0 0 6px ${fc}99`,
                  flexShrink: 0,
                }} />
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600, flex: 1 }}>
                  {label}
                </span>
                <span style={{ fontSize: 16, lineHeight: 1 }}>{verdict.emoji}</span>
                <span style={{ color: verdict.color, fontSize: 13, fontWeight: 700 }}>
                  {verdict.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <a
          href={`/?s=${station.id}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "14px 0",
            borderRadius: 14, textDecoration: "none",
            background: "linear-gradient(135deg,#6366f1,#818cf8)",
            color: "#ffffff", fontSize: 15, fontWeight: 700,
            boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
          }}
        >
          <span style={{ fontSize: 18 }}>🗺</span>
          Открыть на карте
        </a>

        {/* Footer */}
        <div style={{
          marginTop: 20, textAlign: "center",
          color: "rgba(255,255,255,0.2)", fontSize: 11,
        }}>
          FuelMap — наличие топлива в реальном времени
        </div>
      </div>
    </div>
  );
}
