"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AvatarPicker } from "@/components/AvatarPicker";
import { QrScanner } from "@/components/QrScanner";
import { TopBar } from "@/components/TopBar";
import type { ScanOutcome, ScanResult } from "@/lib/game";
import { formatDuration, t, type TextKey } from "@/lib/i18n";
import type { PlayState } from "@/lib/views";
import { answerAction, continueAction, helpAction, missionAction, playStateAction, scanAction, updateLookAction } from "../../actions/play";

type Feedback = { emoji: string; title: string; text?: string; good: boolean } | null;

export function feedbackFor(lang: PlayState["hunt"]["language"], result: ScanResult): Feedback {
  if (result.outcome === "checkpointFound")
    return { emoji: "🎉", title: t(lang, "found"), text: `+${result.points} ${t(lang, "points")}`, good: true };
  if (result.outcome === "treasureFound") return { emoji: "💎", title: t(lang, "foundTreasure"), text: `+${result.points} ${t(lang, "points")}`, good: true };
  return { emoji: result.outcome === "notStarted" ? "⏳" : "🧭", title: t(lang, `scan_${result.outcome}` as TextKey), good: false };
}

function useServerClock(serverNow: string | undefined) {
  const offset = useRef(0);
  useEffect(() => {
    if (serverNow) offset.current = Date.parse(serverNow) - Date.now();
  }, [serverNow]);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return Date.now() + offset.current;
}

export function Play({ huntId, initial }: { huntId: string; initial: PlayState }) {
  const router = useRouter();
  const search = useSearchParams();
  const [state, setState] = useState<PlayState>(initial);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [askHelp, setAskHelp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const now = useServerClock(state.now);
  const lang = state.hunt.language;
  const tr = (key: TextKey, vars?: Record<string, string | number>) => t(lang, key, vars);

  const refresh = useCallback(async () => {
    const res = await playStateAction(huntId);
    if (res.ok) setState(res.data);
  }, [huntId]);

  useEffect(() => {
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  // Resultat från en scanning med mobilens vanliga kamera (/s/<token>).
  useEffect(() => {
    const outcome = search.get("r") as ScanOutcome | null;
    if (outcome) {
      setFeedback(feedbackFor(lang, { outcome, points: Number(search.get("p") ?? 0) }));
      router.replace(`/play/${huntId}`);
    }
  }, [search, lang, huntId, router]);

  const act = async <T,>(fn: () => Promise<{ ok: true; data: { result: T; state: PlayState } } | { ok: false; error: string }>) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) {
        setMessage(res.error);
        return null;
      }
      setState(res.data.state);
      return res.data.result;
    } finally {
      setBusy(false);
    }
  };

  const onScan = useCallback(
    async (token: string) => {
      setScanning(false);
      const result = await act(() => scanAction(huntId, token));
      if (result) setFeedback(feedbackFor(lang, result));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [huntId, lang],
  );

  const { hunt, team } = state;
  const calm = hunt.calm;
  const startsIn = team.scheduledStartAt ? Math.ceil((Date.parse(team.scheduledStartAt) - now) / 1000) : null;
  const shouldCountDown = team.status === "waiting" && hunt.status === "active" && startsIn != null;

  // När nedräkningen är klar: hämta första ledtråden.
  useEffect(() => {
    if (shouldCountDown && startsIn != null && startsIn <= 0) refresh();
  }, [shouldCountDown, startsIn, refresh]);

  const liveElapsed =
    team.status === "active" && team.elapsedSeconds != null && hunt.status === "active"
      ? team.elapsedSeconds + Math.max(0, Math.round((now - Date.parse(state.now)) / 1000))
      : team.elapsedSeconds;

  return (
    <>
      <TopBar brand={hunt.brandName} />
      <main className="page">
        <div className="play-header">
          <Avatar avatarId={team.avatarId} photoUrl={team.photoUrl} size={56} name={team.name} />
          <div>
            <div className="name">{team.name}</div>
            <div className="muted small">{hunt.name}</div>
          </div>
          <div className="score-pill">
            ⭐ {team.stats.score}
            {!calm && team.actualStartAt && <span className="small"> · ⏱ {formatDuration(liveElapsed)}</span>}
          </div>
        </div>

        {team.status !== "waiting" && team.status !== "finished" && (
          <>
            <div className="progress" aria-hidden>
              {Array.from({ length: hunt.totalSteps }, (_, i) => (
                <span key={i} className={i < team.currentStep ? "done" : i === team.currentStep ? "now" : ""} />
              ))}
            </div>
            {calm && <p className="muted small center">{tr("step", { n: team.currentStep + 1, total: hunt.totalSteps })}</p>}
          </>
        )}

        {/* Före start ------------------------------------------------------ */}
        {team.status === "waiting" && hunt.status !== "finished" && (
          <section className="card center">
            <div style={{ fontSize: "3rem" }}>⏳</div>
            <h2>{tr("waitingTitle")}</h2>
            {shouldCountDown && startsIn! > 0 ? (
              <>
                <p>{tr("startsIn")}</p>
                <div className="countdown">{formatDuration(Math.max(0, startsIn!))}</div>
              </>
            ) : (
              <p className="muted">{hunt.status === "paused" ? tr("paused") : tr("waitingForHost")}</p>
            )}
            {hunt.playMode === "team" && (
              <p className="small muted" style={{ marginTop: 16 }}>
                {tr("members")}: <strong style={{ letterSpacing: "0.15em" }}>{team.joinCode}</strong>
              </p>
            )}
          </section>
        )}
        {team.status === "waiting" && hunt.status === "draft" && (
          <LookEditor state={state} onSaved={refresh} huntId={huntId} />
        )}

        {/* Paus ------------------------------------------------------------ */}
        {hunt.status === "paused" && team.status === "active" && (
          <section className="card gold center">
            <div style={{ fontSize: "3rem" }}>☕</div>
            <h2>{tr("pausedTitle")}</h2>
            <p>{tr("paused")}</p>
          </section>
        )}

        {/* Letar ----------------------------------------------------------- */}
        {hunt.status === "active" && team.status === "active" && state.clue && (
          <>
            <section className="clue-card">
              <div className="badge gold" style={{ marginBottom: 10 }}>
                {state.clue.isTreasure ? `💎 ${tr("treasureClue")}` : `${tr("clue")} ${state.clue.stepNumber}`}
              </div>
              <div className="clue-text">{state.clue.text}</div>
            </section>
            {state.help.map((h, i) => (
              <div key={i} className="notice gold">
                🛟 <strong>{tr("helpLabel")}:</strong> {h}
              </div>
            ))}
            <div className="stack">
              <button className="btn primary huge" onClick={() => setScanning(true)} disabled={busy}>
                📷 {tr("scan")}
              </button>
              {askHelp ? (
                <div className="card center">
                  <p>{tr("helpConfirm", { n: hunt.hintPenalty })}</p>
                  <div className="row" style={{ justifyContent: "center" }}>
                    <button
                      className="btn gold"
                      onClick={async () => {
                        setAskHelp(false);
                        await act(() => helpAction(huntId));
                      }}
                    >
                      {tr("helpYes")}
                    </button>
                    <button className="btn" onClick={() => setAskHelp(false)}>
                      {tr("helpNo")}
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn block" onClick={() => setAskHelp(true)}>
                  🛟 {tr("help")}
                </button>
              )}
            </div>
            <WhatNow calm={calm} text={tr("whatNowSeeking")} title={tr("whatNow")} />
          </>
        )}

        {/* Frågor ---------------------------------------------------------- */}
        {hunt.status === "active" && team.status === "active" && team.phase === "questions" && (
          <>
            <section className="card soft center">
              <strong>{tr("onTrack")}</strong> {tr("questionsTitle")}
            </section>
            {state.questions.map((q, i) => (
              <section className="card" key={q.id}>
                <div className="muted small">{tr("questionN", { n: i + 1, total: state.questions.length })}</div>
                <h2 style={{ marginTop: 4 }}>{q.text}</h2>
                <div className="answers">
                  {q.alternatives.map((alt, j) => {
                    const a = q.answer;
                    const cls = a
                      ? j === a.correctAnswer
                        ? "right"
                        : j === a.selected
                          ? "wrong"
                          : ""
                      : picked[q.id] === j
                        ? "picked"
                        : "";
                    return (
                      <button key={j} className={`answer ${cls}`} disabled={!!a || busy} onClick={() => setPicked((p) => ({ ...p, [q.id]: j }))}>
                        {alt}
                      </button>
                    );
                  })}
                </div>
                {q.answer ? (
                  <p style={{ marginTop: 10, fontWeight: 700 }}>
                    {q.answer.isCorrect ? `✅ ${tr("correct", { n: 1 })}` : `💡 ${tr("wrong", { answer: q.alternatives[q.answer.correctAnswer] })}`}
                  </p>
                ) : (
                  <button
                    className="btn primary block"
                    style={{ marginTop: 12 }}
                    disabled={picked[q.id] == null || busy}
                    onClick={() => act(() => answerAction(huntId, q.id, picked[q.id]))}
                  >
                    {lang === "sv" ? "Svara" : "Answer"}
                  </button>
                )}
              </section>
            ))}
            {state.questions.every((q) => q.answer) && (
              <button className="btn primary huge" disabled={busy} onClick={() => act(() => continueAction(huntId))}>
                {tr("continue")} →
              </button>
            )}
            <WhatNow calm={calm} text={tr("whatNowQuestions")} title={tr("whatNow")} />
          </>
        )}

        {/* Uppdrag --------------------------------------------------------- */}
        {hunt.status === "active" && team.status === "active" && team.phase === "mission" && state.mission && (
          <>
            <section className="clue-card center">
              <div style={{ fontSize: "3rem" }}>🎯</div>
              <div className="badge gold">{tr("missionTitle")}</div>
              <p className="clue-text" style={{ marginTop: 10 }}>
                {state.mission.text}
              </p>
            </section>
            <div className="stack">
              <button
                className="btn primary huge"
                disabled={busy}
                onClick={async () => {
                  const r = await act(() => missionAction(huntId, true));
                  if (r) setFeedback({ emoji: "🌟", title: tr("nextUnlocked"), text: `+${r.points} ${tr("points")}`, good: true });
                }}
              >
                ✅ {tr("missionDone")}
              </button>
              <button
                className="btn block"
                disabled={busy}
                onClick={async () => {
                  const r = await act(() => missionAction(huntId, false));
                  if (r) setFeedback({ emoji: "➡️", title: tr("nextUnlocked"), good: true });
                }}
              >
                {tr("missionSkip")}
              </button>
            </div>
            <WhatNow calm={calm} text={tr("whatNowMission")} title={tr("whatNow")} />
          </>
        )}

        {/* Klar / resultat ------------------------------------------------- */}
        {(team.status === "finished" || hunt.status === "finished") && <Finished state={state} />}
      </main>

      {scanning && <QrScanner lang={lang} onResult={onScan} onClose={() => setScanning(false)} />}

      {feedback && (
        <div className="overlay" onClick={() => setFeedback(null)} style={{ background: feedback.good ? "rgba(44,140,104,0.95)" : "rgba(35,49,74,0.95)" }}>
          <div className="celebrate">{feedback.emoji}</div>
          <h1 className="center" style={{ maxWidth: 480 }}>
            {feedback.title}
          </h1>
          {feedback.text && <p className="big">{feedback.text}</p>}
          <button className="btn gold" style={{ marginTop: 16, minWidth: 180 }}>
            {tr("continue")}
          </button>
        </div>
      )}

      {message && (
        <div className="toast" onClick={() => setMessage(null)}>
          {message}
        </div>
      )}
    </>
  );
}

function WhatNow({ calm, title, text }: { calm: boolean; title: string; text: string }) {
  return (
    <section className={`card ${calm ? "soft" : ""}`} style={{ marginTop: 16, boxShadow: calm ? undefined : "none" }}>
      <strong>💬 {title}</strong>
      <p className={calm ? "" : "muted small"} style={{ margin: "4px 0 0" }}>
        {text}
      </p>
    </section>
  );
}

function LookEditor({ state, huntId, onSaved }: { state: PlayState; huntId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const lang = state.hunt.language;
  if (!open)
    return (
      <button className="btn block" onClick={() => setOpen(true)}>
        🎨 {t(lang, "chooseLook")}
      </button>
    );
  return (
    <section className="card">
      <AvatarPicker
        lang={lang}
        kind={state.hunt.playMode === "team" ? "team" : "person"}
        avatarId={state.team.avatarId}
        photoUrl={state.team.photoUrl}
        allowPhoto={state.hunt.allowPhotos}
        onChange={async (v) => {
          await updateLookAction(huntId, v);
          onSaved();
        }}
      />
      <button className="btn primary block" style={{ marginTop: 10 }} onClick={() => setOpen(false)}>
        OK
      </button>
    </section>
  );
}

function Finished({ state }: { state: PlayState }) {
  const lang = state.hunt.language;
  const { team, hunt } = state;
  const s = team.stats;
  return (
    <>
      <section className="card gold center">
        <div style={{ fontSize: "3.5rem" }}>{s.treasureFound ? "💎" : "🏁"}</div>
        <h1>{s.treasureFound ? t(lang, "finishedTitle") : t(lang, "scan_huntFinished")}</h1>
        <div className="row" style={{ justifyContent: "center", gap: 24 }}>
          <div>
            <div className="muted small">{t(lang, "score")}</div>
            <strong style={{ fontSize: "1.8rem" }}>{s.score}</strong>
          </div>
          {!hunt.calm && (
            <div>
              <div className="muted small">{t(lang, "time")}</div>
              <strong style={{ fontSize: "1.8rem" }}>{formatDuration(team.elapsedSeconds)}</strong>
            </div>
          )}
        </div>
        <p className="small" style={{ marginTop: 12 }}>
          {t(lang, "checkpointsFound")}: {s.checkpointsFound} · {t(lang, "correctAnswers")}: {s.correctAnswers} · {t(lang, "missionsDone")}: {s.missionsCompleted} ·{" "}
          {t(lang, "hints")}: {s.hints}
        </p>
        {hunt.diploma && (
          <Link href={`/diploma/${hunt.id}/${team.id}`} className="btn primary">
            📜 {t(lang, "showDiploma")}
          </Link>
        )}
      </section>

      {state.ranking ? (
        <section className="card">
          <h2>🏆 {t(lang, "results")}</h2>
          {state.ranking.map((r) => (
            <div key={r.teamId} className="cp-item" style={{ marginBottom: 8, cursor: "default", borderColor: r.isMe ? "var(--accent)" : undefined }}>
              <strong style={{ width: 30, fontSize: "1.2rem" }}>{r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : r.place}</strong>
              <Avatar avatarId={r.avatarId} photoUrl={r.photoUrl} size={40} />
              <span style={{ flex: 1 }}>
                <strong>{r.name}</strong>
                {r.place === 1 && <span className="badge gold" style={{ marginLeft: 6 }}>{t(lang, "winner")}</span>}
                <br />
                <span className="muted small">
                  {r.stats.treasureFound ? "💎 " : ""}
                  {formatDuration(r.elapsedSeconds)}
                </span>
              </span>
              <strong>⭐ {r.stats.score}</strong>
            </div>
          ))}
        </section>
      ) : (
        <p className="muted center">{t(lang, "waitingResults")}</p>
      )}
    </>
  );
}
