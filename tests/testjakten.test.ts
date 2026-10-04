// Kör testscenariot "Testjakten" genom spelmotorn, steg för steg enligt specen.

import { describe, expect, it } from "vitest";
import { createTestjakten } from "@/lib/demo";
import {
  answerQuestion,
  completeMission,
  continueAfterQuestions,
  finishHunt,
  pauseHunt,
  playContext,
  ranking,
  requestHelp,
  resumeHunt,
  scan,
  startHunt,
  teamStats,
} from "@/lib/game";
import { addCheckpoint, checkpointsOf, createHunt, joinHunt, missionOf, questionsOf, teamsOf, treasureOf, updateHuntSettings, UserError, validateHunt } from "@/lib/hunts";
import { emptyDb, type Db } from "@/lib/types";

const T0 = new Date("2026-10-04T14:00:00Z");
const at = (min: number, sec = 0) => new Date(T0.getTime() + min * 60_000 + sec * 1000);

function setup() {
  const db = emptyDb();
  const hunt = createTestjakten(db, at(-60));
  return { db, hunt };
}

function joinTeam(db: Db, teamName: string, player: string) {
  const team = teamsOf(db, db.hunts[0].id).find((t) => t.name === teamName)!;
  return joinHunt(db, { kind: "existing", teamCode: team.joinCode, playerName: player }, at(-30)).participant;
}

const ctx = (db: Db, p: { id: string; token: string }, now: Date) => playContext(db, p.id, p.token, now);

/** Svarar på alla frågor vid aktuell kontrollpunkt. correctCount = hur många som ska bli rätt. */
function answerAll(db: Db, p: { id: string; token: string }, now: Date, correctCount = 3) {
  const c = ctx(db, p, now);
  const cp = checkpointsOf(db, c.hunt.id)[c.team.currentStep];
  questionsOf(db, cp.id).forEach((q, i) => {
    const pick = i < correctCount ? q.correctAnswer : (q.correctAnswer + 1) % q.alternatives.length;
    answerQuestion(db, ctx(db, p, now), q.id, pick, now);
  });
  continueAfterQuestions(db, ctx(db, p, now), now);
}

describe("Testjakten", () => {
  it("1–3: jakten skapas med QR-koder, frågor, uppdrag och placeringslista", () => {
    const { db, hunt } = setup();
    expect(hunt.name).toBe("Testjakten");
    expect(hunt.template).toBe("birthday");
    expect(hunt.gameMode).toBe("classic");
    expect(hunt.playMode).toBe("team");
    expect(hunt.startMode).toBe("staggered");
    expect(hunt.startIntervalMinutes).toBe(2);
    const cps = checkpointsOf(db, hunt.id);
    expect(cps).toHaveLength(3);
    const tokens = [...cps.map((c) => c.qrToken), treasureOf(db, hunt.id)!.qrToken];
    expect(new Set(tokens).size).toBe(4);
    for (const token of tokens) expect(token.length).toBeGreaterThanOrEqual(22); // 128 bitar
    for (const cp of cps) {
      expect(questionsOf(db, cp.id)).toHaveLength(3);
      expect(missionOf(db, cp.id)).not.toBeNull();
      expect(cp.hostPlacementNote).not.toBe("");
    }
    expect(teamsOf(db, hunt.id).map((t) => [t.name, t.avatarId])).toEqual([
      ["Rävarna", "foxes"],
      ["Ugglorna", "owls"],
    ]);
    expect(validateHunt(db, hunt.id).errors).toEqual([]);
  });

  it("4–15: hela spelet från start till diplom", () => {
    const { db, hunt } = setup();
    const fox = joinTeam(db, "Rävarna", "Alva");
    const owl = joinTeam(db, "Ugglorna", "Noah");
    const [cp1, cp2, cp3] = checkpointsOf(db, hunt.id);
    const treasure = treasureOf(db, hunt.id)!;

    // 5. Lagen startar med 2 minuters mellanrum.
    startHunt(db, hunt.id, { otherActiveHunts: 0 }, at(0));
    const [rav, ugg] = teamsOf(db, hunt.id);
    expect(rav.scheduledStartAt).toBe(at(0).toISOString());
    expect(ugg.scheduledStartAt).toBe(at(2).toISOString());
    expect(ctx(db, fox, at(0)).team.status).toBe("active");
    expect(ctx(db, owl, at(1)).team.status).toBe("waiting");

    // Scanning före starttid ger inga poäng.
    expect(scan(db, ctx(db, owl, at(1)), cp1.qrToken, at(1)).outcome).toBe("notStarted");

    // 6. Ugglorna aktiveras först vid sin egen starttid.
    expect(ctx(db, owl, at(2)).team.status).toBe("active");
    expect(ctx(db, owl, at(2)).team.actualStartAt).toBe(at(2).toISOString());

    // 11. Fel QR-kod ger inga poäng.
    const wrong = scan(db, ctx(db, fox, at(3)), cp2.qrToken, at(3));
    expect(wrong.outcome).toBe("wrongStep");
    expect(teamStats(db, hunt, rav.id).score).toBe(0);
    expect(scan(db, ctx(db, fox, at(3)), treasure.qrToken, at(3)).outcome).toBe("wrongStep");

    // 12. Hjälpknappen drar av en poäng (även flera gånger).
    requestHelp(db, ctx(db, fox, at(4)), at(4));
    expect(teamStats(db, hunt, rav.id).score).toBe(-1);

    // 7. Rätt QR låser upp frågor och ger 4 poäng.
    const found = scan(db, ctx(db, fox, at(5)), cp1.qrToken, at(5));
    expect(found).toMatchObject({ outcome: "checkpointFound", points: 4 });
    expect(ctx(db, fox, at(5)).team.phase).toBe("questions");
    // Samma kod igen ger inga extra poäng.
    expect(scan(db, ctx(db, fox, at(5)), cp1.qrToken, at(5)).outcome).toBe("alreadyFound");
    // Nästa kod innan frågorna är klara.
    expect(scan(db, ctx(db, fox, at(5)), cp2.qrToken, at(5)).outcome).toBe("finishStepFirst");

    // 8. Rätt svar ger poäng; ett svar kan bara skickas en gång.
    const q1 = questionsOf(db, cp1.id)[0];
    expect(answerQuestion(db, ctx(db, fox, at(6)), q1.id, q1.correctAnswer, at(6))).toMatchObject({ isCorrect: true, points: 1 });
    expect(answerQuestion(db, ctx(db, fox, at(6)), q1.id, q1.correctAnswer, at(6)).points).toBe(0);
    expect(() => continueAfterQuestions(db, ctx(db, fox, at(6)), at(6))).toThrow(UserError);
    const [, q2, q3] = questionsOf(db, cp1.id);
    answerQuestion(db, ctx(db, fox, at(6)), q2.id, q2.correctAnswer, at(6));
    answerQuestion(db, ctx(db, fox, at(6)), q3.id, (q3.correctAnswer + 1) % 3, at(6)); // fel svar
    continueAfterQuestions(db, ctx(db, fox, at(6)), at(6));
    expect(teamStats(db, hunt, rav.id).score).toBe(-1 + 4 + 2);

    // 9. Uppdrag markeras som klart.
    expect(ctx(db, fox, at(7)).team.phase).toBe("mission");
    completeMission(db, ctx(db, fox, at(7)), true, at(7));
    expect(teamStats(db, hunt, rav.id).score).toBe(-1 + 4 + 2 + 1);

    // 10. Nästa ledtråd visas.
    const afterFirst = ctx(db, fox, at(7)).team;
    expect(afterFirst.currentStep).toBe(1);
    expect(afterFirst.phase).toBe("seeking");

    // Paus stoppar scanning och klockan.
    pauseHunt(db, hunt.id, at(8));
    expect(scan(db, ctx(db, fox, at(9)), cp2.qrToken, at(9)).outcome).toBe("paused");
    resumeHunt(db, hunt.id, at(10));

    // Rävarna fortsätter genom kedjan.
    scan(db, ctx(db, fox, at(11)), cp2.qrToken, at(11));
    answerAll(db, fox, at(12));
    completeMission(db, ctx(db, fox, at(12)), true, at(12));
    scan(db, ctx(db, fox, at(13)), cp3.qrToken, at(13));
    answerAll(db, fox, at(14));
    completeMission(db, ctx(db, fox, at(14)), false, at(14)); // hoppar över sista uppdraget

    // 13. Skatten hittas.
    const t = scan(db, ctx(db, fox, at(20)), treasure.qrToken, at(20));
    expect(t).toMatchObject({ outcome: "treasureFound", points: 10 });
    const foxTeam = ctx(db, fox, at(20)).team;
    expect(foxTeam.status).toBe("finished");
    // 20 min sedan egen start minus 2 min paus.
    expect(foxTeam.elapsedSeconds).toBe(18 * 60);
    expect(teamStats(db, hunt, rav.id)).toMatchObject({
      checkpointsFound: 3,
      correctAnswers: 8,
      missionsCompleted: 2,
      hints: 1,
      treasureFound: true,
      score: 12 + 8 + 2 + 10 - 1,
    });

    // Ugglorna spelar hela kedjan utan hjälp och med alla rätt.
    for (const [i, cp] of [cp1, cp2, cp3].entries()) {
      scan(db, ctx(db, owl, at(15 + i)), cp.qrToken, at(15 + i));
      answerAll(db, owl, at(15 + i));
      completeMission(db, ctx(db, owl, at(15 + i)), true, at(15 + i));
    }
    scan(db, ctx(db, owl, at(21)), treasure.qrToken, at(21));
    expect(teamStats(db, hunt, ugg.id).score).toBe(12 + 9 + 3 + 10);
    // Ugglorna startade 14:02 och var klara 14:21 = 19 min minus paus 14:08–14:10.
    expect(ctx(db, owl, at(21)).team.elapsedSeconds).toBe(17 * 60);

    // 14. Vinnare utses (flest poäng).
    finishHunt(db, hunt.id, at(25));
    const rows = ranking(db, hunt.id, at(25));
    expect(rows.map((r) => [r.name, r.place, r.stats.score])).toEqual([
      ["Ugglorna", 1, 34],
      ["Rävarna", 2, 31],
    ]);
  });

  it("snabbast vinner räknar tid från lagets egen starttid", () => {
    const { db, hunt } = setup();
    hunt.winMode = "fastest";
    const fox = joinTeam(db, "Rävarna", "Alva");
    const owl = joinTeam(db, "Ugglorna", "Noah");
    startHunt(db, hunt.id, { otherActiveHunts: 0 }, at(0));
    const cps = checkpointsOf(db, hunt.id);
    const treasure = treasureOf(db, hunt.id)!;
    const play = (p: typeof fox, finishMin: number) => {
      for (const cp of cps) {
        const now = at(finishMin - 1);
        scan(db, ctx(db, p, now), cp.qrToken, now);
        answerAll(db, p, now, 0);
        completeMission(db, ctx(db, p, now), false, now);
      }
      scan(db, ctx(db, p, at(finishMin)), treasure.qrToken, at(finishMin));
    };
    play(fox, 32); // startade 14:00, klar 14:32 → 32 min
    play(owl, 33); // startade 14:02, klar 14:33 → 31 min
    const rows = ranking(db, hunt.id, at(40));
    expect(rows[0].name).toBe("Ugglorna");
    expect(rows[0].elapsedSeconds).toBe(31 * 60);
    expect(rows[1].elapsedSeconds).toBe(32 * 60);
  });

  it("allt är gratis: mallar, spellägen, lagbild och fler ledtrådar", () => {
    const db = emptyDb();
    const hunt = createHunt(db, {
      name: "Kalas",
      description: "",
      template: "birthday",
      gameMode: "calm",
      playMode: "team",
      ageGroup: "child",
      themes: [],
      difficulty: "easy",
      clueCount: 10,
      winMode: "points",
      startMode: "simultaneous",
      startIntervalMinutes: 2,
      allowPhotos: true,
    });
    expect(checkpointsOf(db, hunt.id)).toHaveLength(10);
    expect(hunt.gameMode).toBe("calm");
    expect(hunt.template).toBe("birthday");
    expect(hunt.allowPhotos).toBe(true);
    addCheckpoint(db, hunt.id);
    expect(checkpointsOf(db, hunt.id)).toHaveLength(11);
    for (const name of ["A", "B", "C"]) joinHunt(db, { kind: "new", huntCode: hunt.joinCode, name });
  });

  it("gamla jakter som sparats som gratis får allt", () => {
    const db = emptyDb();
    const hunt = createHunt(db, {
      name: "Gammal",
      description: "",
      template: "none",
      gameMode: "classic",
      playMode: "team",
      ageGroup: "child",
      themes: [],
      difficulty: "easy",
      clueCount: 3,
      winMode: "points",
      startMode: "simultaneous",
      startIntervalMinutes: 2,
      allowPhotos: false,
    });
    Object.assign(hunt, { plan: "free", maxClues: 3 });
    addCheckpoint(db, hunt.id);
    expect(checkpointsOf(db, hunt.id)).toHaveLength(4);
    for (const name of ["A", "B", "C"]) joinHunt(db, { kind: "new", huntCode: hunt.joinCode, name });
    updateHuntSettings(db, hunt.id, { gameMode: "teamBattle", allowPhotos: true });
    expect(hunt.gameMode).toBe("teamBattle");
    expect(hunt.allowPhotos).toBe(true);
  });
});
