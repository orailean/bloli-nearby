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
test("schema backfills bypass the request timeout and restore it afterward", async () => {
  const commands: string[] = [];
  const fakePool = {
    connect: async () => ({
      query: async (sql: string) => {
        commands.push(sql);
        return { rows: [] };
      },
      release: () => commands.push("release"),
    }),
  } as unknown as Parameters<typeof migrate>[0];
  await migrate(fakePool);
  assert.equal(commands[0], "SET statement_timeout = 0");
  assert.match(commands[1], /INSERT INTO country_location_memberships/);
  assert.equal(commands[2], "SET statement_timeout = 30000");
  assert.equal(commands[3], "release");
});
