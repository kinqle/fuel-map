import { createHash } from "crypto";
import type { NextRequest } from "next/server";

// Хэш IP чтобы не хранить сырые адреса
export function getIpHash(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
          ?? req.headers.get("x-real-ip")
          ?? "unknown";
  return createHash("sha256").update(ip + "benzok-salt").digest("hex").slice(0, 16);
}

// ── Простой in-memory rate limiter ────────────────────────────────────────────

const ipTimestamps = new Map<string, number[]>();

export function checkRateLimit(ipHash: string, windowMs: number, maxHits: number): boolean {
  const now = Date.now();
  const ts  = (ipTimestamps.get(ipHash) ?? []).filter(t => now - t < windowMs);
  if (ts.length >= maxHits) return false;
  ts.push(now);
  ipTimestamps.set(ipHash, ts);
  // Чистим карту если слишком выросла
  if (ipTimestamps.size > 10_000) {
    for (const [k, v] of ipTimestamps) {
      if (v.every(t => now - t > windowMs)) ipTimestamps.delete(k);
    }
  }
  return true;
}

// ── Детектор подозрительного IP (много device_id с одного адреса) ─────────────

const ipDeviceLog = new Map<string, Array<{ device: string; time: number }>>();
const DEVICE_WINDOW = 10 * 60_000; // 10 минут
const MAX_DEVICES   = 8;           // больше 8 уникальных device_id — бот

export function isSuspiciousIp(ipHash: string, deviceId: string): boolean {
  const now = Date.now();
  const log = (ipDeviceLog.get(ipHash) ?? []).filter(e => now - e.time < DEVICE_WINDOW);
  log.push({ device: deviceId, time: now });
  ipDeviceLog.set(ipHash, log);
  const unique = new Set(log.map(e => e.device));
  return unique.size > MAX_DEVICES;
}
