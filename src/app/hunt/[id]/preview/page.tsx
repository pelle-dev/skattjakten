import Link from "next/link";
import { checkpointsOf, missionOf, questionsOf, treasureOf, validateHunt } from "@/lib/hunts";
import { maxScore } from "@/lib/game";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const hunt = db.hunts.find((h) => h.id === id)!;
  const cps = checkpointsOf(db, id);
  const treasure = treasureOf(db, id);
  const { errors, warnings } = validateHunt(db, id);
  const missing = (text: string) => <span className="badge bad">{text}</span>;

  return (
    <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(240px, 1fr)", alignItems: "start" }}>
      <section className="card">
        <h2>Hela kedjan</h2>
        <p className="muted small">Så här upplever deltagarna jakten, steg för steg. Maxpoäng: {maxScore(db, hunt)}.</p>
        <div className="timeline">
          <div className="node">
            <strong>🚩 Start</strong>
            <p className="muted small">Deltagarna ser nedräkningen och sedan första ledtråden.</p>
          </div>
          {cps.map((cp) => {
            const qs = questionsOf(db, cp.id);
            const mission = missionOf(db, cp.id);
            return (
              <div className="node" key={cp.id}>
                <p style={{ marginBottom: 4 }}>
                  <span className="badge gold">Ledtråd till kontrollpunkt {cp.order + 1}</span>
                </p>
                <p style={{ fontWeight: 700 }}>{cp.publicClueText ? `”${cp.publicClueText}”` : missing("Saknar publik ledtråd")}</p>
                <div className="card" style={{ boxShadow: "none" }}>
                  <strong>
                    📍 {cp.title} <span className="muted small">(QR-kod)</span>
                  </strong>
                  <p className="small" style={{ marginTop: 6 }}>
                    🔒 Placering: {cp.hostPlacementNote || missing("Saknar placering")}
                    <br />
                    🛟 Hjälp: {cp.helpText || missing("Saknar hjälptext")}
                  </p>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>❓ Frågor</p>
                  {qs.length === 0 ? (
                    missing("Saknar frågor")
                  ) : (
                    <ol style={{ margin: 0, paddingLeft: 22 }} className="small">
                      {qs.map((q) => (
                        <li key={q.id}>
                          {q.questionText} <span className="muted">(rätt: {q.alternatives[q.correctAnswer]})</span>{" "}
                          {!q.approvedByHost && <span className="badge warn">Ej godkänd</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                  <p style={{ fontWeight: 700, margin: "8px 0 0" }}>🎯 Uppdrag</p>
                  <p className="small">{mission ? mission.missionText : <span className="muted">Inget uppdrag</span>}</p>
                </div>
              </div>
            );
          })}
          <div className="node treasure">
            <p style={{ marginBottom: 4 }}>
              <span className="badge gold">Sista ledtråden</span>
            </p>
            <p style={{ fontWeight: 700 }}>{treasure?.publicClueText ? `”${treasure.publicClueText}”` : missing("Saknar text som leder till skatten")}</p>
            <div className="card gold">
              <strong>💎 Skatten</strong>
              <p className="small" style={{ margin: "6px 0 0" }}>
                🔒 Placering: {treasure?.hostPlacementNote || missing("Saknar placering")}
              </p>
            </div>
          </div>
          <div className="node">
            <strong>🏆 Resultat och diplom</strong>
          </div>
        </div>
      </section>
      <aside>
        <section className="card">
          <h2>Kontroll</h2>
          {errors.length === 0 && warnings.length === 0 && <div className="notice">Allt ser bra ut! 🎉</div>}
          {errors.length > 0 && <p className="small">Måste fixas innan start:</p>}
          {errors.map((e) => (
            <div key={e} className="notice bad small">
              {e}
            </div>
          ))}
          {warnings.length > 0 && <p className="small">Bra att kolla:</p>}
          {warnings.map((w) => (
            <div key={w} className="notice warn small">
              {w}
            </div>
          ))}
          <Link href={`/hunt/${id}/build`} className="btn block">
            Till ledtrådarna
          </Link>
        </section>
      </aside>
    </div>
  );
}
