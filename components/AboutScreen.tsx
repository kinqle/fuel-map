"use client";
import { motion } from "framer-motion";
import type { Theme } from "../lib/types";
import { T } from "../lib/constants";

export function AboutScreen({ theme, isMobile, onClose }: {
  theme:    Theme;
  isMobile: boolean;
  onClose:  () => void;
}) {
  const tk = T[theme];

  const wrapStyle: React.CSSProperties = isMobile ? {
    position: "fixed", inset: 0, zIndex: 1200,
    background: tk.card, display: "flex", flexDirection: "column",
  } : {
    position: "fixed", top: 0, left: 0, bottom: 0, width: 380,
    zIndex: 1200, background: tk.card,
    boxShadow: "4px 0 40px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column", overflowY: "auto",
  };

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: tk.textSub, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  const card = (icon: string, text: React.ReactNode) => (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
      background: tk.rowBg, borderRadius: 12, marginBottom: 8,
      border: `1px solid ${tk.rowBorder}`,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>
      <div style={{ color: tk.text, fontSize: 13, lineHeight: 1.55 }}>{text}</div>
    </div>
  );

  return (
    <motion.div
      initial={isMobile ? { y: "100%" } : { x: -380 }}
      animate={isMobile ? { y: 0 }      : { x: 0 }}
      exit={   isMobile ? { y: "100%" } : { x: -380 }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      drag={isMobile ? "y" : false}
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.3 }}
      onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 400) onClose(); }}
      style={wrapStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {isMobile && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: tk.handle }} />
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? `calc(10px + env(safe-area-inset-top)) 16px 14px` : "24px 20px 20px",
        borderBottom: `1px solid ${tk.divider}`, flexShrink: 0,
      }}>
        <img src="/benzok-logo.jpg" alt="БензОК" style={{ height: 40, objectFit: "contain", borderRadius: 8 }} />
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: "50%", border: "none",
          background: tk.rowBg, color: tk.textSub, cursor: "pointer",
          fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>

      <div style={{ padding: isMobile ? "16px 16px" : "24px 20px", flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as const }}>
        {section("Что такое БензОК?", <>
          {card("⛽", <><strong>БензОК</strong> — народная карта заправок. Водители в реальном времени сообщают, есть ли топливо на АЗС рядом с ними.</>)}
          {card("🗺️", "Открываете карту, выбираете город — и сразу видите, где бензин есть, а где очередь или пусто.")}
          {card("📡", "Данные обновляются мгновенно. Как только кто-то проголосовал — все видят актуальную картину.")}
        </>)}

        {section("Как это работает", <>
          {card("✅", <><strong>«Есть топливо»</strong> — нажимаете прямо с заправки. Ваш голос помогает десяткам водителей рядом.</>)}
          {card("❌", <><strong>«Нет топлива»</strong> — предупреждаете других, чтобы не ехали вхолостую.</>)}
          {card("⏱️", "Голоса учитываются со временем — свежие важнее старых. Карта всегда показывает актуальную ситуацию.")}
        </>)}

        {section("Зачем это нужно", <>
          {card("🔍", "В условиях дефицита топлива поиск рабочей заправки — это лотерея. БензОК превращает её в осознанный выбор маршрута.")}
          {card("🤝", "Сервис работает только вместе с вами. Каждый голос — это помощь другим водителям.")}
        </>)}

        {section("Обратная связь", <>
          <a
            href="https://t.me/benzokchannel"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
              background: "rgba(41,182,246,0.10)", border: "1.5px solid rgba(41,182,246,0.35)",
              borderRadius: 14, textDecoration: "none", marginBottom: 8,
              transition: "background 0.15s",
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(180deg,#2aabee,#229ed9)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="url(#tg_grad_ab)"/>
                <path d="M5.491 11.74l11.57-4.461c.537-.194 1.006.131.832.943l-1.97 9.281c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953z" fill="white"/>
                <defs>
                  <linearGradient id="tg_grad_ab" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2aabee"/>
                    <stop offset="1" stopColor="#229ed9"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div style={{ color: tk.text, fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Telegram-канал</div>
              <div style={{ color: "#29b6f6", fontSize: 13, fontWeight: 600 }}>@benzokchannel</div>
              <div style={{ color: tk.textSub, fontSize: 11, marginTop: 2 }}>Новости, обновления, обратная связь</div>
            </div>
          </a>
        </>)}

        <div style={{ textAlign: "center", color: tk.textSub, fontSize: 11, marginTop: 8, opacity: 0.6 }}>
          БензОК — сделано для водителей, водителями
        </div>
      </div>
    </motion.div>
  );
}
