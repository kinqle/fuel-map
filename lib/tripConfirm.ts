const KEY = "benzok_trip";
const CONFIRM_AFTER_MS  = 15 * 60 * 1000; // показываем вопрос через 15 мин
const EXPIRE_AFTER_MS   = 90 * 60 * 1000; // через 1.5 часа — поздно спрашивать

export interface PendingTrip {
  stationId:   string;
  stationName: string;
  at:          number;
}

export function savePendingTrip(stationId: string, stationName: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ stationId, stationName, at: Date.now() }));
  } catch {}
}

export function getPendingTrip(): PendingTrip | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const trip: PendingTrip = JSON.parse(raw);
    const age = Date.now() - trip.at;
    if (age < CONFIRM_AFTER_MS || age > EXPIRE_AFTER_MS) return null;
    return trip;
  } catch {
    return null;
  }
}

export function clearPendingTrip(): void {
  try { localStorage.removeItem(KEY); } catch {}
}
