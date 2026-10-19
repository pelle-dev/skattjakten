// Statistik över hur Skattjakten används, för statistiksidan (/statistik).
// Testjakter räknas för sig. Gamla jakter raderas efter 90 dagar (se cleanup.ts),
// så siffrorna gäller bara jakter som finns kvar.

import type { Db } from "./types";

export const STATS_WEEKS = 12;

export interface Stats {
  huntsCreated: number;
  huntsStarted: number;
  huntsFinished: number;
  demoHunts: number;
  teams: number;
  participants: number;
  /** Nya jakter per vecka (måndag–söndag), nyaste veckan först. */
  weeks: { weekStart: string; created: number; started: number }[];
}

/** Måndagen i veckan som tiden ligger i (UTC), som "ÅÅÅÅ-MM-DD". */
function weekStart(time: number): string {
  const d = new Date(time);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function computeStats(db: Db, now = new Date()): Stats {
  const real = db.hunts.filter((h) => !h.isDemo);
  const realIds = new Set(real.map((h) => h.id));

  const weeks: Stats["weeks"] = [];
  const byWeek = new Map<string, Stats["weeks"][number]>();
  for (let i = 0; i < STATS_WEEKS; i++) {
    const w = { weekStart: weekStart(now.getTime() - i * 7 * 86_400_000), created: 0, started: 0 };
    weeks.push(w);
    byWeek.set(w.weekStart, w);
  }
  for (const h of real) {
    const created = byWeek.get(weekStart(Date.parse(h.createdAt)));
    if (created) created.created += 1;
    const started = h.startedAt ? byWeek.get(weekStart(Date.parse(h.startedAt))) : undefined;
    if (started) started.started += 1;
  }

  return {
    huntsCreated: real.length,
    huntsStarted: real.filter((h) => h.startedAt).length,
    huntsFinished: real.filter((h) => h.status === "finished").length,
    demoHunts: db.hunts.length - real.length,
    teams: db.teams.filter((t) => realIds.has(t.huntId)).length,
    participants: db.participants.filter((p) => realIds.has(p.huntId)).length,
    weeks,
  };
}
