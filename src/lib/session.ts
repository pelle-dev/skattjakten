// Inga konton i MVP: åtkomst sparas i cookies.
// - Skattgömmaren får en cookie per jakt med jaktens hemliga hostKey.
// - Deltagaren får en cookie per jakt med sitt deltagar-id och sin hemliga nyckel.

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import type { Db, Hunt } from "./types";

const HOST_PREFIX = "sj_h_";
const PLAYER_PREFIX = "sj_p_";
const MAX_AGE = 60 * 60 * 24 * 90;

// secure: cookien skickas bara över https (utom lokalt, där appen körs på http).
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production" && !!process.env.VERCEL, sameSite: "lax" as const, path: "/", maxAge: MAX_AGE };

export async function setHostCookie(hunt: Hunt) {
  (await cookies()).set(HOST_PREFIX + hunt.id, hunt.hostKey, cookieOptions);
}

export async function hostHuntIds(): Promise<string[]> {
  return (await cookies())
    .getAll()
    .filter((c) => c.name.startsWith(HOST_PREFIX))
    .map((c) => c.name.slice(HOST_PREFIX.length));
}

/** Jämför hemliga nycklar utan att svarstiden avslöjar hur mycket som stämde. */
export function sameSecret(given: string | null | undefined, expected: string): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isHost(hunt: Hunt): Promise<boolean> {
  return sameSecret((await cookies()).get(HOST_PREFIX + hunt.id)?.value, hunt.hostKey);
}

/**
 * Jakten om webbläsaren är dess skattgömmare, annars null.
 * Varje värdsida måste själv anropa den här: layouten skyddar inte sidan,
 * eftersom Next.js kan hämta en sida utan att köra layouten på nytt.
 */
export async function hostHunt(db: Db, huntId: string): Promise<Hunt | null> {
  const hunt = db.hunts.find((h) => h.id === huntId);
  return hunt && (await isHost(hunt)) ? hunt : null;
}

/** Ett anonymt id för den som anropar (hashad IP-adress), för att begränsa missbruk. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(`skattjakten:${ip}`).digest("base64url").slice(0, 22);
}

export async function setPlayerCookie(huntId: string, participantId: string, token: string) {
  (await cookies()).set(PLAYER_PREFIX + huntId, `${participantId}.${token}`, cookieOptions);
}

export async function playerCredentials(huntId: string): Promise<{ id: string; token: string } | null> {
  const raw = (await cookies()).get(PLAYER_PREFIX + huntId)?.value;
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 0) return null;
  return { id: raw.slice(0, dot), token: raw.slice(dot + 1) };
}

export async function playerHuntIds(): Promise<string[]> {
  return (await cookies())
    .getAll()
    .filter((c) => c.name.startsWith(PLAYER_PREFIX))
    .map((c) => c.name.slice(PLAYER_PREFIX.length));
}

/** Antal andra jakter som den här webbläsaren styr och som är igång. */
export async function otherActiveHunts(db: Db, huntId: string) {
  const ids = new Set(await hostHuntIds());
  return db.hunts.filter((h) => h.id !== huntId && ids.has(h.id) && (h.status === "active" || h.status === "paused")).length;
}

/** Adressen som QR-koder och länkar ska peka på. */
export async function baseUrl(): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || /^\d/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
