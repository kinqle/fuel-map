"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Theme } from "../lib/types";
import { T } from "../lib/constants";
import {
  levelProgress, LEVEL_NAMES, BADGES, MAX_LEVEL,
  totalXpForLevel, XP_PER_VOTE, tierColor, tierName, earnedBadges,
} from "../lib/xp";
import { getUserXpData } from "../lib/userProfile";

function StatCard({ label, value, color, theme }: {
  label: string; value: string; color: string; theme: Theme;
}) {
  const tk = T[theme];
  return (
    <div style={{
      background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      borderRadius: 16, padding: "14px 16px", textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: tk.textSub, marginTop: 3 }}>{label}</div>
    </div>
  );
}

export function LevelScreen({ theme, isMobile, onClose }: {
  theme:    Theme;
  isMobile: boolean;
  onClose:  () => void;
}) {
  const tk = T[theme];

  // Читаем XP один раз при монтировании (экран закрывается и открывается заново)
  const [xpData] = useState(getUserXpData);
  // Контролируем сворачивание информационной карточки
  const [infoOpen, setInfoOpen] = useState(true);

  const { level, current, needed, pct } = levelProgress(xpData.xp);
  const color    = tierColor(level);
  const tier     = tierName(level);
  const earned   = earnedBadges(level);
  const nextBadge = BADGES.find(b => b.level > level);
  const votesLeft = nextBadge
    ? Math.max(0, Math.ceil((totalXpForLevel(nextBadge.level) - xpData.xp) / XP_PER_VOTE))
    : 0;

  // Цвет фона кольца прогресса (тёмный: полупрозрачный, светлый: светло-серый)
  const ringBg = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const panelStyle: React.CSSProperties = isMobile ? {
    position: "fixed", inset: 0, zIndex: 1002,
    background: tk.bg, overflowY: "auto",
    padding: "calc(20px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))",
  } : {
    position: "fixed", left: 0, top: 0, bottom: 0,
    width: 360, zIndex: 1002,
    background: tk.bg,
    boxShadow: "4px 0 48px rgba(0,0,0,0.4)",
    overflowY: "auto",
    padding: "24px 24px",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isMobile ? 0 : -40, y: isMobile ? 40 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: isMobile ? 0 : -40, y: isMobile ? 40 : 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      style={panelStyle}
    >
      {/* Информационная карточка — объяснение системы */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          marginBottom: 20,
          background: theme === "dark" ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.07)",
          border: `1px solid rgba(99,102,241,0.30)`,
          borderRadius: 18, overflow: "hidden",
        }}
      >
        <button
          onClick={() => setInfoOpen(o => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", background: "none", border: "none", cursor: "pointer",
            color: "#818cf8",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14 }}>🏆 Как работает система уровней?</span>
          <motion.span
            animate={{ rotate: infoOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 12, opacity: 0.7 }}
          >▼</motion.span>
        </button>

        <AnimatePresence initial={false}>
          {infoOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { ico: "⚡", text: "За каждое голосование о наличии топлива вы получаете 20 XP" },
                  { ico: "⏱️", text: "XP начисляется раз в 8 часов на каждой заправке — это защита от накрутки. Объезжать все станции ради XP бессмысленно" },
                  { ico: "🎖️", text: "Каждые 5 уровней выдаётся значок. Всего 50 уровней и 10 значков" },
                  { ico: "🌍", text: "Ваш рейтинг отражает реальный вклад в помощь водителям города" },
                ].map(({ ico, text }) => (
                  <div key={ico} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{ico}</span>
                    <span style={{ fontSize: 12, color: tk.textSub, lineHeight: 1.5 }}>{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Шапка */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: tk.text }}>Мой уровень</div>
          <div style={{ fontSize: 12, color: tk.textSub, marginTop: 2 }}>Достижения и прогресс</div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "none",
            background: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
            color: tk.textSub, fontSize: 20, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >×</button>
      </div>

      {/* Кольцо прогресса с номером уровня */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: level < MAX_LEVEL
            ? `conic-gradient(${color} ${pct * 3.6}deg, ${ringBg} 0deg)`
            : color,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
          boxShadow: `0 0 32px ${color}40`,
        }}>
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: tk.bg,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1 }}>{level}</span>
            <span style={{ fontSize: 9, color: tk.textSub, letterSpacing: 1, marginTop: 1 }}>УРОВЕНЬ</span>
          </div>
        </div>

        <div style={{ fontSize: 24, fontWeight: 800, color: tk.text, marginBottom: 4 }}>
          {LEVEL_NAMES[level]}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, color,
          background: `${color}18`, border: `1px solid ${color}40`,
          borderRadius: 20, padding: "3px 12px",
        }}>
          {tier}
        </div>
      </div>

      {/* Прогресс-бар */}
      {level < MAX_LEVEL ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: tk.textSub, marginBottom: 7 }}>
            <span>{current.toLocaleString("ru")} XP</span>
            <span>до ур. {level + 1}: {needed.toLocaleString("ru")} XP</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: ringBg, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
              style={{
                height: "100%", borderRadius: 4,
                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
              }}
            />
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: tk.textSub, marginTop: 4 }}>{pct}%</div>
        </div>
      ) : (
        <div style={{ textAlign: "center", marginBottom: 24, color, fontSize: 14, fontWeight: 700 }}>
          🚀 Максимальный уровень достигнут!
        </div>
      )}

      {/* Статистика */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 30 }}>
        <StatCard label="Всего XP"     value={xpData.xp.toLocaleString("ru")}         color={color}    theme={theme} />
        <StatCard label="Голосований"  value={xpData.totalVotes.toLocaleString("ru")}  color="#4ade80"  theme={theme} />
      </div>

      {/* Значки */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: tk.text, marginBottom: 14 }}>Значки</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {BADGES.map(badge => {
            const isEarned = badge.level <= level;
            return (
              <div key={badge.level} style={{ textAlign: "center" }}>
                <motion.div
                  initial={isEarned ? { scale: 0.7, opacity: 0 } : false}
                  animate={isEarned ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{
                    width: 52, height: 52, borderRadius: 14,
                    margin: "0 auto 6px",
                    background: isEarned ? `${tierColor(badge.level)}22` : ringBg,
                    border: `2px solid ${isEarned ? tierColor(badge.level) + "80" : "transparent"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26, opacity: isEarned ? 1 : 0.28,
                  }}
                  title={isEarned ? badge.name : `Уровень ${badge.level}`}
                >
                  {isEarned ? badge.emoji : "🔒"}
                </motion.div>
                <div style={{ fontSize: 9, color: isEarned ? tk.textSub : tk.textSub, lineHeight: 1.25 }}>
                  {isEarned ? badge.name : `Ур. ${badge.level}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Подсказка до следующего значка */}
      {nextBadge && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            marginTop: 24,
            background: `${tierColor(nextBadge.level)}12`,
            border: `1px solid ${tierColor(nextBadge.level)}35`,
            borderRadius: 16, padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: 12, color: tk.textSub, marginBottom: 4 }}>Следующий значок</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: tk.text, marginBottom: 2 }}>
            {nextBadge.emoji} {nextBadge.name} — уровень {nextBadge.level}
          </div>
          <div style={{ fontSize: 11, color: tk.textSub }}>{nextBadge.desc}</div>
          <div style={{ fontSize: 11, color: tierColor(nextBadge.level), marginTop: 6, fontWeight: 600 }}>
            Осталось ~{votesLeft} голосований
          </div>
        </motion.div>
      )}

      {/* Подпись внизу */}
      <div style={{ marginTop: 28, textAlign: "center", fontSize: 11, color: tk.textSub, opacity: 0.5 }}>
        XP начисляется раз в 8 часов на каждой заправке
      </div>
    </motion.div>
  );
}
