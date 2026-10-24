import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { Client } from "pg";

const repoRoot = path.resolve(__dirname, "../../..");
const migrationsDir = path.join(repoRoot, "database/migrations");

dotenv.config({
  path: path.join(repoRoot, ".env"),
});
dotenv.config({
  path: path.join(repoRoot, "apps/api/.env"),
});
dotenv.config({
  path: path.join(repoRoot, "apps/api/.env.production.local"),
});

type Migration = {
  name: string;
  path: string;
};

function getDatabaseUrl() {
  const target = (process.env.WMS_DB_TARGET || "local").toLowerCase();
  const configuredUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL;
  const password =
    process.env.SUPABASE_DB_PASSWORD ||
    process.env.POSTGRES_PASSWORD;
  const linkedPoolerUrlPath = path.join(
    repoRoot,
    "supabase/.temp/pooler-url"
  );

  if (
    ["prod", "production", "supabase"].includes(target) &&
    password &&
    fs.existsSync(linkedPoolerUrlPath)
  ) {
    const poolerUrl = fs
      .readFileSync(linkedPoolerUrlPath, "utf8")
      .trim();
    const url = new URL(poolerUrl);

    url.password = password;

    return url.toString();
  }

  if (["prod", "production", "supabase"].includes(target)) {
    if (configuredUrl) {
      const host = new URL(configuredUrl).hostname;

      if (!["localhost", "127.0.0.1"].includes(host)) {
        return configuredUrl;
      }
    }

    throw new Error(
      [
        "Missing production database binding.",
        "Create apps/api/.env.production.local with SUPABASE_DB_PASSWORD.",
        "The repo is linked to Supabase and will combine that password with supabase/.temp/pooler-url.",
      ].join("\n")
    );
  }

  if (configuredUrl) {
    return configuredUrl;
  }

  if (password && fs.existsSync(linkedPoolerUrlPath)) {
    const poolerUrl = fs
      .readFileSync(linkedPoolerUrlPath, "utf8")
      .trim();
    const url = new URL(poolerUrl);

    url.password = password;

    return url.toString();
  }

  return undefined;
}

function shouldUseSsl(databaseUrl: string) {
  try {
    const host = new URL(databaseUrl).hostname;

    return !["localhost", "127.0.0.1"].includes(host);
  } catch {
    return true;
  }
}

function getClient() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error(
      [
        "Missing DATABASE_URL.",
        "Use the Supabase pooler/direct Postgres connection string.",
        "Example: DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
        "Because this repo is already linked to Supabase, you can also set SUPABASE_DB_PASSWORD and the script will use supabase/.temp/pooler-url.",
      ].join("\n")
    );
  }

  return new Client({
    connectionString,
    ssl: shouldUseSsl(connectionString)
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  });
}

function getMigrations(): Migration[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({
      name: file,
      path: path.join(migrationsDir, file),
    }));
}

async function ensureMigrationTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client: Client) {
  await ensureMigrationTable(client);

  const result = await client.query<{
    name: string;
  }>(`
    SELECT name
    FROM schema_migrations
    ORDER BY name ASC
  `);

  return new Set(result.rows.map((row) => row.name));
}

async function status() {
  const client = getClient();
  const migrations = getMigrations();

  await client.connect();

  try {
    const applied = await getAppliedMigrations(client);

    for (const migration of migrations) {
      const state = applied.has(migration.name)
        ? "applied"
        : "pending";

      console.log(`${state.padEnd(8)} ${migration.name}`);
    }
  } finally {
    await client.end();
  }
}

async function baseline() {
  const client = getClient();
  const migrations = getMigrations();

  await client.connect();

  try {
    await ensureMigrationTable(client);

    for (const migration of migrations) {
      await client.query(
        `
          INSERT INTO schema_migrations (name)
          VALUES ($1)
          ON CONFLICT (name) DO NOTHING
        `,
        [migration.name]
      );
    }

    console.log(
      `Baseline recorded for ${migrations.length} migrations.`
    );
  } finally {
    await client.end();
  }
}

async function migrate() {
  const client = getClient();
  const migrations = getMigrations();

  await client.connect();

  try {
    const applied = await getAppliedMigrations(client);

    for (const migration of migrations) {
      if (applied.has(migration.name)) {
        console.log(`skip     ${migration.name}`);
        continue;
      }

      const sql = fs.readFileSync(migration.path, "utf8");

      console.log(`apply    ${migration.name}`);
      await client.query(sql);
      await client.query(
        `
          INSERT INTO schema_migrations (name)
          VALUES ($1)
        `,
        [migration.name]
      );
    }

    console.log("Database migrations complete.");
  } finally {
    await client.end();
  }
}

async function applyOne(name: string | undefined) {
  if (!name) {
    throw new Error("Missing migration file name.");
  }

  const migration = getMigrations().find(
    (candidate) => candidate.name === name
  );

  if (!migration) {
    throw new Error(`Migration "${name}" not found.`);
  }

  const client = getClient();

  await client.connect();

  try {
    const applied = await getAppliedMigrations(client);

    if (applied.has(migration.name)) {
      console.log(`skip     ${migration.name}`);
      return;
    }

    const sql = fs.readFileSync(migration.path, "utf8");

    console.log(`apply    ${migration.name}`);
    await client.query(sql);
    await client.query(
      `
        INSERT INTO schema_migrations (name)
        VALUES ($1)
      `,
      [migration.name]
    );
    console.log("Database migration complete.");
  } finally {
    await client.end();
  }
}

async function main() {
  const command = process.argv[2] ?? "status";

  if (command === "status") {
    await status();
    return;
  }

  if (command === "baseline") {
    await baseline();
    return;
  }

  if (command === "migrate") {
    await migrate();
    return;
  }

  if (command === "apply") {
    await applyOne(process.argv[3]);
    return;
  }

  throw new Error(
    `Unknown command "${command}". Use status, baseline, migrate, or apply.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
