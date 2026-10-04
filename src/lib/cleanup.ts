// Automatisk radering: en skattjakt med alla lag, namn, bilder och svar tas bort
// 90 dagar efter senaste aktivitet (för en avslutad jakt: 90 dagar efter att den avslutades).

import type { Db } from "./types";

export const RETENTION_DAYS = 90;

type Row = { huntId?: string; createdAt?: string; updatedAt?: string };

/** Raderar gamla jakter och allt som hör till dem. Returnerar antalet raderade jakter. */
export function purgeOldHunts(db: Db, now = new Date()): number {
  const last = new Map<string, number>();
  const touch = (huntId: string | undefined, ...dates: (string | null | undefined)[]) => {
    if (!huntId) return;
    for (const d of dates) {
      const t = d ? Date.parse(d) : NaN;
      if (!Number.isNaN(t) && t > (last.get(huntId) ?? 0)) last.set(huntId, t);
    }
  };
  for (const h of db.hunts) touch(h.id, h.createdAt, h.startedAt, h.finishedAt);
  const tables = Object.entries(db).filter(([key, rows]) => key !== "hunts" && Array.isArray(rows)) as [keyof Db, Row[]][];
  for (const [, rows] of tables) for (const r of rows) touch(r.huntId, r.createdAt, r.updatedAt);

  const cutoff = now.getTime() - RETENTION_DAYS * 86_400_000;
  const expired = new Set(db.hunts.filter((h) => (last.get(h.id) ?? 0) < cutoff).map((h) => h.id));
  if (!expired.size) return 0;
  db.hunts = db.hunts.filter((h) => !expired.has(h.id));
  for (const [key, rows] of tables) (db as unknown as Record<string, Row[]>)[key] = rows.filter((r) => !r.huntId || !expired.has(r.huntId));
  return expired.size;
}
