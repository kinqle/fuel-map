"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { Theme } from "../lib/types";
import { T } from "../lib/constants";

export function TripConfirmBanner({ stationName, theme, isMobile, onYes, onNo, onDismiss }: {
  stationName: string;
  theme:       Theme;
  isMobile:    boolean;
  onYes:       () => void;
  onNo:        () => void;
  onDismiss:   () => void;
}) {
  const tk = T[theme];

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
      {/* Кнопка закрыть */}
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
        <span style={{ fontSize: 28, flexShrink: 0 }}>⛽</span>
        <div>
          <div style={{ color: tk.text, fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
            Вы были на АЗС?
          </div>
          <div style={{ color: tk.textSub, fontSize: 12, lineHeight: 1.4 }}>
            {stationName} — топливо нашли?
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onYes}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 14,
            border: "1.5px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.15)", color: "#22c55e",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            transition: "background 0.12s",
          }}
        >
          ✅ Да, есть
        </button>
        <button
          onClick={onNo}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 14,
            border: "1.5px solid rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.12)", color: "#ef4444",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            transition: "background 0.12s",
          }}
        >
          ❌ Нет, пусто
        </button>
      </div>
    </motion.div>
  );
}
