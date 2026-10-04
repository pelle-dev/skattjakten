import { formatDuration, t } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { Avatar } from "./Avatar";

export function Diploma({
  lang,
  brandName,
  huntName,
  teamName,
  individual,
  avatarId,
  photoUrl,
  score,
  elapsedSeconds,
  place,
  date,
}: {
  lang: Language;
  brandName: string;
  huntName: string;
  teamName: string;
  individual: boolean;
  avatarId: string | null;
  photoUrl: string | null;
  score: number;
  elapsedSeconds: number | null;
  place: number | null;
  date: string;
}) {
  return (
    <div className="diploma">
      <div style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        🗺️ {brandName} · {t(lang, "diploma")}
      </div>
      <div style={{ margin: "20px 0 8px" }}>
        <Avatar avatarId={avatarId} photoUrl={photoUrl} size={120} name={teamName} />
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 900 }}>{teamName}</div>
      <div className="title">{t(lang, individual ? "diplomaTextSingle" : "diplomaText")}</div>
      <div className="big" style={{ marginBottom: 18 }}>
        {huntName}
      </div>
      <div className="row" style={{ justifyContent: "center", gap: 28, fontSize: "1.1rem" }}>
        <div>
          <div className="muted small">{t(lang, "score")}</div>
          <strong style={{ fontSize: "1.6rem" }}>{score}</strong>
        </div>
        <div>
          <div className="muted small">{t(lang, "time")}</div>
          <strong style={{ fontSize: "1.6rem" }}>{formatDuration(elapsedSeconds)}</strong>
        </div>
        {place != null && (
          <div>
            <div className="muted small">{t(lang, "place")}</div>
            <strong style={{ fontSize: "1.6rem" }}>{place === 1 ? "🏆 1" : place}</strong>
          </div>
        )}
      </div>
      <p className="muted" style={{ marginTop: 22 }}>
        {t(lang, "date")}: {new Date(date).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-GB", { year: "numeric", month: "long", day: "numeric" })}
      </p>
      <div style={{ fontSize: "2.4rem" }}>⭐ 💎 ⭐</div>
    </div>
  );
}
