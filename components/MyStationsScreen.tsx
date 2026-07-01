"use client";
import { motion } from "framer-motion";
import type { Station, VotesMap, Theme } from "../lib/types";
import { T, BRAND_COLORS, BRAND_LOGOS, STATUS_META } from "../lib/constants";
import { haversineKm } from "../lib/utils";
import { getStationStatus } from "../lib/votes";

export function MyStationsScreen({ stations, favorites, votes, userPos, theme, isMobile, onSelect, onClose }: {
  stations:  Station[];
  favorites: Set<string>;
  votes:     VotesMap;
  userPos:   [number, number] | null;
  theme:     Theme;
  isMobile:  boolean;
  onSelect:  (id: string) => void;
  onClose:   () => void;
}) {
  const tk = T[theme];
  const favStations = stations.filter(s => favorites.has(s.id));

  const wrapStyle: React.CSSProperties = isMobile ? {
    position: "fixed", inset: 0, zIndex: 1100,
    background: tk.card, display: "flex", flexDirection: "column",
    paddingTop: "env(safe-area-inset-top)",
  } : {
    position: "fixed", top: 0, left: 0, bottom: 0, width: 340,
    zIndex: 1100, background: tk.card,
    boxShadow: "4px 0 40px rgba(0,0,0,0.4)",
    display: "flex", flexDirection: "column",
  };

  return (
    <motion.div
      initial={isMobile ? { y: "100%" } : { x: -340 }}
      animate={isMobile ? { y: 0 }      : { x: 0 }}
      exit={   isMobile ? { y: "100%" } : { x: -340 }}
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
        padding: isMobile ? `16px 20px 16px` : "20px 20px 16px",
        borderBottom: `1px solid ${tk.divider}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>★</span>
          <div>
            <div style={{ color: tk.text, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Мои АЗС</div>
            <div style={{ color: tk.textSub, fontSize: 12, marginTop: 1 }}>
              {favStations.length === 0 ? "Нет избранных" :
               `${favStations.length} ${favStations.length === 1 ? "заправка" : favStations.length <= 4 ? "заправки" : "заправок"}`}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: "50%", border: "none",
          background: tk.rowBg, color: tk.textSub, cursor: "pointer",
          fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {favStations.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>★</div>
            <div style={{ color: tk.text, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Нет избранных АЗС</div>
            <div style={{ color: tk.textSub, fontSize: 13, lineHeight: 1.5 }}>
              Откройте любую заправку и нажмите<br />«⭐ Добавить в избранное»
            </div>
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {favStations.map((s) => {
              const sv     = votes[s.id] ?? {};
              const status = getStationStatus(sv);
              const sm     = STATUS_META[status];
              const color  = BRAND_COLORS[s.brand_id ?? ""] ?? "#6366f1";
              const dist   = userPos ? haversineKm(userPos, s.position) : null;
              return (
                <button key={s.id} onClick={() => { onSelect(s.id); onClose(); }} style={{
                  width: "100%", padding: "14px 20px", border: "none", cursor: "pointer",
                  background: "transparent", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 14,
                  borderBottom: `1px solid ${tk.divider}`,
                  transition: "background 0.12s",
                }}>
                  {BRAND_LOGOS[s.brand_id ?? ""] ? (
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden", padding: 4, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.08)",
                    }}>
                      <img src={BRAND_LOGOS[s.brand_id ?? ""]} alt={s.name}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `${color}20`, border: `1.5px solid ${color}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 800, color,
                    }}>{s.short}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: tk.text, fontSize: 14, fontWeight: 600, marginBottom: 3,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px", borderRadius: 20,
                        background: sm.bg, fontSize: 10, fontWeight: 600, color: sm.color,
                      }}>{sm.label}</span>
                      {s.address && (
                        <span style={{ color: tk.textSub, fontSize: 11,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                          {s.address}
                        </span>
                      )}
                    </div>
                  </div>
                  {dist != null && (
                    <div style={{ color: tk.textSub, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {dist < 1 ? `${Math.round(dist * 1000)} м` : `${dist.toFixed(1)} км`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
