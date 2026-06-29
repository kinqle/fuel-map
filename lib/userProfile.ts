// Профиль пользователя: XP хранится в localStorage
import { XP_PER_VOTE, XP_PER_VOTE_EXTRA, SESSION_MS, levelFromXp } from "./xp";

interface XpData {
  xp:           number;
  totalVotes:   number;
  cooldowns:    Record<string, number>; // не используется, сохраняется для совместимости
  stationFirst: Record<string, number>; // stationId → начало текущей 30-мин сессии
  stationFuels: Record<string, string[]>; // stationId → виды топлива, за которые уже дали XP в сессии
}

function load(): XpData {
  if (typeof window === "undefined") return { xp: 0, totalVotes: 0, cooldowns: {}, stationFirst: {}, stationFuels: {} };
  try {
    const s = localStorage.getItem("user_xp");
    if (s) {
      const d = JSON.parse(s) as XpData;
      if (!d.stationFirst) d.stationFirst = {};
      if (!d.stationFuels) d.stationFuels = {};
      return d;
    }
  } catch {}
  return { xp: 0, totalVotes: 0, cooldowns: {}, stationFirst: {}, stationFuels: {} };
}

function save(data: XpData): void {
  try { localStorage.setItem("user_xp", JSON.stringify(data)); } catch {}
}

export function getUserXpData(): { xp: number; totalVotes: number } {
  const d = load();
  return { xp: d.xp, totalVotes: d.totalVotes };
}

export interface VoteXpResult {
  awarded:       boolean;
  xpGained:      number;
  newXp:         number;
  totalVotes:    number;
  oldLevel:      number;
  newLevel:      number;
  alreadyEarned: boolean; // голос принят, но XP уже были начислены раньше в этой сессии
}

// Начислить XP за голос:
// - новая сессия (прошло > 30 мин) → 20 XP, начинаем сессию
// - тот же вид топлива уже голосовался в этой сессии → 0 XP (alreadyEarned: true)
// - новый вид топлива в той же сессии → 3 XP
// Защита от накрутки через геолокацию в MapView
export function awardVoteXp(stationId: string, fuel: string): VoteXpResult {
  const data         = load();
  const now          = Date.now();
  const oldLevel     = levelFromXp(data.xp);
  const lastStation  = data.stationFirst[stationId] ?? 0;
  const isNewSession = now - lastStation >= SESSION_MS;
  const sessionFuels = isNewSession ? [] : (data.stationFuels[stationId] ?? []);

  // За этот вид топлива уже давали XP в текущей сессии — голос принят, XP не начисляем
  if (!isNewSession && sessionFuels.includes(fuel)) {
    return { awarded: false, xpGained: 0, newXp: data.xp, totalVotes: data.totalVotes, oldLevel, newLevel: oldLevel, alreadyEarned: true };
  }

  const isFirstFuel = sessionFuels.length === 0;
  const gain        = isFirstFuel ? XP_PER_VOTE : XP_PER_VOTE_EXTRA;
  const newXp       = data.xp + gain;
  const newLevel    = levelFromXp(newXp);

  save({
    xp:           newXp,
    totalVotes:   data.totalVotes + 1,
    cooldowns:    data.cooldowns,
    stationFirst: isNewSession ? { ...data.stationFirst, [stationId]: now } : data.stationFirst,
    stationFuels: { ...data.stationFuels, [stationId]: [...sessionFuels, fuel] },
  });

  return { awarded: true, xpGained: gain, newXp, totalVotes: data.totalVotes + 1, oldLevel, newLevel, alreadyEarned: false };
}
