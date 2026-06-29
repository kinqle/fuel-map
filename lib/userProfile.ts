// Профиль пользователя: XP и кулдауны хранятся в localStorage
import { XP_PER_VOTE, COOLDOWN_MS, levelFromXp } from "./xp";

interface XpData {
  xp:         number;
  totalVotes: number;
  cooldowns:  Record<string, number>; // "stationId:fuel" → timestamp последнего начисления
}

function load(): XpData {
  if (typeof window === "undefined") return { xp: 0, totalVotes: 0, cooldowns: {} };
  try {
    const s = localStorage.getItem("user_xp");
    if (s) return JSON.parse(s) as XpData;
  } catch {}
  return { xp: 0, totalVotes: 0, cooldowns: {} };
}

function save(data: XpData): void {
  try { localStorage.setItem("user_xp", JSON.stringify(data)); } catch {}
}

export function getUserXpData(): XpData {
  return load();
}

export interface VoteXpResult {
  awarded:    boolean;
  xpGained:   number;
  newXp:      number;
  totalVotes: number;
  oldLevel:   number;
  newLevel:   number;
}

// Начислить XP за голосование; кулдаун 8 часов на одну связку станция+вид топлива
export function awardVoteXp(stationId: string, fuel: string): VoteXpResult {
  const data     = load();
  const key      = `${stationId}:${fuel}`;
  const now      = Date.now();
  const lastAt   = data.cooldowns[key] ?? 0;
  const oldLevel = levelFromXp(data.xp);

  if (now - lastAt < COOLDOWN_MS) {
    return { awarded: false, xpGained: 0, newXp: data.xp, totalVotes: data.totalVotes, oldLevel, newLevel: oldLevel };
  }

  const newXp   = data.xp + XP_PER_VOTE;
  const newLevel = levelFromXp(newXp);
  save({
    xp:         newXp,
    totalVotes: data.totalVotes + 1,
    cooldowns:  { ...data.cooldowns, [key]: now },
  });
  return { awarded: true, xpGained: XP_PER_VOTE, newXp, totalVotes: data.totalVotes + 1, oldLevel, newLevel };
}
