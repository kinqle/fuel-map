import type { Theme, FuelId, MarkerStatus, FuelVotes, Filters, City } from "./types";

export const CITIES_FALLBACK: City[] = [
  { id: "tver",        name: "Тверь",              position: [56.8587, 35.9176] },
  { id: "moscow",      name: "Москва",             position: [55.7558, 37.6176] },
  { id: "mo",          name: "Московская область", position: [55.8200, 37.9000] },
  { id: "spb",         name: "Санкт-Петербург",    position: [59.9311, 30.3609] },
  { id: "ekb",         name: "Екатеринбург",       position: [56.8389, 60.6057] },
  { id: "nsk",         name: "Новосибирск",        position: [54.9885, 82.9207] },
  { id: "kazan",       name: "Казань",             position: [55.8304, 49.0661] },
  { id: "krasnodar",   name: "Краснодар",          position: [45.0355, 38.9753] },
  { id: "samara",      name: "Самара",             position: [53.2001, 50.1500] },
  { id: "ufa",         name: "Уфа",               position: [54.7388, 55.9721] },
  { id: "chelyabinsk", name: "Челябинск",          position: [55.1644, 61.4368] },
];

export const FUELS: { id: FuelId; label: string; color: string }[] = [
  { id: "ai92",   label: "АИ-92", color: "#60a5fa" },
  { id: "ai95",   label: "АИ-95", color: "#34d399" },
  { id: "diesel", label: "ДТ",    color: "#fbbf24" },
];

export const BRAND_COLORS: Record<string, string> = {
  lukoil:         "#e63946",
  rosneft:        "#1a73e8",
  gazprom:        "#2a9d8f",
  bashneft:       "#f97316",
  tatneft:        "#8b5cf6",
  surgutneftegas: "#0ea5e9",
  neftmagistral:  "#10b981",
  teboil:         "#cc0000",
  bp:             "#16a34a",
  shell:          "#ca8a04",
  neste:          "#0284c7",
  total:          "#dc2626",
};

export const BRAND_LOGOS: Record<string, string> = {
  lukoil:   "/brands/lukoil.svg",
  rosneft:  "/brands/rosneft.svg",
  gazprom:  "/brands/gazprom.png",
  bashneft: "/brands/bashneft.svg",
  tatneft:  "/brands/tatneft.svg",
  neste:    "/brands/neste.svg",
  shell:    "/brands/shell.svg",
  total:    "/brands/total.svg",
  teboil:   "/brands/teboil.svg",
};

export const TILE_URLS: Record<Theme, string> = {
  dark:  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
};

export const T = {
  dark: {
    bg:             "#0f0f13",
    card:           "linear-gradient(180deg,#16161e 0%,#0f0f13 100%)",
    cardShadow:     "0 -8px 48px rgba(0,0,0,0.65)",
    text:           "#ffffff",
    textSub:        "rgba(255,255,255,0.38)",
    ctrl:           "rgba(15,15,19,0.88)",
    ctrlBorder:     "rgba(255,255,255,0.12)",
    ctrlText:       "#ffffff",
    divider:        "rgba(255,255,255,0.07)",
    handle:         "rgba(255,255,255,0.14)",
    rowBg:          "rgba(255,255,255,0.04)",
    rowBorder:      "rgba(255,255,255,0.06)",
    voteBg:         "rgba(255,255,255,0.07)",
    voteColor:      "rgba(255,255,255,0.45)",
    cityListBg:     "#18181f",
    cityListBorder: "rgba(255,255,255,0.1)",
    cityHover:      "rgba(255,255,255,0.06)",
    iconBg:  (c: string) => `${c}18`,
    iconBdr: (c: string) => `${c}30`,
  },
  light: {
    bg:             "#eef0f4",
    card:           "linear-gradient(180deg,#ffffff 0%,#f8f9fb 100%)",
    cardShadow:     "0 -8px 48px rgba(0,0,0,0.15)",
    text:           "#1a1a2e",
    textSub:        "rgba(0,0,0,0.4)",
    ctrl:           "rgba(255,255,255,0.92)",
    ctrlBorder:     "rgba(0,0,0,0.1)",
    ctrlText:       "#1a1a2e",
    divider:        "rgba(0,0,0,0.08)",
    handle:         "rgba(0,0,0,0.12)",
    rowBg:          "rgba(0,0,0,0.03)",
    rowBorder:      "rgba(0,0,0,0.06)",
    voteBg:         "rgba(0,0,0,0.06)",
    voteColor:      "rgba(0,0,0,0.45)",
    cityListBg:     "#ffffff",
    cityListBorder: "rgba(0,0,0,0.1)",
    cityHover:      "rgba(0,0,0,0.04)",
    iconBg:  (c: string) => `${c}18`,
    iconBdr: (c: string) => `${c}40`,
  },
} as const;

export type TkType = typeof T[Theme];

export const STATUS_COLORS: Record<MarkerStatus, { bg: string; glow: string }> = {
  green:   { bg: "#22c55e", glow: "34,197,94"   },
  yellow:  { bg: "#f97316", glow: "249,115,22"  },
  red:     { bg: "#ef4444", glow: "239,68,68"   },
  neutral: { bg: "#6b7280", glow: "107,114,128" },
};

export const STATUS_META = {
  green:   { label: "Топливо есть",   bg: "rgba(34,197,94,0.14)",   color: "#22c55e" },
  yellow:  { label: "Данные неточны", bg: "rgba(245,158,11,0.14)",  color: "#f59e0b" },
  red:     { label: "Топлива нет",    bg: "rgba(239,68,68,0.14)",   color: "#ef4444" },
  neutral: { label: "Нет данных",     bg: "rgba(107,114,128,0.14)", color: "#9ca3af" },
} as const;

export const DEFAULT_FILTERS: Filters = {
  fuels: new Set(), brands: new Set(), nearbyOnly: false, inStockOnly: false,
};

export const COMMENT_CATS = [
  { id: "fuel_yes", emoji: "🟢", label: "Есть топливо"    },
  { id: "fuel_no",  emoji: "🔴", label: "Нет топлива"     },
  { id: "refill",   emoji: "⛽", label: "Привезли бензин" },
  { id: "queue",    emoji: "🚗", label: "Большая очередь" },
  { id: "no_card",  emoji: "💳", label: "Нет терминала"   },
  { id: "problem",  emoji: "⚠️", label: "Проблема"        },
  { id: "other",    emoji: "💬", label: "Другое"          },
] as const;

export const RECENT_LIMIT = 8;
export const HALFLIFE_SEC = 3 * 3600;
export const REPORT_HIDE  = 3;
export const COMMENT_GAP  = 15 * 60_000;
export const ARCHIVE_MS   = 24 * 3_600_000;
export const MAX_BODY     = 280;

export const EMPTY_FUEL: FuelVotes = { yes: 0, no: 0, yesW: 0, noW: 0, myVote: null, lastAt: null };
