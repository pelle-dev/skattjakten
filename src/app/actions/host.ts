"use server";

// Serverfunktioner för skattgömmaren. Alla kontrollerar att webbläsaren har jaktens värdnyckel.

import { aiMode, generateQuestions, suggestClue, suggestHelp } from "@/lib/ai";
import { QUESTIONS_PER_CHECKPOINT, templateById } from "@/lib/catalog";
import { createTestjakten } from "@/lib/demo";
import { finishHunt, pauseHunt, resumeHunt, scan, startHunt, syncTeams } from "@/lib/game";
import {
  addCheckpoint,
  addTeam,
  createHunt,
  deleteQuestion,
  getHunt,
  moveCheckpoint,
  questionsOf,
  removeCheckpoint,
  removeTeam,
  saveQuestion,
  setMission,
  setQuestionApproved,
  updateCheckpoint,
  updateHuntSettings,
  updateTeam,
  updateTreasure,
  useAiQuota,
  UserError,
  type CheckpointPatch,
  type HuntInput,
  type HuntSettingsPatch,
  type QuestionInput,
  type TeamInput,
  type TreasurePatch,
} from "@/lib/hunts";
import { run } from "@/lib/result";
import { isHost, otherActiveHunts, setHostCookie } from "@/lib/session";
import { mutate, readDb } from "@/lib/store";
import type { Db, Difficulty, Hunt } from "@/lib/types";
import { buildDashboard, buildHostBundle } from "@/lib/views";

async function assertHost(hunt: Hunt) {
  if (!(await isHost(hunt))) throw new UserError("Du har inte behörighet till den här skattjakten.");
}

/** Hämtar jakten för ett objekt (jakt, ledtråd, fråga eller lag) och kontrollerar behörighet. */
async function hostFor(kind: "hunt" | "checkpoint" | "question" | "team", id: string): Promise<Hunt> {
  const db = await readDb();
  const huntId =
    kind === "hunt"
      ? id
      : kind === "checkpoint"
        ? db.checkpoints.find((c) => c.id === id)?.huntId
        : kind === "question"
          ? db.questions.find((q) => q.id === id)?.huntId
          : db.teams.find((t) => t.id === id)?.huntId;
  if (!huntId) throw new UserError("Hittade inte det du letade efter.");
  const hunt = getHunt(db, huntId);
  await assertHost(hunt);
  return hunt;
}

const hostMutate = async <T,>(kind: Parameters<typeof hostFor>[0], id: string, fn: (db: Db) => T) => {
  await hostFor(kind, id);
  return mutate(fn);
};

// ---------------------------------------------------------------------------

export async function createHuntAction(input: HuntInput) {
  return run(async () => {
    const hunt = await mutate((db) => createHunt(db, input));
    await setHostCookie(hunt);
    return { id: hunt.id };
  });
}

export async function createDemoAction() {
  return run(async () => {
    const hunt = await mutate((db) => createTestjakten(db));
    await setHostCookie(hunt);
    return { id: hunt.id };
  });
}

export async function hostBundleAction(huntId: string) {
  return run(async () => {
    await hostFor("hunt", huntId);
    const db = await readDb();
    return buildHostBundle(db, getHunt(db, huntId), aiMode());
  });
}

export async function updateSettingsAction(huntId: string, patch: HuntSettingsPatch) {
  return run(() => hostMutate("hunt", huntId, (db) => void updateHuntSettings(db, huntId, patch)));
}

// Ledtrådar ------------------------------------------------------------------

export async function addCheckpointAction(huntId: string) {
  return run(() => hostMutate("hunt", huntId, (db) => addCheckpoint(db, huntId).id));
}

export async function removeCheckpointAction(checkpointId: string) {
  return run(() => hostMutate("checkpoint", checkpointId, (db) => removeCheckpoint(db, checkpointId)));
}

export async function moveCheckpointAction(checkpointId: string, direction: -1 | 1) {
  return run(() => hostMutate("checkpoint", checkpointId, (db) => moveCheckpoint(db, checkpointId, direction)));
}

export async function updateCheckpointAction(checkpointId: string, patch: CheckpointPatch) {
  return run(() => hostMutate("checkpoint", checkpointId, (db) => void updateCheckpoint(db, checkpointId, patch)));
}

export async function updateTreasureAction(huntId: string, patch: TreasurePatch) {
  return run(() => hostMutate("hunt", huntId, (db) => void updateTreasure(db, huntId, patch)));
}

// Frågor och uppdrag -----------------------------------------------------------

export async function saveQuestionAction(checkpointId: string, input: QuestionInput) {
  return run(() => hostMutate("checkpoint", checkpointId, (db) => saveQuestion(db, checkpointId, input).id));
}

export async function deleteQuestionAction(questionId: string) {
  return run(() => hostMutate("question", questionId, (db) => deleteQuestion(db, questionId)));
}

export async function approveQuestionAction(questionId: string, approved: boolean) {
  return run(() => hostMutate("question", questionId, (db) => void setQuestionApproved(db, questionId, approved)));
}

export async function setMissionAction(checkpointId: string, text: string | null) {
  return run(() => hostMutate("checkpoint", checkpointId, (db) => void setMission(db, checkpointId, text)));
}

// AI ---------------------------------------------------------------------------

export async function aiClueAction(huntId: string, req: { placementNote: string; difficulty: Difficulty; previous?: string; variant?: number }) {
  return run(async () => {
    const hunt = await hostFor("hunt", huntId);
    if (!req.placementNote.trim()) throw new UserError("Skriv först var QR-koden ska placeras.");
    await mutate((db) => useAiQuota(db, huntId));
    try {
      return await suggestClue({ ...req, language: hunt.language, ageGroup: hunt.ageGroup, themes: hunt.themes });
    } catch (err) {
      console.error(err);
      throw new UserError("AI-förslaget misslyckades. Försök igen eller skriv en egen ledtråd.");
    }
  });
}

export async function aiHelpAction(huntId: string, req: { placementNote: string; clue: string }) {
  return run(async () => {
    const hunt = await hostFor("hunt", huntId);
    await mutate((db) => useAiQuota(db, huntId));
    try {
      return await suggestHelp({ ...req, language: hunt.language });
    } catch (err) {
      console.error(err);
      throw new UserError("AI-förslaget misslyckades. Försök igen eller skriv en egen hjälptext.");
    }
  });
}

/** Skapar AI-frågor för de lediga platserna (eller ersätter en fråga). Frågorna måste godkännas. */
export async function aiQuestionsAction(checkpointId: string, replaceQuestionId?: string) {
  return run(async () => {
    const hunt = await hostFor("checkpoint", checkpointId);
    if (hunt.status !== "draft") throw new UserError("Frågor kan bara ändras innan skattjakten startar.");
    const db = await readDb();
    const cp = db.checkpoints.find((c) => c.id === checkpointId)!;
    const existing = questionsOf(db, checkpointId);
    const count = replaceQuestionId ? 1 : QUESTIONS_PER_CHECKPOINT - existing.length;
    if (count <= 0) throw new UserError("Ledtråden har redan tre frågor. Ta bort en eller byt ut en fråga.");
    await mutate((d) => useAiQuota(d, hunt.id));
    const avoid = db.questions.filter((q) => q.huntId === hunt.id).map((q) => q.questionText);
    let generated;
    try {
      generated = await generateQuestions({
        count,
        language: hunt.language,
        ageGroup: hunt.ageGroup,
        themes: hunt.themes,
        focus: templateById(hunt.template).focus,
        difficulty: cp.difficulty,
        gameMode: hunt.gameMode,
        clue: cp.publicClueText,
        avoid,
      });
    } catch (err) {
      console.error(err);
      throw new UserError("Det gick inte att skapa frågor just nu. Försök igen.");
    }
    if (!generated.length) throw new UserError("Det gick inte att skapa fler frågor. Skriv en egen fråga.");
    await mutate((d) => {
      if (replaceQuestionId) deleteQuestion(d, replaceQuestionId);
      for (const g of generated) saveQuestion(d, checkpointId, { ...g, generatedByAi: true });
    });
    return generated.length;
  });
}

// Lag --------------------------------------------------------------------------

export async function addTeamAction(huntId: string, input: TeamInput) {
  return run(() => hostMutate("hunt", huntId, (db) => addTeam(db, huntId, input).id));
}

export async function updateTeamAction(teamId: string, input: Partial<TeamInput>) {
  return run(() => hostMutate("team", teamId, (db) => void updateTeam(db, teamId, input)));
}

export async function removeTeamAction(teamId: string) {
  return run(() => hostMutate("team", teamId, (db) => removeTeam(db, teamId)));
}

// Kontrollpanel ----------------------------------------------------------------

export async function controlAction(huntId: string, op: "start" | "pause" | "resume" | "finish") {
  return run(async () => {
    await hostFor("hunt", huntId);
    const other = await otherActiveHunts(await readDb(), huntId);
    await mutate((db) => {
      if (op === "start") startHunt(db, huntId, { otherActiveHunts: other });
      if (op === "pause") pauseHunt(db, huntId);
      if (op === "resume") resumeHunt(db, huntId);
      if (op === "finish") finishHunt(db, huntId);
    });
  });
}

export async function dashboardAction(huntId: string) {
  return run(async () => {
    await hostFor("hunt", huntId);
    const now = new Date();
    return mutate((db) => {
      const hunt = getHunt(db, huntId);
      syncTeams(db, hunt, now);
      return buildDashboard(db, hunt, now);
    });
  });
}

/** Testläge: skattgömmaren låtsas att ett lag scannar en kod. */
export async function simulateScanAction(huntId: string, teamId: string, token: string) {
  return run(async () => {
    await hostFor("hunt", huntId);
    const now = new Date();
    return mutate((db) => {
      const hunt = getHunt(db, huntId);
      const team = db.teams.find((t) => t.id === teamId && t.huntId === huntId);
      if (!team) throw new UserError("Välj ett lag.");
      syncTeams(db, hunt, now);
      return scan(db, { hunt, team, participant: null }, token, now);
    });
  });
}
