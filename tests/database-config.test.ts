import test from "node:test";
import assert from "node:assert/strict";
import { databaseOptions } from "../src/server/db.js";
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
