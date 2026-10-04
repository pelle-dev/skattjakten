import Link from "next/link";
import { Suspense } from "react";
import { TopBar } from "@/components/TopBar";
import { playContext } from "@/lib/game";
import { UserError } from "@/lib/hunts";
import { playerCredentials } from "@/lib/session";
import { mutate } from "@/lib/store";
import { buildPlayState } from "@/lib/views";
import { Play } from "./Play";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: Promise<{ huntId: string }> }) {
  const { huntId } = await params;
  const creds = await playerCredentials(huntId);
  let state = null;
  if (creds) {
    const now = new Date();
    state = await mutate((db) => {
      try {
        const ctx = playContext(db, creds.id, creds.token, now);
        return ctx.hunt.id === huntId ? buildPlayState(db, ctx, now) : null;
      } catch (err) {
        if (err instanceof UserError) return null;
        throw err;
      }
    });
  }
  if (!state) {
    return (
      <>
        <TopBar />
        <main className="page">
          <div className="card center">
            <h1>Du är inte med ännu</h1>
            <p className="muted">Gå med i skattjakten med koden från skattgömmaren.</p>
            <Link href="/join" className="btn primary">
              Gå med
            </Link>
          </div>
        </main>
      </>
    );
  }
  return (
    <Suspense>
      <Play huntId={huntId} initial={state} />
    </Suspense>
  );
}
