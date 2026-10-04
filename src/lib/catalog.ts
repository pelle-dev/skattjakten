import type { AgeGroup, Difficulty, GameMode, Language, Plan, ScoringRules, TemplateId, WinMode } from "./types";

export type Text = Record<Language, string>;

export const DEFAULT_SCORING: ScoringRules = {
  checkpointFound: 4,
  correctAnswer: 1,
  missionCompleted: 1,
  treasureFound: 10,
  hintPenalty: 1,
};

export const QUESTIONS_PER_CHECKPOINT = 3;

// ---------------------------------------------------------------------------
// Planer (freemium). Betalning byggs inte i MVP – planen är ett internt läge.

export interface PlanLimits {
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

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxActiveHunts: 1,
    defaultClues: 3,
    maxClues: 3,
    maxTeams: 2,
    aiGenerations: 6,
    templates: false,
    gameModes: ["classic"],
    missions: false,
    diploma: false,
    photos: false,
  },
  paid: {
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
  },
};

export const PLAN_LABEL: Record<Plan, string> = { free: "Gratis", paid: "Betald" };

// ---------------------------------------------------------------------------

export const GAME_MODES: { id: GameMode; label: Text; description: string; available: boolean }[] = [
  { id: "classic", label: { sv: "Klassisk skattjakt", en: "Classic treasure trail" }, description: "Alla följer samma ledtrådskedja fram till skatten.", available: true },
  { id: "calm", label: { sv: "Lugn jakt", en: "Calm trail" }, description: "Samma kedja, utan klocka och med extra tydliga steg.", available: true },
  { id: "teamBattle", label: { sv: "Lagkamp", en: "Team battle" }, description: "Flera lag tävlar i samma jakt, gärna med startintervall.", available: true },
  { id: "pointHunt", label: { sv: "Poängjakt", en: "Point hunt" }, description: "Hitta punkter i valfri ordning. Kommer senare.", available: false },
];

export const WIN_MODES: { id: WinMode; label: Text; description: string }[] = [
  { id: "fastest", label: { sv: "Snabbast vinner", en: "Fastest wins" }, description: "Tiden räknas från varje lags egen starttid." },
  { id: "points", label: { sv: "Flest poäng vinner", en: "Most points wins" }, description: "Vid lika poäng vinner den som hittade skatten snabbast." },
];

export const AGE_GROUPS: { id: AgeGroup; label: Text }[] = [
  { id: "child", label: { sv: "Barn", en: "Children" } },
  { id: "youth", label: { sv: "Ungdom", en: "Youth" } },
  { id: "adult", label: { sv: "Vuxen", en: "Adults" } },
];

export const DIFFICULTIES: { id: Difficulty; label: Text }[] = [
  { id: "easy", label: { sv: "Enkel", en: "Easy" } },
  { id: "medium", label: { sv: "Medel", en: "Medium" } },
  { id: "tricky", label: { sv: "Klurig", en: "Tricky" } },
];

export const THEMES: { id: string; label: Text }[] = [
  { id: "animals", label: { sv: "Djur", en: "Animals" } },
  { id: "nature", label: { sv: "Natur", en: "Nature" } },
  { id: "sports", label: { sv: "Sport", en: "Sports" } },
  { id: "music", label: { sv: "Musik", en: "Music" } },
  { id: "film", label: { sv: "Film", en: "Film" } },
  { id: "history", label: { sv: "Historia", en: "History" } },
  { id: "geography", label: { sv: "Geografi", en: "Geography" } },
  { id: "space", label: { sv: "Rymden", en: "Space" } },
  { id: "puzzles", label: { sv: "Klurigheter", en: "Brain teasers" } },
  { id: "fairytales", label: { sv: "Sagor", en: "Fairy tales" } },
  { id: "pirates", label: { sv: "Pirater", en: "Pirates" } },
  { id: "mystery", label: { sv: "Mysterium", en: "Mystery" } },
  { id: "family", label: { sv: "Familj", en: "Family" } },
  { id: "mixed", label: { sv: "Blandat", en: "Mixed" } },
];

export const themeLabel = (id: string, lang: Language) => THEMES.find((t) => t.id === id)?.label[lang] ?? id;

// ---------------------------------------------------------------------------
// Mallar

export interface Template {
  id: TemplateId;
  label: Text;
  description: string;
  themes: string[];
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  /** Tema som AI-frågorna ska få extra fokus på. */
  focus: string[];
  missions: Text[];
  treasureClue: Text;
}

export const MISSION_EXAMPLES: Text[] = [
  { sv: "Ta en lagbild där alla gör tummen upp.", en: "Take a team photo with everyone giving a thumbs up." },
  { sv: "Hitta något grönt innan ni går vidare.", en: "Find something green before you move on." },
  { sv: "Gör en high-five med alla i laget.", en: "High-five everyone in your team." },
  { sv: "Räkna hur många fönster ni ser från platsen.", en: "Count how many windows you can see from here." },
  { sv: "Hitta något runt.", en: "Find something round." },
  { sv: "Hitta något som börjar på bokstaven S.", en: "Find something that starts with the letter S." },
  { sv: "Alla i laget ska säga en sak de är bra på.", en: "Everyone in the team says one thing they are good at." },
  { sv: "Gör en konstig grimas.", en: "Make a funny face." },
  { sv: "Hitta något som låter.", en: "Find something that makes a sound." },
  { sv: "Gå tio steg bakåt och titta igen.", en: "Walk ten steps backwards and look again." },
];

export const TEMPLATES: Template[] = [
  {
    id: "none",
    label: { sv: "Ingen mall", en: "No template" },
    description: "Börja från början.",
    themes: ["mixed"],
    ageGroup: "child",
    difficulty: "easy",
    focus: [],
    missions: MISSION_EXAMPLES,
    treasureClue: { sv: "Sista ledtråden leder till skatten!", en: "The last clue leads to the treasure!" },
  },
  {
    id: "birthday",
    label: { sv: "Barnkalas", en: "Birthday party" },
    description: "Lekfull jakt med korta ledtrådar, enkla frågor, roliga uppdrag och diplom efteråt.",
    themes: ["animals", "fairytales"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["kalas", "lekar", "djur"],
    missions: [MISSION_EXAMPLES[2], MISSION_EXAMPLES[7], MISSION_EXAMPLES[1], MISSION_EXAMPLES[0], MISSION_EXAMPLES[4]],
    treasureClue: { sv: "Skatten väntar där kalaset började. Leta där ni brukar öppna paket!", en: "The treasure waits where the party began. Look where presents get opened!" },
  },
  {
    id: "easter",
    label: { sv: "Påskägg", en: "Easter egg" },
    description: "Påsk, vår, godis och gömda ägg. Slutskatten är ett påskägg.",
    themes: ["nature", "family"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["påsk", "vår", "ägg", "kycklingar", "godis"],
    missions: [
      { sv: "Hoppa som en påskhare tio gånger.", en: "Hop like an Easter bunny ten times." },
      { sv: "Hitta något gult, som en kyckling.", en: "Find something yellow, like a chick." },
      MISSION_EXAMPLES[2],
      { sv: "Kackla som en höna allihop!", en: "Everyone cluck like a hen!" },
    ],
    treasureClue: { sv: "Påskharen har gömt det stora ägget. Leta där ni hittar vårens första blomma!", en: "The Easter bunny hid the big egg. Look where spring's first flower grows!" },
  },
  {
    id: "midsummer",
    label: { sv: "Midsommar", en: "Midsummer" },
    description: "Sommar, natur, blommor, lekar och familj.",
    themes: ["nature", "family"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["sommar", "blommor", "midsommar", "lekar"],
    missions: [
      { sv: "Plocka (eller hitta) tre olika blommor.", en: "Find three different flowers." },
      { sv: "Gör små grodorna-hoppet tre gånger.", en: "Do the little frogs jump three times." },
      MISSION_EXAMPLES[1],
      MISSION_EXAMPLES[6],
    ],
    treasureClue: { sv: "Där stången står när vi dansar, finns er skatt.", en: "Where the maypole stands when we dance, your treasure is found." },
  },
  {
    id: "schoolyard",
    label: { sv: "Skolgården", en: "Schoolyard" },
    description: "För skola, fritids eller förening. Samarbete, tydliga instruktioner och låg stress.",
    themes: ["mixed", "nature"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["samarbete", "skola", "kunskap"],
    missions: [MISSION_EXAMPLES[6], MISSION_EXAMPLES[3], MISSION_EXAMPLES[5], MISSION_EXAMPLES[2]],
    treasureClue: { sv: "Där ni ställer upp er efter rasten finns skatten.", en: "Where you line up after break, the treasure is waiting." },
  },
  {
    id: "corporate",
    label: { sv: "Företagsevent", en: "Corporate event" },
    description: "Kickoff, mässa eller företagsaktivitet. Lagarbete och stationer.",
    themes: ["mixed", "puzzles"],
    ageGroup: "adult",
    difficulty: "medium",
    focus: ["lagarbete", "företag", "kunskap"],
    missions: [
      { sv: "Ta en lagbild med något i företagets färg.", en: "Take a team photo with something in the company colour." },
      MISSION_EXAMPLES[6],
      { sv: "Hitta någon utanför laget och säg hej.", en: "Find someone outside your team and say hello." },
    ],
    treasureClue: { sv: "Där dagen startade och kaffet serverades, väntar skatten.", en: "Where the day started and coffee was served, the treasure awaits." },
  },
  {
    id: "candy",
    label: { sv: "Godisjakten", en: "Candy hunt" },
    description: "En enkel och rolig jakt där slutmålet är godis. Snabb start.",
    themes: ["family", "animals"],
    ageGroup: "child",
    difficulty: "easy",
    focus: ["godis", "färger", "smaker"],
    missions: [
      { sv: "Hitta något som har samma färg som ert favoritgodis.", en: "Find something the same colour as your favourite candy." },
      MISSION_EXAMPLES[2],
      MISSION_EXAMPLES[7],
    ],
    treasureClue: { sv: "Godiset finns där det är svalt och mörkt. Titta där maten sover!", en: "The candy is where it is cool and dark. Look where the food sleeps!" },
  },
];

export const templateById = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

// ---------------------------------------------------------------------------
// Avatarer (emoji, så att inga bilder behövs).

export interface Avatar {
  id: string;
  emoji: string;
  label: Text;
  color: string;
}

export const TEAM_AVATARS: Avatar[] = [
  { id: "foxes", emoji: "🦊", label: { sv: "Rävarna", en: "The Foxes" }, color: "#f6a04d" },
  { id: "bears", emoji: "🐻", label: { sv: "Björnarna", en: "The Bears" }, color: "#b07a4f" },
  { id: "owls", emoji: "🦉", label: { sv: "Ugglorna", en: "The Owls" }, color: "#8d7bd8" },
  { id: "dragons", emoji: "🐉", label: { sv: "Drakarna", en: "The Dragons" }, color: "#4cb782" },
  { id: "stars", emoji: "⭐", label: { sv: "Stjärnorna", en: "The Stars" }, color: "#f2c94c" },
  { id: "lightning", emoji: "⚡", label: { sv: "Blixtarna", en: "The Lightnings" }, color: "#56a8f5" },
  { id: "pirates", emoji: "🏴‍☠️", label: { sv: "Piraterna", en: "The Pirates" }, color: "#555c6e" },
  { id: "unicorns", emoji: "🦄", label: { sv: "Enhörningarna", en: "The Unicorns" }, color: "#ef8fc4" },
];

export const PERSON_AVATARS: Avatar[] = [
  { id: "cat", emoji: "🐱", label: { sv: "Katt", en: "Cat" }, color: "#f6a04d" },
  { id: "dog", emoji: "🐶", label: { sv: "Hund", en: "Dog" }, color: "#b07a4f" },
  { id: "rabbit", emoji: "🐰", label: { sv: "Kanin", en: "Rabbit" }, color: "#ef8fc4" },
  { id: "panda", emoji: "🐼", label: { sv: "Panda", en: "Panda" }, color: "#555c6e" },
  { id: "frog", emoji: "🐸", label: { sv: "Groda", en: "Frog" }, color: "#4cb782" },
  { id: "lion", emoji: "🦁", label: { sv: "Lejon", en: "Lion" }, color: "#f2c94c" },
  { id: "robot", emoji: "🤖", label: { sv: "Robot", en: "Robot" }, color: "#56a8f5" },
  { id: "astronaut", emoji: "🧑‍🚀", label: { sv: "Astronaut", en: "Astronaut" }, color: "#8d7bd8" },
];

export const ALL_AVATARS = [...TEAM_AVATARS, ...PERSON_AVATARS];
export const avatarById = (id: string | null | undefined) => ALL_AVATARS.find((a) => a.id === id) ?? null;
