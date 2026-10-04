import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PLAN_LIMITS } from "@/lib/catalog";
import { maxScore, ranking } from "@/lib/game";
import { checkpointsOf } from "@/lib/hunts";
import { formatDuration } from "@/lib/i18n";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const hunt = db.hunts.find((h) => h.id === id)!;
  const rows = ranking(db, id);
  const total = checkpointsOf(db, id).length;
  const finished = hunt.status === "finished";
  const winners = rows.filter((r) => r.place === 1);
  const diploma = PLAN_LIMITS[hunt.plan].diploma;

  return (
    <>
      {!finished && (
        <div className="notice warn">
          Skattjakten är inte avslutad ännu. Det här är ställningen just nu. <Link href={`/hunt/${id}/dashboard`}>Till kontrollpanelen</Link>
        </div>
      )}
      {finished && winners.length > 0 && (
        <section className="card gold center">
          <div style={{ fontSize: "3rem" }}>🏆</div>
          <h2>{winners.length > 1 ? "Vinnare (delad första plats)" : "Vinnare"}</h2>
          <div className="row" style={{ justifyContent: "center" }}>
            {winners.map((w) => (
              <span key={w.teamId} className="row">
                <Avatar avatarId={w.avatarId} photoUrl={w.photoUrl} size={56} />
                <strong style={{ fontSize: "1.5rem" }}>{w.name}</strong>
              </span>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            {hunt.winMode === "fastest" ? "Snabbast till skatten, räknat från egen starttid." : "Flest poäng. Vid lika poäng vinner den som hittade skatten snabbast."}
          </p>
        </section>
      )}
      <section className="card">
        <h2>Resultat</h2>
        <div className="table-wrap">
          <table className="list">
            <thead>
              <tr>
                <th>Plats</th>
                <th>{hunt.playMode === "team" ? "Lag" : "Deltagare"}</th>
                <th>Poäng</th>
                <th>Tid</th>
                <th>Hittade platser</th>
                <th>Rätta svar</th>
                <th>Uppdrag</th>
                <th>Hjälp</th>
                <th>Skatten</th>
                {diploma && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.teamId}>
                  <td>
                    <strong>{r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : r.place}</strong>
                  </td>
                  <td>
                    <span className="row" style={{ flexWrap: "nowrap" }}>
                      <Avatar avatarId={r.avatarId} photoUrl={r.photoUrl} size={32} />
                      <strong>{r.name}</strong>
                    </span>
                  </td>
                  <td>
                    <strong>{r.stats.score}</strong>
                    <span className="muted small"> / {maxScore(db, hunt)}</span>
                  </td>
                  <td>{formatDuration(r.elapsedSeconds)}</td>
                  <td>
                    {r.stats.checkpointsFound}/{total}
                  </td>
                  <td>
                    {r.stats.correctAnswers}/{r.stats.answers}
                  </td>
                  <td>{r.stats.missionsCompleted}</td>
                  <td>{r.stats.hints}</td>
                  <td>{r.stats.treasureFound ? "Ja 💎" : "Nej"}</td>
                  {diploma && (
                    <td>
                      <Link href={`/diploma/${id}/${r.teamId}`} className="btn small">
                        Diplom
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
