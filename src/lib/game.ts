// Spelmotorn: start, scanning, frågor, uppdrag, hjälp, poäng, tid och resultat.
// Alla funktioner tar emot "now" så att tidsberoende regler går att testa.

import { PLAN_LIMITS } from "./catalog";
import { checkpointsOf, getHunt, limitsOf, missionOf, questionsOf, teamsOf, treasureOf, UserError, validateHunt } from "./hunts";
import { newId } from "./ids";
import type { Db, Hunt, Participant, Team } from "./types";

const iso = (d: Date) => d.toISOString();
const ms = (s: string | null) => (s ? Date.parse(s) : NaN);

// ---------------------------------------------------------------------------
// Tid

/** Sekunder mellan from och to, minus tid då jakten var pausad. */
export function activeSeconds(hunt: Hunt, fromIso: string, to: Date): number {
  const from = Date.parse(fromIso);
  const end = to.getTime();
  if (end <= from) return 0;
  let paused = 0;
  for (const p of hunt.pauses) {
    const pFrom = Date.parse(p.from);
    const pTo = p.to ? Date.parse(p.to) : end;
    const overlap = Math.min(end, pTo) - Math.max(from, pFrom);
    if (overlap > 0) paused += overlap;
  }
  return Math.max(0, Math.round((end - from - paused) / 1000));
}

export function teamElapsed(hunt: Hunt, team: Team, now: Date): number | null {
  if (!team.actualStartAt) return null;
  const end = team.finishedAt ? new Date(team.finishedAt) : hunt.finishedAt ? new Date(hunt.finishedAt) : now;
  return activeSeconds(hunt, team.actualStartAt, end);
}

// ---------------------------------------------------------------------------
// Poäng – räknas alltid fram ur loggade händelser.

export interface TeamStats {
  checkpointsFound: number;
  correctAnswers: number;
  answers: number;
  missionsCompleted: number;
  hints: number;
  treasureFound: boolean;
  score: number;
}

export function teamStats(db: Db, hunt: Hunt, teamId: string): TeamStats {
  const scans = db.scanEvents.filter((e) => e.teamId === teamId && e.isCorrectStep);
  const checkpointsFound = new Set(scans.filter((e) => e.scanType === "checkpoint").map((e) => e.checkpointId)).size;
  const treasureFound = scans.some((e) => e.scanType === "treasure");
  const answers = db.answers.filter((a) => a.teamId === teamId);
  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  const completions = db.missionCompletions.filter((m) => m.teamId === teamId && m.completed);
  const missionPoints = completions.reduce(
    (sum, c) => sum + (db.missions.find((m) => m.id === c.missionId)?.points ?? hunt.scoring.missionCompleted),
    0,
  );
  const hints = db.hintRequests.filter((h) => h.teamId === teamId);
  const s = hunt.scoring;
  const score =
    checkpointsFound * s.checkpointFound +
    correctAnswers * s.correctAnswer +
    missionPoints +
    (treasureFound ? s.treasureFound : 0) -
    hints.reduce((sum, h) => sum + h.pointsPenalty, 0);
  return {
    checkpointsFound,
    correctAnswers,
    answers: answers.length,
    missionsCompleted: completions.length,
    hints: hints.length,
    treasureFound,
    score,
  };
}

export function maxScore(db: Db, hunt: Hunt) {
  const cps = checkpointsOf(db, hunt.id);
  const s = hunt.scoring;
  return cps.reduce(
    (sum, cp) =>
      sum + s.checkpointFound + questionsOf(db, cp.id).length * s.correctAnswer + (missionOf(db, cp.id)?.points ?? 0),
    s.treasureFound,
  );
}

// ---------------------------------------------------------------------------
// Start, paus, avslut

/** Uppdaterar lagens status utifrån klockan (väntar → aktiv när starttiden är nådd). */
export function syncTeams(db: Db, hunt: Hunt, now: Date) {
  for (const team of teamsOf(db, hunt.id)) {
    if (team.status === "waiting" && hunt.status === "active" && team.scheduledStartAt && ms(team.scheduledStartAt) <= now.getTime()) {
      team.status = "active";
      // Tiden räknas från lagets egen starttid.
      team.actualStartAt = team.scheduledStartAt;
      team.updatedAt = iso(now);
    }
    team.elapsedSeconds = teamElapsed(hunt, team, now);
    team.score = teamStats(db, hunt, team.id).score;
    for (const p of db.participants.filter((x) => x.teamId === team.id)) {
      p.status = team.status;
      p.scheduledStartAt = team.scheduledStartAt;
      p.actualStartAt = team.actualStartAt;
      p.elapsedSeconds = team.elapsedSeconds;
    }
  }
}

export function startHunt(db: Db, huntId: string, opts: { otherActiveHunts: number }, now = new Date()) {
  const hunt = getHunt(db, huntId);
  if (hunt.status !== "draft") throw new UserError("Skattjakten har redan startat.");
  const { errors } = validateHunt(db, huntId);
  if (errors.length) throw new UserError(`Skattjakten kan inte starta ännu: ${errors[0]}`);
  const teams = teamsOf(db, huntId);
  if (teams.length === 0) throw new UserError("Lägg till minst ett lag eller en deltagare innan start.");
  if (opts.otherActiveHunts >= PLAN_LIMITS[hunt.plan].maxActiveHunts)
    throw new UserError("Gratisläget tillåter en aktiv skattjakt åt gången. Avsluta den andra först.");

  hunt.status = "active";
  hunt.globalStartedAt = iso(now);
  hunt.startedAt = iso(now);
  const interval = hunt.startMode === "staggered" ? hunt.startIntervalMinutes * 60_000 : 0;
  teams.forEach((team, i) => {
    team.scheduledStartAt = new Date(now.getTime() + i * interval).toISOString();
  });
  syncTeams(db, hunt, now);
  return hunt;
}

export function pauseHunt(db: Db, huntId: string, now = new Date()) {
  const hunt = getHunt(db, huntId);
  if (hunt.status !== "active") throw new UserError("Bara en aktiv skattjakt kan pausas.");
  hunt.status = "paused";
  hunt.pauses.push({ from: iso(now), to: null });
  return hunt;
}

export function resumeHunt(db: Db, huntId: string, now = new Date()) {
  const hunt = getHunt(db, huntId);
  if (hunt.status !== "paused") throw new UserError("Skattjakten är inte pausad.");
  const open = hunt.pauses.find((p) => !p.to);
  if (open) open.to = iso(now);
  hunt.status = "active";
  syncTeams(db, hunt, now);
  return hunt;
}

export function finishHunt(db: Db, huntId: string, now = new Date()) {
  const hunt = getHunt(db, huntId);
  if (hunt.status === "finished") return hunt;
  if (hunt.status === "draft") throw new UserError("Skattjakten har inte startat.");
  syncTeams(db, hunt, now);
  const open = hunt.pauses.find((p) => !p.to);
  if (open) open.to = iso(now);
  hunt.status = "finished";
  hunt.finishedAt = iso(now);
  syncTeams(db, hunt, now);
  return hunt;
}

// ---------------------------------------------------------------------------
// Deltagarens handlingar

export interface PlayContext {
  hunt: Hunt;
  team: Team;
  /** null när skattgömmaren simulerar en scanning i testläget. */
  participant: Participant | null;
}

export function playContext(db: Db, participantId: string, token: string, now: Date): PlayContext {
  const participant = db.participants.find((p) => p.id === participantId && p.token === token);
  if (!participant) throw new UserError("Du är inte med i den här skattjakten.");
  const team = db.teams.find((t) => t.id === participant.teamId);
  if (!team) throw new UserError("Ditt lag finns inte längre.");
  const hunt = getHunt(db, team.huntId);
  syncTeams(db, hunt, now);
  return { hunt, team, participant };
}

export type ScanOutcome =
  | "checkpointFound"
  | "treasureFound"
  | "notStarted"
  | "paused"
  | "huntFinished"
  | "teamFinished"
  | "alreadyFound"
  | "finishStepFirst"
  | "wrongStep"
  | "unknown";

export interface ScanResult {
  outcome: ScanOutcome;
  points: number;
  checkpointNumber?: number;
}

function advance(db: Db, team: Team) {
  team.currentStep += 1;
  team.phase = "seeking";
}

/** Efter hittad kontrollpunkt: frågor → uppdrag → nästa ledtråd. */
function nextPhase(db: Db, team: Team, checkpointId: string) {
  const answered = new Set(db.answers.filter((a) => a.teamId === team.id).map((a) => a.questionId));
  const remaining = questionsOf(db, checkpointId).filter((q) => !answered.has(q.id));
  if (remaining.length) {
    team.phase = "questions";
    return;
  }
  const mission = missionOf(db, checkpointId);
  const done = mission && db.missionCompletions.some((m) => m.teamId === team.id && m.missionId === mission.id);
  if (mission && !done) {
    team.phase = "mission";
    return;
  }
  advance(db, team);
}

export function scan(db: Db, ctx: PlayContext, token: string, now = new Date()): ScanResult {
  const { hunt, team, participant } = ctx;
  const cps = checkpointsOf(db, hunt.id);
  const treasure = treasureOf(db, hunt.id);
  const cp = cps.find((c) => c.qrToken === token) ?? null;
  const isTreasure = !!treasure && treasure.qrToken === token;

  const log = (isCorrectStep: boolean) =>
    db.scanEvents.push({
      id: newId(),
      huntId: hunt.id,
      teamId: team.id,
      participantId: participant?.id ?? null,
      checkpointId: cp?.id ?? null,
      treasureId: isTreasure ? treasure!.id : null,
      scanType: cp ? "checkpoint" : isTreasure ? "treasure" : "unknown",
      isCorrectStep,
      createdAt: iso(now),
    });

  const refuse = (outcome: ScanOutcome): ScanResult => {
    log(false);
    return { outcome, points: 0, checkpointNumber: cp ? cp.order + 1 : undefined };
  };

  if (!cp && !isTreasure) return refuse("unknown");
  if (hunt.status === "finished") return refuse("huntFinished");
  if (hunt.status === "draft" || team.status === "waiting") return refuse("notStarted");
  if (hunt.status === "paused") return refuse("paused");
  if (team.status === "finished") return refuse("teamFinished");

  const target = cps[team.currentStep];
  if (cp) {
    if (cp.order < team.currentStep || (target?.id === cp.id && team.phase !== "seeking")) return refuse("alreadyFound");
    if (team.phase !== "seeking") return refuse("finishStepFirst");
    if (target?.id !== cp.id) return refuse("wrongStep");
    // Skydd mot dubbla poäng, t.ex. om två mobiler i laget scannar samtidigt.
    if (db.scanEvents.some((e) => e.teamId === team.id && e.checkpointId === cp.id && e.isCorrectStep)) return refuse("alreadyFound");
    log(true);
    nextPhase(db, team, cp.id);
    team.updatedAt = iso(now);
    syncTeams(db, hunt, now);
    return { outcome: "checkpointFound", points: hunt.scoring.checkpointFound, checkpointNumber: cp.order + 1 };
  }

  // Skatten
  if (team.currentStep < cps.length) return refuse(team.phase === "seeking" ? "wrongStep" : "finishStepFirst");
  log(true);
  team.status = "finished";
  team.finishedAt = iso(now);
  team.updatedAt = iso(now);
  syncTeams(db, hunt, now);
  return { outcome: "treasureFound", points: hunt.scoring.treasureFound };
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: number;
  points: number;
}

export function answerQuestion(db: Db, ctx: PlayContext, questionId: string, selected: number, now = new Date()): AnswerResult {
  const { hunt, team, participant } = ctx;
  if (hunt.status !== "active") throw new UserError(hunt.status === "paused" ? "Skattjakten är pausad just nu." : "Skattjakten är inte igång.");
  const cp = checkpointsOf(db, hunt.id)[team.currentStep];
  const q = db.questions.find((x) => x.id === questionId);
  if (!cp || !q || q.checkpointId !== cp.id || team.phase !== "questions") throw new UserError("Den här frågan är inte aktiv just nu.");
  const previous = db.answers.find((a) => a.teamId === team.id && a.questionId === q.id);
  if (previous) {
    // Svaret är redan inskickat (t.ex. från en annan mobil i laget).
    return { isCorrect: previous.isCorrect, correctAnswer: q.correctAnswer, points: 0 };
  }
  if (!Number.isInteger(selected) || selected < 0 || selected >= q.alternatives.length) throw new UserError("Välj ett svar.");
  const isCorrect = selected === q.correctAnswer;
  db.answers.push({
    id: newId(),
    huntId: hunt.id,
    teamId: team.id,
    participantId: participant?.id ?? null,
    checkpointId: cp.id,
    questionId: q.id,
    selectedAnswer: selected,
    isCorrect,
    createdAt: iso(now),
  });
  team.updatedAt = iso(now);
  syncTeams(db, hunt, now);
  return { isCorrect, correctAnswer: q.correctAnswer, points: isCorrect ? hunt.scoring.correctAnswer : 0 };
}

/** Går vidare när alla frågor är besvarade (deltagaren har sett facit). */
export function continueAfterQuestions(db: Db, ctx: PlayContext, now = new Date()) {
  const { hunt, team } = ctx;
  if (team.phase !== "questions") return;
  const cp = checkpointsOf(db, hunt.id)[team.currentStep];
  if (!cp) return;
  const answered = new Set(db.answers.filter((a) => a.teamId === team.id).map((a) => a.questionId));
  if (questionsOf(db, cp.id).some((q) => !answered.has(q.id))) throw new UserError("Svara på alla frågor först.");
  nextPhase(db, team, cp.id);
  team.updatedAt = iso(now);
}

export function completeMission(db: Db, ctx: PlayContext, completed: boolean, now = new Date()) {
  const { hunt, team, participant } = ctx;
  if (hunt.status !== "active") throw new UserError("Skattjakten är inte igång just nu.");
  const cp = checkpointsOf(db, hunt.id)[team.currentStep];
  const mission = cp ? missionOf(db, cp.id) : null;
  if (!cp || !mission || team.phase !== "mission") throw new UserError("Det finns inget uppdrag just nu.");
  if (!db.missionCompletions.some((m) => m.teamId === team.id && m.missionId === mission.id)) {
    db.missionCompletions.push({
      id: newId(),
      huntId: hunt.id,
      teamId: team.id,
      participantId: participant?.id ?? null,
      checkpointId: cp.id,
      missionId: mission.id,
      completed,
      photoUrl: null,
      approvedByHost: false,
      createdAt: iso(now),
    });
  }
  advance(db, team);
  team.updatedAt = iso(now);
  syncTeams(db, hunt, now);
  return { points: completed ? mission.points : 0 };
}

export function requestHelp(db: Db, ctx: PlayContext, now = new Date()) {
  const { hunt, team, participant } = ctx;
  if (hunt.status !== "active" || team.status !== "active") throw new UserError("Hjälp finns när er jakt är igång.");
  if (team.phase !== "seeking") throw new UserError("Svara på frågorna eller gör uppdraget först.");
  const cps = checkpointsOf(db, hunt.id);
  const cp = cps[team.currentStep] ?? null;
  db.hintRequests.push({
    id: newId(),
    huntId: hunt.id,
    teamId: team.id,
    participantId: participant?.id ?? null,
    checkpointId: cp?.id ?? null,
    createdAt: iso(now),
    pointsPenalty: hunt.scoring.hintPenalty,
  });
  syncTeams(db, hunt, now);
  return { penalty: hunt.scoring.hintPenalty };
}

// ---------------------------------------------------------------------------
// Resultat

export interface RankRow {
  teamId: string;
  name: string;
  avatarId: string | null;
  photoUrl: string | null;
  status: Team["status"];
  scheduledStartAt: string | null;
  actualStartAt: string | null;
  finishedAt: string | null;
  elapsedSeconds: number | null;
  currentStep: number;
  phase: Team["phase"];
  stats: TeamStats;
  place: number;
}

export function ranking(db: Db, huntId: string, now = new Date()): RankRow[] {
  const hunt = getHunt(db, huntId);
  const rows = teamsOf(db, huntId).map((team) => ({
    teamId: team.id,
    name: team.name,
    avatarId: team.avatarId,
    photoUrl: team.photoUrl,
    status: team.status,
    scheduledStartAt: team.scheduledStartAt,
    actualStartAt: team.actualStartAt,
    finishedAt: team.finishedAt,
    elapsedSeconds: teamElapsed(hunt, team, now),
    currentStep: team.currentStep,
    phase: team.phase,
    stats: teamStats(db, hunt, team.id),
    place: 0,
  }));
  const time = (r: RankRow) => (r.stats.treasureFound ? r.elapsedSeconds ?? Infinity : Infinity);
  rows.sort((a, b) => {
    if (hunt.winMode === "fastest") {
      if (a.stats.treasureFound !== b.stats.treasureFound) return a.stats.treasureFound ? -1 : 1;
      if (a.stats.treasureFound) return time(a) - time(b) || b.stats.score - a.stats.score;
      return b.stats.score - a.stats.score || b.stats.checkpointsFound - a.stats.checkpointsFound;
    }
    return b.stats.score - a.stats.score || time(a) - time(b);
  });
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    const tied = prev && prev.stats.score === r.stats.score && time(prev) === time(r) && prev.stats.treasureFound === r.stats.treasureFound;
    r.place = tied ? prev.place : i + 1;
  });
  return rows;
}

export { limitsOf };
