// Профиль пользователя: XP и кулдауны хранятся в localStorage
import { XP_PER_VOTE, XP_PER_VOTE_EXTRA, COOLDOWN_MS, SESSION_MS, levelFromXp } from "./xp";

interface XpData {
  xp:           number;
  totalVotes:   number;
  cooldowns:    Record<string, number>; // "stationId:fuel" → timestamp (8ч кулдаун на вид топлива)
  stationFirst: Record<string, number>; // "stationId" → timestamp первого полного XP в этой сессии
}

function load(): XpData {
  if (typeof window === "undefined") return { xp: 0, totalVotes: 0, cooldowns: {}, stationFirst: {} };
  try {
    const s = localStorage.getItem("user_xp");
    if (s) {
      const d = JSON.parse(s) as XpData;
      // Совместимость со старой схемой без stationFirst
      if (!d.stationFirst) d.stationFirst = {};
      return d;
    }
  } catch {}
  return { xp: 0, totalVotes: 0, cooldowns: {}, stationFirst: {} };
}

function save(data: XpData): void {
  try { localStorage.setItem("user_xp", JSON.stringify(data)); } catch {}
}

export function getUserXpData(): { xp: number; totalVotes: number } {
  const d = load();
  return { xp: d.xp, totalVotes: d.totalVotes };
}

export interface VoteXpResult {
  awarded:    boolean;
  xpGained:   number;
  newXp:      number;
  totalVotes: number;
  oldLevel:   number;
  newLevel:   number;
}

// Начислить XP с учётом двух уровней защиты:
// 1) 8-часовой кулдаун на конкретный вид топлива → 0 XP
// 2) В рамках одного часа на заправке первый голос даёт полный XP, остальные — XP_PER_VOTE_EXTRA
export function awardVoteXp(stationId: string, fuel: string): VoteXpResult {
  const data     = load();
  const fuelKey  = `${stationId}:${fuel}`;
  const now      = Date.now();
  const lastFuel = data.cooldowns[fuelKey] ?? 0;
  const oldLevel = levelFromXp(data.xp);

  // Жёсткий кулдаун: уже голосовал по этому топливу недавно
  if (now - lastFuel < COOLDOWN_MS) {
    return { awarded: false, xpGained: 0, newXp: data.xp, totalVotes: data.totalVotes, oldLevel, newLevel: oldLevel };
  }

  // Определяем, первый ли это голос на этой заправке в текущей сессии
  const lastStation = data.stationFirst[stationId] ?? 0;
  const isNewSession = now - lastStation >= SESSION_MS;
  const gain = isNewSession ? XP_PER_VOTE : XP_PER_VOTE_EXTRA;

  const newXp    = data.xp + gain;
  const newLevel = levelFromXp(newXp);

  save({
    xp:           newXp,
    totalVotes:   data.totalVotes + 1,
    cooldowns:    { ...data.cooldowns, [fuelKey]: now },
    stationFirst: isNewSession
      ? { ...data.stationFirst, [stationId]: now } // начинаем новую сессию
      : data.stationFirst,                          // сессия продолжается
  });

  return { awarded: true, xpGained: gain, newXp, totalVotes: data.totalVotes + 1, oldLevel, newLevel };
}
