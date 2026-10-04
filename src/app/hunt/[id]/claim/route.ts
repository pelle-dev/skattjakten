import { NextResponse } from "next/server";
import { sameSecret } from "@/lib/session";
import { readDb } from "@/lib/store";

// Värdlänk: öppnar jakten som skattgömmare på en annan enhet.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const hunt = (await readDb()).hunts.find((h) => h.id === id);
  const ok = !!hunt && sameSecret(key, hunt.hostKey);
  const res = NextResponse.redirect(new URL(ok ? `/hunt/${id}` : "/", url));
  if (ok) {
    res.cookies.set(`sj_h_${id}`, key, { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  }
  return res;
}
