/** Confirm concierge_leads matches what the app and the ledger expect. */
import fs from "node:fs";
import pg from "pg";

const dsn = fs.readFileSync("C:/Users/oussa/supabase-selfhosted/.cloud-db-url", "utf8").trim();
const client = new pg.Client({ connectionString: dsn, ssl: { rejectUnauthorized: false } });
await client.connect();

const q = async (label, sql) => {
  const { rows } = await client.query(sql);
  console.log(`\n== ${label}`);
  console.table(rows);
};

await q(
  "columns",
  `select column_name, data_type, is_nullable
     from information_schema.columns
    where table_name = 'concierge_leads' order by ordinal_position`,
);

await q(
  "indexes",
  `select indexname from pg_indexes where tablename = 'concierge_leads' order by indexname`,
);

await q(
  "rls enabled + policies",
  `select c.relrowsecurity as rls_on, p.polname, p.polcmd
     from pg_class c left join pg_policy p on p.polrelid = c.oid
    where c.relname = 'concierge_leads'`,
);

// The security property that matters: anon may INSERT the ten public columns
// and must have NO privilege on the ledger columns.
await q(
  "anon column privileges",
  `select privilege_type, column_name
     from information_schema.column_privileges
    where table_name = 'concierge_leads' and grantee = 'anon'
    order by privilege_type, column_name`,
);

// The locale CHECK must accept every locale the site serves.
await q(
  "locale + status checks",
  `select conname, pg_get_constraintdef(oid) as definition
     from pg_constraint
    where conrelid = 'public.concierge_leads'::regclass and contype = 'c'
      and (conname like '%locale%' or conname like '%status%' or conname like '%service%')`,
);

await client.end();
