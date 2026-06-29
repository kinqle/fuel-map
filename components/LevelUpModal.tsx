"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Theme } from "../lib/types";
import { T } from "../lib/constants";
import { LEVEL_NAMES, BADGES, levelColor, tierName } from "../lib/xp";

const CONFETTI = [
  { id: 0, x: -150, y: -170, emoji: "⭐", delay: 0.10 },
  { id: 1, x:  130, y: -150, emoji: "✨", delay: 0.20 },
  { id: 2, x: -110, y:  130, emoji: "🎉", delay: 0.15 },
  { id: 3, x:  160, y:   90, emoji: "⭐", delay: 0.05 },
  { id: 4, x:    0, y: -200, emoji: "✨", delay: 0.30 },
  { id: 5, x: -180, y:   30, emoji: "💫", delay: 0.25 },
  { id: 6, x:  170, y: -110, emoji: "🎊", delay: 0.12 },
  { id: 7, x:  -60, y:  170, emoji: "⭐", delay: 0.35 },
];

export function LevelUpModal({ level, theme, onClose }: {
  level:   number;
  theme:   Theme;
  onClose: () => void;
}) {
  const tk    = T[theme];
  const color = levelColor(level);
  const name  = LEVEL_NAMES[level] ?? "";
  const tier  = tierName(level);
  const badge = BADGES.find(b => b.level === level);

  // Автозакрытие через 7 секунд
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      {/* Конфетти вокруг карточки */}
      {CONFETTI.map(c => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.5, 1.1], x: c.x, y: c.y }}
          transition={{ duration: 2.6, delay: c.delay, ease: "easeOut" }}
          style={{ position: "absolute", fontSize: 28, pointerEvents: "none", userSelect: "none" }}
        >
          {c.emoji}
        </motion.div>
      ))}

      {/* Основная карточка */}
      <motion.div
        initial={{ scale: 0.55, opacity: 0, y: 80 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{   scale: 0.88,  opacity: 0, y: -24 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: theme === "dark" ? "rgba(10,11,18,0.99)" : "rgba(255,255,255,0.99)",
          border: `2px solid ${color}55`,
          borderRadius: 32,
          padding: "40px 44px 32px",
          textAlign: "center",
          boxShadow: `0 40px 120px rgba(0,0,0,0.65), 0 0 90px ${color}20`,
          minWidth: 290, maxWidth: 340,
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Фоновый градиент за карточкой */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 32,
          background: `radial-gradient(ellipse at 50% 0%, ${color}12 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Надпись УРОВЕНЬ ПОВЫШЕН */}
        <div style={{
          fontSize: 10, fontWeight: 900, letterSpacing: "0.18em",
          textTransform: "uppercase", color, marginBottom: 22, opacity: 0.9,
        }}>
          ▲ УРОВЕНЬ ПОВЫШЕН
        </div>

        {/* Круглый бейдж с пульсацией */}
        <motion.div
          animate={{
            boxShadow: [
              `0 0 0 0px ${color}60`,
              `0 0 0 16px ${color}00`,
            ],
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          style={{
            width: 108, height: 108, borderRadius: "50%",
            background: `${color}18`,
            border: `3px solid ${color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 22px",
          }}
        >
          <span style={{ fontSize: 44, fontWeight: 900, color, lineHeight: 1 }}>
            {level}
          </span>
        </motion.div>

        {/* Название уровня */}
        <div style={{ fontSize: 26, fontWeight: 800, color: tk.text, marginBottom: 5 }}>
          {name}
        </div>

        {/* Тир */}
        <div style={{
          fontSize: 12, fontWeight: 700, color, marginBottom: 26,
          textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.75,
        }}>
          {tier}
        </div>

        {/* Значок если заработан на этом уровне */}
        {badge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.65, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            transition={{ delay: 0.45, type: "spring", stiffness: 380, damping: 22 }}
            style={{
              background: `${color}15`,
              border: `1.5px solid ${color}45`,
              borderRadius: 18, padding: "12px 18px",
              marginBottom: 24,
              display: "flex", alignItems: "center", gap: 12, textAlign: "left",
            }}
          >
            <span style={{ fontSize: 28, flexShrink: 0 }}>{badge.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: tk.text }}>
                Новый значок: {badge.name}
              </div>
              <div style={{ fontSize: 11, color: tk.textSub, marginTop: 2 }}>
                {badge.desc}
              </div>
            </div>
          </motion.div>
        )}

        {/* Кнопка */}
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "13px", borderRadius: 18, border: "none",
            background: `${color}20`, color,
            fontSize: 14, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit", transition: "background 0.15s",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = `${color}35`)}
          onMouseLeave={e => (e.currentTarget.style.background = `${color}20`)}
        >
          Продолжить
        </button>
      </motion.div>
    </div>
  );
}
