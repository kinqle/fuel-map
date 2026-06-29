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

// Начислить XP за голос:
// - первый голос на заправке за последний час → полный XP (20)
// - дополнительные виды топлива в той же сессии → XP_PER_VOTE_EXTRA (3)
// Кулдаун по топливу убран — защита через геолокацию в MapView
export function awardVoteXp(stationId: string, fuel: string): VoteXpResult {
  const data         = load();
  const now          = Date.now();
  const oldLevel     = levelFromXp(data.xp);
  const lastStation  = data.stationFirst[stationId] ?? 0;
  const isNewSession = now - lastStation >= SESSION_MS;
  const gain         = isNewSession ? XP_PER_VOTE : XP_PER_VOTE_EXTRA;
  const newXp        = data.xp + gain;
  const newLevel     = levelFromXp(newXp);

  save({
    xp:           newXp,
    totalVotes:   data.totalVotes + 1,
    cooldowns:    data.cooldowns,
    stationFirst: isNewSession
      ? { ...data.stationFirst, [stationId]: now }
      : data.stationFirst,
  });

  return { awarded: true, xpGained: gain, newXp, totalVotes: data.totalVotes + 1, oldLevel, newLevel };
}
