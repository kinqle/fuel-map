"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Theme } from "../lib/types";
import { T } from "../lib/constants";
import { LEVEL_NAMES, tierColor } from "../lib/xp";

// Фиксированные позиции частиц — разброс вокруг центра карточки
const PARTICLES = [
  { id: 0, dx: -90, emoji: "❤️", delay: 0.00 },
  { id: 1, dx: -45, emoji: "✨", delay: 0.14 },
  { id: 2, dx:   0, emoji: "👍", delay: 0.05 },
  { id: 3, dx:  50, emoji: "❤️", delay: 0.22 },
  { id: 4, dx:  95, emoji: "✨", delay: 0.10 },
  { id: 5, dx: -65, emoji: "💫", delay: 0.30 },
  { id: 6, dx:  25, emoji: "❤️", delay: 0.18 },
  { id: 7, dx:  70, emoji: "💫", delay: 0.36 },
];

export function VoteAnimation({ xpGained, levelUp, newXp, theme, onDone }: {
  xpGained: number;
  levelUp:  number | null;
  newXp:    number;
  theme:    Theme;
  onDone:   () => void;
}) {
  const tk    = T[theme];
  const color = levelUp ? tierColor(levelUp) : "#818cf8";

  // Автоматически скрыть через 2.8 секунды
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      pointerEvents: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Плавающие частицы */}
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 60, x: p.dx, scale: 0.4 }}
          animate={{ opacity: [0, 1, 1, 0], y: -180, scale: [0.4, 1.3, 0.9] }}
          transition={{ duration: 2.5, delay: p.delay, ease: "easeOut" }}
          style={{ position: "absolute", fontSize: 30, userSelect: "none" }}
        >
          {p.emoji}
        </motion.div>
      ))}

      {/* Карточка благодарности */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.82 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 360, damping: 26, delay: 0.08 }}
        style={{
          position: "relative", zIndex: 1,
          background: theme === "dark" ? "rgba(16,18,26,0.98)" : "rgba(255,255,255,0.98)",
          border: `1.5px solid ${theme === "dark" ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.25)"}`,
          borderRadius: 28, padding: "28px 44px 24px",
          textAlign: "center",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          minWidth: 260, maxWidth: 320,
        }}
      >
        {/* Иконка с эффектом покачивания */}
        <motion.div
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 0.55, delay: 0.18 }}
          style={{ fontSize: 54, marginBottom: 10, display: "block", lineHeight: 1 }}
        >
          🙏
        </motion.div>

        <div style={{ fontSize: 21, fontWeight: 800, color: tk.text, marginBottom: 6 }}>
          Спасибо!
        </div>
        <div style={{ fontSize: 13, color: tk.textSub, lineHeight: 1.5, marginBottom: 18 }}>
          Вы помогаете другим водителям<br />найти топливо
        </div>

        {/* Плашка с XP */}
        {xpGained > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.55, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.32, type: "spring", stiffness: 520, damping: 22 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.18))",
              border: "1.5px solid rgba(99,102,241,0.5)",
              borderRadius: 24, padding: "8px 20px",
              color: "#818cf8", fontWeight: 800, fontSize: 17,
              marginBottom: levelUp ? 10 : 0,
            }}
          >
            ⚡ +{xpGained} XP
          </motion.div>
        )}

        {/* Сообщение о повышении уровня */}
        {levelUp && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.52, type: "spring", stiffness: 420, damping: 22 }}
            style={{
              background: `linear-gradient(135deg,${color}25,${color}15)`,
              border: `1.5px solid ${color}70`,
              borderRadius: 20, padding: "8px 18px",
              color, fontWeight: 800, fontSize: 14,
            }}
          >
            🎉 Уровень {levelUp}! · {LEVEL_NAMES[levelUp] ?? ""}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
