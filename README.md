# Skattjakten

En mobilanpassad webbapp för fysiska skattjakter med QR-koder. En skattgömmare skapar en kedja av ledtrådar, skriver ut QR-koder och gömmer dem. Deltagarna följer ledtrådarna, scannar QR-koderna, svarar på frågor, gör uppdrag och hittar till slut skatten.

Det här är MVP:n för privata skattjakter. Den körs lokalt utan konton eller externa tjänster.

---

## Kom igång (lokalt)

Du behöver [Node.js](https://nodejs.org) version 20 eller nyare.

```bash
npm install
npm run build
npm start
```

Öppna sedan **http://localhost:3000** i webbläsaren.

Vill du ändra i koden och se ändringarna direkt kan du köra `npm run dev` i stället för de två sista raderna.

### Prova Testjakten

På startsidan finns knappen **Skapa Testjakten**. Den skapar en färdig jakt enligt testscenariot:

- namn ”Testjakten”, mallen Barnkalas, Klassisk skattjakt, lagspel
- 3 ledtrådar med placering, ledtråd, hjälptext, tre frågor och ett uppdrag var
- en skatt med egen QR-kod
- 2 lag (Rävarna och Ugglorna) med avatarer och 2 minuters startintervall

Så här spelar du igenom den på en dator:

1. Klicka **Skapa Testjakten**. Du hamnar i skattgömmarens vy.
2. Titta under **Förhandsgranska** och **Skriv ut** (QR-sidor och placeringslista).
3. Under **Lag** ser du lagkoderna. Öppna ett **privat webbläsarfönster**, gå till http://localhost:3000/join och skriv in Rävarnas lagkod. Gör samma sak i ett till privat fönster (eller en annan webbläsare) för Ugglorna.
4. Gå till **Kontrollpanel** och tryck **Starta skattjakten**. Rävarna får första ledtråden direkt, Ugglorna ser en nedräkning på 2 minuter.
5. ”Scanna” genom att öppna testlänken under respektive QR-kod på utskriftssidan, i lagets fönster. Det är exakt samma sak som händer när en mobil scannar koden.
6. Svara på frågorna, markera uppdraget som klart, och fortsätt till skatten.
7. Tryck **Avsluta** i kontrollpanelen. Under **Resultat** syns vinnaren och diplomen.

Det finns också ett **Testläge** i kontrollpanelen där du kan låtsas att ett lag scannar en viss kod.

Alternativt kan Testjakten skapas från terminalen med `npm run seed`, som skriver ut en värdlänk.

### Spela med riktiga mobiler

QR-koderna innehåller en webbadress. Mobilerna måste kunna nå den adressen.

1. Datorn och mobilerna ska vara på samma wifi.
2. Ta reda på datorns adress i nätverket (till exempel `192.168.1.10`).
3. Öppna appen på datorn via den adressen, till exempel `http://192.168.1.10:3000`, innan du skriver ut. Då pekar QR-koderna dit. (Eller sätt `PUBLIC_BASE_URL`, se nedan.)
4. Deltagarna scannar QR-koderna med **mobilens vanliga kamera**. Det öppnar appen och registrerar scanningen.

Knappen **Scanna QR-kod** inne i appen använder kameran direkt i webbläsaren. Mobiler tillåter bara det på säkra adresser (https). Lokalt över wifi fungerar därför mobilens vanliga kamera bäst. När appen läggs ut på en riktig https-adress (till exempel Vercel) fungerar även kameran i appen.

---

## Publicera på nätet (Vercel)

Då får du en länk som fungerar i alla mobiler, och kameran i appen fungerar eftersom adressen är https. Allt nedan är gratis.

1. **Lägg in koden i main.** Öppna pull requesten på GitHub och tryck **Merge pull request** → **Confirm merge**. (Vercel publicerar det som ligger i main.)
2. Gå till [vercel.com](https://vercel.com) och välj **Sign Up** → **Continue with GitHub**. Välj gratisplanen (Hobby).
3. Tryck **Add New… → Project**, välj **skattjakten** i listan och tryck **Import** och sedan **Deploy**. Vänta tills det står klart.
4. Gå in i projektet, öppna fliken **Storage** och tryck **Create Database**. Välj **Neon** (Postgres), godkänn och koppla databasen till projektet. Då läggs `DATABASE_URL` in automatiskt.
5. Öppna fliken **Deployments**, tryck på **⋯** vid den översta och välj **Redeploy**.
6. Öppna länken som slutar på `.vercel.app` och tryck **Skapa Testjakten**.

Vill du ha riktiga AI-förslag: lägg till `ANTHROPIC_API_KEY` under **Settings → Environment Variables** och gör Redeploy igen.

Med `DATABASE_URL` satt sparas all data i Postgres (tabellen `skattjakten_store` skapas automatiskt). Utan den används den lokala filen.

---

## Miljövariabler

Allt är frivilligt. Kopiera `.env.example` till `.env.local` och fyll i det du behöver.

| Variabel | Vad den gör |
| --- | --- |
| `ANTHROPIC_API_KEY` | Nyckel till Claude. Används för AI-förslag på ledtrådar, hjälptexter och frågor. Saknas den används inbyggda exempel (mockad AI), så att allt går att testa. |
| `AI_MODEL` | Vilken Claude-modell som används. Standard: `claude-opus-5-5`. |
| `PUBLIC_BASE_URL` | Adressen som QR-koder och länkar pekar på, t.ex. `http://192.168.1.10:3000`. Tom = adressen du öppnar appen med. |
| `DATABASE_URL` | Postgres-databas (t.ex. Neon eller Supabase). Satt = datan sparas där. Behövs på Vercel. `POSTGRES_URL` fungerar också. |
| `DATA_FILE` | Var datan sparas lokalt när ingen databas är satt. Standard: `data/db.json`. |

AI-anropen görs bara på servern, så nyckeln syns aldrig i webbläsaren.

---

## Tester

```bash
npm test          # spelmotorn: hela Testjakten-flödet, poäng, tider och gränser
npm run typecheck # TypeScript
```

Testerna i `tests/testjakten.test.ts` går igenom alla 15 punkter i testflödet: jakten skapas, QR-koder finns, lag går med, lagen startar med 2 minuters mellanrum, rätt QR låser upp frågor, rätt svar ger poäng, uppdrag ger poäng, fel QR ger inga poäng, hjälp drar av poäng, paus räknas bort från tiden, skatten hittas och vinnaren utses (både Flest poäng och Snabbast vinner, räknat från lagets egen starttid).

---

## Grafisk profil

Appen följer Skattjaktens grafiska profil, som finns i `docs/brand.md`. Appen är bara på svenska.

- Färger, hörnradier och typsnitt ligger som variabler överst i `src/app/globals.css`.
- Typsnitten (Nunito Sans för rubriker, Atkinson Hyperlegible för text) laddas i `src/app/layout.tsx`.
- Logotyperna ligger i `public/brand/` (primary, monochrome och white för logo, wordmark och symbol, plus appikonen). `src/components/Brand.tsx` har komponenterna `Logo`, `Wordmark` och `BrandSymbol`.
- Favicon och hemskärmsikon är `src/app/icon.png` och `src/app/apple-icon.png`, gjorda från appikonen.

## Teknik och arkitektur

- **Next.js 16 + TypeScript + React 19**, en mobil-först webbapp. Serverlogiken körs som server actions.
- **Lagring:** en JSON-fil (`data/db.json`) lokalt, eller Postgres när `DATABASE_URL` är satt, via `src/lib/store.ts`. Allt går genom `readDb()` och `mutate()`, så det är den enda filen som behöver bytas för att flytta till Supabase/Postgres. Tabellerna i datamodellen motsvarar redan databastabeller.
- **Spelmotorn** (`src/lib/game.ts`) och **skattgömmarens logik** (`src/lib/hunts.ts`) är ren TypeScript utan beroende på Next.js. De kan återanvändas av ett framtida API för en native-app.
- **QR-koder** genereras med `qrcode`. Varje kontrollpunkt och skatten har en slumpmässig token på 128 bitar, så de går inte att gissa. QR-koden pekar på `/s/<token>`.
- **QR-scanning** i appen sker med kameran och `jsqr`. Mobilens vanliga kamera fungerar också.
- **Inga konton:** skattgömmaren får en hemlig nyckel i en cookie per jakt (”värdlänken” på Översikt öppnar jakten på en annan enhet). Deltagare får en egen hemlig nyckel i en cookie.
- **AI:** `src/lib/ai/` anropar Claude med strukturerat svar. Utan nyckel används `mock.ts`. AI-frågor sparas alltid som ej godkända och jakten kan inte starta förrän skattgömmaren har godkänt dem.

### Projektstruktur

```
src/
  app/
    page.tsx                  Startsida
    create/                   Skapa skattjakt
    hunt/[id]/                Skattgömmarens vyer
      build/                  Ledtrådsbyggaren med Ledtrådshjälparen
      preview/                Förhandsgranskning av kedjan med varningar
      print/                  QR-sidor och placeringslista
      teams/                  Lag och deltagare
      dashboard/              Kontrollpanel (start, paus, avslut, poäng, händelser, testläge)
      results/                Resultat
      settings/               Inställningar
      claim/                  Värdlänk
    join/                     Gå med via kod, länk eller QR
    play/[huntId]/            Deltagarvyn
    s/[token]/                Hit leder QR-koderna
    diploma/[huntId]/[teamId] Diplom (utskrivbart)
    actions/                  Serverfunktioner (host.ts, play.ts)
  components/                 Avatarer, QR-scanner, formulär m.m.
  lib/
    types.ts                  Datamodellen
    catalog.ts                Planer, mallar, teman, spellägen, avatarer, poängregler
    hunts.ts                  Skapa/redigera jakt, ledtrådar, frågor, uppdrag, lag, validering
    game.ts                   Spelmotor: start, scanning, frågor, uppdrag, hjälp, poäng, tid, ranking
    views.ts                  Vad som skickas till webbläsaren (deltagare ser aldrig facit i förväg)
    ai/                       AI-förslag (Claude) och mockad AI
    store.ts                  Lagring
    demo.ts                   Testjakten
tests/                        Tester för spelmotorn
scripts/seed.ts               Skapar Testjakten från terminalen
```

### Datamodell

Se `src/lib/types.ts`. Tabellerna är `Hunt`, `Checkpoint`, `Question`, `Mission`, `Treasure`, `Team`, `Participant`, `ScanEvent`, `HintRequest`, `Answer`, `MissionCompletion` och `CommercialSettings` (förberedd, används inte än). Tekniskt heter en ledtrådsplats `Checkpoint`.

Några saker utöver specen:

- `Hunt.hostKey` (värdens hemliga nyckel), `Hunt.joinCode`, `Hunt.allowPhotos`, `Hunt.scoring` (poängreglerna per jakt), `Hunt.pauses` (för rättvis tid) och `Hunt.aiGenerationsUsed`.
- `Team.phase` (letar / frågor / uppdrag) och `Team.startOrder`.
- `Treasure.helpText`, så att det finns hjälp även för sista ledtråden.
- `Participant.token`, deltagarens hemliga nyckel.

`Checkpoint.publicClueText` är ledtråden som leder **till** den kontrollpunkten. `Treasure.publicClueText` är sista ledtråden, som leder till skatten.

### Regler som spelmotorn följer

- Rätt QR i rätt ordning ger poäng (4), sedan tre frågor (1 poäng per rätt svar), sedan eventuellt uppdrag (1 poäng), sedan nästa ledtråd. Skatten ger 10. Hjälp kostar 1 poäng varje gång.
- Fel QR, en redan hittad QR eller scanning före starttid ger vänliga meddelanden och inga poäng. Alla scanningar och hjälp-begäranden loggas.
- Samma kontrollpunkt kan inte ge poäng två gånger, även om flera mobiler i laget scannar samtidigt.
- Rätt svar skickas till mobilen först när svaret är inskickat.
- Tid räknas från lagets egen starttid, minus tid då jakten var pausad.
- Snabbast vinner: först den som hittade skatten snabbast. Flest poäng vinner: högst poäng, vid lika poäng den som hittade skatten snabbast.

### Gratis och betald (internt läge, ingen betalning)

| | Gratis | Betald |
| --- | --- | --- |
| Ledtrådar | max 3 | 10 som standard, kan ändras (max 30) |
| Lag/deltagare | max 2 | max 30 |
| Aktiva jakter | 1 | flera |
| AI-förslag per jakt | 6 | obegränsat |
| Mallar, Lugn jakt, Lagkamp | – | ja |
| Uppdrag, lagbild, diplom | – | ja |

Gränserna finns på ett ställe: `PLAN_LIMITS` i `src/lib/catalog.ts`.

---

## Inte byggt i MVP (men förberett)

Native-app, betalning, GPS/kartor, pushnotiser, publika eller kommersiella jakter, sponsorer, leadformulär, premiumteman, användarkonton, fotobevis för uppdrag, Poängjakt (valfri ordning) och PDF-diplom. Datamodellen har fält för kommersiell användning (`ownerType`, `visibility`, `commercial`, `CommercialSettings`) och uppdrag har `missionType` för framtida foto/godkännande.
