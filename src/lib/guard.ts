// Kontroller av det som skickas till serverfunktionerna.
// Serverfunktioner kan anropas direkt av vem som helst, så TypeScript-typerna räcker inte:
// här stoppas för stora, felaktiga eller för många anrop innan något sparas.

import "server-only";
import { avatarById } from "./catalog";
import { UserError } from "./hunts";
import { clientKey } from "./session";
import { hit } from "./store";

/** Stoppar indata som är orimligt stor (skyddar databasen och AI-kostnaden). */
export function limitSize(value: unknown, maxChars: number) {
  let size: number;
  try {
    size = JSON.stringify(value ?? null).length;
  } catch {
    throw new UserError("Felaktiga uppgifter.");
  }
  if (size > maxChars) throw new UserError("Texten är för lång. Korta ner den och försök igen.");
}

/** Kräver att varje angivet värde är en text. */
export function requireStrings(...values: unknown[]) {
  if (values.some((v) => typeof v !== "string")) throw new UserError("Felaktiga uppgifter.");
}

// Lagbilder görs om till en liten JPEG i webbläsaren (320×320), normalt 20–60 kB.
const MAX_PHOTO_CHARS = 300_000;
const PHOTO_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Bara egna avatarer och små inbäddade bilder: inga länkar till andra webbplatser. */
export function checkLook(look: { avatarId?: unknown; photoUrl?: unknown }) {
  const { avatarId, photoUrl } = look;
  if (avatarId !== undefined && avatarId !== null && (typeof avatarId !== "string" || !avatarById(avatarId)))
    throw new UserError("Välj en av figurerna.");
  if (photoUrl !== undefined && photoUrl !== null) {
    if (typeof photoUrl !== "string" || !PHOTO_PATTERN.test(photoUrl)) throw new UserError("Bilden gick inte att använda. Välj en annan bild.");
    if (photoUrl.length > MAX_PHOTO_CHARS) throw new UserError("Bilden är för stor. Välj en annan bild.");
  }
}

const LIMITS = {
  // Nya skattjakter per enhet/nätverk och timme.
  createHunt: { limit: 20, windowSeconds: 3600, message: "Du har skapat många skattjakter på kort tid. Vänta en stund och försök igen." },
  // AI-förslag per enhet/nätverk och timme.
  ai: { limit: 150, windowSeconds: 3600, message: "Många AI-förslag på kort tid. Vänta en stund eller skriv själv." },
  // Att gå med. Högt, eftersom en hel skolklass kan dela samma wifi.
  join: { limit: 300, windowSeconds: 3600, message: "Många försök att gå med på kort tid. Vänta en stund och försök igen." },
  joinInfo: { limit: 600, windowSeconds: 3600, message: "Många försök på kort tid. Vänta en stund och försök igen." },
} as const;

/** Begränsar hur ofta samma enhet/nätverk får göra något. */
export async function rateLimit(kind: keyof typeof LIMITS) {
  const { limit, windowSeconds, message } = LIMITS[kind];
  if (!(await hit(`${kind}:${await clientKey()}`, limit, windowSeconds))) throw new UserError(message);
}

/** Tak för alla AI-anrop i hela appen per dygn, så att en felaktig eller elak användning inte kan ge en stor räkning. */
export async function aiDailyCap() {
  const cap = Number(process.env.AI_DAILY_LIMIT) || 2000;
  if (!(await hit("ai:all", cap, 86_400))) throw new UserError("AI-hjälpen är tillfälligt pausad. Skriv själv så länge.");
}
