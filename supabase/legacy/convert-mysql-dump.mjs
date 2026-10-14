#!/usr/bin/env node
// Converts the old system's MySQL dump (HeidiSQL export of TechproCanada) into a
// Postgres script for the Supabase SQL Editor.
//
//   node supabase/legacy/convert-mysql-dump.mjs supabase/legacy/data/*.sql
//
// Takes one or more dump files (the main export plus mii_company_details) and writes
// supabase/legacy/data/legacy_import.sql, or the path given with --out=<file>.
// Login secrets (password hashes, auth keys, access tokens, API keys, push tokens) are
// never copied. The old `user` table isn't needed at all: app_users already has its ids.
//
// The tables are copied as they are into a separate `legacy` schema, so nothing collides
// with the app's own tables (the dump has its own `mii_inspections` and `mii_job_number`
// with different columns) and the API never exposes them. Moving the rows into the app's
// tables is a separate step, once the mapping (statuses, companies, users) is agreed.
//
// What the conversion changes:
//   - MySQL syntax (backticks, ENGINE, COLLATE, AUTO_INCREMENT, \' escapes) -> Postgres
//   - int AUTO_INCREMENT id  -> integer identity, continued after the highest imported id
//   - tinyint 0/1            -> boolean
//   - float                  -> double precision
//   - timestamp              -> timestamptz (the dump is in UTC); '0000-00-00 ...' -> null
//   - text holding JSON      -> jsonb (supporting_documents, packing_slips)
//   - foreign keys           -> kept when the referenced table is in the dump (marked
//                               NOT VALID if some rows point at missing ids), plus an index
//                               on every foreign-key column (Postgres doesn't add one itself)

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const output =
  args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ??
  "supabase/legacy/data/legacy_import.sql";
// A glob like data/*.sql also matches an earlier output, so that file is left out.
const inputs = args.filter(
  (arg) => !arg.startsWith("--out=") && path.resolve(arg) !== path.resolve(output),
);
if (inputs.length === 0) {
  console.error(
    "Usage: node supabase/legacy/convert-mysql-dump.mjs <dump.sql>... [--out=output.sql]",
  );
  process.exit(1);
}
const src = inputs
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n")
  .replace(/\r\n/g, "\n");
const input = inputs.map((file) => path.basename(file)).join(", ");
const SCHEMA = "legacy";

// Login secrets and device tokens never leave the old system.
const SECRET = /password|auth_key|access_token|api_key|token|oauth|salary|facial/i;

// ── Read the CREATE TABLE statements ────────────────────────────────────────

const tables = new Map();
for (const match of src.matchAll(/CREATE TABLE IF NOT EXISTS `(\w+)` \(([\s\S]*?)\n\)\s*ENGINE[^;]*;/g)) {
  const [, name, body] = match;
  const columns = [];
  const foreignKeys = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim().replace(/,$/, "");
    const column = line.match(/^`(\w+)` (\w+)(?:\(([\d,]+)\))?(.*)$/);
    if (column) {
      const [, columnName, type, , rest] = column;
      columns.push({
        name: columnName,
        type: type.toLowerCase(),
        autoIncrement: /AUTO_INCREMENT/i.test(rest),
        currentTimestamp: /DEFAULT CURRENT_TIMESTAMP/i.test(rest),
      });
      continue;
    }
    const fk = line.match(/FOREIGN KEY \(`(\w+)`\) REFERENCES `(\w+)` \(`(\w+)`\)/);
    if (fk) foreignKeys.push({ column: fk[1], table: fk[2], refColumn: fk[3] });
  }
  tables.set(name, {
    name,
    columns: columns.filter((column) => !SECRET.test(column.name)),
    dropped: columns.filter((column) => SECRET.test(column.name)).map((column) => column.name),
    foreignKeys,
    rows: [],
  });
}
if (tables.size === 0) throw new Error("No CREATE TABLE statements found - is this the MySQL dump?");

// ── Read the INSERT statements ──────────────────────────────────────────────

// MySQL backslash escapes inside '...' strings.
const ESCAPES = { 0: "", n: "\n", r: "\r", t: "\t", b: "\b", Z: "\x1a", "%": "\\%", _: "\\_" };
const token = /[^,)\s]+/y;

const insertStart = /INSERT INTO `(\w+)` \(([^)]*)\) VALUES\s*/g;
for (let match; (match = insertStart.exec(src)); ) {
  const table = tables.get(match[1]);
  if (!table) throw new Error(`INSERT into ${match[1]}, which has no CREATE TABLE`);
  const columnNames = match[2].split(",").map((c) => c.trim().replace(/`/g, ""));
  let i = insertStart.lastIndex;
  const skipSpace = () => {
    while (/\s/.test(src[i])) i++;
  };

  for (;;) {
    skipSpace();
    if (src[i] === ",") {
      i++;
      continue;
    }
    if (src[i] === ";") {
      i++;
      break;
    }
    if (src[i] !== "(") throw new Error(`${table.name}: unexpected "${src[i]}" at offset ${i}`);
    i++;
    const values = [];
    for (;;) {
      skipSpace();
      if (src[i] === "'") {
        let text = "";
        i++;
        for (;;) {
          const ch = src[i];
          if (ch === undefined) throw new Error(`${table.name}: unterminated string`);
          if (ch === "\\") {
            const next = src[i + 1];
            text += next in ESCAPES ? ESCAPES[next] : next;
            i += 2;
          } else if (ch === "'" && src[i + 1] === "'") {
            text += "'";
            i += 2;
          } else if (ch === "'") {
            i++;
            break;
          } else {
            text += ch;
            i++;
          }
        }
        values.push(text);
      } else {
        token.lastIndex = i;
        const word = token.exec(src)?.[0];
        if (!word) throw new Error(`${table.name}: unreadable value at offset ${i}`);
        i += word.length;
        values.push(word.toUpperCase() === "NULL" ? null : Number(word));
      }
      skipSpace();
      if (src[i] === ",") {
        i++;
      } else if (src[i] === ")") {
        i++;
        break;
      } else {
        throw new Error(`${table.name}: unexpected "${src[i]}" at offset ${i}`);
      }
    }
    if (values.length !== columnNames.length) {
      throw new Error(`${table.name}: a row has ${values.length} values for ${columnNames.length} columns`);
    }
    table.rows.push(
      Object.fromEntries(
        columnNames.flatMap((name, k) => (table.dropped.includes(name) ? [] : [[name, values[k]]])),
      ),
    );
  }
  insertStart.lastIndex = i;
}

// ── Decide Postgres types from the MySQL types and the data ─────────────────

const isJson = (value) => {
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === "object";
  } catch {
    return false;
  }
};

for (const table of tables.values()) {
  for (const column of table.columns) {
    const values = table.rows.map((row) => row[column.name]).filter((v) => v !== null);
    if (column.autoIncrement) column.pg = "integer generated by default as identity";
    else if (column.type === "tinyint") {
      // Only a true 0/1 flag becomes boolean.
      column.pg = values.every((v) => v === 0 || v === 1) ? "boolean" : "smallint";
    } else if (["int", "integer", "mediumint"].includes(column.type)) column.pg = "integer";
    else if (column.type === "smallint") column.pg = "smallint";
    else if (column.type === "bigint") column.pg = "bigint";
    else if (["float", "double", "decimal", "numeric"].includes(column.type)) column.pg = "double precision";
    else if (column.type === "date") column.pg = "date";
    else if (["timestamp", "datetime"].includes(column.type)) column.pg = "timestamptz";
    else if (column.type === "json") column.pg = "jsonb";
    else if (values.length > 0 && values.every(isJson)) column.pg = "jsonb";
    else column.pg = "text";
  }
}

// ── Write the Postgres script ───────────────────────────────────────────────

const ident = (name) => `"${name}"`;
const qualified = (name) => `${SCHEMA}.${ident(name)}`;
const quote = (text) => `'${String(text).replace(/'/g, "''")}'`;

function literal(value, column) {
  if (value === null || value === undefined) return "null";
  switch (column.pg) {
    case "boolean":
      return value ? "true" : "false";
    case "timestamptz":
    case "date":
      return /^0000-00-00/.test(String(value)) ? "null" : quote(value);
    case "jsonb":
      return quote(value);
    case "text":
      return quote(value);
    default:
      return typeof value === "number" ? (Number.isFinite(value) ? String(value) : "null") : quote(value);
  }
}

const out = [];
const summary = [];
out.push(
  `-- Generated by supabase/legacy/convert-mysql-dump.mjs from ${path.basename(input)}`,
  `-- on ${new Date().toISOString().slice(0, 10)}. Run it once in the Supabase SQL Editor.`,
  `-- It copies the old system's tables into the "${SCHEMA}" schema. Running it again`,
  `-- replaces that copy; the app's own tables are not touched.`,
  "",
  "begin;",
  "set local time zone 'UTC';",
  "",
  `create schema if not exists ${SCHEMA};`,
  `comment on schema ${SCHEMA} is 'Read-only copy of the old MySQL system, kept for migrating into the app tables.';`,
  "",
);

for (const table of tables.values()) {
  out.push(`drop table if exists ${qualified(table.name)} cascade;`);
}
out.push("");

for (const table of tables.values()) {
  const lines = table.columns.map((column) => {
    let line = `  ${ident(column.name)} ${column.pg}`;
    if (column.autoIncrement) line += " primary key";
    else if (column.currentTimestamp) line += " default now()";
    return line;
  });
  out.push(`create table ${qualified(table.name)} (\n${lines.join(",\n")}\n);`);
  out.push(`alter table ${qualified(table.name)} enable row level security;`);
  out.push(
    `comment on table ${qualified(table.name)} is ${quote(`Copy of TechproCanada.${table.name} from the old MySQL system.`)};`,
    "",
  );
}

// Rows in batches, so one statement never gets huge.
for (const table of tables.values()) {
  const names = table.columns.map((column) => ident(column.name)).join(", ");
  for (let start = 0; start < table.rows.length; start += 200) {
    const batch = table.rows.slice(start, start + 200);
    const tuples = batch.map(
      (row) => `  (${table.columns.map((column) => literal(row[column.name], column)).join(", ")})`,
    );
    out.push(`insert into ${qualified(table.name)} (${names}) values\n${tuples.join(",\n")};`, "");
  }
  const id = table.columns.find((column) => column.autoIncrement);
  if (id && table.rows.length > 0) {
    out.push(
      `select setval(pg_get_serial_sequence('${SCHEMA}.${table.name}', '${id.name}'), (select max(${ident(id.name)}) from ${qualified(table.name)}));`,
      "",
    );
  }
  summary.push(
    `${table.name}: ${table.rows.length} rows` +
      (table.dropped.length ? ` (left out: ${table.dropped.join(", ")})` : ""),
  );
}

// Foreign keys and their indexes, after the data is in.
for (const table of tables.values()) {
  for (const fk of table.foreignKeys) {
    out.push(
      `create index ${ident(`${table.name}_${fk.column}_idx`)} on ${qualified(table.name)} (${ident(fk.column)});`,
    );
    const target = tables.get(fk.table);
    if (!target) {
      out.push(`-- ${table.name}.${fk.column} points at ${fk.table}, which is not in this dump: no foreign key.`);
      summary.push(`  ${table.name}.${fk.column} -> ${fk.table}: table missing from the dump`);
      continue;
    }
    const ids = new Set(target.rows.map((row) => row[fk.refColumn]));
    const dangling = table.rows.filter((row) => row[fk.column] !== null && !ids.has(row[fk.column]));
    const constraint = `alter table ${qualified(table.name)} add constraint ${ident(`${table.name}_${fk.column}_fkey`)} foreign key (${ident(fk.column)}) references ${qualified(fk.table)} (${ident(fk.refColumn)})`;
    if (dangling.length > 0) {
      const missing = [...new Set(dangling.map((row) => row[fk.column]))].sort((a, b) => a - b);
      out.push(
        `-- ${dangling.length} row(s) point at ${fk.table} ids that no longer exist (${missing.join(", ")}),`,
        "-- so the key is not checked for existing rows (NOT VALID); new rows are checked.",
        `${constraint} not valid;`,
      );
      summary.push(`  ${table.name}.${fk.column} -> ${fk.table}: ${dangling.length} row(s) with missing ids`);
    } else {
      out.push(`${constraint};`);
    }
  }
}
out.push("", "commit;", "");

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, out.join("\n"));
console.log(`Wrote ${output}`);
console.log(summary.join("\n"));
for (const table of tables.values()) {
  const types = table.columns
    .filter((c) => ["boolean", "jsonb", "timestamptz"].includes(c.pg))
    .map((c) => `${c.name}:${c.pg}`);
  if (types.length) console.log(`  ${table.name} -> ${types.join(", ")}`);
}
