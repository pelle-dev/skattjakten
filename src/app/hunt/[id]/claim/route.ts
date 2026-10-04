import { NextResponse } from "next/server";
import { readDb } from "@/lib/store";

// Värdlänk: öppnar jakten som skattgömmare på en annan enhet.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const hunt = (await readDb()).hunts.find((h) => h.id === id);
  const target = new URL(hunt && key === hunt.hostKey ? `/hunt/${id}` : "/", url);
  const res = NextResponse.redirect(target);
  if (hunt && key === hunt.hostKey) {
    res.cookies.set(`sj_h_${id}`, key, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  }
  return res;
}
