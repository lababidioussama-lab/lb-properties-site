/**
 * Apply a SQL migration to the cloud database.
 *
 * Exists because the documented route — `docker run … psql` — needs Docker
 * running, and neither Docker nor a local psql is available on this machine.
 * `pg` is pure JS, so this works with nothing installed but node_modules.
 *
 *   node scripts/apply-migration.mjs supabase/migrations/0001_concierge_leads.sql
 *
 * The DSN is read from ~/supabase-selfhosted/.cloud-db-url and never printed.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const DSN_FILE = "C:/Users/oussa/supabase-selfhosted/.cloud-db-url";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-migration.mjs <path-to.sql>");
  process.exit(2);
}

const sql = fs.readFileSync(path.resolve(file), "utf8");
const dsn = fs.readFileSync(DSN_FILE, "utf8").trim();

// Redacted echo, so the log shows which database was touched without the
// password ending up in a terminal scrollback.
console.log("target :", dsn.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@"));
console.log("file   :", file, `(${sql.length} bytes)`);

const client = new pg.Client({
  connectionString: dsn,
  // Supabase terminates TLS at the pooler with a cert chain node does not
  // ship a root for; the connection is still encrypted.
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120_000,
});

try {
  await client.connect();
  console.log("connected.");

  /* One transaction: the migration creates a table, its indexes, an RLS
     policy and the column grants that keep anon away from the ledger
     columns. A partial apply would leave the grants off a live table, which
     is the one outcome worse than not applying it at all. */
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log("applied and committed.");
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    /* connection may already be gone */
  }
  console.error("FAILED:", error.message);
  if (error.hint) console.error("hint:", error.hint);
  process.exitCode = 1;
} finally {
  await client.end();
}
