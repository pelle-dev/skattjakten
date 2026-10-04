import QRCode from "qrcode";
import { checkpointsOf, treasureOf } from "@/lib/hunts";
import { t } from "@/lib/i18n";
import { baseUrl } from "@/lib/session";
import { readDb } from "@/lib/store";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const view = (await searchParams).view === "list" ? "list" : "qr";
  const db = await readDb();
  const hunt = db.hunts.find((h) => h.id === id)!;
  const cps = checkpointsOf(db, id);
  const treasure = treasureOf(db, id)!;
  const base = await baseUrl();
  const items = [
    ...cps.map((c) => ({ key: c.id, title: c.title, number: String(c.order + 1), note: c.hostPlacementNote, clue: c.publicClueText, token: c.qrToken })),
    { key: "treasure", title: hunt.language === "sv" ? "Skatten" : "The treasure", number: "💎", note: treasure.hostPlacementNote, clue: treasure.publicClueText, token: treasure.qrToken },
  ];
  const qrs = await Promise.all(items.map((i) => QRCode.toDataURL(`${base}/s/${i.token}`, { margin: 2, width: 600, errorCorrectionLevel: "M" })));
  const scanText = hunt.language === "sv" ? "Scanna när ni har hittat denna punkt" : "Scan when you have found this point";
  const isLocal = /localhost|127\.0\.0\.1/.test(base);

  return (
    <>
      <div className="no-print">
        <div className="row" style={{ marginBottom: 12 }}>
          <a href="?view=qr" className={`btn ${view === "qr" ? "primary" : ""}`}>
            QR-sidor
          </a>
          <a href="?view=list" className={`btn ${view === "list" ? "primary" : ""}`}>
            Placeringslista
          </a>
          <PrintButton />
        </div>
        {view === "qr" && (
          <div className="notice small">
            En QR-kod per A4-sida. QR-sidorna visar inte ledtrådarna, så de kan inte avslöja något. QR-koderna pekar på <strong>{base}</strong>.
            {isLocal && (
              <>
                {" "}
                Mobiler kan inte nå <em>localhost</em>. Öppna appen via datorns adress i nätverket (eller sätt PUBLIC_BASE_URL) innan du skriver ut. Se README.
              </>
            )}
          </div>
        )}
      </div>

      {view === "qr" &&
        items.map((item, i) => (
          <section className="qr-page" key={item.key}>
            <div className="qr-brand">🗺️ {hunt.brandName}</div>
            <div className="muted">{hunt.name}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrs[i]} alt={`QR-kod ${item.title}`} />
            <div className="qr-title">{item.key === "treasure" ? `💎 ${item.title}` : `${hunt.language === "sv" ? "Kontrollpunkt" : "Checkpoint"} ${item.number}`}</div>
            <p className="big">{scanText}</p>
            <p className="no-print small">
              <a href={`/s/${item.token}`} target="_blank">
                Testlänk (öppnar samma sak som en scanning)
              </a>
            </p>
          </section>
        ))}

      {view === "list" && (
        <section className="card">
          <h1>Placeringslista – {hunt.name}</h1>
          <p className="muted">🔒 Privat för skattgömmaren. Visa inte för deltagarna.</p>
          {items.map((item) => (
            <div key={item.key} style={{ borderTop: "1px solid var(--line)", padding: "12px 0", breakInside: "avoid" }}>
              <h3 style={{ marginBottom: 4 }}>{item.key === "treasure" ? "💎 Skatten" : `Kontrollpunkt ${item.number}`}</h3>
              <p style={{ margin: 0 }}>
                <strong>Placera QR-koden:</strong> {item.note || <em className="muted">ingen placering angiven</em>}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Ledtråd som visas i appen:</strong> {item.clue ? `”${item.clue}”` : <em className="muted">saknas</em>}
              </p>
            </div>
          ))}
          <p className="muted small" style={{ marginTop: 12 }}>
            Tips: {t(hunt.language, "appName")} visar alltid bara en ledtråd i taget. Ledtråd 1 visas när laget startar.
          </p>
        </section>
      )}
    </>
  );
}
