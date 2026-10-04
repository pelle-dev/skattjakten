import { UserError } from "./hunts";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Kör en serverfunktion och gör om fel till ett vänligt meddelande. */
export async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof UserError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Något gick fel. Försök igen." };
  }
}
