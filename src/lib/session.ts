// Inga konton i MVP: åtkomst sparas i cookies.
// - Skattgömmaren får en cookie per jakt med jaktens hemliga hostKey.
// - Deltagaren får en cookie per jakt med sitt deltagar-id och sin hemliga nyckel.

import "server-only";
import { cookies, headers } from "next/headers";
import type { Db, Hunt } from "./types";

const HOST_PREFIX = "sj_h_";
const PLAYER_PREFIX = "sj_p_";
const MAX_AGE = 60 * 60 * 24 * 90;

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: MAX_AGE };

export async function setHostCookie(hunt: Hunt) {
  (await cookies()).set(HOST_PREFIX + hunt.id, hunt.hostKey, cookieOptions);
}

export async function hostHuntIds(): Promise<string[]> {
  return (await cookies())
    .getAll()
    .filter((c) => c.name.startsWith(HOST_PREFIX))
    .map((c) => c.name.slice(HOST_PREFIX.length));
}

export async function isHost(hunt: Hunt): Promise<boolean> {
  return (await cookies()).get(HOST_PREFIX + hunt.id)?.value === hunt.hostKey;
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
