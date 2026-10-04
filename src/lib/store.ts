import { promises as fs } from "node:fs";
import path from "node:path";
import { emptyDb, type Db } from "./types";

// All åtkomst till data går genom readDb/mutate.
// - Lokalt: en JSON-fil (data/db.json), så att MVP:n går att köra utan konton.
// - På nätet: sätt DATABASE_URL (eller POSTGRES_URL) till en Postgres-databas, t.ex. Neon eller Supabase.
//   Då sparas samma data i Postgres och ändringar låses med en databastransaktion,
//   så att flera servrar (t.ex. på Vercel) kan skriva samtidigt.
// Senare kan tabellerna i types.ts flyttas till riktiga Postgres-tabeller här, utan att resten av appen ändras.

const databaseUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

const withDefaults = (data: Partial<Db> | null | undefined): Db => ({ ...emptyDb(), ...(data ?? {}) });

// ---------------------------------------------------------------------------
// Fil

const dataFile = () => process.env.DATA_FILE || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "db.json");

let queue: Promise<unknown> = Promise.resolve();

async function loadFile(): Promise<Db> {
  try {
    return withDefaults(JSON.parse(await fs.readFile(dataFile(), "utf8")) as Partial<Db>);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyDb();
    throw err;
  }
}

async function saveFile(db: Db) {
  const file = dataFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 1));
  await fs.rename(tmp, file);
}

function mutateFile<T>(fn: (db: Db) => T): Promise<T> {
  if (process.env.VERCEL) {
    // Vercel kan inte spara filer permanent.
    return Promise.reject(new Error("Ingen databas är kopplad. Lägg till en Postgres-databas (t.ex. Neon) under Storage i Vercel och gör Redeploy."));
  }
  const run = queue.catch(() => undefined).then(async () => {
    const db = await loadFile();
    const result = fn(db);
    await saveFile(db);
    return result;
  });
  queue = run;
  return run;
}

// ---------------------------------------------------------------------------
// Postgres

type Sql = import("postgres").Sql;
let sqlPromise: Promise<Sql> | null = null;

function getSql(): Promise<Sql> {
  sqlPromise ??= (async () => {
    const { default: postgres } = await import("postgres");
    const url = databaseUrl();
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    // prepare:false gör att det fungerar genom databasernas connection pooler.
    const sql = postgres(url, { max: 3, prepare: false, ssl: local ? false : "require", idle_timeout: 20, onnotice: () => {} });
    await sql`create table if not exists skattjakten_store (id int primary key, data jsonb not null, updated_at timestamptz not null default now())`;
    await sql`insert into skattjakten_store (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing`;
    await sql`create table if not exists skattjakten_ratelimit (key text primary key, count int not null, window_start timestamptz not null)`;
    return sql;
  })().catch((err) => {
    sqlPromise = null;
    throw err;
  });
  return sqlPromise;
}

async function readPg(): Promise<Db> {
  const sql = await getSql();
  const rows = await sql<{ data: Partial<Db> }[]>`select data from skattjakten_store where id = 1`;
  return withDefaults(rows[0]?.data);
}

async function mutatePg<T>(fn: (db: Db) => T): Promise<T> {
  const sql = await getSql();
  return (await sql.begin(async (tx) => {
    const rows = await tx<{ data: Partial<Db> }[]>`select data from skattjakten_store where id = 1 for update`;
    const db = withDefaults(rows[0]?.data);
    const result = fn(db);
    await tx`update skattjakten_store set data = ${tx.json(JSON.parse(JSON.stringify(db)))}, updated_at = now() where id = 1`;
    return result;
  })) as T;
}

// ---------------------------------------------------------------------------

export const storageMode = () => (databaseUrl() ? "postgres" : "file");

export async function readDb(): Promise<Db> {
  if (databaseUrl()) return readPg();
  await queue.catch(() => undefined);
  return loadFile();
}

/** Läser, ändrar och sparar databasen. Ändringar körs en i taget. */
export function mutate<T>(fn: (db: Db) => T): Promise<T> {
  return databaseUrl() ? mutatePg(fn) : mutateFile(fn);
}

// ---------------------------------------------------------------------------
// Begränsning av antal anrop (mot missbruk, t.ex. tusentals jakter eller AI-anrop från samma ställe)

const memoryHits = new Map<string, { count: number; start: number }>();

/** Räknar ett anrop för nyckeln. Returnerar false om gränsen redan är nådd i det aktuella tidsfönstret. */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!databaseUrl()) {
    const now = Date.now();
    const cur = memoryHits.get(key);
    if (!cur || now - cur.start > windowSeconds * 1000) {
      memoryHits.set(key, { count: 1, start: now });
      return true;
    }
    cur.count += 1;
    return cur.count <= limit;
  }
  const sql = await getSql();
  const rows = await sql<{ count: number }[]>`
    insert into skattjakten_ratelimit (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when skattjakten_ratelimit.window_start < now() - make_interval(secs => ${windowSeconds}) then 1 else skattjakten_ratelimit.count + 1 end,
      window_start = case when skattjakten_ratelimit.window_start < now() - make_interval(secs => ${windowSeconds}) then now() else skattjakten_ratelimit.window_start end
    returning count`;
  if (Math.random() < 0.01) await sql`delete from skattjakten_ratelimit where window_start < now() - interval '2 days'`;
  return (rows[0]?.count ?? 0) <= limit;
}
