import Link from "next/link";
import { Diploma } from "@/components/Diploma";
import { PrintButton } from "@/app/hunt/[id]/print/PrintButton";
import { LIMITS } from "@/lib/catalog";
import { ranking } from "@/lib/game";
import { t } from "@/lib/i18n";
import { isHost, playerCredentials } from "@/lib/session";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DiplomaPage({ params }: { params: Promise<{ huntId: string; teamId: string }> }) {
  const { huntId, teamId } = await params;
  const db = await readDb();
  const hunt = db.hunts.find((h) => h.id === huntId);
  const team = db.teams.find((x) => x.id === teamId && x.huntId === huntId);
  const creds = await playerCredentials(huntId);
  const isMember = !!creds && db.participants.some((p) => p.id === creds.id && p.token === creds.token && p.teamId === teamId);
  const allowed = hunt && team && ((await isHost(hunt)) || isMember);
  if (!hunt || !team || !allowed) {
    return (
      <main className="page center">
        <h1>Diplomet hittades inte</h1>
        <Link href="/">Till startsidan</Link>
      </main>
    );
  }
  if (!LIMITS.diploma) {
    return (
      <main className="page center">
        <p>Diplom är avstängda.</p>
      </main>
    );
  }
  const row = ranking(db, huntId).find((r) => r.teamId === teamId)!;
  const backHref = isMember ? `/play/${huntId}` : `/hunt/${huntId}/results`;
  return (
    <main className="page">
      <div className="row no-print" style={{ marginBottom: 16 }}>
        <Link href={backHref} className="btn">
          ←
        </Link>
        <PrintButton label={`🖨️ ${t("print")}`} />
      </div>
      <Diploma
        huntName={hunt.name}
        teamName={team.name}
        individual={hunt.playMode === "individual"}
        avatarId={team.avatarId}
        photoUrl={team.photoUrl}
        score={row.stats.score}
        elapsedSeconds={row.elapsedSeconds}
        place={hunt.status === "finished" ? row.place : null}
        date={team.finishedAt ?? hunt.finishedAt ?? new Date().toISOString()}
      />
    </main>
  );
}
