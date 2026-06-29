import type { Theme } from "./types";

export function getDeviceId(): string {
  let id = localStorage.getItem("device_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("device_id", id); }
  return id;
}

export function getStoredTheme(): Theme {
  return (localStorage.getItem("theme") as Theme | null) ?? "dark";
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function formatDist(d: number): string {
  return d < 1 ? `${Math.round(d * 1000)} м` : `${d.toFixed(1)} км`;
}

export function formatAge(iso: string | null): string {
  if (!iso) return "";
  let normalized = iso.replace(" ", "T");
  if (!/[Z+]/.test(normalized.slice(10))) normalized += "Z";
  const diff = Math.floor((Date.now() - new Date(normalized).getTime()) / 1000);
  if (diff < 60)    return "только что";
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

export function getAgeSec(lastAt: string | null): number {
  if (!lastAt) return Infinity;
  let n = lastAt.replace(" ", "T");
  if (!/[Z+]/.test(n.slice(10))) n += "Z";
  return (Date.now() - new Date(n).getTime()) / 1000;
}
