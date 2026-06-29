"use client";
import React from "react";
import L from "leaflet";
import type { Theme } from "../lib/types";
import { T } from "../lib/constants";

export function SideControls({ theme, onToggleTheme, onLocate, mapRef, isMobile }: {
  theme:         Theme;
  onToggleTheme: () => void;
  onLocate:      () => void;
  mapRef:        React.RefObject<L.Map | null>;
  isMobile:      boolean;
}) {
  const tk  = T[theme];
  const sz  = isMobile ? 48 : 42;
  const btn: React.CSSProperties = {
    width: sz, height: sz,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "none", cursor: "pointer",
    fontSize: isMobile ? 21 : 19, color: tk.ctrlText,
    borderRadius: isMobile ? 14 : 12,
    transition: "background 0.12s",
    flexShrink: 0,
  };
  const onHover = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.background = theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  };
  const onLeave = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.background = "transparent";
  };

  const divider = isMobile
    ? <div style={{ width: 1, background: tk.divider, margin: "8px 0" }} />
    : <div style={{ height: 1, background: tk.divider, margin: "0 8px" }} />;

  const wrapStyle: React.CSSProperties = isMobile ? {
    position: "fixed",
    right: 16, bottom: "calc(16px + env(safe-area-inset-bottom))",
    zIndex: 900, display: "flex", flexDirection: "row", gap: 2,
    background: tk.ctrl,
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${tk.ctrlBorder}`,
    borderRadius: 18, padding: "0 6px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
  } : {
    position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
    zIndex: 900, display: "flex", flexDirection: "column", gap: 2,
    background: tk.ctrl,
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${tk.ctrlBorder}`,
    borderRadius: 18, padding: "6px 0",
    boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
  };

  return (
    <div style={wrapStyle}>
      <button style={btn} title="Приблизить"
        onClick={() => mapRef.current?.zoomIn()}
        onMouseEnter={onHover} onMouseLeave={onLeave}>+
      </button>
      {divider}
      <button style={btn} title="Отдалить"
        onClick={() => mapRef.current?.zoomOut()}
        onMouseEnter={onHover} onMouseLeave={onLeave}>−
      </button>
      {divider}
      <button style={btn} title="Моё местоположение"
        onClick={onLocate}
        onMouseEnter={onHover} onMouseLeave={onLeave}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 2L4 21l8-4 8 4L12 2z"/>
        </svg>
      </button>
      {divider}
      <button style={btn} title="Сменить тему"
        onClick={onToggleTheme}
        onMouseEnter={onHover} onMouseLeave={onLeave}>
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
