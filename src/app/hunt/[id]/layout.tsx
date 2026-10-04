import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { isHost } from "@/lib/session";
import { readDb } from "@/lib/store";
import { HostTabs } from "./HostTabs";

export const dynamic = "force-dynamic";

export default async function HostLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const hunt = db.hunts.find((h) => h.id === id);
  if (!hunt || !(await isHost(hunt))) {
    return (
      <>
        <TopBar />
        <main className="page">
          <div className="card center">
            <h1>Ingen åtkomst</h1>
            <p className="muted">
              Den här skattjakten styrs från en annan enhet. Öppna värdlänken från den enheten, eller gå tillbaka till startsidan.
            </p>
            <Link href="/" className="btn primary">
              Till startsidan
            </Link>
          </div>
        </main>
      </>
    );
  }
  return (
    <>
      <TopBar right={<span className="badge grey">Skattgömmare</span>} />
      <main className="page wide">
        <div className="no-print">
          <h1 style={{ marginBottom: 4 }}>{hunt.name}</h1>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Kod för deltagare: <strong style={{ letterSpacing: "0.15em" }}>{hunt.joinCode}</strong> ·{" "}
            {hunt.plan === "paid" ? "Betald" : "Gratis"} · {hunt.status === "draft" ? "Utkast" : hunt.status === "active" ? "Pågår" : hunt.status === "paused" ? "Pausad" : "Avslutad"}
          </p>
          <HostTabs huntId={hunt.id} />
        </div>
        {children}
      </main>
    </>
  );
}
