import { avatarById } from "@/lib/catalog";

export function Avatar({ avatarId, photoUrl, size = 48, name }: { avatarId?: string | null; photoUrl?: string | null; size?: number; name?: string }) {
  const avatar = avatarById(avatarId);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.55, background: avatar?.color ?? undefined }} aria-label={name}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name ?? ""} />
      ) : avatar ? (
        avatar.emoji
      ) : (
        "🧭"
      )}
    </span>
  );
}
