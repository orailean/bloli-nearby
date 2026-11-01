import test from "node:test";
import assert from "node:assert/strict";
import { databaseOptions, migrate } from "../src/server/db.js";
test("container connections use configurable shared database and role names", () => {
  assert.deepEqual(
    databaseOptions(
      { DATABASE_PASSWORD_FILE: "/secret" },
      () => "test-password",
    ),
    {
      host: "db",
      port: 5432,
      user: "bloli",
      database: "bloli_nearby",
      password: "test-password",
    },
  );
  assert.deepEqual(
    databaseOptions(
      {
        DATABASE_PASSWORD_FILE: "/secret",
        DB_USER: "custom_user",
        DB_NAME: "custom_db",
        DB_HOST: "custom_host",
        DB_PORT: "5440",
      },
      () => "test-password",
    ),
    {
      host: "custom_host",
      port: 5440,
      user: "custom_user",
      database: "custom_db",
      password: "test-password",
    },
  );
});
test("native development preserves its explicit connection URL", () => {
  assert.deepEqual(
    databaseOptions({ DATABASE_URL: "postgres://localhost/local_sample" }),
    { connectionString: "postgres://localhost/local_sample" },
  );
});
const fakeMigrationPool = (
  commands: string[],
  respond: (sql: string) => { rows: unknown[] } = () => ({ rows: [] }),
) =>
  ({
    connect: async () => ({
      query: async (sql: string) => {
        commands.push(sql);
        return respond(sql);
      },
      release: () => commands.push("release"),
    }),
  }) as unknown as Parameters<typeof migrate>[0];
test("schema backfills bypass the request timeout and restore it afterward", async () => {
  const commands: string[] = [];
  await migrate(fakeMigrationPool(commands));
  assert.match(commands[0], /to_regclass\('schema_state'\)/);
  assert.equal(commands[1], "SET statement_timeout = 0");
  assert.match(commands[2], /INSERT INTO country_location_memberships/);
  assert.match(commands[3], /INSERT INTO schema_state/);
  assert.equal(commands[4], "SET statement_timeout = 30000");
  assert.equal(commands[5], "release");
});
test("an already applied schema takes no table locks", async () => {
  const commands: string[] = [];
  await migrate(
    fakeMigrationPool(commands, (sql) => ({
      rows: /to_regclass|FROM schema_state/.test(sql) ? [{ ready: true }] : [],
    })),
  );
  assert.equal(
    commands.some((sql) => /CREATE TABLE|ALTER TABLE/.test(sql)),
    false,
  );
  assert.equal(commands.at(-1), "release");
});
test("a deadlocked schema run is retried and other errors are not", async () => {
  const commands: string[] = [];
  let failures = 1;
  await migrate(
    fakeMigrationPool(commands, (sql) => {
      if (/CREATE TABLE/.test(sql) && failures-- > 0)
        throw Object.assign(new Error("deadlock detected"), { code: "40P01" });
      return { rows: [] };
    }),
    { retryDelayMs: 0 },
  );
  assert.equal(commands.filter((sql) => /CREATE TABLE/.test(sql)).length, 2);
  assert.match(commands.at(-3)!, /INSERT INTO schema_state/);
  await assert.rejects(
    migrate(
      fakeMigrationPool([], (sql) => {
        if (/CREATE TABLE/.test(sql))
          throw Object.assign(new Error("syntax"), { code: "42601" });
        return { rows: [] };
      }),
      { retryDelayMs: 0 },
    ),
    /syntax/,
  );
});
