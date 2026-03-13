import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  sociocapPool?: Pool;
};

function normalizeDatabaseUrl(rawValue: string | undefined) {
  if (!rawValue) return "";

  let value = rawValue.trim().replace(/^"|"$/g, "");

  if (value.includes("DATABASE_URL=")) {
    const candidates = value
      .split("DATABASE_URL=")
      .map((candidate) => candidate.trim())
      .filter(Boolean);

    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const candidate = candidates[index];
      if (
        candidate.startsWith("postgres://") ||
        candidate.startsWith("postgresql://")
      ) {
        value = candidate;
        break;
      }
    }
  }

  return value;
}

export function getPool() {
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  if (!globalForDb.sociocapPool) {
    globalForDb.sociocapPool = new Pool({
      connectionString,
      max: 5,
    });
  }

  return globalForDb.sociocapPool;
}
