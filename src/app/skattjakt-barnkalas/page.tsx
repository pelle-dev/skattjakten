import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";

// Temasida för sökningar som "skattjakt barnkalas". Texten är godkänd av Pelle.
const TITLE = "Skattjakt till barnkalas – enkel och rolig med QR-koder | Skattjakten";
const DESCRIPTION =
  "Ordna en skattjakt på barnkalaset utan stress. Ledtrådar, frågor och uppdrag i mobilen, tips per ålder och exempel på ledtrådar. Gratis.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/skattjakt-barnkalas" },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/skattjakt-barnkalas" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  { q: "Behöver barnen egna mobiler?", a: "Nej, det räcker med en mobil per lag." },
  { q: "Kostar det något?", a: "Nej, Skattjakten är gratis." },
  { q: "Fungerar det inomhus?", a: "Ja, QR-koderna kan gömmas var som helst där mobilen kan scanna dem." },
  { q: "Vad är skatten?", a: "Det bestämmer du. Godis, små presenter eller kalastårtan fungerar fint." },
];

// Vanliga frågor som strukturerad data, så att Google förstår sidan.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  inLanguage: "sv-SE",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

function CreateButton() {
  return (
    <Link href="/create" className="btn primary huge">
      Skapa en kalasjakt
    </Link>
  );
}

export default function SkattjaktBarnkalas() {
  return (
    <>
      <TopBar />
      <main className="page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

        <h1>Skattjakt till barnkalas</h1>
        <p>
          En skattjakt på kalaset ger barnen något att göra tillsammans, och du slipper hålla i allt själv. Med Skattjakten gör du en jakt på några
          minuter. Du gömmer ledtrådarna, barnen löser resten i mobilen.
        </p>
        <div className="stack" style={{ margin: "20px 0" }}>
          <CreateButton />
        </div>

        <section className="card">
          <h2>Så går det till</h2>
          <ol>
            <li>Skapa jakten och skriv ledtrådarna. Ledtrådshjälparen ger förslag om du kör fast.</li>
            <li>Skriv ut QR-koderna och göm dem, till exempel hemma, på gården eller i parken.</li>
            <li>Barnen går med i lag och följer ledtrådarna. På varje plats väntar frågor och ett litet uppdrag.</li>
            <li>Sista ledtråden leder till skatten. Alla lag får ett diplom.</li>
          </ol>
        </section>

        <section className="card">
          <h2>Tips efter ålder</h2>
          <ul>
            <li>
              <strong>4–6 år:</strong> 3–4 ledtrådar, korta och tydliga. Låt en vuxen läsa högt och gå med varje lag.
            </li>
            <li>
              <strong>7–9 år:</strong> 4–6 ledtrådar. Små gåtor och enkla frågor fungerar bra.
            </li>
            <li>
              <strong>10–12 år:</strong> 6–8 ledtrådar. Kluriga gåtor, fler frågor och lite tävling mellan lagen.
            </li>
          </ul>
          <p>Räkna med ungefär 5 minuter per ledtråd. Starta lagen med några minuters mellanrum, så trängs ingen vid samma gömställe.</p>
        </section>

        <section className="card">
          <h2>Exempel på ledtrådar</h2>
          <ul>
            <li>”Där man kan vila mellan lekarna finns första spåret. Leta under något rött.”</li>
            <li>”Leta där något grönt bor i en liten burk, nära dörren där gästerna kommer in.”</li>
            <li>”Skatten finns där det är kallt och maten sover. Titta högst upp!”</li>
          </ul>
        </section>

        <section className="card">
          <h2>Uppdrag som passar på kalas</h2>
          <ul>
            <li>Ta en lagbild där alla gör en rolig min.</li>
            <li>Hitta tre saker som är gula.</li>
            <li>Sjung en vers av födelsedagssången till kalasbarnet.</li>
            <li>Bygg ett torn av fem saker ni hittar i närheten.</li>
          </ul>
        </section>

        <section className="card">
          <h2>Vanliga frågor</h2>
          {FAQ.map((f) => (
            <p key={f.q}>
              <strong>{f.q}</strong> {f.a}
            </p>
          ))}
        </section>

        <section className="card soft">
          <p>Knappen skapar en ny, tom jakt som du fyller med dina egna ledtrådar.</p>
          <div className="stack">
            <CreateButton />
          </div>
        </section>
      </main>
    </>
  );
}
