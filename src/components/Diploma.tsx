import { formatDuration, t } from "@/lib/i18n";
import { Avatar } from "./Avatar";
import { BrandSymbol, Logo } from "./Brand";

export function Diploma({
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
      <Logo width={220} />
      <div className="diploma-label">{t("diploma")}</div>
      <div style={{ margin: "20px 0 8px" }}>
        <Avatar avatarId={avatarId} photoUrl={photoUrl} size={120} name={teamName} />
      </div>
      <div className="diploma-name">{teamName}</div>
      <div className="title">{t(individual ? "diplomaTextSingle" : "diplomaText")}</div>
      <div className="big" style={{ marginBottom: 18 }}>
        {huntName}
      </div>
      <div className="row" style={{ justifyContent: "center", gap: 28, fontSize: "1.1rem" }}>
        <div>
          <div className="muted small">{t("score")}</div>
          <strong style={{ fontSize: "1.6rem" }}>{score}</strong>
        </div>
        <div>
          <div className="muted small">{t("time")}</div>
          <strong style={{ fontSize: "1.6rem" }}>{formatDuration(elapsedSeconds)}</strong>
        </div>
        {place != null && (
          <div>
            <div className="muted small">{t("place")}</div>
            <strong style={{ fontSize: "1.6rem" }}>{place === 1 ? "🏆 1" : place}</strong>
          </div>
        )}
      </div>
      <p className="muted" style={{ marginTop: 22 }}>
        {t("date")}: {new Date(date).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" })}
      </p>
      <BrandSymbol width={150} />
    </div>
  );
}
