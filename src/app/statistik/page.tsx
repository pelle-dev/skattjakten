import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { computeStats, STATS_WEEKS } from "@/lib/stats";
import { readDb } from "@/lib/store";
import { logIn } from "./actions";
import { canSeeStats, statsPassword } from "./access";

// Statistiksida för den som driver Skattjakten. Skyddas av lösenordet i STATISTIK_LOSENORD.

export const metadata: Metadata = { title: "Statistik · Skattjakten" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  losenord: "Fel lösenord. Försök igen.",
  manga: "För många försök. Vänta en kvart och försök igen.",
};

const weekLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("sv-SE", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ fel?: string }> }) {
  if (!statsPassword()) {
    return (
      <>
        <TopBar />
        <main className="page">
          <section className="card stack">
            <h1>Statistik</h1>
            <p>Statistiksidan är inte påslagen än. Lägg till miljövariabeln STATISTIK_LOSENORD i Vercel och gör Redeploy.</p>
          </section>
        </main>
      </>
    );
  }

  if (!(await canSeeStats())) {
    const error = ERRORS[(await searchParams).fel ?? ""];
    return (
      <>
        <TopBar />
        <main className="page">
          <section className="card stack">
            <h1>Statistik</h1>
            <form action={logIn} className="stack">
              <label>
                Lösenord
                <input type="password" name="losenord" autoComplete="current-password" required />
              </label>
              {error && <p className="small" role="alert">{error}</p>}
              <button className="btn primary">Visa statistik</button>
            </form>
          </section>
        </main>
      </>
    );
  }

  const s = computeStats(await readDb());
  const max = Math.max(1, ...s.weeks.map((w) => w.created));
  const totals = [
    ["Skapade jakter", s.huntsCreated],
    ["Startade jakter", s.huntsStarted],
    ["Spelade klart", s.huntsFinished],
    ["Lag", s.teams],
    ["Deltagare", s.participants],
    ["Testjakter", s.demoHunts],
  ] as const;

  return (
    <>
      <TopBar />
      <main className="page wide">
        <h1>Statistik</h1>
        <p className="muted">
          Jakter raderas 90 dagar efter att de är klara, så siffrorna gäller ungefär de senaste tre månaderna. Testjakter räknas inte in i de andra siffrorna.
        </p>
        <section className="grid2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 16 }}>
          {totals.map(([label, value]) => (
            <div key={label} className="card center" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800 }}>{value}</div>
              <div className="muted small">{label}</div>
            </div>
          ))}
        </section>
        <section className="card">
          <h2>Nya jakter per vecka</h2>
          <p className="muted small">De senaste {STATS_WEEKS} veckorna, nyaste först.</p>
          <div className="table-wrap">
            <table className="list">
              <thead>
                <tr>
                  <th>Vecka från</th>
                  <th>Skapade</th>
                  <th>Startade</th>
                  <th style={{ width: "40%" }} aria-hidden></th>
                </tr>
              </thead>
              <tbody>
                {s.weeks.map((w) => (
                  <tr key={w.weekStart}>
                    <td style={{ whiteSpace: "nowrap" }}>{weekLabel(w.weekStart)}</td>
                    <td>{w.created}</td>
                    <td>{w.started}</td>
                    <td aria-hidden>
                      <div style={{ height: 12, borderRadius: 6, background: "var(--skattguld)", width: `${(w.created / max) * 100}%` }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <p className="muted small">Besök på hemsidan ser du under Analytics i Vercel.</p>
      </main>
    </>
  );
}
