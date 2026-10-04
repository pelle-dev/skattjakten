"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { formatDuration } from "@/lib/i18n";
import type { Dashboard } from "@/lib/views";
import { controlAction, dashboardAction, hostBundleAction, simulateScanAction } from "../../../actions/host";

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–");

const SCAN_TEXT: Record<string, string> = {
  checkpointFound: "Rätt plats! +poäng",
  treasureFound: "Skatten hittad!",
  notStarted: "Laget har inte startat än",
  paused: "Jakten är pausad",
  huntFinished: "Jakten är avslutad",
  teamFinished: "Laget är redan klart",
  alreadyFound: "Redan hittad",
  finishStepFirst: "Laget har frågor/uppdrag kvar",
  wrongStep: "Fel ordning – inga poäng",
  unknown: "Okänd kod",
};

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [simTeam, setSimTeam] = useState("");
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await dashboardAction(id);
    if (res.ok) setData(res.data);
  }, [id]);

  useEffect(() => {
    load();
    hostBundleAction(id).then((r) => r.ok && setErrors(r.data.validation.errors));
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [id, load]);

  if (!data) return <p className="muted">Laddar…</p>;
  const h = data.hunt;
  const now = Date.parse(data.now);

  const control = async (op: "start" | "pause" | "resume" | "finish") => {
    if (op === "finish" && !confirm("Avsluta skattjakten? Då räknas resultatet ut.")) return;
    setBusy(true);
    const res = await controlAction(id, op);
    setBusy(false);
    if (!res.ok) toast.show(res.error);
    await load();
    router.refresh();
  };

  return (
    <>
      <section className="card">
        <div className="row between">
          <div>
            <h2 style={{ margin: 0 }}>
              {h.status === "draft" && "⏸️ Inte startad"}
              {h.status === "active" && "🟢 Pågår"}
              {h.status === "paused" && "⏸️ Pausad"}
              {h.status === "finished" && "🏁 Avslutad"}
            </h2>
            <p className="muted small" style={{ margin: 0 }}>
              {h.startedAt ? `Startade ${clock(h.startedAt)}` : "Starta när QR-koderna är utplacerade."}
              {h.startedAt && h.status !== "finished" && ` · ${formatDuration(Math.round((now - Date.parse(h.startedAt)) / 1000))}`}
              {h.finishedAt && ` · Avslutad ${clock(h.finishedAt)}`}
            </p>
          </div>
          <div className="row">
            {h.status === "draft" && (
              <button className="btn primary" disabled={busy} onClick={() => control("start")}>
                ▶️ Starta skattjakten
              </button>
            )}
            {h.status === "active" && (
              <button className="btn" disabled={busy} onClick={() => control("pause")}>
                ⏸️ Pausa
              </button>
            )}
            {h.status === "paused" && (
              <button className="btn primary" disabled={busy} onClick={() => control("resume")}>
                ▶️ Fortsätt
              </button>
            )}
            {(h.status === "active" || h.status === "paused") && (
              <button className="btn danger" disabled={busy} onClick={() => control("finish")}>
                🏁 Avsluta
              </button>
            )}
            {h.status === "finished" && (
              <Link className="btn gold" href={`/hunt/${id}/results`}>
                🏆 Visa resultat
              </Link>
            )}
          </div>
        </div>
        {h.status === "draft" && errors.length > 0 && (
          <div className="notice bad small" style={{ marginTop: 12 }}>
            Innan start: {errors[0]} <Link href={`/hunt/${id}/preview`}>Se alla</Link>
          </div>
        )}
        {h.status === "draft" && data.rows.length === 0 && (
          <div className="notice warn small" style={{ marginTop: 12 }}>
            Inga lag ännu. <Link href={`/hunt/${id}/teams`}>Lägg till lag</Link>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Poängställning</h2>
        <div className="table-wrap">
          <table className="list">
            <thead>
              <tr>
                <th>#</th>
                <th>{h.playMode === "team" ? "Lag" : "Deltagare"}</th>
                <th>Status</th>
                <th>Planerad start</th>
                <th>Faktisk start</th>
                <th>Tid</th>
                <th>Hittade</th>
                <th>Rätt svar</th>
                <th>Hjälp</th>
                <th>Poäng</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const waiting = r.status === "waiting";
                const startsIn = r.scheduledStartAt ? Math.max(0, Math.round((Date.parse(r.scheduledStartAt) - now) / 1000)) : null;
                return (
                  <tr key={r.teamId}>
                    <td>{h.status === "draft" ? "–" : r.place}</td>
                    <td>
                      <span className="row" style={{ flexWrap: "nowrap" }}>
                        <Avatar avatarId={r.avatarId} photoUrl={r.photoUrl} size={32} />
                        <strong>{r.name}</strong>
                      </span>
                    </td>
                    <td>
                      {waiting && <span className="badge grey">Väntar{h.status !== "draft" && startsIn ? ` ${formatDuration(startsIn)}` : ""}</span>}
                      {r.status === "active" && (
                        <span className="badge">
                          Aktiv · {r.phase === "seeking" ? `letar ${r.currentStep < data.totalCheckpoints ? r.currentStep + 1 : "skatten"}` : r.phase === "questions" ? "frågor" : "uppdrag"}
                        </span>
                      )}
                      {r.status === "finished" && <span className="badge gold">Klar 💎</span>}
                    </td>
                    <td>{clock(r.scheduledStartAt)}</td>
                    <td>{clock(r.actualStartAt)}</td>
                    <td>{formatDuration(r.elapsedSeconds)}</td>
                    <td>
                      {r.stats.checkpointsFound}/{data.totalCheckpoints}
                      {r.stats.treasureFound && " + 💎"}
                    </td>
                    <td>{r.stats.correctAnswers}</td>
                    <td>{r.stats.hints > 0 ? <span className="badge warn">🛟 {r.stats.hints}</span> : "0"}</td>
                    <td>
                      <strong>{r.stats.score}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          Uppdateras automatiskt. Maxpoäng {data.maxScore}. Vinstläge: {h.winMode === "fastest" ? "snabbast (från egen starttid)" : "flest poäng"}.
        </p>
      </section>

      <div className="grid2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>Händelser</h2>
          {data.events.length === 0 && <p className="muted small">Scanningar och hjälp-begäranden visas här.</p>}
          <div className="stack small">
            {data.events.map((e) => (
              <div key={e.id} className="row" style={{ flexWrap: "nowrap" }}>
                <span className="muted" style={{ width: 70 }}>
                  {clock(e.at)}
                </span>
                <span>{e.kind === "hint" ? "🛟" : e.ok ? "✅" : "❌"}</span>
                <span>
                  <strong>{e.teamName}</strong> {e.kind === "scan" ? `scannade ${e.label}` : e.label.toLowerCase()}
                  {e.kind === "scan" && !e.ok && <span className="muted"> (ingen poäng)</span>}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ background: "#f6f7fb" }}>
          <h2>🧪 Testläge</h2>
          <p className="muted small">Låtsas att ett lag scannar en QR-kod, utan att gå runt. Bra när du vill prova flödet hemma.</p>
          <label className="field">
            <span>Lag</span>
            <select value={simTeam} onChange={(e) => setSimTeam(e.target.value)}>
              <option value="">Välj lag…</option>
              {data.rows.map((r) => (
                <option key={r.teamId} value={r.teamId}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="chips">
            {data.codes.map((c) => (
              <button
                key={c.token}
                className="chip"
                disabled={!simTeam}
                onClick={async () => {
                  const res = await simulateScanAction(id, simTeam, c.token);
                  if (!res.ok) return toast.show(res.error);
                  toast.show(`${c.label}: ${SCAN_TEXT[res.data.outcome]}`, res.data.points > 0);
                  load();
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Frågor och uppdrag besvaras i deltagarvyn. Öppna ett privat webbläsarfönster och gå med med lagkoden för att spela som ett lag.
          </p>
        </section>
      </div>
      {toast.node}
    </>
  );
}
