// Testscenariot "Testjakten": färdig jakt med 3 ledtrådar, skatt, frågor, uppdrag och 2 lag.

import { addTeam, checkpointsOf, createHunt, saveQuestion, setMission, treasureOf, updateCheckpoint, updateTreasure } from "./hunts";
import type { Db, Hunt } from "./types";

const CHECKPOINTS = [
  {
    hostPlacementNote: "Under den röda bänken vid lekplatsen.",
    publicClueText: "Där man kan vila mellan lekarna finns första spåret. Leta under något rött.",
    helpText: "Leta vid den röda bänken på lekplatsen.",
    mission: "Gör en high-five med alla i laget.",
    questions: [
      { questionText: "Vilket djur säger ”mu”?", alternatives: ["Ko", "Gris", "Häst"], correctAnswer: 0 },
      { questionText: "Hur många ben har en spindel?", alternatives: ["6", "8", "10"], correctAnswer: 1 },
      { questionText: "Vilken färg har gräs på sommaren?", alternatives: ["Lila", "Grönt", "Orange"], correctAnswer: 1 },
    ],
  },
  {
    hostPlacementNote: "I håligheten i den stora eken bakom huset.",
    publicClueText: "Bakom huset står något gammalt och starkt. Där naturen själv har gjort ett gömställe.",
    helpText: "Titta i hålet i den stora eken bakom huset.",
    mission: "Hitta något grönt innan ni går vidare.",
    questions: [
      { questionText: "Vad växer på en ek?", alternatives: ["Kottar", "Ekollon", "Äpplen"], correctAnswer: 1 },
      { questionText: "Vilket djur sover hela vintern?", alternatives: ["Björn", "Häst", "Ko"], correctAnswer: 0 },
      { questionText: "Vad tappade Askungen på balen?", alternatives: ["En hatt", "En ring", "En sko"], correctAnswer: 2 },
    ],
  },
  {
    hostPlacementNote: "Bakom blomkrukan vid entrén.",
    publicClueText: "Leta där något grönt bor i en liten burk, nära dörren där gästerna kommer in.",
    helpText: "Titta bakom blomkrukan vid entrén.",
    mission: "Gör en konstig grimas allihop!",
    questions: [
      { questionText: "Vad äter man ofta på en födelsedag?", alternatives: ["Tårta", "Soppa", "Gröt"], correctAnswer: 0 },
      { questionText: "Vilket djur har en lång snabel?", alternatives: ["Giraff", "Elefant", "Zebra", "Lejon"], correctAnswer: 1 },
      { questionText: "Hur många dagar har en vecka?", alternatives: ["5", "7", "10"], correctAnswer: 1 },
    ],
  },
];

export function createTestjakten(db: Db, now = new Date()): Hunt {
  const hunt = createHunt(
    db,
    {
      name: "Testjakten",
      language: "sv",
      description: "Exempeljakt för att testa hela flödet: 3 ledtrådar, 2 lag och 2 minuters startintervall.",
      template: "birthday",
      gameMode: "classic",
      playMode: "team",
      ageGroup: "child",
      themes: ["animals", "fairytales"],
      difficulty: "easy",
      plan: "paid",
      clueCount: 3,
      winMode: "points",
      startMode: "staggered",
      startIntervalMinutes: 2,
      allowPhotos: true,
    },
    now,
  );
  hunt.isDemo = true;
  checkpointsOf(db, hunt.id).forEach((cp, i) => {
    const data = CHECKPOINTS[i];
    updateCheckpoint(db, cp.id, { hostPlacementNote: data.hostPlacementNote, publicClueText: data.publicClueText, helpText: data.helpText }, now);
    setMission(db, cp.id, data.mission, now);
    for (const q of data.questions) saveQuestion(db, cp.id, { ...q, approvedByHost: true }, now);
  });
  updateTreasure(
    db,
    hunt.id,
    {
      hostPlacementNote: "I kylskåpet, längst in på översta hyllan.",
      publicClueText: "Skatten finns där det är kallt och maten sover. Titta högst upp!",
      helpText: "Öppna kylskåpet och titta på översta hyllan.",
    },
    now,
  );
  addTeam(db, hunt.id, { name: "Rävarna", avatarId: "foxes" }, now);
  addTeam(db, hunt.id, { name: "Ugglorna", avatarId: "owls" }, now);
  if (!treasureOf(db, hunt.id)) throw new Error("Testjakten saknar skatt");
  return hunt;
}
