"use client";
import { useEffect, useRef, useMemo } from "react";
import type { Station, VotesMap, Theme } from "../lib/types";
import { T, FUELS, BRAND_COLORS, BRAND_LOGOS, STATUS_COLORS } from "../lib/constants";
import { haversineKm, formatDist } from "../lib/utils";
import { getStationStatus, getFuelVerdict } from "../lib/votes";

export function StationList({ stations, selectedId, activeId, hoveredId, votes, userPos, theme, isMobile, onSelect, onHover }: {
  stations:   Station[];
  selectedId: string | null;
  activeId:   string;
  hoveredId:  string | null;
  votes:      VotesMap;
  userPos:    [number, number] | null;
  theme:      Theme;
  isMobile:   boolean;
  onSelect:   (id: string) => void;
  onHover:    (id: string | null) => void;
}) {
  const tk       = T[theme];
  const listRef  = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sortedStations = useMemo(() => {
    if (!userPos) return stations;
    return [...stations].sort((a, b) =>
      haversineKm(userPos, a.position) - haversineKm(userPos, b.position)
    );
  }, [stations, userPos]);

  useEffect(() => {
    const focusId = selectedId ?? activeId;
    const el = cardRefs.current[focusId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedId, activeId]);

  const wrapStyle: React.CSSProperties = isMobile ? {
    position: "fixed",
    bottom: `calc(12px + env(safe-area-inset-bottom))`,
    left: 0, right: 0,
    zIndex: 800,
    pointerEvents: "none",
  } : {
    position: "fixed",
    right: 0, top: 0, bottom: 0,
    width: 252,
    zIndex: 800,
    display: "flex", flexDirection: "column", justifyContent: "center",
    pointerEvents: "none",
  };

  const scrollStyle: React.CSSProperties = isMobile ? {
    display: "flex", flexDirection: "row", gap: 8,
    overflowX: "auto", overflowY: "hidden",
    scrollbarWidth: "none",
    padding: "6px 12px 6px",
    pointerEvents: "auto",
  } : {
    display: "flex", flexDirection: "column", gap: 6,
    overflowY: "auto", overflowX: "hidden",
    scrollbarWidth: "none",
    padding: "16px 12px 16px 6px",
    maxHeight: "70vh",
    pointerEvents: "auto",
  };

  return (
    <div style={wrapStyle}>
      <div ref={listRef} style={scrollStyle} className="fm-panel-scroll">
        {sortedStations.map((s) => {
          const stVotes    = votes[s.id] ?? {};
          const status     = getStationStatus(stVotes);
          const sc         = STATUS_COLORS[status];
          const dist       = userPos ? haversineKm(userPos, s.position) : null;
          const isSelected = s.id === selectedId;
          const isActive   = s.id === activeId && s.id !== selectedId;
          const isHovered  = s.id === hoveredId;
          const color      = BRAND_COLORS[s.brand] ?? "#6366f1";

          const cardStyle: React.CSSProperties = isMobile
            ? { flexShrink: 0, width: 148, padding: "10px 12px" }
            : { width: "100%", padding: "10px 12px" };

          return (
            <div
              key={s.id}
              ref={(el) => { cardRefs.current[s.id] = el; }}
              onClick={() => onSelect(s.id)}
              onMouseEnter={() => onHover(s.id)}
              onMouseLeave={() => onHover(null)}
              style={{
                ...cardStyle,
                borderRadius: 14,
                background: isSelected
                  ? `${sc.bg}22`
                  : isActive   ? "rgba(99,102,241,0.10)"
                  : isHovered  ? (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)")
                  : tk.ctrl,
                backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
                border: `1.5px solid ${isSelected ? `${sc.bg}66` : isActive ? "rgba(99,102,241,0.35)" : tk.ctrlBorder}`,
                boxShadow: isSelected
                  ? `0 4px 20px rgba(0,0,0,0.25), 0 0 0 2px ${sc.bg}33`
                  : isActive   ? "0 2px 12px rgba(99,102,241,0.18)"
                  : "0 2px 12px rgba(0,0,0,0.18)",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                {BRAND_LOGOS[s.brand] ? (
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", padding: 3,
                    boxShadow: "0 0 0 1.5px rgba(0,0,0,0.08)",
                  }}>
                    <img src={BRAND_LOGOS[s.brand]} alt={s.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `${color}20`, border: `1.5px solid ${color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color,
                  }}>{s.short}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: tk.text, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {dist != null && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: tk.textSub,
                      background: theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                      padding: "2px 6px", borderRadius: 6,
                    }}>{formatDist(dist)}</span>
                  )}
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: sc.bg,
                    boxShadow: isSelected ? `0 0 6px ${sc.bg}` : "none",
                  }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {FUELS.map(({ id, label }) => {
                  const fd = stVotes[id];
                  const fVerdict = fd ? getFuelVerdict(fd) : null;
                  const dotColor = fVerdict?.kind === "yes" ? "#22c55e"
                    : fVerdict?.kind === "no"  ? "#ef4444"
                    : "#6b7280";
                  return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, opacity: fVerdict ? 1 : 0.3 }} />
                      <span style={{ fontSize: 9, color: tk.textSub, fontWeight: 600 }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
