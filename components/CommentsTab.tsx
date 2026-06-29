"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import type { Comment, Theme } from "../lib/types";
import { T, COMMENT_CATS, REPORT_HIDE, COMMENT_GAP, ARCHIVE_MS, MAX_BODY } from "../lib/constants";
import { getDeviceId, formatAge } from "../lib/utils";

function repBadge(totalLikes: number): { b: string; l: string } | null {
  if (totalLikes >= 50) return { b: "🏆", l: "Эксперт" };
  if (totalLikes >= 25) return { b: "⭐⭐", l: "Опытный" };
  if (totalLikes >= 10) return { b: "⭐", l: "Надёжный" };
  if (totalLikes >= 3)  return { b: "✔", l: "Активный" };
  return null;
}

export function CommentsTab({ stationId, theme }: { stationId: string; theme: Theme }) {
  const tk   = T[theme];
  const myId = getDeviceId();

  const [comments,   setComments]   = useState<Comment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [writing,    setWriting]    = useState(false);
  const [nameStep,   setNameStep]   = useState(false);
  const [name,       setName]       = useState(() => {
    try { return localStorage.getItem("comment_name") ?? ""; } catch { return ""; }
  });
  const [cat,        setCat]        = useState<string | null>(null);
  const [body,       setBody]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - ARCHIVE_MS).toISOString();
    const { data: cData } = await supabase
      .from("comments")
      .select("*")
      .eq("station_id", stationId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(60);
    if (!cData?.length) { setComments([]); setLoading(false); return; }

    const ids = (cData as Comment[]).map(c => c.id);
    const { data: rData } = await supabase
      .from("comment_reactions")
      .select("comment_id, device_id, type")
      .in("comment_id", ids);

    const reactions = (rData ?? []) as { comment_id: string; device_id: string; type: string }[];

    const mapped: Comment[] = (cData as Comment[]).map(c => {
      const cr = reactions.filter(r => r.comment_id === c.id);
      return {
        ...c,
        likes:    cr.filter(r => r.type === "like").length,
        reports:  cr.filter(r => r.type === "report").length,
        myLike:   cr.some(r => r.device_id === myId && r.type === "like"),
        myReport: cr.some(r => r.device_id === myId && r.type === "report"),
      };
    }).filter(c => c.reports < REPORT_HIDE);

    mapped.sort((a, b) => {
      const ap = a.likes >= 3 ? 1 : 0, bp = b.likes >= 3 ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return b.created_at.localeCompare(a.created_at);
    });

    setComments(mapped);
    setLoading(false);
  }, [stationId, myId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel(`comments-${stationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_reactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [stationId, load]);

  const authorLikes = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of comments) m[c.device_id] = (m[c.device_id] ?? 0) + c.likes;
    return m;
  }, [comments]);

  const cooldownMs = () => {
    try {
      const last = parseInt(localStorage.getItem(`last_comment_${stationId}`) ?? "0");
      return Math.max(0, last + COMMENT_GAP - Date.now());
    } catch { return 0; }
  };

  const startWrite = () => {
    const cd = cooldownMs();
    if (cd > 0) { toast.error(`Можно писать через ${Math.ceil(cd / 60_000)} мин`); return; }
    if (!name.trim()) { setNameStep(true); setWriting(true); return; }
    setWriting(true);
  };

  const submitComment = async () => {
    if (!cat || submitting) return;
    const trimName = name.trim() || "Аноним";
    const trimBody = body.trim().slice(0, MAX_BODY);
    try { localStorage.setItem("comment_name", trimName); } catch { /* */ }
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      station_id: stationId, device_id: myId,
      author_name: trimName, category: cat,
      body: trimBody || null,
    });
    if (!error) {
      try { localStorage.setItem(`last_comment_${stationId}`, String(Date.now())); } catch { /* */ }
      toast.success("Сообщение отправлено!");
    } else {
      toast.error("Ошибка отправки");
    }
    setWriting(false); setCat(null); setBody(""); setNameStep(false); setSubmitting(false);
    load();
  };

  const toggleLike = async (c: Comment) => {
    if (c.myLike) {
      await supabase.from("comment_reactions").delete()
        .eq("comment_id", c.id).eq("device_id", myId).eq("type", "like");
    } else {
      await supabase.from("comment_reactions")
        .upsert({ comment_id: c.id, device_id: myId, type: "like" });
    }
    load();
  };

  const reportComment = async (c: Comment) => {
    if (c.myReport) return;
    await supabase.from("comment_reactions")
      .upsert({ comment_id: c.id, device_id: myId, type: "report" });
    toast("Жалоба отправлена", { icon: "✓" });
    load();
  };

  const catInfo = (id: string) =>
    COMMENT_CATS.find(c => c.id === id) ?? COMMENT_CATS[COMMENT_CATS.length - 1];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: theme === "dark" ? "#1a1a24" : "#f3f4f6",
    border: `1px solid ${tk.rowBorder}`,
    color: tk.text, fontSize: 14, boxSizing: "border-box",
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div>
      {!writing ? (
        <button onClick={startWrite} style={{
          width: "100%", padding: "12px 16px", borderRadius: 14,
          background: "rgba(99,102,241,0.10)", border: "1.5px dashed rgba(99,102,241,0.4)",
          color: "#818cf8", fontSize: 14, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginBottom: 14, transition: "background 0.15s",
        }}>
          💬 Написать сообщение
        </button>
      ) : (
        <div style={{
          background: tk.rowBg, borderRadius: 16,
          border: "1.5px solid rgba(99,102,241,0.3)",
          padding: 14, marginBottom: 14,
        }}>
          {nameStep ? (
            <div>
              <div style={{ color: tk.textSub, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
                Как вас называть?
              </div>
              <input
                autoFocus value={name} maxLength={40} placeholder="Ваше имя"
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") setNameStep(false); }}
                style={inputStyle}
              />
              <button onClick={() => setNameStep(false)} style={{
                marginTop: 10, padding: "9px 20px", borderRadius: 10,
                background: "#6366f1", border: "none",
                color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>Продолжить →</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: tk.textSub, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                Что сообщаете?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                {COMMENT_CATS.map(c => (
                  <button key={c.id} onClick={() => setCat(c.id === cat ? null : c.id)} style={{
                    padding: "9px 10px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                    background: cat === c.id ? "rgba(99,102,241,0.18)" : (theme === "dark" ? "#1a1a24" : "#f3f4f6"),
                    border: `1.5px solid ${cat === c.id ? "#6366f1" : "transparent"}`,
                    color: tk.text, fontSize: 12, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 7,
                    transition: "all 0.13s",
                  }}>
                    <span style={{ fontSize: 15 }}>{c.emoji}</span>{c.label}
                  </button>
                ))}
              </div>

              <textarea
                value={body} maxLength={MAX_BODY} rows={2}
                onChange={e => setBody(e.target.value)}
                placeholder="Дополнительно (необязательно)..."
                style={{ ...inputStyle, resize: "none" }}
              />
              {body.length > 200 && (
                <div style={{ color: body.length >= MAX_BODY ? "#ef4444" : tk.textSub, fontSize: 10, textAlign: "right", marginTop: 2 }}>
                  {body.length}/{MAX_BODY}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => { setWriting(false); setCat(null); setBody(""); }} style={{
                  flex: 1, padding: "10px", borderRadius: 10,
                  background: "transparent", border: `1px solid ${tk.rowBorder}`,
                  color: tk.textSub, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>Отмена</button>
                <button onClick={submitComment} disabled={!cat || submitting} style={{
                  flex: 2, padding: "10px", borderRadius: 10, border: "none",
                  background: cat ? "#6366f1" : "rgba(99,102,241,0.25)",
                  color: cat ? "white" : tk.textSub,
                  fontSize: 13, fontWeight: 700,
                  cursor: cat ? "pointer" : "default",
                  opacity: submitting ? 0.7 : 1, transition: "all 0.15s",
                }}>
                  {submitting ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "28px 0", textAlign: "center", color: tk.textSub, fontSize: 13 }}>
          Загрузка...
        </div>
      ) : comments.length === 0 ? (
        <div style={{ padding: "28px 0", textAlign: "center", color: tk.textSub, fontSize: 13, lineHeight: 1.6 }}>
          Пока никто не писал.<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>Будьте первым!</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {comments.map(c => {
            const ci     = catInfo(c.category);
            const pinned = c.likes >= 3;
            const rep    = repBadge(authorLikes[c.device_id] ?? 0);
            const isMe   = c.device_id === myId;
            return (
              <div key={c.id} style={{
                borderRadius: 14, padding: "12px 13px",
                background: pinned
                  ? (theme === "dark" ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.06)")
                  : tk.rowBg,
                border: `1px solid ${pinned ? "rgba(99,102,241,0.3)" : tk.rowBorder}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{ci.emoji}</span>
                    <span style={{ color: tk.text, fontSize: 12, fontWeight: 700 }}>{ci.label}</span>
                    {pinned && <span style={{ fontSize: 10, color: "#818cf8" }}>📌</span>}
                  </div>
                  <span style={{ color: tk.textSub, fontSize: 10 }}>{formatAge(c.created_at)}</span>
                </div>

                {c.body && (
                  <div style={{ color: tk.text, fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
                    {c.body}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {rep && <span style={{ fontSize: 10, lineHeight: 1 }}>{rep.b}</span>}
                    <span style={{ color: isMe ? "#818cf8" : tk.textSub, fontSize: 11, fontWeight: isMe ? 700 : 400 }}>
                      {c.author_name}{isMe ? " (вы)" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => toggleLike(c)} style={{
                      background: c.myLike ? "rgba(99,102,241,0.12)" : "transparent",
                      border: "none", cursor: "pointer", padding: "3px 6px",
                      borderRadius: 6, display: "flex", alignItems: "center", gap: 3,
                      color: c.myLike ? "#818cf8" : tk.textSub,
                      fontWeight: c.myLike ? 700 : 400, fontSize: 12,
                      transition: "all 0.13s",
                    } as React.CSSProperties}>
                      👍{c.likes > 0 && <span>{c.likes}</span>}
                    </button>
                    {!isMe && (
                      <button onClick={() => reportComment(c)} title="Пожаловаться" style={{
                        background: c.myReport ? "rgba(239,68,68,0.10)" : "transparent",
                        border: "none", cursor: c.myReport ? "default" : "pointer",
                        padding: "3px 7px", borderRadius: 6,
                        display: "flex", alignItems: "center", gap: 3,
                        color: c.myReport ? "#ef4444" : tk.textSub,
                        fontSize: 12, fontWeight: c.myReport ? 700 : 400,
                        transition: "all 0.13s",
                      }}>
                        🚩{c.myReport && <span style={{ fontSize: 11 }}>Отправлена</span>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
