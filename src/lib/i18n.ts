// Texter som deltagarna ser. Appen är bara på svenska.

const sv = {
  appName: "Skattjakten",
  join: "Gå med",
  joinTitle: "Gå med i en skattjakt",
  joinCode: "Kod till skattjakten",
  teamCode: "Lagkod",
  joinExistingTeam: "Gå med i ett lag som redan finns",
  yourName: "Ditt namn",
  teamName: "Lagnamn",
  chooseLook: "Välj hur ni vill synas",
  chooseAvatar: "Välj en avatar",
  takePhoto: "Ta en bild",
  choosePhoto: "Ta eller välj en bild",
  removePhoto: "Ta bort bilden",
  skip: "Hoppa över",
  photoPrivate: "Bilden visas bara för er och skattgömmaren.",
  start: "Kör!",
  waitingTitle: "Snart börjar jakten!",
  waitingForHost: "Väntar på att skattgömmaren startar jakten.",
  startsIn: "Er skattjakt startar om",
  pausedTitle: "Paus",
  paused: "Skattjakten är pausad just nu. Vänta lite, snart fortsätter den.",
  step: "Steg {n} av {total}",
  clue: "Ledtråd",
  treasureClue: "Sista ledtråden – till skatten!",
  scan: "Scanna QR-kod",
  help: "Be om hjälp",
  helpConfirm: "Vill ni ha hjälp? Det kostar {n} poäng.",
  helpYes: "Ja, visa hjälp",
  helpNo: "Nej, vi letar själva",
  helpLabel: "Hjälp",
  points: "poäng",
  score: "Poäng",
  time: "Tid",
  found: "Bra jobbat! Ni hittade rätt plats.",
  foundTreasure: "Ni hittade skatten!",
  questionsTitle: "Svara på frågorna",
  questionN: "Fråga {n} av {total}",
  correct: "Rätt svar! +{n}",
  wrong: "Inte riktigt. Rätt svar var: {answer}",
  continue: "Fortsätt",
  missionTitle: "Uppdrag",
  missionDone: "Klart!",
  missionSkip: "Hoppa över",
  nextUnlocked: "Snyggt! Nästa ledtråd är upplåst.",
  onTrack: "Ni är på rätt spår.",
  whatNow: "Vad händer nu?",
  whatNowSeeking: "Läs ledtråden. Gå till platsen. Scanna QR-koden.",
  whatNowQuestions: "Svara på frågorna. Sedan får ni nästa ledtråd.",
  whatNowMission: "Gör uppdraget tillsammans och tryck på Klart.",
  scanTitle: "Scanna QR-koden",
  scanHint: "Håll kameran mot QR-koden.",
  scanCameraError: "Kameran gick inte att starta. Använd mobilens vanliga kamera-app och scanna QR-koden därifrån.",
  close: "Stäng",
  scan_notStarted: "Er jakt har inte startat ännu. Vänta tills nedräkningen är klar.",
  scan_paused: "Skattjakten är pausad just nu.",
  scan_huntFinished: "Skattjakten är avslutad.",
  scan_teamFinished: "Ni har redan hittat skatten!",
  scan_alreadyFound: "Den här platsen har ni redan hittat. Fortsätt följa er nuvarande ledtråd.",
  scan_finishStepFirst: "Nästan där! Gör klart frågorna och uppdraget här först.",
  scan_wrongStep: "Ni har hittat en riktig ledtråd, men inte den ni letar efter just nu. Fortsätt följa er nuvarande ledtråd.",
  scan_unknown: "Den här QR-koden hör inte till er skattjakt.",
  finishedTitle: "Ni klarade Skattjakten!",
  waitingResults: "Väntar på att skattjakten avslutas. Sedan visas resultatet.",
  results: "Resultat",
  place: "Plats",
  winner: "Vinnare",
  diploma: "Diplom",
  showDiploma: "Visa diplom",
  print: "Skriv ut / spara",
  diplomaText: "Ni klarade Skattjakten!",
  diplomaTextSingle: "Du klarade Skattjakten!",
  date: "Datum",
  checkpointsFound: "Hittade platser",
  correctAnswers: "Rätta svar",
  missionsDone: "Uppdrag",
  hints: "Hjälp",
  treasure: "Skatten",
  yes: "Ja",
  no: "Nej",
  team: "Lag",
  members: "Fler i laget kan gå med med koden",
  notJoined: "Du är inte med i den här skattjakten ännu.",
  joinFirst: "Gå med först",
  scanRegistered: "Scanning registrerad",
  goToHunt: "Till skattjakten",
  calmBreak: "Ta det lugnt. Det finns ingen brådska.",
} as const;

export type TextKey = keyof typeof sv;

export function t(key: TextKey, vars?: Record<string, string | number>): string {
  let s: string = sv[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
