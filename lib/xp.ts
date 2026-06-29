// Система уровней и опыта

export const XP_PER_VOTE = 20;
export const COOLDOWN_MS  = 8 * 60 * 60 * 1000; // 8 часов — защита от фарма
export const MAX_LEVEL    = 50;

// Имена всех 50 уровней
export const LEVEL_NAMES: string[] = [
  "",                     // 0 — не используется
  "Наблюдатель",
  "Проезжающий",
  "Местный житель",
  "Постоянный клиент",
  "Первый помощник",      // 5 → значок
  "Информатор",
  "Внимательный",
  "Ориентировщик",
  "Дорожный патруль",
  "Разведчик",            // 10 → значок
  "Активист",
  "Знаток района",
  "Верный страж",
  "Дорожный эксперт",
  "Инспектор заправок",   // 15 → значок
  "Знаток",
  "Аналитик топлива",
  "Дорожный специалист",
  "Хранитель данных",
  "Топливный детектив",   // 20 → значок
  "Мастер",
  "Навигатор",
  "Охотник за бензином",
  "Топливный рейнджер",
  "Мастер заправок",      // 25 → значок
  "Гуру",
  "Топливный гуру",
  "Дорожный гений",
  "Легенда района",
  "Элитный разведчик",    // 30 → значок
  "Легенда",
  "Ветеран дорог",
  "Хранитель карты",
  "Топливный стратег",
  "Дорожная легенда",     // 35 → значок
  "Элита",
  "Топливный чемпион",
  "Дорожный архитектор",
  "Навигатор-легенда",
  "Ас топлива",           // 40 → значок
  "Герой",
  "Топливный герой",
  "Спаситель водителей",
  "Дорожный супергерой",
  "Хранитель дорог",      // 45 → значок
  "Легендарный",
  "Недостижимый",
  "Высший разряд",
  "Бессмертный",
  "Бог топлива",          // 50 → значок
];

export interface Badge {
  level: number;
  emoji: string;
  name:  string;
  desc:  string;
}

// Значки каждые 5 уровней — итого 10 штук
export const BADGES: Badge[] = [
  { level: 5,  emoji: "🔰", name: "Первые шаги",        desc: "Сделал первые шаги в сообществе" },
  { level: 10, emoji: "⭐", name: "Надёжный источник",  desc: "Стал настоящим помощником на дорогах" },
  { level: 15, emoji: "🌟", name: "Активный участник",  desc: "Регулярно помогает водителям" },
  { level: 20, emoji: "💫", name: "Знаток дорог",       desc: "Отличное знание заправок города" },
  { level: 25, emoji: "🏅", name: "Дорожный мастер",    desc: "Мастер топливной разведки" },
  { level: 30, emoji: "🥈", name: "Гуру топлива",       desc: "Эксперт по всем заправкам региона" },
  { level: 35, emoji: "🥇", name: "Легенда заправок",   desc: "Легендарный вклад в сообщество" },
  { level: 40, emoji: "💎", name: "Бриллиантовый ас",   desc: "Элита среди водителей" },
  { level: 45, emoji: "👑", name: "Герой дорог",        desc: "Герой топливного сообщества" },
  { level: 50, emoji: "🚀", name: "Бог топлива",        desc: "Высшее достижение. Абсолютная легенда." },
];

// Суммарный XP для достижения уровня n (экспоненциальная кривая)
// Уровень 10 ~164 голосов, уровень 30 ~2250, уровень 50 ~7000+
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(30 * Math.pow(level - 1, 2.1));
}

// Текущий уровень по суммарному XP
export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && totalXpForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
}

// Прогресс внутри текущего уровня
export function levelProgress(xp: number): {
  level:   number;
  current: number;
  needed:  number;
  pct:     number;
} {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { level, current: 0, needed: 0, pct: 100 };
  const base    = totalXpForLevel(level);
  const next    = totalXpForLevel(level + 1);
  const current = xp - base;
  const needed  = next - base;
  return { level, current, needed, pct: Math.min(100, Math.round((current / needed) * 100)) };
}

// Значки, заработанные к данному уровню
export function earnedBadges(level: number): Badge[] {
  return BADGES.filter(b => b.level <= level);
}

// Название тира (диапазона уровней)
export function tierName(level: number): string {
  if (level <= 5)  return "Новичок";
  if (level <= 10) return "Помощник";
  if (level <= 15) return "Активист";
  if (level <= 20) return "Знаток";
  if (level <= 25) return "Мастер";
  if (level <= 30) return "Гуру";
  if (level <= 35) return "Легенда";
  if (level <= 40) return "Элита";
  if (level <= 45) return "Герой";
  return "Легендарный";
}

// Цвет тира
export function tierColor(level: number): string {
  if (level <= 5)  return "#9ca3af";
  if (level <= 10) return "#4ade80";
  if (level <= 15) return "#60a5fa";
  if (level <= 20) return "#a78bfa";
  if (level <= 25) return "#fb923c";
  if (level <= 30) return "#f87171";
  if (level <= 35) return "#fbbf24";
  if (level <= 40) return "#22d3ee";
  if (level <= 45) return "#f472b6";
  return "#818cf8";
}
