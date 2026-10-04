// Bygger de dataobjekt som skickas till webbläsaren.
// Deltagarvyn får aldrig se rätt svar i förväg, framtida ledtrådar, placeringar eller QR-tokens.

import { PLAN_LIMITS, type PlanLimits } from "./catalog";
import { maxScore, ranking, teamStats, type PlayContext, type RankRow, type TeamStats } from "./game";
import { checkpointsOf, missionOf, questionsOf, teamsOf, treasureOf, validateHunt, type Validation } from "./hunts";
import type { Checkpoint, Db, Hunt, Mission, Question, Team, Treasure } from "./types";

// ---------------------------------------------------------------------------
// Deltagare

export interface PlayQuestion {
  id: string;
  text: string;
  alternatives: string[];
  answer: { selected: number; isCorrect: boolean; correctAnswer: number } | null;
}

export interface PlayState {
  now: string;
  hunt: {
    id: string;
    name: string;
    brandName: string;
    language: Hunt["language"];
    status: Hunt["status"];
    gameMode: Hunt["gameMode"];
    winMode: Hunt["winMode"];
    playMode: Hunt["playMode"];
    calm: boolean;
    totalSteps: number;
    allowPhotos: boolean;
    diploma: boolean;
    hintPenalty: number;
    finishedAt: string | null;
  };
  team: Pick<
    Team,
    "id" | "name" | "avatarId" | "photoUrl" | "joinCode" | "status" | "phase" | "currentStep" | "scheduledStartAt" | "actualStartAt" | "finishedAt" | "elapsedSeconds"
  > & { stats: TeamStats };
  me: { name: string };
  /** Ledtråden laget letar efter just nu. */
  clue: { stepNumber: number; isTreasure: boolean; text: string } | null;
  /** Hjälptexter som redan visats för aktuell ledtråd. */
  help: string[];
  checkpointNumber: number | null;
  questions: PlayQuestion[];
  mission: { id: string; text: string; points: number } | null;
  ranking: (Omit<RankRow, "photoUrl"> & { photoUrl: string | null; isMe: boolean })[] | null;
}

export function buildPlayState(db: Db, ctx: PlayContext, now: Date): PlayState {
  const { hunt, team, participant } = ctx;
  const cps = checkpointsOf(db, hunt.id);
  const treasure = treasureOf(db, hunt.id);
  const started = team.status !== "waiting";
  const target: Checkpoint | Treasure | null = team.currentStep < cps.length ? cps[team.currentStep] : treasure;
  const isTreasure = team.currentStep >= cps.length;

  let clue: PlayState["clue"] = null;
  let help: string[] = [];
  if (started && team.status === "active" && target && team.phase === "seeking") {
    clue = { stepNumber: team.currentStep + 1, isTreasure, text: target.publicClueText };
    const targetCpId = isTreasure ? null : (target as Checkpoint).id;
    const hints = db.hintRequests.filter((h) => h.teamId === team.id && h.checkpointId === targetCpId);
    const fallback = hunt.language === "sv" ? "Läs ledtråden en gång till och titta runt omkring er." : "Read the clue again and look around you.";
    help = hints.map(() => target.helpText || fallback);
  }

  let questions: PlayQuestion[] = [];
  let mission: PlayState["mission"] = null;
  let checkpointNumber: number | null = null;
  const current = cps[team.currentStep];
  if (team.status === "active" && current && team.phase !== "seeking") {
    checkpointNumber = current.order + 1;
    if (team.phase === "questions") {
      questions = questionsOf(db, current.id).map((q) => {
        const a = db.answers.find((x) => x.teamId === team.id && x.questionId === q.id);
        return {
          id: q.id,
          text: q.questionText,
          alternatives: q.alternatives,
          // Rätt svar skickas bara när frågan redan är besvarad.
          answer: a ? { selected: a.selectedAnswer, isCorrect: a.isCorrect, correctAnswer: q.correctAnswer } : null,
        };
      });
    }
    if (team.phase === "mission") {
      const m = missionOf(db, current.id);
      if (m) mission = { id: m.id, text: m.missionText, points: m.points };
    }
  }

  const showRanking = hunt.status === "finished";
  return {
    now: now.toISOString(),
    hunt: {
      id: hunt.id,
      name: hunt.name,
      brandName: hunt.brandName,
      language: hunt.language,
      status: hunt.status,
      gameMode: hunt.gameMode,
      winMode: hunt.winMode,
      playMode: hunt.playMode,
      calm: hunt.gameMode === "calm",
      totalSteps: cps.length + 1,
      allowPhotos: hunt.allowPhotos && PLAN_LIMITS[hunt.plan].photos,
      diploma: PLAN_LIMITS[hunt.plan].diploma,
      hintPenalty: hunt.scoring.hintPenalty,
      finishedAt: hunt.finishedAt,
    },
    team: {
      id: team.id,
      name: team.name,
      avatarId: team.avatarId,
      photoUrl: team.photoUrl,
      joinCode: team.joinCode,
      status: team.status,
      phase: team.phase,
      currentStep: team.currentStep,
      scheduledStartAt: team.scheduledStartAt,
      actualStartAt: team.actualStartAt,
      finishedAt: team.finishedAt,
      elapsedSeconds: team.elapsedSeconds,
      stats: teamStats(db, hunt, team.id),
    },
    me: { name: participant?.name ?? team.name },
    clue,
    help,
    checkpointNumber,
    questions,
    mission,
    ranking: showRanking
      ? ranking(db, hunt.id, now).map((r) => ({
          ...r,
          // Andra lags bilder visas inte för deltagare.
          photoUrl: r.teamId === team.id ? r.photoUrl : null,
          isMe: r.teamId === team.id,
        }))
      : null,
  };
}

// ---------------------------------------------------------------------------
// Skattgömmare

export interface HostCheckpoint extends Checkpoint {
  questions: Question[];
  mission: Mission | null;
}

export interface HostBundle {
  hunt: Hunt;
  limits: PlanLimits;
  checkpoints: HostCheckpoint[];
  treasure: Treasure | null;
  teams: (Team & { participants: { id: string; name: string }[] })[];
  validation: Validation;
  maxScore: number;
  aiMode: "claude" | "mock";
}

export function buildHostBundle(db: Db, hunt: Hunt, aiMode: "claude" | "mock"): HostBundle {
  return {
    hunt,
    limits: PLAN_LIMITS[hunt.plan],
    checkpoints: checkpointsOf(db, hunt.id).map((cp) => ({ ...cp, questions: questionsOf(db, cp.id), mission: missionOf(db, cp.id) })),
    treasure: treasureOf(db, hunt.id),
    teams: teamsOf(db, hunt.id).map((t) => ({
      ...t,
      participants: db.participants.filter((p) => p.teamId === t.id).map((p) => ({ id: p.id, name: p.name })),
    })),
    validation: validateHunt(db, hunt.id),
    maxScore: maxScore(db, hunt),
    aiMode,
  };
}

export interface DashboardEvent {
  id: string;
  at: string;
  teamName: string;
  kind: "scan" | "hint";
  label: string;
  ok: boolean;
}

export interface Dashboard {
  now: string;
  hunt: Hunt;
  totalCheckpoints: number;
  maxScore: number;
  rows: RankRow[];
  events: DashboardEvent[];
  hintsByTeam: Record<string, number>;
  /** För testläget: koder att simulera scanning med. */
  codes: { label: string; token: string }[];
}

export function buildDashboard(db: Db, hunt: Hunt, now: Date): Dashboard {
  const cps = checkpointsOf(db, hunt.id);
  const treasure = treasureOf(db, hunt.id);
  const teamName = (id: string) => db.teams.find((t) => t.id === id)?.name ?? "?";
  const cpLabel = (id: string | null) => {
    const cp = cps.find((c) => c.id === id);
    return cp ? `Kontrollpunkt ${cp.order + 1}` : "Skatten";
  };
  const scans: DashboardEvent[] = db.scanEvents
    .filter((e) => e.huntId === hunt.id)
    .map((e) => ({
      id: e.id,
      at: e.createdAt,
      teamName: teamName(e.teamId),
      kind: "scan" as const,
      label: e.scanType === "unknown" ? "Okänd QR-kod" : e.scanType === "treasure" ? "Skatten" : cpLabel(e.checkpointId),
      ok: e.isCorrectStep,
    }));
  const hints: DashboardEvent[] = db.hintRequests
    .filter((h) => h.huntId === hunt.id)
    .map((h) => ({ id: h.id, at: h.createdAt, teamName: teamName(h.teamId), kind: "hint" as const, label: `Bad om hjälp (${cpLabel(h.checkpointId)})`, ok: false }));
  const hintsByTeam: Record<string, number> = {};
  for (const h of db.hintRequests.filter((x) => x.huntId === hunt.id)) hintsByTeam[h.teamId] = (hintsByTeam[h.teamId] ?? 0) + 1;
  return {
    now: now.toISOString(),
    hunt,
    totalCheckpoints: cps.length,
    maxScore: maxScore(db, hunt),
    rows: ranking(db, hunt.id, now),
    events: [...scans, ...hints].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60),
    hintsByTeam,
    codes: [...cps.map((c) => ({ label: `Kontrollpunkt ${c.order + 1}`, token: c.qrToken })), ...(treasure ? [{ label: "Skatten", token: treasure.qrToken }] : [])],
  };
}
