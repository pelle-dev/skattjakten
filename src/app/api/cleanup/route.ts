import { NextResponse } from "next/server";
import { purgeOldHunts } from "@/lib/cleanup";
import { mutate } from "@/lib/store";

// Körs en gång per dygn av Vercel (se vercel.json). Raderar bara jakter som redan ska bort,
// så det gör inget om någon annan anropar adressen.
export const dynamic = "force-dynamic";

export async function GET() {
  const removed = await mutate((db) => purgeOldHunts(db));
  return NextResponse.json({ removed });
}
