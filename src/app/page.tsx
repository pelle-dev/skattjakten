import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Brand";
import { hostHuntIds, playerHuntIds } from "@/lib/session";
import { SITE_URL } from "@/lib/site";
import { readDb } from "@/lib/store";
import type { HuntStatus } from "@/lib/types";
import { DemoButton } from "./DemoButton";
import { HowItWorks } from "./HowItWorks";

export const dynamic = "force-dynamic";

const TITLE = "Skattjakt för barn – skapa din egen med QR-koder | Skattjakten";
const DESCRIPTION =
  "Skapa en rolig skattjakt för barn på några minuter. Göm QR-koder, lös ledtrådar och uppdrag i mobilen och hitta skatten. Perfekt till barnkalas och påskäggsjakt.";

// Startsidan är den enda sidan som ska synas i sökresultat.
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Berättar för Google vad sidan är (en gratis webbapp på svenska).
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Skattjakten",
  url: SITE_URL,
  inLanguage: "sv-SE",
  applicationCategory: "GameApplication",
  operatingSystem: "Webbläsare",
  description: DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "SEK" },
};

const STATUS: Record<HuntStatus, { label: string; cls: string }> = {
  draft: { label: "Utkast", cls: "grey" },
  active: { label: "Pågår", cls: "" },
  paused: { label: "Pausad", cls: "warn" },
  finished: { label: "Avslutad", cls: "gold" },
};

export default async function Home() {
  const db = await readDb();
  const hostIds = new Set(await hostHuntIds());
  const playIds = new Set(await playerHuntIds());
  const hosted = db.hunts.filter((h) => hostIds.has(h.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const playing = db.hunts.filter((h) => playIds.has(h.id) && h.status !== "finished");

  return (
    <>
      <main className="page">
        <section className="hero center">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
          <Logo width={300} className="hero-logo" />
          <h1 className="hero-lead">Skapa en rolig skattjakt på några minuter.</h1>
          <p className="muted">Göm, scanna, lös och hitta skatten.</p>
        </section>

        <div className="stack">
          <Link href="/create" className="btn primary huge">
            Skapa ny skattjakt
          </Link>
          <Link href="/join" className="btn secondary huge">
            Gå med i en skattjakt
          </Link>
        </div>

        <section className="card how" style={{ marginTop: 20 }}>
          <h2>Små ledtrådar, stora äventyr</h2>
          <p>
            Skapa en skattjakt med kluriga frågor och roliga uppdrag. Du gömmer ledtrådarna och skatten. Deltagarna använder mobilen för att skanna,
            lösa uppgifter och hitta vidare – hela vägen till skatten.
          </p>
          <HowItWorks />
        </section>

        {playing.length > 0 && (
          <section className="card" style={{ marginTop: 20 }}>
            <h2>Fortsätt spela</h2>
            {playing.map((h) => (
              <Link key={h.id} href={`/play/${h.id}`} className="btn block" style={{ marginBottom: 8 }}>
                {h.name}
              </Link>
            ))}
          </section>
        )}

        <section className="card" style={{ marginTop: 20 }}>
          <h2>Dina skattjakter</h2>
          {hosted.length === 0 ? (
            <p className="muted">Här visas skattjakter som du skapar på den här enheten.</p>
          ) : (
            <div className="stack">
              {hosted.map((h) => (
                <Link key={h.id} href={`/hunt/${h.id}`} className="cp-item" style={{ textDecoration: "none" }}>
                  <span style={{ fontSize: "1.5rem" }}>{h.status === "finished" ? "🏆" : "🗺️"}</span>
                  <span style={{ flex: 1 }}>
                    <strong>{h.name}</strong>
                    <br />
                    <span className="muted small">
                      Kod {h.joinCode} · {new Date(h.createdAt).toLocaleDateString("sv-SE")}
                    </span>
                  </span>
                  <span className={`badge ${STATUS[h.status].cls}`}>{STATUS[h.status].label}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card soft">
          <h3>Vill du prova direkt?</h3>
          <p className="small">
            Skapa <strong>Testjakten</strong>: en färdig barnkalasjakt med 3 ledtrådar, en skatt, frågor, uppdrag och 2 lag som startar med 2 minuters
            mellanrum.
          </p>
          <DemoButton />
        </section>
      </main>
    </>
  );
}
