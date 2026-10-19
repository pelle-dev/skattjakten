import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { sameSecret } from "@/lib/session";

const COOKIE = "sj_stats";

export const statsPassword = () => process.env.STATISTIK_LOSENORD ?? "";

// Cookien innehåller en hash av lösenordet, inte lösenordet. Byts lösenordet blir gamla inloggningar ogiltiga.
const token = () => createHash("sha256").update(`skattjakten-statistik:${statsPassword()}`).digest("base64url");

export async function setStatsCookie() {
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !!process.env.VERCEL,
    sameSite: "lax",
    path: "/statistik",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function canSeeStats(): Promise<boolean> {
  return !!statsPassword() && sameSecret((await cookies()).get(COOKIE)?.value, token());
}
