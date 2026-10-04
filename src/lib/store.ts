import { promises as fs } from "node:fs";
import path from "node:path";
import { emptyDb, type Db } from "./types";

// Enkel lagring i en JSON-fil så att MVP:n går att köra lokalt utan konton.
// All åtkomst går genom readDb/mutate, så det här är det enda stället som behöver bytas
// när datan ska flyttas till Supabase eller en annan databas.

const dataFile = () => process.env.DATA_FILE || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "db.json");

let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Db> {
  try {
    const raw = await fs.readFile(dataFile(), "utf8");
    return { ...emptyDb(), ...(JSON.parse(raw) as Partial<Db>) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyDb();
    throw err;
  }
}

async function save(db: Db) {
  const file = dataFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 1));
  await fs.rename(tmp, file);
}

export async function readDb(): Promise<Db> {
  await queue.catch(() => undefined);
  return load();
}

/** Läser, ändrar och sparar databasen. Anrop körs ett i taget. */
export function mutate<T>(fn: (db: Db) => T): Promise<T> {
  const run = queue.catch(() => undefined).then(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });
  queue = run;
  return run;
}

export async function writeDb(db: Db) {
  await mutate((current) => Object.assign(current, db));
}
