"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { AnimatePresence, motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

import { supabase } from "../lib/supabase";
import type { Theme, FuelId, VoteValue, Station, City, VotesMap, VoteRow, RecentVote, RecentMap, Filters } from "../lib/types";
import { CITIES_FALLBACK, FUELS, TILE_URLS, T, DEFAULT_FILTERS, EMPTY_FUEL, RECENT_LIMIT } from "../lib/constants";
import { getDeviceId, getStoredTheme, haversineKm, formatDist } from "../lib/utils";
import { voteWeight, velocityBoost, confirmatoryBoost, isStationUnstable, getStationStatus, nearestStation, calcRecommended } from "../lib/votes";
import { useIsMobile } from "../hooks/useIsMobile";
import { MapRefCapture, MarkersLayer, MapClickHandler, CityFlyTo, MapMoveHandler } from "../components/MapLayers";
import { SideControls } from "../components/SideControls";
import { FilterBar } from "../components/FilterBar";
import { SearchBar } from "../components/SearchBar";
import { StationList } from "../components/StationList";
import { StationSheet } from "../components/StationSheet";
import { MyStationsScreen } from "../components/MyStationsScreen";
import { AboutScreen } from "../components/AboutScreen";
import { LevelScreen } from "../components/LevelScreen";
import { VoteAnimation } from "../components/VoteAnimation";
import { LevelUpModal } from "../components/LevelUpModal";
import { awardVoteXp, getUserXpData } from "../lib/userProfile";
import { levelFromXp } from "../lib/xp";

export default function MapView() {
  const [theme,          setTheme]          = useState<Theme>("dark");
  const [cities,         setCities]         = useState<City[]>(CITIES_FALLBACK);
  const [city,           setCity]           = useState<City>(CITIES_FALLBACK[0]);
  const [selId,          setSelId]          = useState<string | null>(null);
  const [votes,          setVotes]          = useState<VotesMap>({});
  const [recentVotes,    setRecentVotes]    = useState<RecentMap>({});
  const [voting,         setVoting]         = useState(false);
  const [userPos,        setUserPos]        = useState<[number, number] | null>(null);
  const userPosRef = useRef<[number, number] | null>(null);
  const [favorites,      setFavorites]      = useState<Set<string>>(new Set());
  const [showMyStations, setShowMyStations] = useState(false);
  const [showAbout,      setShowAbout]      = useState(false);
  const [showLevel,      setShowLevel]      = useState(false);
  const [showTgBanner,   setShowTgBanner]   = useState(false);
  // Данные для анимации XP после голосования
  const [voteAnim,     setVoteAnim]     = useState<{ xpGained: number; newXp: number; alreadyEarned: boolean; seq: number } | null>(null);
  const voteSeqRef = useRef(0);
  // Модальное окно повышения уровня
  const [levelUpModal, setLevelUpModal] = useState<number | null>(null);
  // Текущий уровень для бейджа в SideControls
  const [userLevel, setUserLevel] = useState(() => levelFromXp(getUserXpData().xp));
  const [recommendedId,  setRecommendedId]  = useState<string | null>(null);
  const [unstableIds,    setUnstableIds]    = useState<Set<string>>(new Set());
  const unstableIdsRef = useRef<Set<string>>(new Set());
  const [filters,        setFilters]        = useState<Filters>(DEFAULT_FILTERS);
  const [hoveredId,      setHoveredId]      = useState<string | null>(null);
  const [activeId,       setActiveId]       = useState<string>("");
  const [stations,       setStations]       = useState<Station[]>([]);
  const [geoLabel,       setGeoLabel]       = useState<string | undefined>(undefined);

  const mapRef      = useRef<L.Map | null>(null);
  const votesRef    = useRef<VotesMap>({});
  const selIdRef    = useRef<string | null>(null);
  const stationsRef = useRef<Station[]>([]);
  const cityRef     = useRef<City>(CITIES_FALLBACK[0]);

  useEffect(() => { selIdRef.current    = selId;    }, [selId]);
  useEffect(() => { stationsRef.current = stations; }, [stations]);
  useEffect(() => { votesRef.current    = votes;    }, [votes]);
  useEffect(() => { cityRef.current     = city;     }, [city]);

  const filteredStations = useMemo(() => stations.filter((s: Station) => {
    if (filters.brands.size > 0 && !filters.brands.has(s.brand)) return false;
    if (filters.nearbyOnly && userPos && haversineKm(userPos, s.position) > 2) return false;
    if (filters.inStockOnly) {
      const st = getStationStatus(votes[s.id] ?? {});
      if (st === "red" || st === "neutral") return false;
    }
    if (filters.fuels.size > 0) {
      const sv = votes[s.id] ?? {};
      const ok = [...filters.fuels].some(fid => { const fv = sv[fid]; return fv && fv.yes > 0 && fv.yes >= fv.no; });
      if (!ok) return false;
    }
    return true;
  }), [filters, userPos, votes, stations]);

  useEffect(() => { setTheme(getStoredTheme()); }, []);

  // Синхронизируем цвет body/html и статус-бара с выбранной темой
  useEffect(() => {
    const color = theme === "dark" ? "#0a0a0a" : "#ffffff";
    document.documentElement.style.background = color;
    document.body.style.background = color;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", color);
  }, [theme]);

  useEffect(() => {
    const t = setTimeout(() => setShowTgBanner(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const selectStation = useCallback((id: string | null) => {
    setSelId(id);
    if (id) { setShowMyStations(false); setShowAbout(false); setShowLevel(false); }
    if (id) {
      setActiveId(id);
      const s = stationsRef.current.find((x: Station) => x.id === id);
      if (s && mapRef.current) {
        const zoom = Math.max(mapRef.current.getZoom(), 14);
        mapRef.current.flyTo(s.position, zoom, { animate: true, duration: 0.7 });
      }
    }
  }, []);

  const recalc = useCallback((center: [number, number]) => {
    if (selIdRef.current) return;
    setRecommendedId(calcRecommended(center, stationsRef.current, votesRef.current, unstableIdsRef.current));
    if (stationsRef.current.length > 0)
      setActiveId(nearestStation(center, stationsRef.current));
  }, []);

  useEffect(() => {
    const cur = stationsRef.current;
    const center = mapRef.current
      ? [mapRef.current.getCenter().lat, mapRef.current.getCenter().lng] as [number, number]
      : (cur[0]?.position ?? [56.8587, 35.9176]);
    const rec = calcRecommended(center, cur, votes, unstableIdsRef.current);
    setRecommendedId(rec);
    if (rec && !selIdRef.current) setActiveId(rec);
  }, [votes, stations]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("favorites");
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  useEffect(() => {
    if (!stations.length) return;
    const validIds = new Set(stations.map(s => s.id));
    setFavorites(prev => {
      const cleaned = new Set([...prev].filter(id => validIds.has(id)));
      if (cleaned.size !== prev.size) {
        try { localStorage.setItem("favorites", JSON.stringify([...cleaned])); } catch {}
        return cleaned;
      }
      return prev;
    });
  }, [stations]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("favorites", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    fetch("/api/cities")
      .then(r => r.json())
      .then((data: Array<{ id: string; name: string; lat: number; lng: number }>) => {
        if (data && data.length > 0) {
          const mapped = data.map(r => ({ id: r.id, name: r.name, position: [r.lat, r.lng] as [number, number] }));
          const dbIds = new Set(mapped.map(c => c.id));
          const extras = CITIES_FALLBACK.filter(c => !dbIds.has(c.id));
          setCities([...mapped, ...extras]);
          setCity(mapped[0]);
        }
      })
      .catch(() => { /* fallback уже в state */ });
  }, []);

  const mapRows = (data: Array<{
    id: string; name: string; brand: string | null; brand_id: string | null;
    short: string; lat: number; lng: number; address: string | null; city: string;
  }>): Station[] => data.map(row => ({
    id: row.id, name: row.name, brand: row.brand ?? "", brand_id: row.brand_id,
    short: row.short, position: [row.lat, row.lng] as [number, number],
    city: row.city, address: row.address ?? undefined,
  }));

  const loadStations = useCallback(async (cityId: string, cityName: string) => {
    const params = new URLSearchParams({ city_id: cityId, city_name: cityName });
    const res = await fetch(`/api/stations?${params}`);
    const data = await res.json();
    if (!Array.isArray(data)) { console.error("Failed to load stations"); return; }
    const mapped = mapRows(data as Parameters<typeof mapRows>[0]);
    setStations(mapped);
    setSelId(null);
    if (mapped.length > 0) setActiveId(mapped[0].id);
  }, []);

  // Загружает станции в радиусе ~25км от точки, заменяет текущие

  useEffect(() => { loadStations(city.id, city.name); }, [loadStations, city.id, city.name]);

  const loadVotes = useCallback(async (cityId: string, cityName: string) => {
    const myId = getDeviceId();
    const params = new URLSearchParams({ city_id: cityId, city_name: cityName });
    const res = await fetch(`/api/votes?${params}`);
    const data = await res.json();
    if (!Array.isArray(data)) return;

    const deduped = new Map<string, VoteRow>();
    for (const v of data as VoteRow[]) {
      const key = `${v.station_id}:${v.fuel}:${v.device_id}`;
      if (!deduped.has(key)) deduped.set(key, v);
    }

    const sorted = [...deduped.values()].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );

    // Pre-pass: собираем данные по station+fuel для velocity и confirmatory boost
    const groupMap = new Map<string, Array<{ value: string; device_id: string; created_at: string }>>();
    for (const v of sorted) {
      const k = `${v.station_id}:${v.fuel}`;
      if (!groupMap.has(k)) groupMap.set(k, []);
      groupMap.get(k)!.push({ value: v.value, device_id: v.device_id, created_at: v.created_at });
    }

    const grouped: VotesMap  = {};
    const recent:  RecentMap = {};

    for (const v of sorted) {
      if (!grouped[v.station_id]) grouped[v.station_id] = {};
      const fuel = v.fuel as FuelId;
      if (!grouped[v.station_id][fuel]) {
        grouped[v.station_id][fuel] = { ...EMPTY_FUEL };
      }
      const e = grouped[v.station_id][fuel]!;

      const gv     = groupMap.get(`${v.station_id}:${v.fuel}`) ?? [];
      const vBoost = velocityBoost(gv.map(x => x.created_at));
      const cBoost = confirmatoryBoost(gv, { value: v.value, device_id: v.device_id, created_at: v.created_at });
      const w = voteWeight(v.created_at) * vBoost * cBoost;
      if (v.value === "yes") { e.yes++; e.yesW += w; }
      else                    { e.no++;  e.noW  += w; }
      if (v.device_id === myId) e.myVote = v.value as VoteValue;
      if (!e.lastAt || v.created_at > e.lastAt) e.lastAt = v.created_at;

      if (!recent[v.station_id]) recent[v.station_id] = [];
      if (recent[v.station_id].length < RECENT_LIMIT) {
        recent[v.station_id].push({
          fuel:  v.fuel  as FuelId,
          value: v.value as VoteValue,
          at:    v.created_at,
          mine:  v.device_id === myId,
        });
      }
    }

    // Вычисляем нестабильные станции (3+ смены направления за 3ч по любому виду топлива)
    const unstable = new Set<string>();
    const stationFuelLists = new Map<string, Array<Array<{ value: string; created_at: string }>>>();
    for (const [k, gv] of groupMap.entries()) {
      const stId = k.split(":")[0];
      if (!stationFuelLists.has(stId)) stationFuelLists.set(stId, []);
      stationFuelLists.get(stId)!.push(gv);
    }
    for (const [stId, lists] of stationFuelLists.entries()) {
      if (isStationUnstable(lists)) unstable.add(stId);
    }
    unstableIdsRef.current = unstable;
    setUnstableIds(unstable);

    setVotes(grouped);
    setRecentVotes(recent);
  }, []);

  useEffect(() => {
    loadVotes(city.id, city.name);
  }, [stations, loadVotes, city.id, city.name]);

  useEffect(() => {
    const channel = supabase
      .channel("votes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" },
        () => { loadVotes(cityRef.current.id, cityRef.current.name); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadVotes]);

  const handleVote = useCallback(async (fuel: FuelId, value: VoteValue) => {
    if (voting || !selId) return;

    // Гео-проверка: голосование только в радиусе 2 км от заправки
    if (!userPosRef.current) {
      toast.error("Включите геолокацию — нам нужно убедиться, что вы рядом с заправкой", { duration: 4000 });
      return;
    }
    const targetStation = stationsRef.current.find(s => s.id === selId);
    if (!targetStation) return;
    const dist = haversineKm(userPosRef.current, targetStation.position);
    if (dist > 2) {
      toast.error(`Вы слишком далеко от заправки (${formatDist(dist)}). Подъедьте ближе 🚗`, { duration: 4000 });
      return;
    }

    const myId = getDeviceId();
    setVoting(true);

    const voteRes = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ station_id: selId, fuel, value, device_id: myId }),
    });
    const voteJson = await voteRes.json();
    const error = voteJson.error ? { message: voteJson.error as string } : null;

    if (error) {
      console.error("Vote error:", error);
      toast.error(`Ошибка сохранения: ${error.message}`);
    } else {
      // Начисляем XP и показываем анимацию благодарности
      const xpResult = awardVoteXp(selId, fuel);
      setUserLevel(levelFromXp(xpResult.newXp));
      setVoteAnim({ xpGained: xpResult.xpGained, newXp: xpResult.newXp, alreadyEarned: xpResult.alreadyEarned, seq: ++voteSeqRef.current });
      // Показываем модалку левел-апа после исчезновения VoteAnimation
      if (xpResult.newLevel > xpResult.oldLevel) {
        setTimeout(() => setLevelUpModal(xpResult.newLevel), 3200);
      }
      const fl = FUELS.find((f) => f.id === fuel)?.label;
      toast.success(`${fl}: ${value === "yes" ? "есть ✓" : "нет ✗"}`, { duration: 2000 });
      const nowIso = new Date().toISOString();
      setVotes((prev) => {
        const stVotes = { ...prev[selId!] };
        const fd = stVotes[fuel] ?? { ...EMPTY_FUEL };
        const prevMyVote = fd.myVote;
        const updated = { ...fd, myVote: value, lastAt: nowIso };
        if (prevMyVote === "yes") { updated.yes = Math.max(0, updated.yes - 1); updated.yesW = Math.max(0, updated.yesW - 1); }
        if (prevMyVote === "no")  { updated.no  = Math.max(0, updated.no  - 1); updated.noW  = Math.max(0, updated.noW  - 1); }
        if (value === "yes") { updated.yes += 1; updated.yesW += 1; }
        if (value === "no")  { updated.no  += 1; updated.noW  += 1; }
        return { ...prev, [selId!]: { ...stVotes, [fuel]: updated } };
      });
      setRecentVotes((prev) => {
        const existing = (prev[selId!] ?? []).filter((r) => !(r.mine && r.fuel === fuel));
        const entry: RecentVote = { fuel, value, at: nowIso, mine: true };
        return { ...prev, [selId!]: [entry, ...existing].slice(0, RECENT_LIMIT) };
      });
      await loadVotes(cityRef.current.id, cityRef.current.name);
    }
    setVoting(false);
  }, [voting, selId, loadVotes]);

  const applyPosition = useCallback((lat: number, lng: number) => {
    const pos: [number, number] = [lat, lng];
    userPosRef.current = pos;
    setUserPos(pos);
    const cityList = cities.length > 0 ? cities : CITIES_FALLBACK;
    const nearest = cityList.reduce((best: City, c: City) =>
      haversineKm(pos, c.position) < haversineKm(pos, best.position) ? c : best
    , cityList[0]);
    setCity(nearest);
    if (mapRef.current) {
      mapRef.current.flyTo(pos, Math.max(mapRef.current.getZoom(), 13), { animate: true, duration: 1 });
    }
  }, [cities]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => applyPosition(pos.coords.latitude, pos.coords.longitude),
      () => {}
    );
  }, [applyPosition]);

  const handleLocate = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPosition(pos.coords.latitude, pos.coords.longitude);
        toast.success("Местоположение найдено", { duration: 1500 });
      },
      () => toast.error("Геолокация недоступна")
    );
  }, [applyPosition]);

  const searchParams = useSearchParams();

  // Auto-select station from ?s= query param (from sharing links)
  useEffect(() => {
    const sid = searchParams.get("s");
    if (sid && stations.length > 0 && !selId) selectStation(sid);
  }, [stations, searchParams, selId, selectStation]);

  const isMobile   = useIsMobile();
  const tk         = T[theme];
  const selStation = stations.find((s: Station) => s.id === selId) ?? null;

  return (
    <div style={{ position: "relative", height: "100dvh", width: "100%", overflow: "hidden", background: tk.bg }}>

      {/* Перекрашиваем зону статус-бара (safe-area-inset-top) под текущую тему */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0,
          height: "env(safe-area-inset-top)",
          background: theme === "dark" ? "#0a0a0a" : "#ffffff",
          zIndex: 9999, pointerEvents: "none",
        }} />
      )}

      <Toaster position="top-center" toastOptions={{
        style: {
          background:   theme === "dark" ? "#1e1e2a" : "#ffffff",
          color:        tk.text,
          border:       `1px solid ${tk.ctrlBorder}`,
          borderRadius: "14px", fontSize: 14, fontWeight: 500,
          boxShadow:    "0 8px 32px rgba(0,0,0,0.2)",
        },
      }} />

      <MapContainer
        center={city.position} zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false} attributionControl={false}
      >
        <TileLayer
          key={theme}
          url={TILE_URLS[theme]}
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          maxZoom={19}
        />
        <MapRefCapture onMap={(m) => { mapRef.current = m; }} />
        <MarkersLayer
          stations={filteredStations} selectedId={selId} recommendedId={recommendedId}
          hoveredId={hoveredId} onSelect={selectStation} userPos={userPos} votes={votes}
        />
        <MapClickHandler onMapClick={() => { setSelId(null); setShowMyStations(false); setShowAbout(false); setShowLevel(false); }} />
        <MapMoveHandler onMove={recalc} />
        <CityFlyTo city={city} />
      </MapContainer>

      {/* Top bar */}
      <div style={{
        position: "absolute", zIndex: 900,
        left: isMobile ? 16 : "50%",
        transform: isMobile ? "none" : "translateX(-50%)",
        top: isMobile ? `calc(86px + env(safe-area-inset-top))` : `calc(16px + env(safe-area-inset-top))`,
      }}>
        <SearchBar
          stations={stations} cities={cities} votes={votes}
          userPos={userPos} theme={theme} selectedCity={city}
          favCount={favorites.size} isMobile={isMobile}
          userLevel={userLevel}
          onSelectStation={(s) => selectStation(s.id)}
          onSelectCity={(c) => { setCity(c); setGeoLabel(undefined); }}
          onOpenMyStations={() => setShowMyStations(true)}
          onOpenLevel={() => setShowLevel(true)}
          onNavigateTo={(_lat, _lng, label) => {
            if (mapRef.current) mapRef.current.flyTo([_lat, _lng], 13, { animate: true, duration: 1 });
            setGeoLabel(label);
            // Определяем нужный город по bbox координат
            const moCity    = cities.find(c => c.id === "mo");
            const inMO      = _lat >= 54.0 && _lat <= 57.0 && _lng >= 35.0 && _lng <= 41.5;
            const inMoscow  = _lat >= 55.45 && _lat <= 56.0 && _lng >= 36.8 && _lng <= 37.95;
            if (inMO && !inMoscow && moCity) {
              setCity(moCity);
            } else {
              const nearest = cities.reduce((best, c) =>
                haversineKm([_lat, _lng], c.position) < haversineKm([_lat, _lng], best.position) ? c : best
              );
              setCity(nearest);
            }
          }}
          geoLabel={geoLabel}
        />
        {/* Строка: Фильтры слева, Поддержать справа */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          width: isMobile ? "calc(100vw - 32px)" : "440px",
          marginTop: 6,
        }}>
          <FilterBar filters={filters} onFilters={setFilters} theme={theme} />

          {/* Кнопка поддержки проекта */}
          <a
            href="https://pay.cloudtips.ru/p/9edca9ec"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 13px", borderRadius: 20,
              background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
              boxShadow: "0 2px 12px rgba(239,68,68,0.35), 0 0 0 1px rgba(245,158,11,0.4)",
              color: "#fff", fontSize: 12, fontWeight: 700,
              fontFamily: "inherit", cursor: "pointer",
              textDecoration: "none", flexShrink: 0,
              transition: "transform 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.04)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 18px rgba(239,68,68,0.5), 0 0 0 1px rgba(245,158,11,0.5)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(239,68,68,0.35), 0 0 0 1px rgba(245,158,11,0.4)";
            }}
          >
            <span style={{ fontSize: 13 }}>☕</span>
            Поддержать
          </a>
        </div>
      </div>

      <SideControls
        theme={theme} onToggleTheme={toggleTheme}
        onLocate={handleLocate} mapRef={mapRef} isMobile={isMobile}
      />

      {/* Логотип + кнопка «О проекте» в левом верхнем углу */}
      <div style={{
        position: "absolute",
        left: 16,
        top: `calc(16px + env(safe-area-inset-top))`,
        zIndex: 900,
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
      }}>
        <div style={{
          background: tk.ctrl,
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${tk.ctrlBorder}`,
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
          overflow: "hidden",
          width: isMobile ? 96 : 148,
        }}>
          {/* Логотип */}
          <img
            src="/benzok-logo.jpg"
            alt="БензОК"
            style={{
              width: "100%", display: "block",
              borderRadius: "16px 16px 0 0",
            }}
          />
          {/* Кнопка «О проекте» — на всех устройствах */}
          <button
            onClick={() => setShowAbout(true)}
            style={{
              width: "100%", border: "none", cursor: "pointer",
              background: "transparent",
              padding: isMobile ? "6px 0" : "9px 0",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              color: tk.textSub, fontFamily: "inherit",
              fontSize: isMobile ? 11 : 12, fontWeight: 600,
              borderTop: `1px solid ${tk.ctrlBorder}`,
              transition: "background 0.12s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style={{ opacity: 0.6 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
              О проекте
            </button>
        </div>
      </div>

      {(!isMobile || !selStation) && (
        <StationList
          stations={filteredStations} selectedId={selId} activeId={activeId}
          hoveredId={hoveredId} votes={votes} userPos={userPos}
          theme={theme} isMobile={isMobile}
          onSelect={selectStation} onHover={setHoveredId}
        />
      )}

      <AnimatePresence>
        {selStation && (
          <StationSheet
            key={selStation.id}
            station={selStation}
            votes={votes[selId!] ?? {}}
            recentVotes={recentVotes[selId!] ?? []}
            onVote={handleVote}
            onClose={() => setSelId(null)}
            voting={voting} theme={theme} userPos={userPos}
            isRecommended={selStation.id === recommendedId}
            isUnstable={unstableIds.has(selStation.id)}
            isFavorite={favorites.has(selStation.id)}
            onToggleFavorite={() => toggleFavorite(selStation.id)}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMyStations && (
          <MyStationsScreen
            stations={stations} favorites={favorites} votes={votes}
            userPos={userPos} theme={theme} isMobile={isMobile}
            onSelect={(id) => { selectStation(id); }}
            onClose={() => setShowMyStations(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbout && (
          <AboutScreen theme={theme} isMobile={isMobile} onClose={() => setShowAbout(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLevel && (
          <LevelScreen theme={theme} isMobile={isMobile} onClose={() => setShowLevel(false)} />
        )}
      </AnimatePresence>

      {/* Анимация благодарности после голосования */}
      <AnimatePresence>
        {voteAnim && (
          <VoteAnimation
            key={voteAnim.seq}
            xpGained={voteAnim.xpGained}
            newXp={voteAnim.newXp}
            alreadyEarned={voteAnim.alreadyEarned}
            theme={theme}
            onDone={() => setVoteAnim(null)}
          />
        )}
      </AnimatePresence>

      {/* Модальное окно повышения уровня */}
      <AnimatePresence>
        {levelUpModal !== null && (
          <LevelUpModal
            key={levelUpModal}
            level={levelUpModal}
            theme={theme}
            onClose={() => setLevelUpModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Telegram banner */}
      <AnimatePresence>
        {showTgBanner && (
          <div style={{
            position: "fixed",
            bottom: isMobile ? "calc(108px + env(safe-area-inset-bottom))" : 24,
            left: 0, right: 0,
            display: "flex", justifyContent: "center",
            zIndex: 1100, pointerEvents: "none",
          }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              style={{
                pointerEvents: "auto",
                width: isMobile ? "calc(100vw - 32px)" : 340,
                background: theme === "dark" ? "rgba(20,22,30,0.97)" : "rgba(255,255,255,0.97)",
                border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)"}`,
                borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.32)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
              }}
              onClick={() => window.open("https://t.me/benzokchannel", "_blank")}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: "linear-gradient(145deg,#37aee2,#1e96c8)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="url(#tg_b)"/>
                  <defs>
                    <linearGradient id="tg_b" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#37aee2"/>
                      <stop offset="100%" stopColor="#1e96c8"/>
                    </linearGradient>
                  </defs>
                  <path d="M5.491 11.74l11.57-4.461c.537-.194 1.006.131.832.943l-1.97 9.281c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953z" fill="white"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme === "dark" ? "#fff" : "#000", marginBottom: 2 }}>Telegram-канал</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#37aee2", marginBottom: 3 }}>@benzokchannel</div>
                <div style={{ fontSize: 11, color: theme === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>Новости, обновления, обратная связь</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowTgBanner(false); }}
                style={{
                  width: 28, height: 28, borderRadius: "50%", border: "none",
                  background: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                  color: theme === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                  cursor: "pointer", fontSize: 16, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >×</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
