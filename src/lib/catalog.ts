import type { AgeGroup, Difficulty, GameMode, ScoringRules, TemplateId, WinMode } from "./types";

export const DEFAULT_SCORING: ScoringRules = {
  checkpointFound: 4,
  correctAnswer: 1,
  missionCompleted: 1,
  treasureFound: 10,
  hintPenalty: 1,
};

export const QUESTIONS_PER_CHECKPOINT = 3;

// ---------------------------------------------------------------------------
// Gränser. Allt är gratis just nu; betalplaner kan läggas till senare.

export interface HuntLimits {
  maxActiveHunts: number;
  defaultClues: number;
  maxClues: number;
  maxTeams: number;
  aiGenerations: number;
  templates: boolean;
  gameModes: GameMode[];
  missions: boolean;
  diploma: boolean;
  photos: boolean;
}

export const LIMITS: HuntLimits = {
  maxActiveHunts: 20,
  defaultClues: 10,
  maxClues: 30,
  maxTeams: 30,
  aiGenerations: 1000,
  templates: true,
  gameModes: ["classic", "calm", "teamBattle"],
  missions: true,
  diploma: true,
  photos: true,
};

// ---------------------------------------------------------------------------

export const GAME_MODES: { id: GameMode; label: string; description: string; available: boolean }[] = [
  { id: "classic", label: "Klassisk skattjakt", description: "Alla följer samma ledtrådskedja fram till skatten.", available: true },
  { id: "calm", label: "Lugn jakt", description: "Samma kedja, utan klocka och med extra tydliga steg.", available: true },
  { id: "teamBattle", label: "Lagkamp", description: "Flera lag tävlar i samma jakt, gärna med startintervall.", available: true },
  { id: "pointHunt", label: "Poängjakt", description: "Hitta punkter i valfri ordning. Kommer senare.", available: false },
];

export const WIN_MODES: { id: WinMode; label: string; description: string }[] = [
  { id: "fastest", label: "Snabbast vinner", description: "Tiden räknas från varje lags egen starttid." },
  { id: "points", label: "Flest poäng vinner", description: "Vid lika poäng vinner den som hittade skatten snabbast." },
];

export const AGE_GROUPS: { id: AgeGroup; label: string }[] = [
  { id: "child", label: "Barn" },
  { id: "youth", label: "Ungdom" },
  { id: "adult", label: "Vuxen" },
];

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Enkel" },
  { id: "medium", label: "Medel" },
  { id: "tricky", label: "Klurig" },
];

export const THEMES: { id: string; label: string }[] = [
  { id: "animals", label: "Djur" },
  { id: "nature", label: "Natur" },
  { id: "sports", label: "Sport" },
  { id: "music", label: "Musik" },
  { id: "film", label: "Film" },
  { id: "history", label: "Historia" },
  { id: "geography", label: "Geografi" },
  { id: "space", label: "Rymden" },
  { id: "puzzles", label: "Klurigheter" },
  { id: "fairytales", label: "Sagor" },
  { id: "pirates", label: "Pirater" },
  { id: "mystery", label: "Mysterium" },
  { id: "family", label: "Familj" },
  { id: "mixed", label: "Blandat" },
];

export const themeLabel = (id: string) => THEMES.find((t) => t.id === id)?.label ?? id;

// ---------------------------------------------------------------------------
// Mallar

export interface Template {
  id: TemplateId;
  label: string;
  description: string;
  themes: string[];
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  /** Tema som AI-frågorna ska få extra fokus på. */
  focus: string[];
  missions: string[];
  treasureClue: string;
}

export const MISSION_EXAMPLES: string[] = [
  "Ta en lagbild där alla gör tummen upp.",
  "Hitta något grönt innan ni går vidare.",
  "Gör en high-five med alla i laget.",
  "Räkna hur många fönster ni ser från platsen.",
  "Hitta något runt.",
  "Hitta något som börjar på bokstaven S.",
  "Alla i laget ska säga en sak de är bra på.",
  "Gör en konstig grimas.",
  "Hitta något som låter.",
  "Gå tio steg bakåt och titta igen.",
];

export const TEMPLATES: Template[] = [
  {
    id: "none",
    label: "Ingen mall",
    description: "Börja från början.",
    themes: ["mixed"],
    ageGroup: "child",
    difficulty: "easy",
    focus: [],
    missions: MISSION_EXAMPLES,
    treasureClue: "Sista ledtråden leder till skatten!",
  },
  {
    id: "birthday",
    label: "Barnkalas",
    description: "Lekfull jakt med korta ledtrådar, enkla frågor, roliga uppdrag och diplom efteråt.",
    themes: ["animals", "fairytales"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["kalas", "lekar", "djur"],
    missions: [MISSION_EXAMPLES[2], MISSION_EXAMPLES[7], MISSION_EXAMPLES[1], MISSION_EXAMPLES[0], MISSION_EXAMPLES[4]],
    treasureClue: "Skatten väntar där kalaset började. Leta där ni brukar öppna paket!",
  },
  {
    id: "easter",
    label: "Påskägg",
    description: "Påsk, vår, godis och gömda ägg. Slutskatten är ett påskägg.",
    themes: ["nature", "family"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["påsk", "vår", "ägg", "kycklingar", "godis"],
    missions: [
      "Hoppa som en påskhare tio gånger.",
      "Hitta något gult, som en kyckling.",
      MISSION_EXAMPLES[2],
      "Kackla som en höna allihop!",
    ],
    treasureClue: "Påskharen har gömt det stora ägget. Leta där ni hittar vårens första blomma!",
  },
  {
    id: "midsummer",
    label: "Midsommar",
    description: "Sommar, natur, blommor, lekar och familj.",
    themes: ["nature", "family"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["sommar", "blommor", "midsommar", "lekar"],
    missions: [
      "Plocka (eller hitta) tre olika blommor.",
      "Gör små grodorna-hoppet tre gånger.",
      MISSION_EXAMPLES[1],
      MISSION_EXAMPLES[6],
    ],
    treasureClue: "Där stången står när vi dansar, finns er skatt.",
  },
  {
    id: "schoolyard",
    label: "Skolgården",
    description: "För skola, fritids eller förening. Samarbete, tydliga instruktioner och låg stress.",
    themes: ["mixed", "nature"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["samarbete", "skola", "kunskap"],
    missions: [MISSION_EXAMPLES[6], MISSION_EXAMPLES[3], MISSION_EXAMPLES[5], MISSION_EXAMPLES[2]],
    treasureClue: "Där ni ställer upp er efter rasten finns skatten.",
  },
  {
    id: "corporate",
    label: "Företagsevent",
    description: "Kickoff, mässa eller företagsaktivitet. Lagarbete och stationer.",
    themes: ["mixed", "puzzles"],
    ageGroup: "adult",
    difficulty: "medium",
    focus: ["lagarbete", "företag", "kunskap"],
    missions: [
      "Ta en lagbild med något i företagets färg.",
      MISSION_EXAMPLES[6],
      "Hitta någon utanför laget och säg hej.",
    ],
    treasureClue: "Där dagen startade och kaffet serverades, väntar skatten.",
  },
  {
    id: "candy",
    label: "Godisjakten",
    description: "En enkel och rolig jakt där slutmålet är godis. Snabb start.",
    themes: ["family", "animals"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["godis", "färger", "smaker"],
    missions: [
      "Hitta något som har samma färg som ert favoritgodis.",
      MISSION_EXAMPLES[2],
      MISSION_EXAMPLES[7],
    ],
    treasureClue: "Godiset finns där det är svalt och mörkt. Titta där maten sover!",
  },
];

export const templateById = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

// ---------------------------------------------------------------------------
// Avatarer (emoji, så att inga bilder behövs).

export interface Avatar {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export const TEAM_AVATARS: Avatar[] = [
  { id: "foxes", emoji: "🦊", label: "Rävarna", color: "#FBDDBF" },
  { id: "bears", emoji: "🐻", label: "Björnarna", color: "#EADBC8" },
  { id: "owls", emoji: "🦉", label: "Ugglorna", color: "#E9E4FF" },
  { id: "dragons", emoji: "🐉", label: "Drakarna", color: "#D3EADF" },
  { id: "stars", emoji: "⭐", label: "Stjärnorna", color: "#FBEBB5" },
  { id: "lightning", emoji: "⚡", label: "Blixtarna", color: "#D9F0F2" },
  { id: "rabbits", emoji: "🐰", label: "Kaninerna", color: "#F7E1EA" },
  { id: "squirrels", emoji: "🐿️", label: "Ekorrarna", color: "#FCDCD6" },
  { id: "comets", emoji: "☄️", label: "Kometerna", color: "#E9E4FF" },
  { id: "explorers", emoji: "🧭", label: "Upptäckarna", color: "#D3EADF" },
];

// Avatarer som inte längre går att välja, men som lag skapade tidigare kan ha.
const OLD_AVATARS: Avatar[] = [
  { id: "pirates", emoji: "🦜", label: "Piraterna", color: "#D9F0F2" },
  { id: "unicorns", emoji: "🦄", label: "Enhörningarna", color: "#E9E4FF" },
];

export const PERSON_AVATARS: Avatar[] = [
  { id: "cat", emoji: "🐱", label: "Katt", color: "#FBDDBF" },
  { id: "dog", emoji: "🐶", label: "Hund", color: "#EADBC8" },
  { id: "rabbit", emoji: "🐰", label: "Kanin", color: "#F7E1EA" },
  { id: "panda", emoji: "🐼", label: "Panda", color: "#E4E9EC" },
  { id: "frog", emoji: "🐸", label: "Groda", color: "#D3EADF" },
  { id: "lion", emoji: "🦁", label: "Lejon", color: "#FBEBB5" },
  { id: "robot", emoji: "🤖", label: "Robot", color: "#D9F0F2" },
  { id: "astronaut", emoji: "🧑‍🚀", label: "Astronaut", color: "#E9E4FF" },
];

export const ALL_AVATARS = [...TEAM_AVATARS, ...PERSON_AVATARS, ...OLD_AVATARS];
export const avatarById = (id: string | null | undefined) => ALL_AVATARS.find((a) => a.id === id) ?? null;
