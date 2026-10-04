// Skattgömmarens logik: skapa och redigera jakter, ledtrådar, frågor, uppdrag och lag.
// Funktionerna arbetar direkt på Db-objektet och används inuti store.mutate().

import { DEFAULT_SCORING, PLAN_LIMITS, QUESTIONS_PER_CHECKPOINT, templateById } from "./catalog";
import { newCode, newId, newQrToken, newSecret, normalizeCode } from "./ids";
import type {
  AgeGroup,
  Checkpoint,
  Db,
  Difficulty,
  GameMode,
  Hunt,
  Language,
  Mission,
  Participant,
  Plan,
  PlayMode,
  Question,
  StartMode,
  Team,
  TemplateId,
  Treasure,
  WinMode,
} from "./types";

/** Fel som är tänkta att visas för användaren. */
export class UserError extends Error {}

export interface HuntInput {
  name: string;
  language: Language;
  description: string;
  template: TemplateId;
  gameMode: GameMode;
  playMode: PlayMode;
  ageGroup: AgeGroup;
  themes: string[];
  difficulty: Difficulty;
  plan: Plan;
  clueCount: number;
  winMode: WinMode;
  startMode: StartMode;
  startIntervalMinutes: number;
  allowPhotos: boolean;
}

const iso = (d: Date) => d.toISOString();

export function getHunt(db: Db, huntId: string): Hunt {
  const hunt = db.hunts.find((h) => h.id === huntId);
  if (!hunt) throw new UserError("Skattjakten finns inte.");
  return hunt;
}

export const checkpointsOf = (db: Db, huntId: string) =>
  db.checkpoints.filter((c) => c.huntId === huntId).sort((a, b) => a.order - b.order);

export const questionsOf = (db: Db, checkpointId: string) =>
  db.questions.filter((q) => q.checkpointId === checkpointId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const missionOf = (db: Db, checkpointId: string) => db.missions.find((m) => m.checkpointId === checkpointId) ?? null;

export const treasureOf = (db: Db, huntId: string) => db.treasures.find((t) => t.huntId === huntId) ?? null;

export const teamsOf = (db: Db, huntId: string) =>
  db.teams.filter((t) => t.huntId === huntId).sort((a, b) => a.startOrder - b.startOrder);

export const limitsOf = (hunt: Hunt) => PLAN_LIMITS[hunt.plan];

function assertDraft(hunt: Hunt) {
  if (hunt.status !== "draft") throw new UserError("Det här går bara att ändra innan skattjakten har startat.");
}

function sanitizeInput(input: HuntInput): HuntInput {
  const limits = PLAN_LIMITS[input.plan];
  const name = input.name.trim();
  if (!name) throw new UserError("Ge skattjakten ett namn.");
  const gameMode = limits.gameModes.includes(input.gameMode) ? input.gameMode : "classic";
  const template = limits.templates ? input.template : "none";
  const interval = Math.max(1, Math.min(60, Math.round(input.startIntervalMinutes || 2)));
  return {
    ...input,
    name: name.slice(0, 80),
    description: input.description.trim().slice(0, 500),
    gameMode,
    template,
    themes: input.themes.length ? input.themes.slice(0, 5) : ["mixed"],
    clueCount: Math.max(1, Math.min(limits.maxClues, Math.round(input.clueCount || limits.defaultClues))),
    startIntervalMinutes: interval,
    allowPhotos: limits.photos ? input.allowPhotos : false,
  };
}

function newCheckpoint(huntId: string, order: number, difficulty: Difficulty, now: Date): Checkpoint {
  return {
    id: newId(),
    huntId,
    order,
    title: `Kontrollpunkt ${order + 1}`,
    hostPlacementNote: "",
    publicClueText: "",
    helpText: "",
    difficulty,
    qrToken: newQrToken(),
    createdAt: iso(now),
    updatedAt: iso(now),
  };
}

function newMission(hunt: Hunt, checkpointId: string, text: string, now: Date): Mission {
  return {
    id: newId(),
    huntId: hunt.id,
    checkpointId,
    missionText: text,
    missionType: "selfConfirm",
    points: hunt.scoring.missionCompleted,
    required: false,
    createdAt: iso(now),
    updatedAt: iso(now),
  };
}

export function createHunt(db: Db, rawInput: HuntInput, now = new Date()): Hunt {
  const input = sanitizeInput(rawInput);
  const limits = PLAN_LIMITS[input.plan];
  const hunt: Hunt = {
    id: newId(),
    name: input.name,
    language: input.language,
    brandName: input.language === "en" ? "Treasure Trail" : "Skattjakten",
    description: input.description,
    template: input.template,
    gameMode: input.gameMode,
    playMode: input.playMode,
    ageGroup: input.ageGroup,
    themes: input.themes,
    difficulty: input.difficulty,
    status: "draft",
    winMode: input.winMode,
    plan: input.plan,
    defaultClueCount: limits.defaultClues,
    maxClues: limits.maxClues,
    startMode: input.startMode,
    startIntervalMinutes: input.startIntervalMinutes,
    globalStartedAt: null,
    createdAt: iso(now),
    startedAt: null,
    finishedAt: null,
    ownerType: "private",
    visibility: "private",
    commercial: false,
    hostKey: newSecret(),
    joinCode: newCode(6, db.hunts.map((h) => h.joinCode)),
    allowPhotos: input.allowPhotos,
    scoring: { ...DEFAULT_SCORING },
    aiGenerationsUsed: 0,
    pauses: [],
  };
  db.hunts.push(hunt);

  const template = templateById(hunt.template);
  for (let i = 0; i < input.clueCount; i++) {
    const cp = newCheckpoint(hunt.id, i, hunt.difficulty, now);
    db.checkpoints.push(cp);
    if (limits.missions) {
      const example = template.missions[i % template.missions.length];
      db.missions.push(newMission(hunt, cp.id, example[hunt.language], now));
    }
  }
  const treasure: Treasure = {
    id: newId(),
    huntId: hunt.id,
    hostPlacementNote: "",
    publicClueText: template.id === "none" ? "" : template.treasureClue[hunt.language],
    helpText: "",
    qrToken: newQrToken(),
    createdAt: iso(now),
    updatedAt: iso(now),
  };
  db.treasures.push(treasure);
  return hunt;
}

export type HuntSettingsPatch = Partial<Omit<HuntInput, "clueCount">>;

export function updateHuntSettings(db: Db, huntId: string, patch: HuntSettingsPatch) {
  const hunt = getHunt(db, huntId);
  const onlyText = Object.keys(patch).every((k) => k === "name" || k === "description");
  if (!onlyText) assertDraft(hunt);

  const plan = patch.plan ?? hunt.plan;
  if (plan !== hunt.plan) {
    const limits = PLAN_LIMITS[plan];
    if (checkpointsOf(db, huntId).length > limits.maxClues)
      throw new UserError(`Gratisläget har max ${limits.maxClues} ledtrådar. Ta bort några först.`);
    if (teamsOf(db, huntId).length > limits.maxTeams)
      throw new UserError(`Gratisläget har max ${limits.maxTeams} lag. Ta bort några först.`);
  }
  const merged = sanitizeInput({
    name: patch.name ?? hunt.name,
    language: patch.language ?? hunt.language,
    description: patch.description ?? hunt.description,
    template: patch.template ?? hunt.template,
    gameMode: patch.gameMode ?? hunt.gameMode,
    playMode: patch.playMode ?? hunt.playMode,
    ageGroup: patch.ageGroup ?? hunt.ageGroup,
    themes: patch.themes ?? hunt.themes,
    difficulty: patch.difficulty ?? hunt.difficulty,
    plan,
    clueCount: checkpointsOf(db, huntId).length,
    winMode: patch.winMode ?? hunt.winMode,
    startMode: patch.startMode ?? hunt.startMode,
    startIntervalMinutes: patch.startIntervalMinutes ?? hunt.startIntervalMinutes,
    allowPhotos: patch.allowPhotos ?? hunt.allowPhotos,
  });
  const limits = PLAN_LIMITS[plan];
  Object.assign(hunt, {
    name: merged.name,
    language: merged.language,
    brandName: merged.language === "en" ? "Treasure Trail" : "Skattjakten",
    description: merged.description,
    template: merged.template,
    gameMode: merged.gameMode,
    playMode: merged.playMode,
    ageGroup: merged.ageGroup,
    themes: merged.themes,
    difficulty: merged.difficulty,
    plan,
    defaultClueCount: limits.defaultClues,
    maxClues: limits.maxClues,
    winMode: merged.winMode,
    startMode: merged.startMode,
    startIntervalMinutes: merged.startIntervalMinutes,
    allowPhotos: merged.allowPhotos,
  });
  if (!limits.missions) {
    const ids = new Set(checkpointsOf(db, huntId).map((c) => c.id));
    db.missions = db.missions.filter((m) => !ids.has(m.checkpointId));
  }
  if (!limits.photos) for (const t of teamsOf(db, huntId)) t.photoUrl = null;
  return hunt;
}

// ---------------------------------------------------------------------------
// Ledtrådar / kontrollpunkter

function checkpointWithHunt(db: Db, checkpointId: string) {
  const cp = db.checkpoints.find((c) => c.id === checkpointId);
  if (!cp) throw new UserError("Ledtråden finns inte.");
  return { cp, hunt: getHunt(db, cp.huntId) };
}

export function addCheckpoint(db: Db, huntId: string, now = new Date()): Checkpoint {
  const hunt = getHunt(db, huntId);
  assertDraft(hunt);
  const existing = checkpointsOf(db, huntId);
  const limits = limitsOf(hunt);
  if (existing.length >= limits.maxClues)
    throw new UserError(
      hunt.plan === "free"
        ? `Gratisläget har max ${limits.maxClues} ledtrådar. Byt till betalt läge för fler.`
        : `Max ${limits.maxClues} ledtrådar.`,
    );
  const cp = newCheckpoint(huntId, existing.length, hunt.difficulty, now);
  db.checkpoints.push(cp);
  if (limits.missions) {
    const template = templateById(hunt.template);
    db.missions.push(newMission(hunt, cp.id, template.missions[cp.order % template.missions.length][hunt.language], now));
  }
  return cp;
}

function renumber(db: Db, huntId: string) {
  checkpointsOf(db, huntId).forEach((c, i) => {
    if (/^(Kontrollpunkt|Checkpoint) \d+$/.test(c.title)) c.title = `Kontrollpunkt ${i + 1}`;
    c.order = i;
  });
}

export function removeCheckpoint(db: Db, checkpointId: string) {
  const { cp, hunt } = checkpointWithHunt(db, checkpointId);
  assertDraft(hunt);
  if (checkpointsOf(db, hunt.id).length <= 1) throw new UserError("En skattjakt behöver minst en ledtråd.");
  db.checkpoints = db.checkpoints.filter((c) => c.id !== cp.id);
  db.questions = db.questions.filter((q) => q.checkpointId !== cp.id);
  db.missions = db.missions.filter((m) => m.checkpointId !== cp.id);
  renumber(db, hunt.id);
}

export function moveCheckpoint(db: Db, checkpointId: string, direction: -1 | 1) {
  const { cp, hunt } = checkpointWithHunt(db, checkpointId);
  assertDraft(hunt);
  const list = checkpointsOf(db, hunt.id);
  const other = list[cp.order + direction];
  if (!other) return;
  [cp.order, other.order] = [other.order, cp.order];
  renumber(db, hunt.id);
}

export type CheckpointPatch = Partial<Pick<Checkpoint, "title" | "hostPlacementNote" | "publicClueText" | "helpText" | "difficulty">>;

export function updateCheckpoint(db: Db, checkpointId: string, patch: CheckpointPatch, now = new Date()) {
  const { cp, hunt } = checkpointWithHunt(db, checkpointId);
  if (hunt.status === "finished") throw new UserError("Skattjakten är avslutad.");
  for (const key of ["title", "hostPlacementNote", "publicClueText", "helpText"] as const) {
    if (patch[key] !== undefined) cp[key] = String(patch[key]).slice(0, 600);
  }
  if (patch.difficulty) cp.difficulty = patch.difficulty;
  cp.updatedAt = iso(now);
  return cp;
}

export type TreasurePatch = Partial<Pick<Treasure, "hostPlacementNote" | "publicClueText" | "helpText">>;

export function updateTreasure(db: Db, huntId: string, patch: TreasurePatch, now = new Date()) {
  const hunt = getHunt(db, huntId);
  if (hunt.status === "finished") throw new UserError("Skattjakten är avslutad.");
  const t = treasureOf(db, huntId);
  if (!t) throw new UserError("Skatten saknas.");
  for (const key of ["hostPlacementNote", "publicClueText", "helpText"] as const) {
    if (patch[key] !== undefined) t[key] = String(patch[key]).slice(0, 600);
  }
  t.updatedAt = iso(now);
  return t;
}

// ---------------------------------------------------------------------------
// Frågor

export interface QuestionInput {
  id?: string;
  questionText: string;
  alternatives: string[];
  correctAnswer: number;
  explanation?: string;
  approvedByHost?: boolean;
  generatedByAi?: boolean;
}

function validateQuestion(input: QuestionInput) {
  const text = input.questionText.trim();
  const alternatives = input.alternatives.map((a) => a.trim()).filter(Boolean);
  if (!text) throw new UserError("Frågan saknar text.");
  if (alternatives.length < 3 || alternatives.length > 4) throw new UserError("En fråga behöver 3 eller 4 svarsalternativ.");
  if (new Set(alternatives.map((a) => a.toLowerCase())).size !== alternatives.length)
    throw new UserError("Svarsalternativen måste vara olika.");
  const correct = input.correctAnswer;
  if (!Number.isInteger(correct) || correct < 0 || correct >= alternatives.length)
    throw new UserError("Välj vilket svar som är rätt.");
  return { text, alternatives, correct };
}

export function saveQuestion(db: Db, checkpointId: string, input: QuestionInput, now = new Date()): Question {
  const { cp, hunt } = checkpointWithHunt(db, checkpointId);
  assertDraft(hunt);
  const { text, alternatives, correct } = validateQuestion(input);
  if (input.id) {
    const q = db.questions.find((x) => x.id === input.id && x.checkpointId === cp.id);
    if (!q) throw new UserError("Frågan finns inte.");
    Object.assign(q, {
      questionText: text,
      alternatives,
      correctAnswer: correct,
      explanation: (input.explanation ?? q.explanation).trim(),
      approvedByHost: input.approvedByHost ?? q.approvedByHost,
      updatedAt: iso(now),
    });
    return q;
  }
  if (questionsOf(db, cp.id).length >= QUESTIONS_PER_CHECKPOINT)
    throw new UserError(`Varje ledtråd har ${QUESTIONS_PER_CHECKPOINT} frågor. Ta bort en fråga först.`);
  const q: Question = {
    id: newId(),
    huntId: hunt.id,
    checkpointId: cp.id,
    questionText: text,
    alternatives,
    correctAnswer: correct,
    explanation: (input.explanation ?? "").trim(),
    ageGroup: hunt.ageGroup,
    theme: hunt.themes[0] ?? "mixed",
    difficulty: cp.difficulty,
    generatedByAi: Boolean(input.generatedByAi),
    // AI-frågor publiceras aldrig utan granskning.
    approvedByHost: input.generatedByAi ? false : input.approvedByHost ?? true,
    createdAt: iso(now),
    updatedAt: iso(now),
  };
  db.questions.push(q);
  return q;
}

export function setQuestionApproved(db: Db, questionId: string, approved: boolean) {
  const q = db.questions.find((x) => x.id === questionId);
  if (!q) throw new UserError("Frågan finns inte.");
  assertDraft(getHunt(db, q.huntId));
  q.approvedByHost = approved;
  return q;
}

export function deleteQuestion(db: Db, questionId: string) {
  const q = db.questions.find((x) => x.id === questionId);
  if (!q) return;
  assertDraft(getHunt(db, q.huntId));
  db.questions = db.questions.filter((x) => x.id !== questionId);
}

/** Räknar AI-anrop mot planens kvot. */
export function useAiQuota(db: Db, huntId: string) {
  const hunt = getHunt(db, huntId);
  const limit = limitsOf(hunt).aiGenerations;
  if (hunt.aiGenerationsUsed >= limit)
    throw new UserError(`Gratisläget har ${limit} AI-förslag per jakt. Skriv egna eller byt till betalt läge.`);
  hunt.aiGenerationsUsed += 1;
}

// ---------------------------------------------------------------------------
// Uppdrag

export function setMission(db: Db, checkpointId: string, text: string | null, now = new Date()) {
  const { cp, hunt } = checkpointWithHunt(db, checkpointId);
  assertDraft(hunt);
  const existing = missionOf(db, cp.id);
  const clean = text?.trim() ?? "";
  if (!clean) {
    db.missions = db.missions.filter((m) => m.checkpointId !== cp.id);
    return null;
  }
  if (!limitsOf(hunt).missions) throw new UserError("Uppdrag finns i betalt läge.");
  if (existing) {
    existing.missionText = clean.slice(0, 300);
    existing.updatedAt = iso(now);
    return existing;
  }
  const m = newMission(hunt, cp.id, clean.slice(0, 300), now);
  db.missions.push(m);
  return m;
}

// ---------------------------------------------------------------------------
// Förhandsgranskning och varningar

export interface Validation {
  errors: string[];
  warnings: string[];
}

export function validateHunt(db: Db, huntId: string): Validation {
  const hunt = getHunt(db, huntId);
  const errors: string[] = [];
  const warnings: string[] = [];
  const cps = checkpointsOf(db, huntId);
  if (cps.length === 0) errors.push("Skattjakten har inga ledtrådar.");
  for (const cp of cps) {
    const n = cp.order + 1;
    if (!cp.hostPlacementNote.trim()) warnings.push(`Kontrollpunkt ${n} saknar placeringsbeskrivning.`);
    if (!cp.publicClueText.trim()) errors.push(`Kontrollpunkt ${n} saknar publik ledtråd.`);
    if (!cp.helpText.trim()) warnings.push(`Kontrollpunkt ${n} saknar hjälptext.`);
    if (!cp.qrToken) errors.push(`Kontrollpunkt ${n} saknar QR-kod.`);
    const qs = questionsOf(db, cp.id);
    if (qs.length === 0) warnings.push(`Kontrollpunkt ${n} saknar frågor.`);
    else if (qs.length < QUESTIONS_PER_CHECKPOINT) warnings.push(`Kontrollpunkt ${n} har bara ${qs.length} av ${QUESTIONS_PER_CHECKPOINT} frågor.`);
    const unapproved = qs.filter((q) => !q.approvedByHost).length;
    if (unapproved) errors.push(`Kontrollpunkt ${n} har ${unapproved} fråga${unapproved > 1 ? "or" : ""} som inte är godkänd${unapproved > 1 ? "a" : ""}.`);
    if (limitsOf(hunt).missions && !missionOf(db, cp.id)) warnings.push(`Kontrollpunkt ${n} saknar uppdrag.`);
  }
  const t = treasureOf(db, huntId);
  if (!t || !t.qrToken) errors.push("Skatten saknar QR-kod.");
  if (!t?.publicClueText.trim()) errors.push("Sista ledtråden saknar text som leder till skatten.");
  if (t && !t.hostPlacementNote.trim()) warnings.push("Skatten saknar placeringsbeskrivning.");
  if (t && !t.helpText.trim()) warnings.push("Skatten saknar hjälptext.");
  if (teamsOf(db, huntId).length === 0) warnings.push("Inga lag eller deltagare har gått med ännu.");
  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Lag och deltagare

export interface TeamInput {
  name: string;
  avatarId?: string | null;
  photoUrl?: string | null;
}

function scheduleLateTeam(db: Db, hunt: Hunt, team: Team, now: Date) {
  if (hunt.status === "draft" || hunt.status === "finished") return;
  // Laget gick med efter start: får nästa lediga starttid.
  let start = now.getTime();
  if (hunt.startMode === "staggered") {
    const others = teamsOf(db, hunt.id).filter((t) => t.id !== team.id && t.scheduledStartAt);
    const last = Math.max(...others.map((t) => Date.parse(t.scheduledStartAt!)), 0);
    if (last) start = Math.max(start, last + hunt.startIntervalMinutes * 60_000);
  }
  team.scheduledStartAt = new Date(start).toISOString();
}

export function addTeam(db: Db, huntId: string, input: TeamInput, now = new Date()): Team {
  const hunt = getHunt(db, huntId);
  if (hunt.status === "finished") throw new UserError("Skattjakten är redan avslutad.");
  const teams = teamsOf(db, huntId);
  const limits = limitsOf(hunt);
  if (teams.length >= limits.maxTeams)
    throw new UserError(
      hunt.plan === "free"
        ? `Den här skattjakten är full (max ${limits.maxTeams} ${hunt.playMode === "team" ? "lag" : "deltagare"} i gratisläget).`
        : "Den här skattjakten är full.",
    );
  const name = input.name.trim().slice(0, 40);
  if (!name) throw new UserError(hunt.playMode === "team" ? "Skriv ett lagnamn." : "Skriv ditt namn.");
  if (teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) throw new UserError("Det namnet är redan taget. Välj ett annat.");
  const photo = hunt.allowPhotos && limits.photos ? input.photoUrl ?? null : null;
  const team: Team = {
    id: newId(),
    huntId,
    name,
    joinCode: newCode(5, db.teams.map((t) => t.joinCode)),
    avatarId: input.avatarId ?? null,
    photoUrl: photo,
    score: 0,
    currentStep: 0,
    phase: "seeking",
    scheduledStartAt: null,
    actualStartAt: null,
    status: "waiting",
    elapsedSeconds: null,
    finishedAt: null,
    startOrder: teams.length ? Math.max(...teams.map((t) => t.startOrder)) + 1 : 0,
    createdAt: iso(now),
    updatedAt: iso(now),
  };
  db.teams.push(team);
  scheduleLateTeam(db, hunt, team, now);
  return team;
}

export function updateTeam(db: Db, teamId: string, input: Partial<TeamInput>) {
  const team = db.teams.find((t) => t.id === teamId);
  if (!team) throw new UserError("Laget finns inte.");
  const hunt = getHunt(db, team.huntId);
  if (input.name !== undefined) {
    const name = input.name.trim().slice(0, 40);
    if (name) team.name = name;
  }
  if (input.avatarId !== undefined) team.avatarId = input.avatarId;
  if (input.photoUrl !== undefined) team.photoUrl = hunt.allowPhotos && limitsOf(hunt).photos ? input.photoUrl : null;
  return team;
}

export function removeTeam(db: Db, teamId: string) {
  const team = db.teams.find((t) => t.id === teamId);
  if (!team) return;
  const hunt = getHunt(db, team.huntId);
  if (hunt.status !== "draft" && team.status !== "waiting")
    throw new UserError("Ett lag som redan har startat kan inte tas bort.");
  db.teams = db.teams.filter((t) => t.id !== teamId);
  db.participants = db.participants.filter((p) => p.teamId !== teamId);
}

export function addParticipant(db: Db, team: Team, name: string, now = new Date()): Participant {
  const p: Participant = {
    id: newId(),
    huntId: team.huntId,
    teamId: team.id,
    name: name.trim().slice(0, 40) || team.name,
    avatarId: team.avatarId,
    photoUrl: null,
    scheduledStartAt: team.scheduledStartAt,
    actualStartAt: team.actualStartAt,
    status: team.status,
    elapsedSeconds: team.elapsedSeconds,
    token: newSecret(),
    createdAt: iso(now),
    updatedAt: iso(now),
  };
  db.participants.push(p);
  return p;
}

export type JoinInput =
  | { kind: "new"; huntCode: string; name: string; playerName?: string; avatarId?: string | null; photoUrl?: string | null }
  | { kind: "existing"; teamCode: string; playerName: string };

export function findHuntByCode(db: Db, code: string) {
  const c = normalizeCode(code);
  return db.hunts.find((h) => h.joinCode === c) ?? null;
}

export function findTeamByCode(db: Db, code: string) {
  const c = normalizeCode(code);
  return db.teams.find((t) => t.joinCode === c) ?? null;
}

/** En deltagare går med: antingen som nytt lag/individ eller i ett befintligt lag. */
export function joinHunt(db: Db, input: JoinInput, now = new Date()) {
  if (input.kind === "existing") {
    const team = findTeamByCode(db, input.teamCode);
    if (!team) throw new UserError("Hittade inget lag med den koden.");
    const hunt = getHunt(db, team.huntId);
    if (hunt.status === "finished") throw new UserError("Skattjakten är redan avslutad.");
    if (hunt.playMode === "individual") throw new UserError("Den här skattjakten spelas individuellt.");
    const participant = addParticipant(db, team, input.playerName, now);
    return { hunt, team, participant };
  }
  const hunt = findHuntByCode(db, input.huntCode);
  if (!hunt) throw new UserError("Hittade ingen skattjakt med den koden.");
  const team = addTeam(db, hunt.id, { name: input.name, avatarId: input.avatarId, photoUrl: input.photoUrl }, now);
  const participant = addParticipant(db, team, input.playerName || input.name, now);
  return { hunt, team, participant };
}
