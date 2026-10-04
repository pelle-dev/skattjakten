// Datamodellen för Skattjakten.
// Tekniskt kallas en ledtrådsplats för "Checkpoint", även om appen visar ordet "ledtråd".
// Modellen är platt (som tabeller) så att den enkelt kan flyttas till Supabase/Postgres senare.

export type HuntStatus = "draft" | "active" | "paused" | "finished";
export type PlayMode = "individual" | "team";
export type GameMode = "classic" | "calm" | "teamBattle" | "pointHunt";
export type WinMode = "fastest" | "points";
export type StartMode = "simultaneous" | "staggered";
export type AgeGroup = "child" | "youth" | "adult";
export type Difficulty = "easy" | "medium" | "tricky";
export type TemplateId = "none" | "birthday" | "easter" | "midsummer" | "schoolyard" | "corporate" | "candy";
export type OwnerType = "private" | "business" | "organizer";
export type Visibility = "private" | "unlisted" | "public";
export type TeamStatus = "waiting" | "active" | "finished";
/** Var i det aktuella steget laget befinner sig. */
export type TeamPhase = "seeking" | "questions" | "mission";
export type MissionType = "selfConfirm" | "photo" | "hostApproval";
export type ScanType = "checkpoint" | "treasure" | "unknown";

/** Poängregler. Sparas per jakt så att de kan ändras senare. */
export interface ScoringRules {
  checkpointFound: number;
  correctAnswer: number;
  missionCompleted: number;
  treasureFound: number;
  hintPenalty: number;
}

export interface PauseInterval {
  from: string;
  to: string | null;
}

export interface Hunt {
  id: string;
  name: string;
  description: string;
  template: TemplateId;
  gameMode: GameMode;
  playMode: PlayMode;
  ageGroup: AgeGroup;
  themes: string[];
  difficulty: Difficulty;
  status: HuntStatus;
  winMode: WinMode;
  defaultClueCount: number;
  maxClues: number;
  startMode: StartMode;
  startIntervalMinutes: number;
  globalStartedAt: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  ownerType: OwnerType;
  visibility: Visibility;
  commercial: boolean;
  // Utöver specen:
  /** Hemlig nyckel som ger skattgömmaren åtkomst (inga konton i MVP). */
  hostKey: string;
  /** Kod som deltagarna skriver in för att gå med. */
  joinCode: string;
  /** Skattgömmaren kan stänga av lagbilder. */
  allowPhotos: boolean;
  scoring: ScoringRules;
  aiGenerationsUsed: number;
  /** Pauser, så att tiden kan räknas rättvist. */
  pauses: PauseInterval[];
  isDemo?: boolean;
}

export interface Checkpoint {
  id: string;
  huntId: string;
  order: number;
  title: string;
  /** Privat: var QR-koden sitter. Visas bara för skattgömmaren. */
  hostPlacementNote: string;
  /** Ledtråden som visas för deltagarna och leder TILL den här kontrollpunkten. */
  publicClueText: string;
  /** Visas bara när deltagarna ber om hjälp. */
  helpText: string;
  difficulty: Difficulty;
  qrToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  huntId: string;
  checkpointId: string;
  questionText: string;
  alternatives: string[];
  /** Index i alternatives. */
  correctAnswer: number;
  /** Bara för skattgömmaren. */
  explanation: string;
  ageGroup: AgeGroup;
  theme: string;
  difficulty: Difficulty;
  generatedByAi: boolean;
  approvedByHost: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Mission {
  id: string;
  huntId: string;
  checkpointId: string;
  missionText: string;
  missionType: MissionType;
  points: number;
  required: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Treasure {
  id: string;
  huntId: string;
  hostPlacementNote: string;
  /** Sista ledtråden, som leder till skatten. */
  publicClueText: string;
  helpText: string;
  qrToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  huntId: string;
  name: string;
  /** Kod som fler i samma lag kan använda för att gå med från sin mobil. */
  joinCode: string;
  avatarId: string | null;
  photoUrl: string | null;
  score: number;
  /** Index för kontrollpunkten laget letar efter. Lika med antal kontrollpunkter = letar efter skatten. */
  currentStep: number;
  phase: TeamPhase;
  scheduledStartAt: string | null;
  actualStartAt: string | null;
  status: TeamStatus;
  elapsedSeconds: number | null;
  finishedAt: string | null;
  /** Ordningen i startlistan. */
  startOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  huntId: string;
  teamId: string;
  name: string;
  avatarId: string | null;
  photoUrl: string | null;
  scheduledStartAt: string | null;
  actualStartAt: string | null;
  status: TeamStatus;
  elapsedSeconds: number | null;
  /** Hemlig nyckel som sparas i deltagarens webbläsare. */
  token: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanEvent {
  id: string;
  huntId: string;
  teamId: string;
  participantId: string | null;
  checkpointId: string | null;
  treasureId: string | null;
  scanType: ScanType;
  isCorrectStep: boolean;
  createdAt: string;
}

export interface HintRequest {
  id: string;
  huntId: string;
  teamId: string;
  participantId: string | null;
  /** null betyder att hjälpen gällde skatten. */
  checkpointId: string | null;
  createdAt: string;
  pointsPenalty: number;
}

export interface Answer {
  id: string;
  huntId: string;
  teamId: string;
  participantId: string | null;
  checkpointId: string;
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  createdAt: string;
}

export interface MissionCompletion {
  id: string;
  huntId: string;
  teamId: string;
  participantId: string | null;
  checkpointId: string;
  missionId: string;
  completed: boolean;
  photoUrl: string | null;
  approvedByHost: boolean;
  createdAt: string;
}

/** Förberett för framtida kommersiella jakter. Används inte i MVP. */
export interface CommercialSettings {
  huntId: string;
  ownerType: OwnerType;
  visibility: Visibility;
  sponsorName: string | null;
  prizeDescription: string | null;
  maxParticipants: number | null;
  startDate: string | null;
  endDate: string | null;
  locationName: string | null;
  termsUrl: string | null;
  leadCaptureEnabled: boolean;
  logoUrl: string | null;
  brandColor: string | null;
}

export interface Db {
  hunts: Hunt[];
  checkpoints: Checkpoint[];
  questions: Question[];
  missions: Mission[];
  treasures: Treasure[];
  teams: Team[];
  participants: Participant[];
  scanEvents: ScanEvent[];
  hintRequests: HintRequest[];
  answers: Answer[];
  missionCompletions: MissionCompletion[];
  commercialSettings: CommercialSettings[];
}

export function emptyDb(): Db {
  return {
    hunts: [],
    checkpoints: [],
    questions: [],
    missions: [],
    treasures: [],
    teams: [],
    participants: [],
    scanEvents: [],
    hintRequests: [],
    answers: [],
    missionCompletions: [],
    commercialSettings: [],
  };
}
