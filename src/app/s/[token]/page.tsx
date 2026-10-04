import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { isHost, playerCredentials } from "@/lib/session";
import { readDb } from "@/lib/store";
import { ScanLanding } from "./ScanLanding";

export const dynamic = "force-dynamic";

// Hit kommer man när en QR-kod scannas med mobilens vanliga kamera.
export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await readDb();
  const cp = db.checkpoints.find((c) => c.qrToken === token);
  const treasure = db.treasures.find((t) => t.qrToken === token);
  const huntId = cp?.huntId ?? treasure?.huntId;
  const hunt = db.hunts.find((h) => h.id === huntId);

  if (!hunt) {
    return (
      <>
        <TopBar />
        <main className="page">
          <div className="card center">
            <div style={{ fontSize: "3rem" }}>🧭</div>
            <h1>Okänd QR-kod</h1>
            <p className="muted">Den här QR-koden hör inte till någon skattjakt.</p>
          </div>
        </main>
      </>
    );
  }

  const sv = hunt.language === "sv";
  const label = cp ? `${sv ? "Kontrollpunkt" : "Checkpoint"} ${cp.order + 1}` : sv ? "Skatten" : "The treasure";
  const creds = await playerCredentials(hunt.id);
  const joined = !!creds && db.participants.some((p) => p.id === creds.id && p.token === creds.token);

  if (joined) return <ScanLanding huntId={hunt.id} token={token} lang={hunt.language} brand={hunt.brandName} />;

  const host = await isHost(hunt);
  return (
    <>
      <TopBar brand={hunt.brandName} />
      <main className="page">
        <div className="card center">
          <div style={{ fontSize: "3rem" }}>{cp ? "📍" : "💎"}</div>
          {host ? (
            <>
              <h1>{label}</h1>
              <p>
                Den här QR-koden hör till <strong>{hunt.name}</strong>.
              </p>
              <p className="muted small">Du är skattgömmare på den här enheten, så ingen scanning registrerades.</p>
              <Link href={`/hunt/${hunt.id}`} className="btn primary">
                Till skattjakten
              </Link>
            </>
          ) : (
            <>
              <h1>{hunt.name}</h1>
              <p>{sv ? "Du är inte med i den här skattjakten ännu." : "You haven't joined this trail yet."}</p>
              <Link href={`/join/${hunt.joinCode}`} className="btn primary">
                {sv ? "Gå med först" : "Join first"}
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
