"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FuelId, Theme } from "../lib/types";
import { T } from "../lib/constants";

const FUELS: { id: FuelId; label: string; color: string }[] = [
  { id: "ai92",   label: "АИ-92", color: "#60a5fa" },
  { id: "ai95",   label: "АИ-95", color: "#34d399" },
  { id: "diesel", label: "ДТ",    color: "#fbbf24" },
];

export function TripConfirmBanner({ stationName, theme, isMobile, onSave, onNone, onDismiss }: {
  stationName: string;
  theme:       Theme;
  isMobile:    boolean;
  onSave:      (fuels: FuelId[]) => void;
  onNone:      () => void;
  onDismiss:   () => void;
}) {
  const tk = T[theme];
  const [selected, setSelected] = useState<Set<FuelId>>(new Set());

  function toggle(id: FuelId) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      exit={{    y: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      style={{
        position: "fixed",
        bottom: isMobile ? `calc(24px + env(safe-area-inset-bottom))` : 24,
        left: isMobile ? 16 : "50%",
        right: isMobile ? 16 : "auto",
        transform: isMobile ? "none" : "translateX(-50%)",
        width: isMobile ? "auto" : 380,
        zIndex: 2000,
        background: tk.card,
        borderRadius: 20,
        border: `1px solid ${tk.divider}`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        padding: "16px 18px",
      }}
    >
      <button
        onClick={onDismiss}
        style={{
          position: "absolute", top: 12, right: 12,
          width: 26, height: 26, borderRadius: "50%",
          border: "none", background: tk.rowBg, color: tk.textSub,
          fontSize: 13, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >✕</button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 26, flexShrink: 0 }}>⛽</span>
        <div>
          <div style={{ color: tk.text, fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
            Вы были у {stationName}?
          </div>
          <div style={{ color: tk.textSub, fontSize: 12 }}>
            Отметьте что нашли в наличии
          </div>
        </div>
      </div>

      {/* Чипы топлива */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {FUELS.map(f => {
          const active = selected.has(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 12,
                border: `1.5px solid ${active ? f.color : tk.ctrlBorder}`,
                background: active ? `${f.color}22` : "transparent",
                color: active ? f.color : tk.textSub,
                fontSize: 13, fontWeight: active ? 700 : 500,
                fontFamily: "inherit", cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {active ? "✓ " : ""}{f.label}
            </button>
          );
        })}
      </div>

      {/* Кнопки действий */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onSave([...selected])}
          disabled={selected.size === 0}
          style={{
            flex: 2, padding: "11px 0", borderRadius: 14,
            border: `1.5px solid ${selected.size > 0 ? "rgba(34,197,94,0.4)" : tk.ctrlBorder}`,
            background: selected.size > 0 ? "rgba(34,197,94,0.15)" : "transparent",
            color: selected.size > 0 ? "#22c55e" : tk.textSub,
            fontSize: 13, fontWeight: 700, cursor: selected.size > 0 ? "pointer" : "default",
            fontFamily: "inherit", transition: "all 0.12s",
          }}
        >
          Сохранить
        </button>
        <button
          onClick={onNone}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 14,
            border: "1.5px solid rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.08)", color: "#ef4444",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.12s",
          }}
        >
          Пусто
        </button>
      </div>
    </motion.div>
  );
}
