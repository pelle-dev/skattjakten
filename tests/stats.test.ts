// Statistiksidan och besöksstatistiken.

import { describe, expect, it } from "vitest";
import { anonymizePath } from "@/components/WebAnalytics";
import { createTestjakten } from "@/lib/demo";
import { startHunt } from "@/lib/game";
import { computeStats } from "@/lib/stats";
import { emptyDb } from "@/lib/types";

const NOW = new Date("2026-10-19T08:00:00Z"); // en måndag

describe("computeStats", () => {
  it("räknar riktiga jakter per vecka och testjakter för sig", () => {
    const db = emptyDb();
    createTestjakten(db, new Date("2026-10-18T10:00:00Z"));
    const a = createTestjakten(db, new Date("2026-10-12T10:00:00Z"));
    a.isDemo = false;
    startHunt(db, a.id, { otherActiveHunts: 0 }, new Date("2026-10-19T07:00:00Z"));
    const b = createTestjakten(db, new Date("2026-10-19T07:30:00Z"));
    b.isDemo = false;

    const s = computeStats(db, NOW);
    expect(s.huntsCreated).toBe(2);
    expect(s.huntsStarted).toBe(1);
    expect(s.huntsFinished).toBe(0);
    expect(s.demoHunts).toBe(1);
    expect(s.teams).toBe(db.teams.filter((t) => t.huntId !== db.hunts[0].id).length);
    expect(s.weeks).toHaveLength(12);
    expect(s.weeks[0]).toEqual({ weekStart: "2026-10-19", created: 1, started: 1 });
    expect(s.weeks[1]).toEqual({ weekStart: "2026-10-12", created: 1, started: 0 });
  });
});

describe("anonymizePath", () => {
  it("tar bort hemliga koder ur adresserna", () => {
    expect(anonymizePath("/")).toBe("/");
    expect(anonymizePath("/create")).toBe("/create");
    expect(anonymizePath("/join")).toBe("/join");
    expect(anonymizePath("/join/ABC123")).toBe("/join/[kod]");
    expect(anonymizePath("/s/hemligtoken")).toBe("/s/[kod]");
    expect(anonymizePath("/hunt/abc/teams")).toBe("/hunt/[id]/teams");
    expect(anonymizePath("/play/abc")).toBe("/play/[id]");
    expect(anonymizePath("/diploma/abc/def")).toBe("/diploma/[id]");
    expect(anonymizePath("/statistik")).toBeNull();
  });
});
