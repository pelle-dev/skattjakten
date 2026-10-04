"use server";

// Serverfunktioner för deltagarna. Identifieras med cookie (inget konto behövs).

import { answerQuestion, completeMission, continueAfterQuestions, playContext, requestHelp, scan, type ScanResult } from "@/lib/game";
import { findHuntByCode, findTeamByCode, joinHunt, updateTeam, UserError, type JoinInput } from "@/lib/hunts";
import { checkLook, limitSize, rateLimit, requireStrings } from "@/lib/guard";
import { run } from "@/lib/result";
import { playerCredentials, setPlayerCookie } from "@/lib/session";
import { mutate, readDb } from "@/lib/store";
import type { Db } from "@/lib/types";
import { buildPlayState, type PlayState } from "@/lib/views";

/** Kör en handling för inloggad deltagare och returnerar nytt spelläge. */
async function asPlayer<T>(huntId: string, fn: (db: Db, ctx: ReturnType<typeof playContext>, now: Date) => T) {
  const creds = await playerCredentials(huntId);
  if (!creds) throw new UserError("Du är inte med i den här skattjakten ännu.");
  const now = new Date();
  return mutate((db) => {
    const ctx = playContext(db, creds.id, creds.token, now);
    if (ctx.hunt.id !== huntId) throw new UserError("Du är inte med i den här skattjakten.");
    const result = fn(db, ctx, now);
    return { result, state: buildPlayState(db, ctx, now) };
  });
}

/** Information inför att gå med (namn, lag- eller individuellt spel). */
export async function joinInfoAction(code: string) {
  return run(async () => {
    requireStrings(code);
    limitSize(code, 100);
    await rateLimit("joinInfo");
    const db = await readDb();
    const team = findTeamByCode(db, code);
    const hunt = team ? db.hunts.find((h) => h.id === team.huntId) : findHuntByCode(db, code);
    if (!hunt) throw new UserError("Hittade ingen skattjakt med den koden. Kolla att den är rätt skriven.");
    if (hunt.status === "finished") throw new UserError("Den här skattjakten är redan avslutad.");
    return {
      huntId: hunt.id,
      name: hunt.name,
      playMode: hunt.playMode,
      allowPhotos: hunt.allowPhotos && hunt.plan === "paid",
      team: team ? { name: team.name, avatarId: team.avatarId } : null,
    };
  });
}

export async function joinAction(input: JoinInput) {
  return run(async () => {
    if (input.kind === "new") checkLook(input);
    limitSize({ ...input, photoUrl: null }, 1000);
    await rateLimit("join");
    const { hunt, participant } = await mutate((db) => joinHunt(db, input));
    await setPlayerCookie(hunt.id, participant.id, participant.token);
    return { huntId: hunt.id };
  });
}

export async function playStateAction(huntId: string) {
  return run(async () => (await asPlayer(huntId, () => null)).state);
}

export async function scanAction(huntId: string, token: string): Promise<
  { ok: true; data: { result: ScanResult; state: PlayState } } | { ok: false; error: string }
> {
  return run(() => {
    requireStrings(token);
    limitSize(token, 200);
    return asPlayer(huntId, (db, ctx, now) => scan(db, ctx, token.trim(), now));
  });
}

export async function answerAction(huntId: string, questionId: string, selected: number) {
  return run(() => asPlayer(huntId, (db, ctx, now) => answerQuestion(db, ctx, questionId, selected, now)));
}

export async function continueAction(huntId: string) {
  return run(() => asPlayer(huntId, (db, ctx, now) => continueAfterQuestions(db, ctx, now)));
}

export async function missionAction(huntId: string, completed: boolean) {
  return run(() => asPlayer(huntId, (db, ctx, now) => completeMission(db, ctx, completed, now)));
}

export async function helpAction(huntId: string) {
  return run(() => asPlayer(huntId, (db, ctx, now) => requestHelp(db, ctx, now)));
}

export async function updateLookAction(huntId: string, look: { avatarId?: string | null; photoUrl?: string | null }) {
  return run(() => {
    checkLook(look);
    return asPlayer(huntId, (db, ctx) => void updateTeam(db, ctx.team.id, { avatarId: look.avatarId, photoUrl: look.photoUrl }));
  });
}
