"use client";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Station, City, VotesMap, FuelVotes, Theme } from "../lib/types";
import { T, STATUS_COLORS, STATUS_META } from "../lib/constants";
import { getStationStatus } from "../lib/votes";
import { haversineKm, formatDist } from "../lib/utils";

export function SearchBar({ stations, cities, votes, userPos, theme, selectedCity, favCount, isMobile, userLevel, onSelectStation, onSelectCity, onOpenMyStations, onOpenLevel, onNavigateTo }: {
  stations:         Station[];
  cities:           City[];
  votes:            VotesMap;
  userPos:          [number, number] | null;
  theme:            Theme;
  selectedCity:     City;
  favCount:         number;
  isMobile:         boolean;
  userLevel:        number;
  onSelectStation:  (station: Station) => void;
  onSelectCity:     (city: City) => void;
  onOpenMyStations: () => void;
  onOpenLevel:      () => void;
  onNavigateTo:     (lat: number, lng: number, label: string, state?: string) => void;
}) {
  const [query,     setQuery]     = useState("");
  const [open,      setOpen]      = useState(false);
  const [focused,   setFocused]   = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [geoResult, setGeoResult] = useState<{ name: string; lat: number; lng: number; state?: string } | null>(null);
  const [geoQuery,  setGeoQuery]  = useState<string>(""); // q для которого результат готов
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tk = T[theme];
  const q  = query.trim().toLowerCase();
  const showLabel = !isFocused && !query;

  const startsWithQ = (str: string) => {
    if (!q) return false;
    const lower = str.toLowerCase();
    return lower.startsWith(q) || lower.split(/[\s\-•]+/).some(w => w.startsWith(q));
  };

  const stResults   = q ? stations.filter(s => startsWithQ(s.name) || startsWithQ(s.brand)) : [];
  const cityResults = q ? cities.filter(c => startsWithQ(c.name)) : [];

  // Геокодинг через Nominatim — только города/районы, минимум 3 символа
  const noLocal = q.length >= 3 && stResults.length === 0 && cityResults.length === 0;
  // isSearching = noLocal && результат ещё не готов для текущего q (без useState-задержки)
  const isSearching = noLocal && geoQuery !== q;
  useEffect(() => {
    if (!noLocal) { setGeoResult(null); return; }
    if (geoTimer.current) clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=ru&accept-language=ru&addressdetails=1`;
        const res = await fetch(url, { headers: { "User-Agent": "BenzOK/1.0" } });
        const data = await res.json();
        const PLACE_TYPES = ["city", "town", "village", "municipality", "administrative", "suburb", "district", "county"];
        const place = data.find((d: {type: string}) => PLACE_TYPES.includes(d.type)) ?? null;
        if (place) {
          const addr = place.address || {};
          const state = addr.state || addr.region || addr.county || undefined;
          setGeoResult({ name: place.display_name.split(",")[0], lat: parseFloat(place.lat), lng: parseFloat(place.lon), state });
        } else {
          setGeoResult(null);
        }
      } catch { setGeoResult(null); }
      setGeoQuery(q); // помечаем что поиск для этого q завершён
    }, 600);
  }, [q, noLocal]);

  type Item = { kind: "station"; station: Station } | { kind: "city"; city: City };
  const items: Item[] = [
    ...stResults.map(s => ({ kind: "station" as const, station: s })),
    ...cityResults.map(c => ({ kind: "city"    as const, city:    c })),
  ];

  const pick = (item: Item) => {
    if (item.kind === "station") onSelectStation(item.station);
    else                         onSelectCity(item.city);
    setQuery(""); setOpen(false); setFocused(-1);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f + 1, items.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === "Enter" && focused >= 0) pick(items[focused]);
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  const barWidth = isMobile ? "calc(100vw - 32px)" : "440px";
  const isOpen   = open;

  const StationRow = ({ s, idx, highlight }: { s: Station; idx: number; highlight?: boolean }) => {
    const stVotes = votes[s.id] ?? {};
    const status  = getStationStatus(stVotes);
    const sm      = STATUS_META[status];
    const dist    = userPos ? haversineKm(userPos, s.position) : null;
    const totalY  = (Object.values(stVotes) as FuelVotes[]).reduce((a, f) => a + (f?.yes ?? 0), 0);
    const totalN  = (Object.values(stVotes) as FuelVotes[]).reduce((a, f) => a + (f?.no  ?? 0), 0);
    const isFoc   = focused === idx;
    return (
      <button key={s.id}
        onMouseDown={() => pick({ kind: "station", station: s })}
        onMouseEnter={() => setFocused(idx)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "10px 14px", border: "none", cursor: "pointer", textAlign: "left",
          background: isFoc ? tk.cityHover : highlight ? "rgba(251,191,36,0.05)" : "transparent",
          transition: "background 0.1s",
        }}>
        <div style={{ position: "relative", width: 38, height: 38, flexShrink: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `${STATUS_COLORS[status].bg}22`,
            border: `1.5px solid ${STATUS_COLORS[status].bg}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: STATUS_COLORS[status].bg,
          }}>{s.short}</div>
          <div style={{
            position: "absolute", bottom: -2, right: -2,
            width: 12, height: 12, borderRadius: "50%",
            background: STATUS_COLORS[status].bg,
            border: "2px solid " + (theme === "dark" ? "#18181f" : "#fff"),
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: tk.text, fontSize: 13, fontWeight: 600 }}>{s.name}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: 5, background: sm.bg, color: sm.color, fontSize: 10, fontWeight: 700 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: sm.color, display: "inline-block" }} />{sm.label}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
            {(totalY + totalN > 0) && (
              <span style={{ fontSize: 11 }}>
                <span style={{ color: "#22c55e", fontWeight: 600 }}>✓ {totalY}</span>
                <span style={{ color: tk.textSub }}> / </span>
                <span style={{ color: "#ef4444", fontWeight: 600 }}>✗ {totalN}</span>
              </span>
            )}
            {dist != null && <span style={{ color: tk.textSub, fontSize: 11 }}>{formatDist(dist)}</span>}
          </div>
        </div>
        {highlight && <span style={{ color: "#fbbf24", fontSize: 14, flexShrink: 0 }}>★</span>}
      </button>
    );
  };

  return (
    <div style={{ position: "relative", width: barWidth, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        background: tk.ctrl,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: `1.5px solid ${isOpen ? "rgba(99,102,241,0.55)" : tk.ctrlBorder}`,
        borderRadius: isOpen ? "16px 16px 0 0" : "16px",
        boxShadow: isOpen ? "0 4px 24px rgba(0,0,0,0.35), 0 0 0 3px rgba(99,102,241,0.12)" : "0 4px 20px rgba(0,0,0,0.25)",
        transition: "border-color 0.15s, border-radius 0.15s, box-shadow 0.15s",
        overflow: "hidden",
      }}>
        <div onClick={() => { if (showLabel) inputRef.current?.focus(); }}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: showLabel ? "pointer" : "text" }}>
          {showLabel
            ? <span style={{ fontSize: 14 }}>📍</span>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={tk.textSub} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          }
          {showLabel && <span style={{ color: tk.text, fontSize: 14, fontWeight: 600, userSelect: "none" }}>{selectedCity.name}</span>}
          <input ref={inputRef} value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setFocused(-1); }}
            onFocus={() => { setIsFocused(true); setOpen(true); }}
            onBlur={() => { setIsFocused(false); setTimeout(() => { setOpen(false); setFocused(-1); }, 160); }}
            onKeyDown={onKeyDown}
            placeholder="АЗС, город…"
            style={{
              flex: showLabel ? 0 : 1, width: showLabel ? 0 : undefined, opacity: showLabel ? 0 : 1,
              border: "none", outline: "none", background: "transparent",
              color: tk.text, fontSize: 14, fontWeight: 500, fontFamily: "inherit", overflow: "hidden",
            }}
          />
          {query && (
            <button onMouseDown={() => { setQuery(""); setFocused(-1); inputRef.current?.focus(); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: tk.textSub, fontSize: 14, padding: 0, lineHeight: 1, display: "flex" }}>✕</button>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: tk.ctrlBorder, flexShrink: 0 }} />

        <button
          onMouseDown={(e) => { e.preventDefault(); setOpen(false); onOpenMyStations(); }}
          style={{
            padding: "8px 12px", border: "none", cursor: "pointer", background: "transparent",
            color: tk.textSub, fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            transition: "color 0.15s",
          }}
          title="Мои АЗС"
        >
          <span style={{ fontSize: 15 }}>★</span>
          <span style={{ fontSize: 12 }}>Мои АЗС</span>
          {favCount > 0 && (
            <span style={{
              minWidth: 16, height: 16, borderRadius: 8, padding: "0 4px",
              background: "#fbbf24", color: "#000", fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
            }}>{favCount}</span>
          )}
        </button>
      </div>

      {/* Кнопка «Ваш уровень в БензОК» — располагается под строкой поиска */}
      <button
        onMouseDown={(e) => { e.preventDefault(); onOpenLevel(); }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: isMobile ? "7px 12px" : "9px 14px",
          background: tk.ctrl,
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: `1.5px solid rgba(99,102,241,0.35)`,
          borderRadius: 14,
          boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
          cursor: "pointer", width: "100%",
          color: "#818cf8", fontFamily: "inherit",
          transition: "border-color 0.15s, background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.65)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)")}
      >
        {/* Иконка трофея */}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#818cf8" style={{ flexShrink: 0 }}>
          <path d="M19 5h-1V3H6v2H5C3.3 5 2 6.3 2 8c0 1.1.6 2.1 1.5 2.7.9 2.4 3.1 4.2 5.8 4.6L9 17H7v2h10v-2h-2l-.3-1.7c2.7-.4 4.9-2.2 5.8-4.6.9-.6 1.5-1.6 1.5-2.7 0-1.7-1.3-3-3-3zM4 8c0-.6.4-1 1-1v3.9C4.4 10.4 4 9.2 4 8zm16 0c0 1.2-.4 2.4-1 3.2V7c.6 0 1 .4 1 1z"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1, textAlign: "left" }}>
          Ваш уровень в БензОК
        </span>
        {/* Бейдж с номером уровня */}
        <span style={{
          minWidth: 22, height: 22, borderRadius: 11,
          background: "rgba(99,102,241,0.20)",
          border: "1.5px solid rgba(99,102,241,0.45)",
          color: "#818cf8", fontSize: 11, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 5px", flexShrink: 0,
        }}>
          {userLevel}
        </span>
      </button>

      {/* Выпадающий список поиска — позиционируется относительно всего враппера */}
      <div style={{ position: "relative" }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.94, transformOrigin: "top" }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{   opacity: 0, scaleY: 0.94 }}
            transition={{ duration: 0.13 }}
            style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
              background: tk.cityListBg,
              border: `1.5px solid ${tk.cityListBorder}`,
              borderTop: "none", borderRadius: "0 0 16px 16px",
              overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
              maxHeight: isMobile ? "60svh" : 440, overflowY: "auto",
            }}
          >
            <>
              {!q && (
                <div style={{ padding: "28px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                  <div style={{ color: tk.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Поиск АЗС и городов</div>
                  <div style={{ color: tk.textSub, fontSize: 12 }}>Начните вводить название</div>
                </div>
              )}

              {cityResults.length > 0 && (
                <>
                  <div style={{ padding: "12px 16px 6px", color: tk.textSub, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Города
                  </div>
                  {cityResults.map((c, i) => {
                    const idx = i;
                    const isFoc = focused === idx;
                    const isCurrent = c.id === selectedCity.id;
                    return (
                      <button key={c.id}
                        onMouseDown={() => pick({ kind: "city", city: c })}
                        onMouseEnter={() => setFocused(idx)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12, width: "100%",
                          padding: "10px 16px", border: "none", cursor: "pointer", textAlign: "left",
                          background: isFoc ? tk.cityHover : "transparent", transition: "background 0.12s",
                        }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: isCurrent ? "rgba(99,102,241,0.15)" : tk.rowBg,
                          border: `1.5px solid ${isCurrent ? "rgba(99,102,241,0.45)" : tk.rowBorder}`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                        }}>🏙️</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: tk.text, fontSize: 13, fontWeight: isCurrent ? 700 : 500 }}>{c.name}</div>
                          <div style={{ color: tk.textSub, fontSize: 11, marginTop: 1 }}>Россия</div>
                        </div>
                        {isCurrent && (
                          <span style={{ color: "#6366f1", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>текущий</span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {cityResults.length > 0 && stResults.length > 0 && (
                <div style={{ height: 1, background: tk.divider, margin: "4px 0" }} />
              )}

              {stResults.length > 0 && (
                <>
                  <div style={{ padding: "12px 16px 6px", color: tk.textSub, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Заправки
                  </div>
                  {stResults.slice(0, 12).map((s, i) => <StationRow key={s.id} s={s} idx={cityResults.length + i} />)}
                  {stResults.length > 12 && (
                    <div style={{ padding: "8px 16px 12px", color: tk.textSub, fontSize: 11, textAlign: "center" }}>
                      ещё {stResults.length - 12} — уточните запрос
                    </div>
                  )}
                </>
              )}

              {q && items.length === 0 && (
                <div style={{ padding: "16px" }}>
                  {isSearching ? (
                    <div style={{ color: tk.textSub, fontSize: 13, textAlign: "center" }}>🔍 Ищем на карте…</div>
                  ) : geoResult ? (
                    <button
                      onMouseDown={() => {
                        onNavigateTo(geoResult.lat, geoResult.lng, geoResult.name, geoResult.state);
                        setQuery(""); setOpen(false);
                      }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer",
                        background: "rgba(99,102,241,0.10)", transition: "background 0.12s",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 22 }}>📍</span>
                      <div>
                        <div style={{ color: tk.text, fontSize: 13, fontWeight: 700 }}>Перейти к «{geoResult.name}»</div>
                        <div style={{ color: tk.textSub, fontSize: 11, marginTop: 2 }}>
                          {geoResult.state ?? "Открыть на карте"}
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div style={{ color: tk.textSub, fontSize: 13, textAlign: "center" }}>
                      По запросу «{query}» ничего не найдено
                    </div>
                  )}
                </div>
              )}
            </>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
