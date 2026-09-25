/**
 * The security claim in 0001_concierge_leads.sql is that a holder of the anon
 * key cannot file a lead already marked won with a commission attached.
 * RLS does not do this — it restricts rows, not columns — the GRANTs do.
 * This asserts it rather than trusting the comment.
 */
import fs from "node:fs";
import pg from "pg";

const dsn = fs.readFileSync("C:/Users/oussa/supabase-selfhosted/.cloud-db-url", "utf8").trim();
const client = new pg.Client({ connectionString: dsn, ssl: { rejectUnauthorized: false } });
await client.connect();

const asAnon = async (label, sql) => {
  await client.query("begin");
  try {
    await client.query("set local role anon");
    await client.query(sql);
    console.log(`  ALLOWED  ${label}`);
    await client.query("rollback");
    return true;
  } catch (error) {
    console.log(`  BLOCKED  ${label}  → ${error.message.split("\n")[0]}`);
    await client.query("rollback");
    return false;
  }
};

console.log("as role `anon`:");

const legit = await asAnon(
  "insert the public columns only",
  `insert into public.concierge_leads (service, full_name, phone, locale)
   values ('advisory', 'anon probe', '+971500000000', 'en')`,
);

const forgedStatus = await asAnon(
  "insert with status = 'won'",
  `insert into public.concierge_leads (service, full_name, phone, status)
   values ('advisory', 'forged', '+971500000000', 'won')`,
);

const forgedCommission = await asAnon(
  "insert with commission_aed = 999999",
  `insert into public.concierge_leads (service, full_name, phone, commission_aed)
   values ('advisory', 'forged', '+971500000000', 999999)`,
);

const readBack = await asAnon("select existing leads", `select id from public.concierge_leads`);

const update = await asAnon(
  "update someone else's lead",
  `update public.concierge_leads set status = 'won'`,
);

await client.end();

const expected = legit && !forgedStatus && !forgedCommission && !readBack && !update;
console.log(`\n${expected ? "PASS" : "FAIL"} — anon can file an enquiry and nothing else`);
process.exitCode = expected ? 0 : 1;
