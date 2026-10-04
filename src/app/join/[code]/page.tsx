import { redirect } from "next/navigation";
import { findHuntByCode } from "@/lib/hunts";
import { playerCredentials } from "@/lib/session";
import { readDb } from "@/lib/store";
import { JoinForm } from "./JoinForm";

export const dynamic = "force-dynamic";

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = await readDb();
  // Redan med i jakten på den här enheten? Fortsätt spela.
  const hunt = findHuntByCode(db, code);
  if (hunt && hunt.status !== "finished") {
    const creds = await playerCredentials(hunt.id);
    if (creds && db.participants.some((p) => p.id === creds.id && p.token === creds.token)) redirect(`/play/${hunt.id}`);
  }
  return <JoinForm code={code} />;
}
