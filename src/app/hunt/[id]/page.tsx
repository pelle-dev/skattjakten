import { notFound } from "next/navigation";
import Link from "next/link";
import { RETENTION_DAYS } from "@/lib/cleanup";
import { validateHunt, checkpointsOf, teamsOf } from "@/lib/hunts";
import { baseUrl, hostHunt } from "@/lib/session";
import { readDb } from "@/lib/store";
import { CopyLink } from "./CopyLink";

export const dynamic = "force-dynamic";

export default async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const hunt = await hostHunt(db, id);
  if (!hunt) notFound();
  const { errors, warnings } = validateHunt(db, id);
  const cps = checkpointsOf(db, id);
  const teams = teamsOf(db, id);
  const base = await baseUrl();
  const steps = [
    { href: "build", title: "Bygg ledtrådarna", text: `${cps.length} ledtrådar + skatten. Ledtrådshjälparen guidar dig.`, done: errors.length === 0 },
    { href: "preview", title: "Förhandsgranska kedjan", text: "Se hela flödet och vad som saknas.", done: errors.length === 0 && warnings.length === 0 },
    { href: "print", title: "Skriv ut och göm QR-koderna", text: "En sida per QR-kod och en privat placeringslista.", done: false },
    { href: "teams", title: "Lägg till lag", text: `${teams.length} ${hunt.playMode === "team" ? "lag" : "deltagare"} hittills. Dela koden ${hunt.joinCode}.`, done: teams.length > 0 },
    { href: "dashboard", title: "Starta och följ jakten", text: "Starta, pausa, avsluta och se poängen live.", done: hunt.status !== "draft" },
    { href: "results", title: "Resultat och diplom", text: "Vinnare, poäng, tider och diplom.", done: hunt.status === "finished" },
  ];
  return (
    <div className="grid2" style={{ alignItems: "start" }}>
      <section className="card">
        <h2>Så här gör du</h2>
        <div className="stack">
          {steps.map((s, i) => (
            <Link key={s.href} href={`/hunt/${id}/${s.href}`} className="cp-item" style={{ textDecoration: "none" }}>
              <span className="cp-num" style={{ background: s.done ? "var(--primary)" : undefined }}>
                {s.done ? "✓" : i + 1}
              </span>
              <span>
                <strong>{s.title}</strong>
                <br />
                <span className="muted small">{s.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <div>
        {(errors.length > 0 || warnings.length > 0) && hunt.status === "draft" && (
          <section className="card">
            <h2>Att göra</h2>
            {errors.slice(0, 5).map((e) => (
              <div key={e} className="notice bad small">
                {e}
              </div>
            ))}
            {warnings.slice(0, 5).map((w) => (
              <div key={w} className="notice warn small">
                {w}
              </div>
            ))}
            {errors.length + warnings.length > 10 && <p className="muted small">…och fler i förhandsgranskningen.</p>}
          </section>
        )}
        <section className="card">
          <h2>Dela</h2>
          <p className="small">Deltagarna går med på startsidan med koden:</p>
          <p className="center" style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "0.2em" }}>
            {hunt.joinCode}
          </p>
          <CopyLink label="Länk för deltagare" url={`${base}/join/${hunt.joinCode}`} />
          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />
          <p className="small muted">
            Värdlänk: öppna jakten som skattgömmare på en annan enhet. Dela den inte med deltagarna.
          </p>
          <CopyLink label="Värdlänk" url={`${base}/hunt/${id}/claim?key=${hunt.hostKey}`} />
          <p className="small muted" style={{ marginTop: 16 }}>
            Skattjakten raderas automatiskt, med alla namn, bilder och svar, {RETENTION_DAYS} dagar efter att den avslutats.
          </p>
        </section>
      </div>
    </div>
  );
}
