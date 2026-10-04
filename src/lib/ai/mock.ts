// Mockad AI: används när ingen ANTHROPIC_API_KEY finns, så att hela flödet går att testa lokalt.

import type { AgeGroup, Difficulty } from "../types";
import type { GeneratedQuestion } from "./types";

interface Place {
  words: string[];
  text: { medium: string; tricky: string };
}

// Kända platser/föremål → gåtfulla omskrivningar.
const PLACES: Place[] = [
  {
    words: ["bänk", "bench"],
    text: { medium: "Där man kan vila benen en stund finns nästa spår.", tricky: "När benen behöver paus efter spring och skratt, finns nästa spår där man sitter." },
  },
  {
    words: ["ek", "träd", "tree", "oak", "björk", "gran", "tall"],
    text: { medium: "Leta vid något som är gammalt, högt och har löv eller barr.", tricky: "Jag har rötter men inga fötter, en krona men ingen kung. Vad är jag?" },
  },
  {
    words: ["dörr", "door", "förråd", "shed"],
    text: { medium: "Det som öppnas och stängs men aldrig går någonstans gömmer nästa spår.", tricky: "Jag har ett handtag men är ingen kopp, jag har ett lås men är ingen kista." },
  },
  {
    words: ["brevlåda", "mailbox", "postlåda"],
    text: { medium: "Där breven sover innan någon hämtar dem.", tricky: "Jag äter papper varje dag men blir aldrig mätt." },
  },
  {
    words: ["kruka", "blomkruka", "pot", "flowerpot", "blomma", "flower"],
    text: { medium: "Leta där något grönt bor i en liten burk.", tricky: "Mitt hus är runt och mina hyresgäster växer långsamt mot solen." },
  },
  {
    words: ["sten", "stone", "rock"],
    text: { medium: "Under något tungt och grått som legat där väldigt länge.", tricky: "Jag har legat här längre än alla ni, tung och tyst. Titta under mig." },
  },
  {
    words: ["gunga", "swing", "lekplats", "playground", "rutschkana", "slide", "sandlåda", "sandbox"],
    text: { medium: "Där man leker och skrattar finns nästa spår.", tricky: "Fram och tillbaka, upp mot himlen – men aldrig iväg. Där väntar nästa spår." },
  },
  {
    words: ["trappa", "stairs", "steps", "trapp"],
    text: { medium: "Leta där man går upp och ner, steg för steg.", tricky: "Jag har många steg men går ingenstans." },
  },
  {
    words: ["staket", "fence", "grind", "gate"],
    text: { medium: "Leta vid det som håller ihop trädgården.", tricky: "Jag står vakt runt gården dag och natt utan att sova." },
  },
  {
    words: ["cykel", "bike", "bicycle"],
    text: { medium: "Leta vid något med två hjul och en ringklocka.", tricky: "Jag har två hjul och en kedja, men jag är ingen fånge." },
  },
  {
    words: ["kylskåp", "fridge", "kyl"],
    text: { medium: "Där det är kallt och maten sover.", tricky: "Jag är kall inuti och lyser när du öppnar mig." },
  },
  {
    words: ["soffa", "sofa", "couch", "kudde", "cushion"],
    text: { medium: "Där man myser och tittar på film.", tricky: "Jag är mjuk och bred och alla vill sitta på mig på fredagskvällen." },
  },
];

const SV_NEUTER: Record<string, string> = {
  röd: "rött", röda: "rött", blå: "blått", blåa: "blått", gul: "gult", gula: "gult",
  grön: "grönt", gröna: "grönt", vit: "vitt", vita: "vitt", svart: "svart", svarta: "svart",
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const trimDot = (s: string) => s.trim().replace(/[.!]+$/, "");

export function mockClue(note: string, difficulty: Difficulty, variant = 0): string {
  const clean = trimDot(note) || "på ett hemligt ställe";
  const lower = clean.toLowerCase();
  if (difficulty === "easy") {
    const easy = [`Leta ${lowerFirst(clean)}.`, `Gå dit och titta noga: ${lowerFirst(clean)}.`, `Nästa spår finns ${lowerFirst(clean)}.`];
    return easy[variant % easy.length];
  }
  const matches = PLACES.filter((p) => p.words.some((w) => lower.includes(w)));
  const place = matches[variant % Math.max(1, matches.length)];
  const colorWord = lower.match(/(?<![a-zåäö])(röda|röd|blåa|blå|gula|gul|gröna|grön|vita|vit|svarta|svart)(?![a-zåäö])/)?.[0];
  if (place) {
    let text = place.text[difficulty];
    if (colorWord && difficulty === "medium") text += ` Leta efter något ${SV_NEUTER[colorWord] ?? colorWord}.`;
    return text;
  }
  const generic = {
    medium: ["Nästa spår är gömt på ett ställe ni har gått förbi många gånger.", "Titta lågt och titta noga – nästa spår är närmare än ni tror."],
    tricky: ["Jag är gömd där ingen brukar titta, men alla har sett mig.", "Gå dit vardagen händer, men leta där ögonen sällan landar."],
  };
  const list = generic[difficulty];
  return list[variant % list.length];
}

export function mockHelp(note: string): string {
  const clean = trimDot(note);
  if (!clean) return "Läs ledtråden en gång till och titta runt omkring er.";
  return `Leta ${lowerFirst(clean)}.`;
}

// ---------------------------------------------------------------------------
// Frågebank

type Bank = Record<string, GeneratedQuestion[]>;
const q = (questionText: string, alternatives: string[], correctAnswer: number, explanation = ""): GeneratedQuestion => ({
  questionText,
  alternatives,
  correctAnswer,
  explanation,
});

const CHILD: Bank = {
  animals: [
    q("Vilket djur säger ”mu”?", ["Ko", "Gris", "Häst"], 0),
    q("Hur många ben har en spindel?", ["6", "8", "10"], 1),
    q("Vilket djur har en lång snabel?", ["Giraff", "Elefant", "Zebra", "Lejon"], 1),
    q("Vad äter en kanin helst?", ["Morötter", "Fisk", "Godis"], 0),
    q("Vilket djur sover hela vintern?", ["Björn", "Häst", "Ko"], 0),
    q("Vilken fågel kan inte flyga?", ["Pingvin", "Kråka", "Duva"], 0),
    q("Var bor en fisk?", ["I vatten", "I ett träd", "Under jorden"], 0),
    q("Vad kallas en hundunge?", ["Kattunge", "Valp", "Kalv"], 1),
  ],
  nature: [
    q("Vilken färg har gräs på sommaren?", ["Grönt", "Lila", "Orange"], 0),
    q("Vad behöver en blomma för att växa?", ["Vatten och sol", "Godis", "Snö"], 0),
    q("Vilken årstid kommer efter vintern?", ["Hösten", "Våren", "Sommaren"], 1),
    q("Vad växer på en ek?", ["Kottar", "Ekollon", "Äpplen"], 1),
    q("Vad kallas fruset vatten?", ["Is", "Ånga", "Sand"], 0),
    q("Vilket av dessa är ett bär?", ["Blåbär", "Gran", "Mossa"], 0),
  ],
  space: [
    q("Vad heter planeten vi bor på?", ["Mars", "Jorden", "Venus"], 1),
    q("Vad lyser på himlen på dagen?", ["Månen", "Solen", "Stjärnorna"], 1),
    q("Vad kallas en person som åker till rymden?", ["Astronaut", "Pirat", "Kock"], 0),
    q("Vilken färg brukar Mars kallas?", ["Den röda planeten", "Den blå planeten", "Den gröna planeten"], 0),
  ],
  fairytales: [
    q("Vem bor med de sju dvärgarna?", ["Snövit", "Askungen", "Rapunzel"], 0),
    q("Vad tappade Askungen på balen?", ["En sko", "En hatt", "En ring"], 0),
    q("Vem ville äta upp Rödluvan?", ["Vargen", "Björnen", "Räven"], 0),
    q("Hur många grisar finns i sagan om husen?", ["Två", "Tre", "Fyra"], 1),
    q("Vad har Pippi Långstrump för häst?", ["Lilla Gubben", "Stora Gubben", "Herr Nilsson"], 0),
  ],
  pirates: [
    q("Vad letar pirater ofta efter?", ["Skatter", "Snö", "Läxor"], 0),
    q("Vilket djur sitter ofta på en pirats axel?", ["Papegoja", "Katt", "Ko"], 0),
    q("Vad visar var skatten är gömd?", ["En skattkarta", "En kokbok", "En klocka"], 0),
    q("Vad seglar pirater med?", ["Skepp", "Tåg", "Flygplan"], 0),
  ],
  family: [
    q("Vad kallas din mammas mamma?", ["Mormor", "Farmor", "Faster"], 0),
    q("Hur många dagar har en vecka?", ["5", "7", "10"], 1),
    q("Vad äter man ofta på en födelsedag?", ["Tårta", "Soppa", "Gröt"], 0),
    q("Vilken månad firar vi jul?", ["December", "Juni", "Mars"], 0),
    q("Vad säger man när man får en present?", ["Tack!", "Hejdå!", "Aj!"], 0),
  ],
  sports: [
    q("Hur många mål ska man göra i fotboll för att vinna?", ["Fler än motståndarna", "Exakt tio", "Inga alls"], 0),
    q("Vad behöver man för att åka skidor?", ["Snö", "Sand", "Vatten"], 0),
    q("Vilken boll är störst?", ["Basketboll", "Tennisboll", "Golfboll"], 0),
    q("Vad har man på huvudet när man cyklar?", ["Hjälm", "Mössa av papper", "Krona"], 0),
  ],
  music: [
    q("Vilket instrument har tangenter?", ["Piano", "Trumma", "Fiol"], 0),
    q("Vad sjunger man på en födelsedag?", ["Ja må hen leva", "Bä bä vita lamm", "Imse vimse spindel"], 0),
    q("Vilket instrument slår man på?", ["Trumma", "Flöjt", "Gitarr"], 0),
  ],
  easter: [
    q("Vem sägs gömma påskägg?", ["Påskharen", "Tomten", "Tandfen"], 0),
    q("Vad kläcks ur ett ägg?", ["En kyckling", "En valp", "En kattunge"], 0),
    q("Vilken färg har en nykläckt kyckling oftast?", ["Gul", "Blå", "Svart"], 0),
    q("Vad klär barn ut sig till på påsk?", ["Påskkärringar", "Tomtar", "Spöken"], 0),
  ],
  midsummer: [
    q("Vad dansar man runt på midsommar?", ["Midsommarstången", "Granen", "Brasan"], 0),
    q("Vilken dans hoppar man som grodor i?", ["Små grodorna", "Hokey pokey", "Tango"], 0),
    q("Hur många blommor ska man plocka under kudden?", ["Sju", "Två", "Hundra"], 0),
    q("Vilket bär äter man ofta på midsommar?", ["Jordgubbar", "Lingon", "Hjortron"], 0),
  ],
  candy: [
    q("Vilken dag äter många barn lördagsgodis?", ["Lördag", "Måndag", "Onsdag"], 0),
    q("Vad är choklad gjort av?", ["Kakaobönor", "Morötter", "Potatis"], 0),
    q("Vad ska man göra efter att man ätit godis?", ["Borsta tänderna", "Sova på golvet", "Äta mer"], 0),
  ],
};

const OLDER: Bank = {
  mixed: [
    q("Vilken är Sveriges största sjö?", ["Vänern", "Vättern", "Mälaren"], 0, "Vänern är Sveriges och EU:s största sjö."),
    q("Hur många kontinenter finns det?", ["5", "6", "7"], 2),
    q("Vilket grundämne har kemiska tecknet O?", ["Guld", "Syre", "Osmium"], 1),
    q("Vem målade Mona Lisa?", ["Leonardo da Vinci", "Picasso", "Van Gogh"], 0),
    q("Vilken planet är störst i vårt solsystem?", ["Jupiter", "Saturnus", "Jorden"], 0),
    q("Vad är huvudstad i Norge?", ["Bergen", "Oslo", "Trondheim"], 1),
    q("Hur många minuter är det på ett dygn?", ["1 440", "1 200", "2 400"], 0),
    q("Vilket år landade människan på månen första gången?", ["1959", "1969", "1979"], 1),
  ],
};

const THEME_ALIASES: Record<string, string> = { mystery: "pirates", puzzles: "space", history: "fairytales", geography: "nature", film: "fairytales" };

function shuffled<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function mockQuestions(opts: {
  count: number;
  ageGroup: AgeGroup;
  themes: string[];
  focus: string[];
  avoid: string[];
}): GeneratedQuestion[] {
  const banks = opts.ageGroup === "child" ? CHILD : { ...CHILD, ...OLDER };
  const keys = [...opts.focus.map((f) => ({ påsk: "easter", midsommar: "midsummer", godis: "candy" })[f] ?? ""), ...opts.themes]
    .map((k) => THEME_ALIASES[k] ?? k)
    .filter((k) => banks[k]);
  if (opts.ageGroup !== "child") keys.push("mixed");
  if (!keys.length) keys.push("animals", "nature", "family");
  const avoid = new Set(opts.avoid.map((a) => a.toLowerCase()));
  const pool = shuffled(keys.flatMap((k) => banks[k])).filter((x) => !avoid.has(x.questionText.toLowerCase()));
  // Fyll på med andra teman om temat tar slut.
  const backup = shuffled(Object.values(banks).flat()).filter((x) => !avoid.has(x.questionText.toLowerCase()));
  const out: GeneratedQuestion[] = [];
  for (const item of [...pool, ...backup]) {
    if (out.length >= opts.count) break;
    if (out.some((o) => o.questionText === item.questionText)) continue;
    // Blanda svarsalternativen så att rätt svar inte alltid står först.
    const order = shuffled(item.alternatives.map((_, i) => i));
    out.push({
      questionText: item.questionText,
      alternatives: order.map((i) => item.alternatives[i]),
      correctAnswer: order.indexOf(item.correctAnswer),
      explanation: item.explanation || "Exempelfråga (mockad AI).",
    });
  }
  return out;
}
