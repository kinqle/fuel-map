"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Station, Theme } from "../lib/types";
import { T, type TkType } from "../lib/constants";

export function RouteButton({ station, color, tk, onNavigate }: { station: Station; color: string; tk: TkType; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const lat = station.position[0];
  const lon = station.position[1];

  const apps = [
    { label: "Яндекс Карты", url: `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto` },
    { label: "2ГИС",         url: `https://2gis.ru/routeSearch/to/${lon},${lat}/car` },
  ];

  return (
    <div style={{ position: "relative", marginTop: 16 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 10,
          padding: "15px 0", borderRadius: 18, border: "none", cursor: "pointer",
          background: `linear-gradient(135deg, ${color}, ${color}bb)`,
          color: "white", fontWeight: 700, fontSize: 15,
          boxShadow: `0 6px 20px ${color}44`,
          transition: "opacity 0.15s",
        }}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        Маршрут
        <svg viewBox="0 0 24 24" width="13" height="13" fill="white" style={{ opacity: 0.8 }}>
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={   { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
              borderRadius: 16, overflow: "hidden",
              background: tk.cityListBg,
              border: `1px solid ${tk.cityListBorder}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              zIndex: 10,
            }}
          >
            {apps.map((app) => (
              <a
                key={app.label}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { setOpen(false); onNavigate?.(); }}
                style={{
                  display: "block", padding: "13px 18px",
                  color: tk.text, fontWeight: 500, fontSize: 14,
                  textDecoration: "none", borderBottom: `1px solid ${tk.divider}`,
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = tk.cityHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {app.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
