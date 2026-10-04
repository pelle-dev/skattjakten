"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AvatarPicker } from "@/components/AvatarPicker";
import { BrandSymbol } from "@/components/Brand";
import { TopBar } from "@/components/TopBar";
import { TEAM_AVATARS } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { joinAction, joinInfoAction } from "../../actions/play";

type Info = Extract<Awaited<ReturnType<typeof joinInfoAction>>, { ok: true }>["data"];

export function JoinForm({ code }: { code: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [look, setLook] = useState<{ avatarId: string | null; photoUrl: string | null }>({ avatarId: null, photoUrl: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    joinInfoAction(code).then((res) => {
      if (res.ok) {
        setInfo(res.data);
        if (res.data.team) {
          setMode("existing");
          setTeamCode(code);
        }
      } else setError(res.error);
    });
  }, [code]);

  if (error)
    return (
      <>
        <TopBar />
        <main className="page">
          <div className="card center">
            <p className="big">{error}</p>
            <a className="btn primary" href="/join">
              Skriv koden igen
            </a>
          </div>
        </main>
      </>
    );
  if (!info)
    return (
      <main className="page center loading">
        <BrandSymbol width={140} />
        <p className="muted">Hämtar skattjakten…</p>
      </main>
    );

  const isTeam = info.playMode === "team";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await joinAction(
      mode === "existing"
        ? { kind: "existing", teamCode, playerName }
        : { kind: "new", huntCode: code, name: isTeam ? teamName : playerName, playerName, ...look },
    );
    if (res.ok) router.push(`/play/${res.data.huntId}`);
    else {
      setError(null);
      alert(res.error);
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar />
      <main className="page">
        <section className="card gold center">
          <p className="muted" style={{ margin: 0 }}>
            {t("joinTitle")}
          </p>
          <h1 style={{ margin: "4px 0 0" }}>{info.name}</h1>
        </section>

        <form onSubmit={submit} className="card">
          {info.team ? (
            <div className="row" style={{ marginBottom: 16 }}>
              <Avatar avatarId={info.team.avatarId} size={56} />
              <div>
                <div className="muted small">{t("team")}</div>
                <strong className="big">{info.team.name}</strong>
              </div>
            </div>
          ) : (
            isTeam && (
              <div className="chips" style={{ marginBottom: 16 }}>
                <button type="button" className={`chip ${mode === "new" ? "on" : ""}`} onClick={() => setMode("new")}>
                  Nytt lag
                </button>
                <button type="button" className={`chip ${mode === "existing" ? "on" : ""}`} onClick={() => setMode("existing")}>
                  {t("joinExistingTeam")}
                </button>
              </div>
            )
          )}

          {mode === "existing" && !info.team && (
            <label className="field">
              <span>{t("teamCode")}</span>
              <input className="code-input" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} required maxLength={8} />
            </label>
          )}

          {mode === "new" && isTeam && (
            <label className="field">
              <span>{t("teamName")}</span>
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required maxLength={40} placeholder="T.ex. Rävarna" />
            </label>
          )}

          <label className="field">
            <span>{t("yourName")}</span>
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} required={!isTeam || mode === "existing"} maxLength={40} />
          </label>

          {mode === "new" && (
            <div className="field">
              <span style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>{t("chooseLook")}</span>
              <AvatarPicker
                kind={isTeam ? "team" : "person"}
                avatarId={look.avatarId}
                photoUrl={look.photoUrl}
                allowPhoto={info.allowPhotos}
                onChange={(v) => {
                  setLook(v);
                  const label = TEAM_AVATARS.find((a) => a.id === v.avatarId)?.label;
                  if (isTeam && !teamName && label) setTeamName(label);
                }}
              />
            </div>
          )}

          <button className="btn primary huge" disabled={busy} style={{ marginTop: 12 }}>
            {t("start")}
          </button>
        </form>
      </main>
    </>
  );
}
