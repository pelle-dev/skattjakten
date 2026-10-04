"use client";

import { useRef, useState } from "react";
import { PERSON_AVATARS, TEAM_AVATARS } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { Avatar } from "./Avatar";

/** Gör bilden liten och kvadratisk innan den skickas, så att den inte tar plats i onödan. */
async function shrinkImage(file: File, size = 320): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarPicker({
  kind,
  avatarId,
  photoUrl,
  allowPhoto,
  onChange,
}: {
  kind: "team" | "person";
  avatarId: string | null;
  photoUrl: string | null;
  allowPhoto: boolean;
  onChange: (v: { avatarId: string | null; photoUrl: string | null }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const list = kind === "team" ? TEAM_AVATARS : PERSON_AVATARS;

  return (
    <div className="stack">
      <div className="avatar-grid">
        {list.map((a) => (
          <button
            type="button"
            key={a.id}
            className={`avatar-option ${!photoUrl && avatarId === a.id ? "on" : ""}`}
            onClick={() => onChange({ avatarId: a.id, photoUrl: null })}
          >
            <Avatar avatarId={a.id} size={44} />
            {a.label}
          </button>
        ))}
      </div>
      {allowPhoto && (
        <div className="row">
          {photoUrl && <Avatar photoUrl={photoUrl} size={64} />}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                onChange({ avatarId, photoUrl: await shrinkImage(file) });
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
          <button type="button" className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
            📷 {t("choosePhoto")}
          </button>
          {photoUrl && (
            <button type="button" className="btn ghost small" onClick={() => onChange({ avatarId, photoUrl: null })}>
              {t("removePhoto")}
            </button>
          )}
        </div>
      )}
      {allowPhoto && <p className="muted small">{t("photoPrivate")}</p>}
      <button type="button" className="btn ghost small" onClick={() => onChange({ avatarId: null, photoUrl: null })}>
        {t("skip")}
      </button>
    </div>
  );
}
