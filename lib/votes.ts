import type { MarkerStatus, FuelId, FuelVotes, VotesMap, RecentVote, Station } from "./types";
import { HALFLIFE_SEC } from "./constants";
import { haversineKm, getAgeSec, formatAge } from "./utils";

const STATUS_SCORE: Record<MarkerStatus, number> = { green: 3, yellow: 1.5, neutral: 1, red: 0 };

export function voteWeight(createdAt: string): number {
  let ts = createdAt.replace(" ", "T");
  if (!/[Z+]/.test(ts.slice(10))) ts += "Z";
  const ageSec = (Date.now() - new Date(ts).getTime()) / 1000;
  return Math.exp(-ageSec / HALFLIFE_SEC);
}

export function calcFuelConfidence(fd: FuelVotes): number {
  const totalW = fd.yesW + fd.noW;
  if (fd.yes + fd.no === 0 || totalW < 0.01) return 0;
  return Math.round((Math.max(fd.yesW, fd.noW) / totalW) * 100);
}

export function getFuelVerdict(fd: FuelVotes): { emoji: string; label: string; color: string; kind: "yes" | "no" | "neutral" } {
  const totalW = fd.yesW + fd.noW;
  const total  = fd.yes  + fd.no;
  if (total === 0)    return { emoji: "⚫", label: "Нет данных",          color: "#6b7280", kind: "neutral" };
  if (totalW < 0.25)  return { emoji: "⚫", label: "Информация устарела", color: "#6b7280", kind: "neutral" };
  if (total < 2)      return { emoji: "🟠", label: "Мало подтверждений", color: "#f97316", kind: "neutral" };
  const agreement = Math.max(fd.yesW, fd.noW) / totalW;
  if (agreement < 0.65) return { emoji: "🟡", label: "Мнения разделились", color: "#f59e0b", kind: "neutral" };
  if (fd.yesW > fd.noW) return { emoji: "🟢", label: "Скорее всего есть", color: "#22c55e", kind: "yes"     };
  return                       { emoji: "🔴", label: "Скорее всего нет",   color: "#ef4444", kind: "no"      };
}

export function getFreshnessInfo(lastAt: string | null): { color: string; icon: string; label: string; detail: string } {
  if (!lastAt) return { color: "#6b7280", icon: "⚫", label: "Никто ещё не голосовал", detail: "" };
  const age  = getAgeSec(lastAt);
  const text = formatAge(lastAt);
  if (age < 1800) return { color: "#22c55e", icon: "🟢", label: "Информация очень свежая",    detail: `Последнее подтверждение ${text}` };
  if (age < 7200) return { color: "#f59e0b", icon: "🟡", label: "Данные относительно свежие", detail: `Последнее подтверждение ${text}` };
  return               { color: "#ef4444", icon: "🔴", label: "Нет новых подтверждений",       detail: `Последнее подтверждение ${text}` };
}

export function computeTrend(
  fuelId: FuelId,
  recent: RecentVote[],
  fd: FuelVotes,
): { icon: string; text: string; color: string } | null {
  const fuel = recent.filter(r => r.fuel === fuelId);
  if (fuel.length < 3) return null;

  const last       = fuel.slice(-5);
  const recentYes  = last.filter(r => r.value === "yes").length;
  const recentTotal = last.length;

  let flips = 0;
  for (let i = 1; i < last.length; i++) {
    if (last[i].value !== last[i - 1].value) flips++;
  }
  if (flips >= 2 && recentTotal >= 3) {
    return { icon: "⚠️", text: "Ситуация быстро меняется", color: "#f59e0b" };
  }

  const recentYesPct  = recentYes / recentTotal;
  const totalW        = fd.yesW + fd.noW;
  const overallYesPct = totalW > 0 ? fd.yesW / totalW : 0.5;

  if (recentYesPct >= 0.75 && recentYesPct > overallYesPct + 0.15) {
    return { icon: "⬆️", text: "Всё больше подтверждений наличия", color: "#22c55e" };
  }
  if (recentYesPct <= 0.25 && recentYesPct < overallYesPct - 0.15) {
    return { icon: "⬇️", text: "Поступает всё больше сообщений об отсутствии", color: "#ef4444" };
  }
  return null;
}

export function getStationStatus(stationVotes: Partial<Record<FuelId, FuelVotes>>): MarkerStatus {
  const active = (Object.values(stationVotes) as FuelVotes[]).filter(
    (f) => f && f.yes + f.no > 0 && f.yesW + f.noW >= 0.25
  );
  if (active.length === 0) return "neutral";
  const yesWins = active.filter((f) => f.yesW >= f.noW).length;
  const ratio   = yesWins / active.length;
  if (ratio >= 0.67) return "green";
  if (ratio <= 0.33) return "red";
  return "yellow";
}

export function getFuelStatusColor(fd: FuelVotes | undefined): string {
  if (!fd || (fd.yes + fd.no) === 0) return "#6b7280";
  if (fd.yes >= fd.no) return "#22c55e";
  return "#ef4444";
}

export function nearestStation(center: [number, number], stations: Station[]): string {
  if (!stations.length) return "";
  let bestId   = stations[0].id;
  let bestDist = haversineKm(center, stations[0].position);
  for (const s of stations) {
    const d = haversineKm(center, s.position);
    if (d < bestDist) { bestDist = d; bestId = s.id; }
  }
  return bestId;
}

export function calcRecommended(
  center:   [number, number],
  stations: Station[],
  votes:    VotesMap,
): string | null {
  if (!stations.length) return null;
  let bestId    = stations[0].id;
  let bestScore = -1;
  for (const s of stations) {
    const status = getStationStatus(votes[s.id] ?? {});
    const dist   = haversineKm(center, s.position);
    const score  = 0.6 * STATUS_SCORE[status] + 0.4 * (1 / (1 + dist));
    if (score > bestScore) { bestScore = score; bestId = s.id; }
  }
  return bestId;
}
