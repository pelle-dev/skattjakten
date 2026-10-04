"use client";

import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AvatarPicker } from "@/components/AvatarPicker";
import { useToast } from "@/components/Toast";
import { TEAM_AVATARS } from "@/lib/catalog";
import { addTeamAction, removeTeamAction } from "../../../actions/host";
import { useHostBundle } from "../useHostBundle";

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) : "–");

export default function TeamsPage() {
  const { id } = useParams<{ id: string }>();
  const { bundle, reload } = useHostBundle(id);
  const toast = useToast();
  const [name, setName] = useState("");
  const [look, setLook] = useState<{ avatarId: string | null; photoUrl: string | null }>({ avatarId: "foxes", photoUrl: null });
  const [joinQr, setJoinQr] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (!bundle) return;
    setOrigin(window.location.origin);
    QRCode.toDataURL(`${window.location.origin}/join/${bundle.hunt.joinCode}`, { margin: 1, width: 360 }).then(setJoinQr);
  }, [bundle]);

  if (!bundle) return <p className="muted">Laddar…</p>;
  const h = bundle.hunt;
  const isTeam = h.playMode === "team";
  const full = bundle.teams.length >= bundle.limits.maxTeams;

  return (
    <div className="grid2" style={{ alignItems: "start" }}>
      <section className="card">
        <h2>{isTeam ? "Lag" : "Deltagare"}</h2>
        <p className="muted small">
          {h.startMode === "staggered"
            ? `Startordning: lagen startar i den här ordningen med ${h.startIntervalMinutes} minuters mellanrum.`
            : "Alla startar samtidigt."}{" "}
          Max {bundle.limits.maxTeams} i {h.plan === "free" ? "gratisläget" : "den här planen"}.
        </p>
        {bundle.teams.length === 0 && <p className="muted">Inga ännu. Lägg till här eller låt deltagarna gå med med koden.</p>}
        <div className="stack">
          {bundle.teams.map((team, i) => (
            <div key={team.id} className="cp-item" style={{ cursor: "default" }}>
              <span className="muted" style={{ width: 18 }}>
                {i + 1}.
              </span>
              <Avatar avatarId={team.avatarId} photoUrl={team.photoUrl} size={44} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{team.name}</strong>
                <br />
                <span className="muted small">
                  {isTeam && <>Lagkod {team.joinCode} · </>}
                  {team.participants.length ? team.participants.map((p) => p.name).join(", ") : "ingen mobil ansluten än"}
                  {team.scheduledStartAt && <> · start {time(team.scheduledStartAt)}</>}
                </span>
              </span>
              {(h.status === "draft" || team.status === "waiting") && (
                <button
                  className="btn small danger"
                  onClick={async () => {
                    if (!confirm(`Ta bort ${team.name}?`)) return;
                    const res = await removeTeamAction(team.id);
                    if (!res.ok) toast.show(res.error);
                    reload();
                  }}
                >
                  Ta bort
                </button>
              )}
            </div>
          ))}
        </div>
        {isTeam && bundle.teams.length > 0 && (
          <p className="muted small" style={{ marginTop: 12 }}>
            Fler mobiler i samma lag kan gå med på startsidan med lagkoden.
          </p>
        )}
      </section>

      <div>
        <section className="card">
          <h2>Gå med via QR-kod</h2>
          <p className="small">Låt deltagarna scanna den här med mobilkameran, eller skriva in koden {h.joinCode} under ”Gå med”.</p>
          {joinQr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={joinQr} alt="QR-kod för att gå med" style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto" }} />
          )}
          <p className="center small muted">{origin}/join/{h.joinCode}</p>
        </section>

        {h.status !== "finished" && (
          <section className="card">
            <h2>Lägg till {isTeam ? "lag" : "deltagare"}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await addTeamAction(id, { name, ...look });
                if (!res.ok) return toast.show(res.error);
                setName("");
                reload();
              }}
            >
              <label className="field">
                <span>{isTeam ? "Lagnamn" : "Namn"}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={isTeam ? "T.ex. Rävarna" : "T.ex. Alva"} required />
              </label>
              <AvatarPicker
                kind={isTeam ? "team" : "person"}
                avatarId={look.avatarId}
                photoUrl={look.photoUrl}
                allowPhoto={h.allowPhotos && bundle.limits.photos}
                onChange={(v) => {
                  setLook(v);
                  const label = TEAM_AVATARS.find((a) => a.id === v.avatarId)?.label;
                  if (isTeam && !name && label) setName(label);
                }}
              />
              <button className="btn primary block" style={{ marginTop: 12 }} disabled={full}>
                {full ? "Fullt" : "Lägg till"}
              </button>
            </form>
          </section>
        )}
      </div>
      {toast.node}
    </div>
  );
}
