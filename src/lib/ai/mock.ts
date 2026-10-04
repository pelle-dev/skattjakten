// Mockad AI: används när ingen ANTHROPIC_API_KEY finns, så att hela flödet går att testa lokalt.

import type { AgeGroup, Difficulty, Language } from "../types";
import type { GeneratedQuestion } from "./types";

interface Place {
  words: string[];
  sv: { medium: string; tricky: string };
  en: { medium: string; tricky: string };
}

// Kända platser/föremål → gåtfulla omskrivningar.
const PLACES: Place[] = [
  {
    words: ["bänk", "bench"],
    sv: { medium: "Där man kan vila benen en stund finns nästa spår.", tricky: "När benen behöver paus efter spring och skratt, finns nästa spår där man sitter." },
    en: { medium: "Where you can rest your legs for a while, the next clue is waiting.", tricky: "When legs need a pause after running and laughing, look where people sit." },
  },
  {
    words: ["ek", "träd", "tree", "oak", "björk", "gran", "tall"],
    sv: { medium: "Leta vid något som är gammalt, högt och har löv eller barr.", tricky: "Jag har rötter men inga fötter, en krona men ingen kung. Vad är jag?" },
    en: { medium: "Look near something old and tall with leaves or needles.", tricky: "I have roots but no feet, a crown but no king. What am I?" },
  },
  {
    words: ["dörr", "door", "förråd", "shed"],
    sv: { medium: "Det som öppnas och stängs men aldrig går någonstans gömmer nästa spår.", tricky: "Jag har ett handtag men är ingen kopp, jag har ett lås men är ingen kista." },
    en: { medium: "Something that opens and closes but never goes anywhere hides the next clue.", tricky: "I have a handle but I'm not a cup, I have a lock but I'm not a chest." },
  },
  {
    words: ["brevlåda", "mailbox", "postlåda"],
    sv: { medium: "Där breven sover innan någon hämtar dem.", tricky: "Jag äter papper varje dag men blir aldrig mätt." },
    en: { medium: "Where the letters sleep until someone picks them up.", tricky: "I eat paper every day but never get full." },
  },
  {
    words: ["kruka", "blomkruka", "pot", "flowerpot", "blomma", "flower"],
    sv: { medium: "Leta där något grönt bor i en liten burk.", tricky: "Mitt hus är runt och mina hyresgäster växer långsamt mot solen." },
    en: { medium: "Look where something green lives in a little pot.", tricky: "My house is round and my tenants slowly grow towards the sun." },
  },
  {
    words: ["sten", "stone", "rock"],
    sv: { medium: "Under något tungt och grått som legat där väldigt länge.", tricky: "Jag har legat här längre än alla ni, tung och tyst. Titta under mig." },
    en: { medium: "Under something heavy and grey that has been there a long time.", tricky: "I have been here longer than all of you, heavy and quiet. Look underneath me." },
  },
  {
    words: ["gunga", "swing", "lekplats", "playground", "rutschkana", "slide", "sandlåda", "sandbox"],
    sv: { medium: "Där man leker och skrattar finns nästa spår.", tricky: "Fram och tillbaka, upp mot himlen – men aldrig iväg. Där väntar nästa spår." },
    en: { medium: "Where children play and laugh, the next clue is waiting.", tricky: "Back and forth, up to the sky – but never going away. Look there." },
  },
  {
    words: ["trappa", "stairs", "steps", "trapp"],
    sv: { medium: "Leta där man går upp och ner, steg för steg.", tricky: "Jag har många steg men går ingenstans." },
    en: { medium: "Look where you go up and down, step by step.", tricky: "I have many steps but never walk anywhere." },
  },
  {
    words: ["staket", "fence", "grind", "gate"],
    sv: { medium: "Leta vid det som håller ihop trädgården.", tricky: "Jag står vakt runt gården dag och natt utan att sova." },
    en: { medium: "Look by the thing that keeps the garden together.", tricky: "I guard the yard day and night without ever sleeping." },
  },
  {
    words: ["cykel", "bike", "bicycle"],
    sv: { medium: "Leta vid något med två hjul och en ringklocka.", tricky: "Jag har två hjul och en kedja, men jag är ingen fånge." },
    en: { medium: "Look near something with two wheels and a bell.", tricky: "I have two wheels and a chain, but I'm no prisoner." },
  },
  {
    words: ["kylskåp", "fridge", "kyl"],
    sv: { medium: "Där det är kallt och maten sover.", tricky: "Jag är kall inuti och lyser när du öppnar mig." },
    en: { medium: "Where it is cold and the food sleeps.", tricky: "I'm cold inside and light up when you open me." },
  },
  {
    words: ["soffa", "sofa", "couch", "kudde", "cushion"],
    sv: { medium: "Där man myser och tittar på film.", tricky: "Jag är mjuk och bred och alla vill sitta på mig på fredagskvällen." },
    en: { medium: "Where you cuddle up and watch movies.", tricky: "I'm soft and wide and everyone wants to sit on me on Friday night." },
  },
];

const SV_NEUTER: Record<string, string> = {
  röd: "rött", röda: "rött", blå: "blått", blåa: "blått", gul: "gult", gula: "gult",
  grön: "grönt", gröna: "grönt", vit: "vitt", vita: "vitt", svart: "svart", svarta: "svart",
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const trimDot = (s: string) => s.trim().replace(/[.!]+$/, "");

export function mockClue(note: string, difficulty: Difficulty, lang: Language, variant = 0): string {
  const clean = trimDot(note) || (lang === "sv" ? "på ett hemligt ställe" : "in a secret place");
  const lower = clean.toLowerCase();
  if (difficulty === "easy") {
    const easy =
      lang === "sv"
        ? [`Leta ${lowerFirst(clean)}.`, `Gå dit och titta noga: ${lowerFirst(clean)}.`, `Nästa spår finns ${lowerFirst(clean)}.`]
        : [`Look ${lowerFirst(clean)}.`, `Go there and look closely: ${lowerFirst(clean)}.`, `The next clue is ${lowerFirst(clean)}.`];
    return easy[variant % easy.length];
  }
  const matches = PLACES.filter((p) => p.words.some((w) => lower.includes(w)));
  const place = matches[variant % Math.max(1, matches.length)];
  const colorWord = lower.match(/(?<![a-zåäö])(röda|röd|blåa|blå|gula|gul|gröna|grön|vita|vit|svarta|svart|red|blue|yellow|green|white|black)(?![a-zåäö])/)?.[0];
  if (place) {
    let text = place[lang][difficulty];
    if (colorWord && difficulty === "medium") text += lang === "sv" ? ` Leta efter något ${SV_NEUTER[colorWord] ?? colorWord}.` : ` Look for something ${colorWord}.`;
    return text;
  }
  const generic =
    lang === "sv"
      ? {
          medium: ["Nästa spår är gömt på ett ställe ni har gått förbi många gånger.", "Titta lågt och titta noga – nästa spår är närmare än ni tror."],
          tricky: ["Jag är gömd där ingen brukar titta, men alla har sett mig.", "Gå dit vardagen händer, men leta där ögonen sällan landar."],
        }
      : {
          medium: ["The next clue hides in a place you have walked past many times.", "Look low and look carefully – the next clue is closer than you think."],
          tricky: ["I hide where nobody looks, yet everybody has seen me.", "Go where everyday life happens, but search where eyes rarely land."],
        };
  const list = generic[difficulty];
  return list[variant % list.length];
}

export function mockHelp(note: string, lang: Language): string {
  const clean = trimDot(note);
  if (!clean) return lang === "sv" ? "Läs ledtråden en gång till och titta runt omkring er." : "Read the clue again and look around you.";
  return lang === "sv" ? `Leta ${lowerFirst(clean)}.` : `Look ${lowerFirst(clean)}.`;
}

// ---------------------------------------------------------------------------
// Frågebank

type Bank = Record<string, { sv: GeneratedQuestion[]; en: GeneratedQuestion[] }>;
const q = (questionText: string, alternatives: string[], correctAnswer: number, explanation = ""): GeneratedQuestion => ({
  questionText,
  alternatives,
  correctAnswer,
  explanation,
});

const CHILD: Bank = {
  animals: {
    sv: [
      q("Vilket djur säger ”mu”?", ["Ko", "Gris", "Häst"], 0),
      q("Hur många ben har en spindel?", ["6", "8", "10"], 1),
      q("Vilket djur har en lång snabel?", ["Giraff", "Elefant", "Zebra", "Lejon"], 1),
      q("Vad äter en kanin helst?", ["Morötter", "Fisk", "Godis"], 0),
      q("Vilket djur sover hela vintern?", ["Björn", "Häst", "Ko"], 0),
      q("Vilken fågel kan inte flyga?", ["Pingvin", "Kråka", "Duva"], 0),
      q("Var bor en fisk?", ["I vatten", "I ett träd", "Under jorden"], 0),
      q("Vad kallas en hundunge?", ["Kattunge", "Valp", "Kalv"], 1),
    ],
    en: [
      q("Which animal says “moo”?", ["Cow", "Pig", "Horse"], 0),
      q("How many legs does a spider have?", ["6", "8", "10"], 1),
      q("Which animal has a long trunk?", ["Giraffe", "Elephant", "Zebra", "Lion"], 1),
      q("What does a rabbit like to eat?", ["Carrots", "Fish", "Candy"], 0),
      q("Which animal sleeps all winter?", ["Bear", "Horse", "Cow"], 0),
      q("Which bird cannot fly?", ["Penguin", "Crow", "Pigeon"], 0),
      q("Where does a fish live?", ["In water", "In a tree", "Underground"], 0),
      q("What is a baby dog called?", ["Kitten", "Puppy", "Calf"], 1),
    ],
  },
  nature: {
    sv: [
      q("Vilken färg har gräs på sommaren?", ["Grönt", "Lila", "Orange"], 0),
      q("Vad behöver en blomma för att växa?", ["Vatten och sol", "Godis", "Snö"], 0),
      q("Vilken årstid kommer efter vintern?", ["Hösten", "Våren", "Sommaren"], 1),
      q("Vad växer på en ek?", ["Kottar", "Ekollon", "Äpplen"], 1),
      q("Vad kallas fruset vatten?", ["Is", "Ånga", "Sand"], 0),
      q("Vilket av dessa är ett bär?", ["Blåbär", "Gran", "Mossa"], 0),
    ],
    en: [
      q("What colour is grass in summer?", ["Green", "Purple", "Orange"], 0),
      q("What does a flower need to grow?", ["Water and sun", "Candy", "Snow"], 0),
      q("Which season comes after winter?", ["Autumn", "Spring", "Summer"], 1),
      q("What grows on an oak tree?", ["Pine cones", "Acorns", "Apples"], 1),
      q("What do we call frozen water?", ["Ice", "Steam", "Sand"], 0),
      q("Which of these is a berry?", ["Blueberry", "Spruce", "Moss"], 0),
    ],
  },
  space: {
    sv: [
      q("Vad heter planeten vi bor på?", ["Mars", "Jorden", "Venus"], 1),
      q("Vad lyser på himlen på dagen?", ["Månen", "Solen", "Stjärnorna"], 1),
      q("Vad kallas en person som åker till rymden?", ["Astronaut", "Pirat", "Kock"], 0),
      q("Vilken färg brukar Mars kallas?", ["Den röda planeten", "Den blå planeten", "Den gröna planeten"], 0),
    ],
    en: [
      q("What is the name of the planet we live on?", ["Mars", "Earth", "Venus"], 1),
      q("What shines in the sky during the day?", ["The moon", "The sun", "The stars"], 1),
      q("What do we call a person who travels to space?", ["Astronaut", "Pirate", "Chef"], 0),
      q("What is Mars often called?", ["The red planet", "The blue planet", "The green planet"], 0),
    ],
  },
  fairytales: {
    sv: [
      q("Vem bor med de sju dvärgarna?", ["Snövit", "Askungen", "Rapunzel"], 0),
      q("Vad tappade Askungen på balen?", ["En sko", "En hatt", "En ring"], 0),
      q("Vem ville äta upp Rödluvan?", ["Vargen", "Björnen", "Räven"], 0),
      q("Hur många grisar finns i sagan om husen?", ["Två", "Tre", "Fyra"], 1),
      q("Vad har Pippi Långstrump för häst?", ["Lilla Gubben", "Stora Gubben", "Herr Nilsson"], 0),
    ],
    en: [
      q("Who lives with the seven dwarfs?", ["Snow White", "Cinderella", "Rapunzel"], 0),
      q("What did Cinderella lose at the ball?", ["A shoe", "A hat", "A ring"], 0),
      q("Who wanted to eat Little Red Riding Hood?", ["The wolf", "The bear", "The fox"], 0),
      q("How many little pigs built houses?", ["Two", "Three", "Four"], 1),
    ],
  },
  pirates: {
    sv: [
      q("Vad letar pirater ofta efter?", ["Skatter", "Snö", "Läxor"], 0),
      q("Vilket djur sitter ofta på en pirats axel?", ["Papegoja", "Katt", "Ko"], 0),
      q("Vad visar var skatten är gömd?", ["En skattkarta", "En kokbok", "En klocka"], 0),
      q("Vad seglar pirater med?", ["Skepp", "Tåg", "Flygplan"], 0),
    ],
    en: [
      q("What do pirates often look for?", ["Treasure", "Snow", "Homework"], 0),
      q("Which animal often sits on a pirate's shoulder?", ["Parrot", "Cat", "Cow"], 0),
      q("What shows where the treasure is hidden?", ["A treasure map", "A cookbook", "A clock"], 0),
      q("What do pirates sail?", ["Ships", "Trains", "Planes"], 0),
    ],
  },
  family: {
    sv: [
      q("Vad kallas din mammas mamma?", ["Mormor", "Farmor", "Faster"], 0),
      q("Hur många dagar har en vecka?", ["5", "7", "10"], 1),
      q("Vad äter man ofta på en födelsedag?", ["Tårta", "Soppa", "Gröt"], 0),
      q("Vilken månad firar vi jul?", ["December", "Juni", "Mars"], 0),
      q("Vad säger man när man får en present?", ["Tack!", "Hejdå!", "Aj!"], 0),
    ],
    en: [
      q("What do you call your mum's mum?", ["Grandmother", "Aunt", "Cousin"], 0),
      q("How many days are in a week?", ["5", "7", "10"], 1),
      q("What do people often eat on a birthday?", ["Cake", "Soup", "Porridge"], 0),
      q("In which month is Christmas?", ["December", "June", "March"], 0),
      q("What do you say when you get a present?", ["Thank you!", "Goodbye!", "Ouch!"], 0),
    ],
  },
  sports: {
    sv: [
      q("Hur många mål ska man göra i fotboll för att vinna?", ["Fler än motståndarna", "Exakt tio", "Inga alls"], 0),
      q("Vad behöver man för att åka skidor?", ["Snö", "Sand", "Vatten"], 0),
      q("Vilken boll är störst?", ["Basketboll", "Tennisboll", "Golfboll"], 0),
      q("Vad har man på huvudet när man cyklar?", ["Hjälm", "Mössa av papper", "Krona"], 0),
    ],
    en: [
      q("How do you win a football match?", ["Score more goals", "Score exactly ten", "Score none"], 0),
      q("What do you need to go skiing?", ["Snow", "Sand", "Water"], 0),
      q("Which ball is biggest?", ["Basketball", "Tennis ball", "Golf ball"], 0),
      q("What do you wear on your head when cycling?", ["A helmet", "A paper hat", "A crown"], 0),
    ],
  },
  music: {
    sv: [
      q("Vilket instrument har tangenter?", ["Piano", "Trumma", "Fiol"], 0),
      q("Vad sjunger man på en födelsedag?", ["Ja må hen leva", "Bä bä vita lamm", "Imse vimse spindel"], 0),
      q("Vilket instrument slår man på?", ["Trumma", "Flöjt", "Gitarr"], 0),
    ],
    en: [
      q("Which instrument has keys?", ["Piano", "Drum", "Violin"], 0),
      q("What song do we sing on birthdays?", ["Happy Birthday", "Twinkle Twinkle", "Old MacDonald"], 0),
      q("Which instrument do you hit?", ["Drum", "Flute", "Guitar"], 0),
    ],
  },
  easter: {
    sv: [
      q("Vem sägs gömma påskägg?", ["Påskharen", "Tomten", "Tandfen"], 0),
      q("Vad kläcks ur ett ägg?", ["En kyckling", "En valp", "En kattunge"], 0),
      q("Vilken färg har en nykläckt kyckling oftast?", ["Gul", "Blå", "Svart"], 0),
      q("Vad klär barn ut sig till på påsk?", ["Påskkärringar", "Tomtar", "Spöken"], 0),
    ],
    en: [
      q("Who is said to hide Easter eggs?", ["The Easter bunny", "Santa", "The tooth fairy"], 0),
      q("What hatches from an egg?", ["A chick", "A puppy", "A kitten"], 0),
      q("What colour is a newly hatched chick usually?", ["Yellow", "Blue", "Black"], 0),
    ],
  },
  midsummer: {
    sv: [
      q("Vad dansar man runt på midsommar?", ["Midsommarstången", "Granen", "Brasan"], 0),
      q("Vilken dans hoppar man som grodor i?", ["Små grodorna", "Hokey pokey", "Tango"], 0),
      q("Hur många blommor ska man plocka under kudden?", ["Sju", "Två", "Hundra"], 0),
      q("Vilket bär äter man ofta på midsommar?", ["Jordgubbar", "Lingon", "Hjortron"], 0),
    ],
    en: [
      q("What do Swedes dance around at midsummer?", ["The maypole", "A pine tree", "A bonfire"], 0),
      q("Which berry is popular at midsummer?", ["Strawberries", "Lingonberries", "Cloudberries"], 0),
      q("How many flowers do you put under your pillow?", ["Seven", "Two", "A hundred"], 0),
    ],
  },
  candy: {
    sv: [
      q("Vilken dag äter många barn lördagsgodis?", ["Lördag", "Måndag", "Onsdag"], 0),
      q("Vad är choklad gjort av?", ["Kakaobönor", "Morötter", "Potatis"], 0),
      q("Vad ska man göra efter att man ätit godis?", ["Borsta tänderna", "Sova på golvet", "Äta mer"], 0),
    ],
    en: [
      q("What is chocolate made from?", ["Cocoa beans", "Carrots", "Potatoes"], 0),
      q("What should you do after eating candy?", ["Brush your teeth", "Sleep on the floor", "Eat more"], 0),
      q("Which of these is sweet?", ["Candy floss", "Salt", "Pepper"], 0),
    ],
  },
};

const OLDER: Bank = {
  mixed: {
    sv: [
      q("Vilken är Sveriges största sjö?", ["Vänern", "Vättern", "Mälaren"], 0, "Vänern är Sveriges och EU:s största sjö."),
      q("Hur många kontinenter finns det?", ["5", "6", "7"], 2),
      q("Vilket grundämne har kemiska tecknet O?", ["Guld", "Syre", "Osmium"], 1),
      q("Vem målade Mona Lisa?", ["Leonardo da Vinci", "Picasso", "Van Gogh"], 0),
      q("Vilken planet är störst i vårt solsystem?", ["Jupiter", "Saturnus", "Jorden"], 0),
      q("Vad är huvudstad i Norge?", ["Bergen", "Oslo", "Trondheim"], 1),
      q("Hur många minuter är det på ett dygn?", ["1 440", "1 200", "2 400"], 0),
      q("Vilket år landade människan på månen första gången?", ["1959", "1969", "1979"], 1),
    ],
    en: [
      q("How many continents are there?", ["5", "6", "7"], 2),
      q("Which element has the chemical symbol O?", ["Gold", "Oxygen", "Osmium"], 1),
      q("Who painted the Mona Lisa?", ["Leonardo da Vinci", "Picasso", "Van Gogh"], 0),
      q("Which is the largest planet in our solar system?", ["Jupiter", "Saturn", "Earth"], 0),
      q("What is the capital of Norway?", ["Bergen", "Oslo", "Trondheim"], 1),
      q("How many minutes are in a day?", ["1,440", "1,200", "2,400"], 0),
      q("In which year did humans first land on the moon?", ["1959", "1969", "1979"], 1),
    ],
  },
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
  lang: Language;
  avoid: string[];
}): GeneratedQuestion[] {
  const banks = opts.ageGroup === "child" ? CHILD : { ...CHILD, ...OLDER };
  const keys = [...opts.focus.map((f) => ({ påsk: "easter", midsommar: "midsummer", godis: "candy" })[f] ?? ""), ...opts.themes]
    .map((k) => THEME_ALIASES[k] ?? k)
    .filter((k) => banks[k]);
  if (opts.ageGroup !== "child") keys.push("mixed");
  if (!keys.length) keys.push("animals", "nature", "family");
  const avoid = new Set(opts.avoid.map((a) => a.toLowerCase()));
  const pool = shuffled(keys.flatMap((k) => banks[k][opts.lang])).filter((x) => !avoid.has(x.questionText.toLowerCase()));
  // Fyll på med andra teman om temat tar slut.
  const backup = shuffled(Object.values(banks).flatMap((b) => b[opts.lang])).filter((x) => !avoid.has(x.questionText.toLowerCase()));
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
      explanation: item.explanation || (opts.lang === "sv" ? "Exempelfråga (mockad AI)." : "Sample question (mock AI)."),
    });
  }
  return out;
}
