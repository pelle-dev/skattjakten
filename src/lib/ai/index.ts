// AI-hjälp för skattgömmaren. Körs bara på servern så att API-nyckeln aldrig når webbläsaren.
// Utan ANTHROPIC_API_KEY används mockade exempel (se mock.ts).

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AGE_GROUPS, DIFFICULTIES, GAME_MODES, themeLabel } from "../catalog";
import type { AgeGroup, Difficulty, GameMode } from "../types";
import { mockClue, mockHelp, mockQuestions } from "./mock";
import type { GeneratedQuestion } from "./types";

export type { GeneratedQuestion };

export const aiMode = (): "claude" | "mock" => (process.env.ANTHROPIC_API_KEY ? "claude" : "mock");

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());
const model = () => process.env.AI_MODEL || "claude-opus-5-5";

const SAFETY_SV =
  "Innehållet ska passa barn och familjer: tydligt, positivt och roligt. Inget politiskt, sexuellt, våldsamt, skrämmande eller känsligt innehåll.";

async function ask<T>(prompt: string, schema: z.ZodType<T>, maxTokens = 2000): Promise<T> {
  const response = await getClient().messages.parse({
    model: model(),
    max_tokens: maxTokens,
    output_config: { effort: "low", format: zodOutputFormat(schema) },
    system:
      "Du hjälper en skattgömmare att skapa en fysisk skattjakt med QR-koder för barn, familjer eller vuxna. " +
      SAFETY_SV +
      " Svara alltid på svenska.",
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error("AI:n kunde inte skapa något förslag.");
  return response.parsed_output as T;
}

const label = <T extends string>(list: { id: T; label: string }[], id: T) => list.find((x) => x.id === id)?.label ?? id;

export interface ClueRequest {
  placementNote: string;
  difficulty: Difficulty;
  ageGroup: AgeGroup;
  themes: string[];
  previous?: string;
  variant?: number;
}

export async function suggestClue(req: ClueRequest): Promise<string> {
  if (aiMode() === "mock") return mockClue(req.placementNote, req.difficulty, req.variant ?? 0);
  const out = await ask(
    [
      `Skriv EN ledtråd på svenska som leder deltagarna till platsen där QR-koden är gömd.`,
      `Privat placering (får inte avslöjas ordagrant om svårighetsgraden inte är enkel): "${req.placementNote}"`,
      `Svårighetsgrad: ${label(DIFFICULTIES, req.difficulty)}. Enkel = rak instruktion. Medel = lätt omskrivning. Klurig = gåta.`,
      `Åldersgrupp: ${label(AGE_GROUPS, req.ageGroup)}. Tema: ${req.themes.map((t) => themeLabel(t)).join(", ")}.`,
      "Max två korta meningar.",
      req.previous ? `Skriv något annat än detta tidigare förslag: "${req.previous}"` : "",
    ].join("\n"),
    z.object({ clue: z.string() }),
  );
  return out.clue.trim();
}

export async function suggestHelp(req: { placementNote: string; clue: string }): Promise<string> {
  if (aiMode() === "mock") return mockHelp(req.placementNote);
  const out = await ask(
    [
      `Skriv en kort hjälptext på svenska som visas om deltagarna fastnar.`,
      `Den ska vara tydligare än ledtråden men gärna inte avslöja exakt allt.`,
      `Ledtråd: "${req.clue}"`,
      `Privat placering: "${req.placementNote}"`,
      "Max en mening.",
    ].join("\n"),
    z.object({ help: z.string() }),
  );
  return out.help.trim();
}

export interface QuestionRequest {
  count: number;
  ageGroup: AgeGroup;
  themes: string[];
  focus: string[];
  difficulty: Difficulty;
  gameMode: GameMode;
  clue: string;
  avoid: string[];
}

const QuestionSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string(),
      alternatives: z.array(z.string()),
      correctIndex: z.number().int(),
      explanation: z.string(),
    }),
  ),
});

function cleanQuestions(raw: z.infer<typeof QuestionSchema>["questions"], count: number): GeneratedQuestion[] {
  return raw
    .map((x) => ({
      questionText: x.questionText.trim(),
      alternatives: x.alternatives.map((a) => a.trim()).filter(Boolean).slice(0, 4),
      correctAnswer: x.correctIndex,
      explanation: x.explanation.trim(),
    }))
    .filter(
      (x) =>
        x.questionText &&
        x.alternatives.length >= 3 &&
        x.correctAnswer >= 0 &&
        x.correctAnswer < x.alternatives.length &&
        new Set(x.alternatives).size === x.alternatives.length,
    )
    .slice(0, count);
}

export async function generateQuestions(req: QuestionRequest): Promise<GeneratedQuestion[]> {
  if (aiMode() === "mock") {
    return mockQuestions({ count: req.count, ageGroup: req.ageGroup, themes: req.themes, focus: req.focus, avoid: req.avoid });
  }
  const out = await ask(
    [
      `Skapa ${req.count} flervalsfrågor på svenska till en kontrollpunkt i en skattjakt.`,
      `Åldersgrupp: ${label(AGE_GROUPS, req.ageGroup)}. Svårighetsgrad: ${label(DIFFICULTIES, req.difficulty)}.`,
      `Tema: ${req.themes.map((t) => themeLabel(t)).join(", ")}${req.focus.length ? ` (gärna med inslag av: ${req.focus.join(", ")})` : ""}.`,
      `Spelläge: ${GAME_MODES.find((g) => g.id === req.gameMode)?.label ?? req.gameMode}.`,
      req.clue ? `Ledtråden till platsen är: "${req.clue}". Frågorna får gärna knyta an till den, men måste inte.` : "",
      "Varje fråga: 3 eller 4 korta svarsalternativ, exakt ett rätt svar (correctIndex börjar på 0), och en kort förklaring som bara skattgömmaren ser.",
      "Frågorna ska gå att svara på utan att googla och vara roliga och tydliga för målgruppen.",
      req.avoid.length ? `Upprepa inte dessa frågor: ${req.avoid.map((a) => `"${a}"`).join("; ")}` : "",
    ].join("\n"),
    QuestionSchema,
    4000,
  );
  const questions = cleanQuestions(out.questions, req.count);
  if (!questions.length) throw new Error("AI:n gav inga användbara frågor.");
  return questions;
}
