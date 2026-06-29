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
    { id: "lukoil",         label: "Лукойл",        color: "#e63946" },
    { id: "rosneft",        label: "Роснефть",       color: "#1a73e8" },
    { id: "gazprom",        label: "Газпром",        color: "#2a9d8f" },
    { id: "bashneft",       label: "Башнефть",       color: "#f97316" },
    { id: "tatneft",        label: "Татнефть",       color: "#8b5cf6" },
    { id: "surgutneftegas", label: "Сургутнефтегаз", color: "#0ea5e9" },
    { id: "neftmagistral",  label: "Нефтьмагистраль",color: "#10b981" },
    { id: "teboil",         label: "Teboil",         color: "#cc0000" },
    { id: "bp",             label: "BP",             color: "#16a34a" },
    { id: "shell",          label: "Shell",          color: "#ca8a04" },
    { id: "neste",          label: "Neste",          color: "#0284c7" },
    { id: "total",          label: "Total",          color: "#dc2626" },
  ];

  const Chip = ({
    label, active, onPress, color = "#6366f1",
  }: { label: string; active: boolean; onPress: () => void; color?: string }) => (
    <button
      onClick={onPress}
      style={{
        padding: "5px 10px",
        borderRadius: 100,
        border: `1.5px solid ${active ? color : tk.ctrlBorder}`,
        background: active ? `${color}22` : "transparent",
        color: active ? color : tk.textSub,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        fontFamily: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap" as const,
        transition: "all 0.12s",
        lineHeight: 1.3,
      }}
    >
      {label}
    </button>
  );

  const Section = ({ label }: { label: string }) => (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      color: tk.textSub, padding: "2px 0 6px",
    }}>
      {label}
    </div>
  );

  const Divider = () => <div style={{ height: 1, background: tk.divider, margin: "8px 0" }} />;

  return (
    <div ref={ref} style={{ position: "relative" }}>
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
              width: 260, zIndex: 300,
              background: tk.cityListBg,
              border: `1px solid ${tk.cityListBorder}`,
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
              padding: "10px 10px 8px",
              transformOrigin: "top left",
            }}
          >
            {/* Топливо */}
            <Section label="Топливо" />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
              {FUEL_OPTIONS.map(f => (
                <Chip key={f.id} label={f.label} active={filters.fuels.has(f.id)} color={f.color}
                  onPress={() => onFilters({ ...filters, fuels: toggle(filters.fuels, f.id) })} />
              ))}
            </div>

            <Divider />

            {/* Бренд */}
            <Section label="Бренд" />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
              {BRAND_OPTIONS.map(b => (
                <Chip key={b.id} label={b.label} active={filters.brands.has(b.id)} color={b.color}
                  onPress={() => onFilters({ ...filters, brands: toggle(filters.brands, b.id) })} />
              ))}
            </div>

            <Divider />

            {/* В наличии */}
            <Chip
              label="✅ В наличии"
              active={filters.inStockOnly}
              color="#22c55e"
              onPress={() => onFilters({ ...filters, inStockOnly: !filters.inStockOnly })}
            />

            {activeCount > 0 && (
              <>
                <Divider />
                <button onClick={() => { onFilters(DEFAULT_FILTERS); setOpen(false); }} style={{
                  width: "100%", padding: "7px 12px", borderRadius: 9, border: "none",
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
