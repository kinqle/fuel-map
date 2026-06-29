"use client";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Filters, FuelId, Theme } from "../lib/types";
import { T, DEFAULT_FILTERS } from "../lib/constants";

export function FilterBar({ filters, onFilters, theme }: {
  filters:   Filters;
  onFilters: (f: Filters) => void;
  theme:     Theme;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tk = T[theme];

  function toggle<V>(set: Set<V>, v: V): Set<V> {
    const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n;
  }

  const activeCount =
    filters.fuels.size + filters.brands.size +
    (filters.nearbyOnly ? 1 : 0) + (filters.inStockOnly ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const FUEL_OPTIONS = [
    { id: "ai92"   as FuelId, label: "АИ-92", color: "#60a5fa" },
    { id: "ai95"   as FuelId, label: "АИ-95", color: "#34d399" },
    { id: "diesel" as FuelId, label: "ДТ",    color: "#fbbf24" },
  ];
  const BRAND_OPTIONS = [
    { id: "lukoil",  label: "Лукойл"   },
    { id: "rosneft", label: "Роснефть" },
    { id: "gazprom", label: "Газпром"  },
  ];

  const Row = ({
    label, active, onPress, color = "#6366f1", disabled = false,
  }: { label: string; active: boolean; onPress: () => void; color?: string; disabled?: boolean }) => (
    <button
      onClick={() => { if (!disabled) onPress(); }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "9px 12px", border: "none", borderRadius: 9,
        background: active ? `${color}18` : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        fontFamily: "inherit", transition: "background 0.12s",
      }}
    >
      <span style={{ color: active ? color : tk.text, fontSize: 13, fontWeight: active ? 600 : 400 }}>
        {label}
      </span>
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `1.5px solid ${active ? color : tk.ctrlBorder}`,
        background: active ? color : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.12s",
      }}>
        {active && <span style={{ color: "white", fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </div>
    </button>
  );

  const Divider = () => <div style={{ height: 1, background: tk.divider, margin: "4px 0" }} />;

  return (
    <div ref={ref} style={{ position: "relative", marginTop: 6 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 13px", borderRadius: 20,
          background: activeCount > 0 ? "rgba(99,102,241,0.15)" : tk.ctrl,
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          border: `1.5px solid ${activeCount > 0 ? "rgba(99,102,241,0.5)" : tk.ctrlBorder}`,
          color: activeCount > 0 ? "#818cf8" : tk.ctrlText,
          fontSize: 12, fontWeight: activeCount > 0 ? 700 : 500,
          fontFamily: "inherit", cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          transition: "all 0.15s ease",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
        Фильтры
        {activeCount > 0 && (
          <span style={{
            background: "#6366f1", color: "white",
            fontSize: 10, fontWeight: 700,
            borderRadius: 10, padding: "1px 5px", lineHeight: 1.4,
          }}>{activeCount}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.95, y: -4  }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0,
              width: 200, zIndex: 300,
              background: tk.cityListBg,
              border: `1px solid ${tk.cityListBorder}`,
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
              padding: "6px",
              transformOrigin: "top left",
            }}
          >
            <div style={{ padding: "2px 4px 6px", color: tk.textSub, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Топливо</div>
            {FUEL_OPTIONS.map(f => (
              <Row key={f.id} label={f.label} active={filters.fuels.has(f.id)} color={f.color}
                onPress={() => onFilters({ ...filters, fuels: toggle(filters.fuels, f.id) })} />
            ))}

            <Divider />
            <div style={{ padding: "4px 4px 6px", color: tk.textSub, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Бренд</div>
            {BRAND_OPTIONS.map(b => (
              <Row key={b.id} label={b.label} active={filters.brands.has(b.id)} color="#a78bfa"
                onPress={() => onFilters({ ...filters, brands: toggle(filters.brands, b.id) })} />
            ))}

            <Divider />
            <Row label="✅ В наличии" active={filters.inStockOnly} color="#22c55e"
              onPress={() => onFilters({ ...filters, inStockOnly: !filters.inStockOnly })} />

            {activeCount > 0 && (
              <>
                <Divider />
                <button onClick={() => { onFilters(DEFAULT_FILTERS); setOpen(false); }} style={{
                  width: "100%", padding: "8px 12px", borderRadius: 9, border: "none",
                  background: "rgba(99,102,241,0.1)", color: "#818cf8",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                }}>Сбросить всё</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
