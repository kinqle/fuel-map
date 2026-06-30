"use client";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import type { Station, FuelId, FuelVotes, VoteValue, RecentVote, Theme } from "../lib/types";
import { T, FUELS, BRAND_COLORS, BRAND_LOGOS, STATUS_META, COMMENT_CATS, ARCHIVE_MS, EMPTY_FUEL } from "../lib/constants";
import { haversineKm, formatDist, formatAge } from "../lib/utils";
import { getStationStatus, calcFuelConfidence, getFuelVerdict, getFreshnessInfo, computeTrend } from "../lib/votes";
import { RouteButton } from "./RouteButton";
import { CommentsTab } from "./CommentsTab";

export function StationSheet({ station, votes, recentVotes, onVote, onClose, voting, theme, userPos, isFavorite, onToggleFavorite, isMobile, isRecommended }: {
  station:          Station;
  votes:            Partial<Record<FuelId, FuelVotes>>;
  recentVotes:      RecentVote[];
  onVote:           (fuel: FuelId, value: VoteValue) => void;
  onClose:          () => void;
  voting:           boolean;
  theme:            Theme;
  userPos:          [number, number] | null;
  isFavorite:       boolean;
  onToggleFavorite: () => void;
  isMobile:         boolean;
  isRecommended:    boolean;
}) {
  const color  = BRAND_COLORS[station.brand] ?? "#6366f1";
  const tk     = T[theme];
  const status = getStationStatus(votes);
  const sm     = STATUS_META[status];
  const dist   = userPos ? haversineKm(userPos, station.position) : null;

  const [changeMenuFuel, setChangeMenuFuel] = useState<FuelId | null>(null);
  const [infoFuel,       setInfoFuel]       = useState<FuelId | null>(null);
  const [sheetTab,       setSheetTab]       = useState<"fuel" | "comments">("fuel");
  const [latestComment,  setLatestComment]  = useState<{ emoji: string; label: string; body: string | null; at: string } | null>(null);
  const [unreadComments, setUnreadComments] = useState(0);
  const sheetTabRef = useRef<"fuel" | "comments">("fuel");
  const openedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    setSheetTab("fuel");
    sheetTabRef.current = "fuel";
    setUnreadComments(0);
    openedAtRef.current = Date.now();
  }, [station.id]);

  useEffect(() => {
    const ch = supabase.channel(`sheet-comments-${station.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
        const row = payload.new as { station_id: string; created_at: string };
        if (row.station_id !== station.id) return;
        const at = new Date(row.created_at).getTime();
        if (at < openedAtRef.current) return;
        if (sheetTabRef.current !== "comments") setUnreadComments(n => n + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [station.id]);

  useEffect(() => {
    const since = new Date(Date.now() - ARCHIVE_MS).toISOString();
    const params = new URLSearchParams({ station_id: station.id, since, limit: "1" });
    fetch(`/api/comments?${params}`)
      .then(r => r.json())
      .then(({ comments }) => {
        if (comments?.[0]) {
          const cat = COMMENT_CATS.find(c => c.id === comments[0].category) ?? COMMENT_CATS[COMMENT_CATS.length - 1];
          setLatestComment({ emoji: cat.emoji, label: cat.label, body: comments[0].body, at: comments[0].created_at });
        }
      });
  }, [station.id]);

  const mobileStyle: React.CSSProperties = {
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001,
    background: tk.card, borderRadius: "24px 24px 0 0",
    boxShadow: "0 -4px 40px rgba(0,0,0,0.4)",
    maxHeight: "82svh", overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  };
  const desktopStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, bottom: 0,
    width: 320, zIndex: 1001,
    background: tk.card, boxShadow: "4px 0 40px rgba(0,0,0,0.35)",
    overflowY: "auto", WebkitOverflowScrolling: "touch",
  };

  return (
    <motion.div
      initial={isMobile ? { y: "100%", opacity: 1 } : { x: -320, opacity: 0 }}
      animate={isMobile ? { y: 0,      opacity: 1 } : { x: 0,    opacity: 1 }}
      exit={   isMobile ? { y: "100%", opacity: 1 } : { x: -320, opacity: 0 }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      onClick={(e) => e.stopPropagation()}
      className="fm-panel-scroll"
      style={isMobile ? mobileStyle : desktopStyle}
    >
      {isMobile && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: tk.handle }} />
        </div>
      )}
      <div style={{ padding: isMobile ? "12px 18px calc(24px + env(safe-area-inset-bottom))" : "20px 18px 48px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {BRAND_LOGOS[station.brand_id ?? ""] ? (
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", padding: 5, boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
              }}>
                <img src={BRAND_LOGOS[station.brand_id ?? ""]} alt={station.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
                />
              </div>
            ) : (
              <div style={{
                width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg,${color}20,${color}40)`,
                border: `1.5px solid ${color}50`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>⛽</div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: tk.text, fontSize: 17, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                {station.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                {isRecommended && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: "rgba(251,191,36,0.15)", fontSize: 11, fontWeight: 700, color: "#fbbf24" }}>★ Рекомендуем</span>
                )}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: sm.bg, fontSize: 11, fontWeight: 600, color: sm.color }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: sm.color, display: "inline-block" }} />
                  {sm.label}
                </span>
                {dist != null && <span style={{ color: tk.textSub, fontSize: 11 }}>{formatDist(dist)}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Поделиться ссылкой на АЗС */}
            <button onClick={() => {
              const url = `${window.location.origin}/station/${station.id}`;
              if (navigator.share) {
                navigator.share({ title: station.name, url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url).then(() => {
                  import("react-hot-toast").then(({ default: toast }) =>
                    toast.success("Ссылка скопирована", { duration: 2000 })
                  );
                });
              }
            }} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 11px", borderRadius: 20, flexShrink: 0,
              background: "rgba(99,102,241,0.10)",
              border: "1.5px solid rgba(99,102,241,0.35)",
              cursor: "pointer", color: "#818cf8",
              fontSize: 12, fontWeight: 700, fontFamily: "inherit",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Поделиться
            </button>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: tk.rowBg, border: `1px solid ${tk.rowBorder}`,
              cursor: "pointer", color: tk.textSub, fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        </div>

        <div style={{ height: 1, background: tk.divider, marginBottom: 12 }} />

        {latestComment && (
          <div onClick={() => setSheetTab("comments")} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 12px", borderRadius: 12, marginBottom: 12,
            background: theme === "dark" ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.2)", cursor: "pointer",
          }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>{latestComment.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: tk.text, fontSize: 12, fontWeight: 600 }}>{latestComment.label}</span>
              {latestComment.body && (
                <span style={{ color: tk.textSub, fontSize: 11 }}> — {latestComment.body.slice(0, 40)}{latestComment.body.length > 40 ? "…" : ""}</span>
              )}
            </div>
            <span style={{ color: tk.textSub, fontSize: 10, flexShrink: 0 }}>{formatAge(latestComment.at)}</span>
          </div>
        )}

        <button onClick={onToggleFavorite} style={{
          width: "100%", padding: "10px 14px", marginBottom: 12,
          border: `1.5px solid ${isFavorite ? "rgba(251,191,36,0.5)" : tk.rowBorder}`,
          borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
          background: isFavorite ? "rgba(251,191,36,0.10)" : tk.rowBg,
          color: isFavorite ? "#fbbf24" : tk.textSub,
          fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          transition: "all 0.18s",
        }}>
          <span style={{ fontSize: 15 }}>{isFavorite ? "★" : "☆"}</span>
          {isFavorite ? "В избранном" : "Добавить в избранное"}
        </button>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, background: tk.rowBg, borderRadius: 12, padding: 4 }}>
          {(["fuel", "comments"] as const).map(t => (
            <button key={t} onClick={() => {
              sheetTabRef.current = t;
              setSheetTab(t);
              if (t === "comments") setUnreadComments(0);
            }} style={{
              flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer",
              background: sheetTab === t ? (theme === "dark" ? "#2a2a3a" : "#ffffff") : "transparent",
              color: sheetTab === t ? tk.text : tk.textSub,
              fontWeight: sheetTab === t ? 700 : 500, fontSize: 13,
              boxShadow: sheetTab === t ? "0 1px 6px rgba(0,0,0,0.12)" : "none",
              transition: "all 0.15s", position: "relative",
            }}>
              {t === "fuel" ? "⛽ Топливо" : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  💬 Сообщения
                  {unreadComments > 0 && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      minWidth: 18, height: 18, borderRadius: 9,
                      background: "#ef4444", color: "#fff",
                      fontSize: 11, fontWeight: 700, padding: "0 4px", lineHeight: 1,
                    }}>{unreadComments > 99 ? "99+" : unreadComments}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Fuel tab */}
        {sheetTab === "fuel" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FUELS.map(({ id, label, color: fc }) => {
                const fd         = votes[id] ?? EMPTY_FUEL;
                const total      = fd.yes + fd.no;
                const verdict    = getFuelVerdict(fd);
                const confidence = calcFuelConfidence(fd);
                const freshness  = getFreshnessInfo(fd.lastAt);
                const trend      = computeTrend(id, recentVotes, fd);

                return (
                  <div key={id} style={{ background: tk.rowBg, borderRadius: 16, padding: "14px 14px", border: `1px solid ${tk.rowBorder}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: fc, boxShadow: `0 0 6px ${fc}99`, flexShrink: 0 }} />
                      <span style={{ color: tk.textSub, fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</span>
                    </div>

                    <div onClick={() => setInfoFuel(infoFuel === id ? null : id)} style={{
                      background: `${verdict.color}18`, border: `1px solid ${verdict.color}35`,
                      borderRadius: 12, padding: "11px 13px", marginBottom: 6,
                      display: "flex", alignItems: "center", gap: 9,
                      cursor: "pointer", userSelect: "none",
                    }}>
                      <span style={{ fontSize: 20, lineHeight: 1 }}>{verdict.emoji}</span>
                      <span style={{ color: verdict.color, fontWeight: 700, fontSize: 15, lineHeight: 1.2, flex: 1 }}>{verdict.label}</span>
                      <span style={{ fontSize: 13, color: verdict.color, opacity: 0.6, fontWeight: 700 }}>?</span>
                    </div>

                    {infoFuel === id && (
                      <div style={{
                        background: theme === "dark" ? "rgba(30,32,44,0.98)" : "rgba(250,250,255,0.98)",
                        border: `1px solid ${verdict.color}40`,
                        borderRadius: 12, padding: "12px 14px",
                        marginBottom: 8, fontSize: 12, lineHeight: 1.6,
                        color: tk.text, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
                      }}>
                        {verdict.label === "Нет данных" && <><b>Нет данных</b> — никто ещё не голосовал по этому виду топлива. Будьте первым — нажмите «Есть» или «Нет» ниже.</>}
                        {verdict.label === "Информация устарела" && <><b>Устаревшие данные</b> — последние голоса были очень давно и больше не актуальны. Обновите информацию, проголосовав прямо сейчас.</>}
                        {verdict.label === "Мало подтверждений" && <><b>Мало подтверждений</b> — проголосовал только один человек. Для надёжного результата нужно хотя бы 2 голоса. Подтвердите или опровергните информацию.</>}
                        {verdict.label === "Мнения разделились" && <><b>Мнения разделились</b> — часть водителей говорит «есть», часть — «нет». Скорее всего ситуация на заправке менялась. Актуальный голос поможет разобраться.</>}
                        {verdict.label === "Скорее всего есть" && <><b>Скорее всего есть</b> — большинство проголосовавших подтвердили наличие топлива. Уверенность: {confidence}%. Данные могут устареть — проверьте свежесть ниже.</>}
                        {verdict.label === "Скорее всего нет" && <><b>Скорее всего нет</b> — большинство сообщили об отсутствии топлива. Уверенность: {confidence}%. Рекомендуем выбрать другую АЗС.</>}
                      </div>
                    )}

                    {total > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 2, marginBottom: 8 }}>
                        <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600 }}>✓ {fd.yes}</span>
                        <span style={{ color: tk.divider }}>·</span>
                        <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 600 }}>✗ {fd.no}</span>
                        <span style={{ color: tk.divider }}>·</span>
                        <span style={{ color: tk.textSub, fontSize: 11 }}>уверенность {confidence}%</span>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 12, paddingLeft: 2 }}>
                      <span style={{ fontSize: 10 }}>{freshness.icon}</span>
                      <span style={{ color: tk.textSub, fontSize: 11 }}>{freshness.detail || freshness.label}</span>
                    </div>

                    {trend && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 8, background: `${trend.color}10`, border: `1px solid ${trend.color}28`, marginBottom: 12 }}>
                        <span style={{ fontSize: 14, lineHeight: 1 }}>{trend.icon}</span>
                        <span style={{ color: trend.color, fontSize: 11, fontWeight: 600 }}>{trend.text}</span>
                      </motion.div>
                    )}

                    {(() => {
                      const kind = verdict.kind;
                      const isChanging = changeMenuFuel === id;

                      if (kind === "neutral") {
                        return (
                          <div>
                            <div style={{ color: tk.textSub, fontSize: 11, marginBottom: 7, fontStyle: "italic" }}>Помогите нам разобраться:</div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {([
                                { v: "yes" as VoteValue, label: "🟢 Есть", ac: "#22c55e", sh: "0 4px 14px rgba(34,197,94,0.4)"  },
                                { v: "no"  as VoteValue, label: "🔴 Нет",  ac: "#ef4444", sh: "0 4px 14px rgba(239,68,68,0.4)" },
                              ] as const).map(({ v, label: bl, ac, sh }) => {
                                const active = fd.myVote === v;
                                return (
                                  <button key={v} onClick={() => onVote(id, v)} disabled={voting} style={{
                                    flex: 1, padding: "11px 0", borderRadius: 10,
                                    border: active ? "none" : `1px solid ${ac}35`,
                                    cursor: voting ? "not-allowed" : "pointer",
                                    fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                                    background: active ? ac : `${ac}10`,
                                    color: active ? "white" : ac,
                                    boxShadow: active ? sh : "none",
                                    opacity: voting ? 0.5 : 1, transition: "all 0.15s ease",
                                  } as React.CSSProperties}>{bl}</button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      const isPrimYes  = kind === "yes";
                      const primVote   = isPrimYes ? "yes" : "no" as VoteValue;
                      const primLabel  = isPrimYes ? "✅ Подтверждаю" : "❌ Подтверждаю";
                      const primColor  = isPrimYes ? "#22c55e" : "#ef4444";
                      const primShadow = isPrimYes ? "0 4px 14px rgba(34,197,94,0.4)" : "0 4px 14px rgba(239,68,68,0.4)";
                      const primActive = fd.myVote === primVote;
                      const secActive  = fd.myVote !== null && fd.myVote !== primVote;

                      const fixOptions: { v: VoteValue; label: string; ac: string }[] = isPrimYes ? [
                        { v: "no", label: "❌ Топлива нет",          ac: "#ef4444" },
                        { v: "no", label: "🚫 Заправка не работает", ac: "#ef4444" },
                      ] : [
                        { v: "yes", label: "✅ Топливо появилось", ac: "#22c55e" },
                      ];

                      return (
                        <div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { onVote(id, primVote); setChangeMenuFuel(null); }} disabled={voting} style={{
                              flex: 2, padding: "11px 0", borderRadius: 10,
                              border: primActive ? "none" : `1px solid ${primColor}40`,
                              cursor: voting ? "not-allowed" : "pointer",
                              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                              background: primActive ? primColor : `${primColor}15`,
                              color: primActive ? "white" : primColor,
                              boxShadow: primActive ? primShadow : "none",
                              opacity: voting ? 0.5 : 1, transition: "all 0.15s ease",
                            } as React.CSSProperties}>{primLabel}</button>

                            <button onClick={() => setChangeMenuFuel(isChanging ? null : id)} style={{
                              flex: 1, padding: "11px 0", borderRadius: 10,
                              cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                              transition: "all 0.15s ease",
                              background: (isChanging || secActive) ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.07)",
                              color: "#f59e0b",
                              border: `1px solid ${(isChanging || secActive) ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.28)"}`,
                              opacity: voting ? 0.5 : 1,
                            } as React.CSSProperties}>⚠ Исправить</button>
                          </div>

                          <AnimatePresence>
                            {isChanging && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                style={{ overflow: "hidden" }}
                              >
                                <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 10, padding: "10px 10px 8px" }}>
                                  <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Что происходит сейчас?</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    {fixOptions.map((opt, i) => (
                                      <button key={i} onClick={() => { onVote(id, opt.v); setChangeMenuFuel(null); }} disabled={voting} style={{
                                        width: "100%", padding: "9px 12px", borderRadius: 8,
                                        border: `1px solid ${opt.ac}30`, background: `${opt.ac}10`,
                                        color: opt.ac, fontSize: 12, fontWeight: 600,
                                        fontFamily: "inherit", cursor: voting ? "not-allowed" : "pointer",
                                        textAlign: "left" as const,
                                        opacity: voting ? 0.5 : 1, transition: "all 0.1s ease",
                                      }}>{opt.label}</button>
                                    ))}
                                    <button onClick={() => setChangeMenuFuel(null)} style={{
                                      width: "100%", padding: "7px 12px", borderRadius: 8,
                                      border: "none", background: "transparent",
                                      color: tk.textSub, fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                                    }}>Отмена</button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {recentVotes.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ color: tk.text, fontSize: 13, fontWeight: 700 }}>Активность</span>
                  <div style={{ padding: "2px 8px", borderRadius: 20, background: tk.rowBg, border: `1px solid ${tk.rowBorder}`, color: tk.textSub, fontSize: 10, fontWeight: 600 }}>{recentVotes.length}</div>
                </div>

                <div style={{ position: "relative", paddingLeft: 30 }}>
                  <div style={{ position: "absolute", left: 8, top: 14, bottom: 14, width: 1.5, background: `linear-gradient(to bottom, ${tk.divider} 0%, transparent 100%)`, pointerEvents: "none" }} />

                  <AnimatePresence initial={false}>
                    {recentVotes.map((r, i) => {
                      const fuel   = FUELS.find(f => f.id === r.fuel);
                      const isYes  = r.value === "yes";
                      const dotClr = isYes ? "#22c55e" : "#ef4444";
                      const bgClr  = theme === "dark" ? "#0f0f13" : "#f8f9fb";

                      return (
                        <motion.div key={`${r.fuel}-${r.at}`}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.22, delay: i * 0.04 }}
                          style={{ position: "relative", marginBottom: i < recentVotes.length - 1 ? 8 : 0 }}>
                          <div style={{
                            position: "absolute", left: -30, top: "50%", transform: "translateY(-50%)",
                            width: 16, height: 16, borderRadius: "50%",
                            background: dotClr, border: `2.5px solid ${bgClr}`,
                            boxShadow: i === 0 ? `0 0 10px ${dotClr}70` : "none",
                            zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ color: "white", fontSize: 8, fontWeight: 900, lineHeight: 1 }}>{isYes ? "✓" : "✗"}</span>
                          </div>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px", borderRadius: 12,
                            background: r.mine ? `${dotClr}0d` : tk.rowBg,
                            border: `1px solid ${r.mine ? `${dotClr}28` : tk.rowBorder}`,
                          }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: `${fuel?.color ?? "#6b7280"}14`, border: `1.5px solid ${fuel?.color ?? "#6b7280"}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: fuel?.color ?? "#6b7280" }}>
                              {r.fuel === "ai92" ? "92" : r.fuel === "ai95" ? "95" : "ДТ"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                                <span style={{ color: tk.text, fontSize: 12, fontWeight: 600 }}>{fuel?.label ?? r.fuel}</span>
                                {r.mine && <span style={{ padding: "1px 5px", borderRadius: 4, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)", color: "#818cf8", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>ВЫ</span>}
                              </div>
                              <div style={{ color: dotClr, fontSize: 11, fontWeight: 600 }}>{isYes ? "Топливо есть" : "Топлива нет"}</div>
                            </div>
                            <div style={{ color: tk.textSub, fontSize: 10, flexShrink: 0, textAlign: "right" as const }}>{formatAge(r.at)}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}

        {sheetTab === "comments" && <CommentsTab stationId={station.id} theme={theme} />}

        <RouteButton station={station} color="#3b82f6" tk={tk} />
      </div>
    </motion.div>
  );
}
