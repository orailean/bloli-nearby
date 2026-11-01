import test from "node:test";
import assert from "node:assert/strict";
import type pg from "pg";
import { request } from "node:http";
import { createApi } from "../src/server/api.js";
import { runRefresh } from "../src/server/refresh.js";
import { migrate } from "../src/server/db.js";
import { AppError } from "../src/shared/domain.js";
import {
  captureEvents,
  sanitizeError,
  sanitizeText,
} from "../src/server/log.js";

// Values that must never leave the host, wherever they appear in an error.
const leaks = [
  "52.52001",
  "13.40495",
  "lat=",
  "203.0.113.9",
  "2001:db8::7",
  "s3cr3t-pass",
  "abc.def.ghi",
  "glc_eyJrIjoiZmFrZSJ9",
];
const leakyMessage = [
  "query failed for postgres://bloli:s3cr3t-pass@db:5432/bloli_nearby?sslmode=disable",
  "while serving /api/locations?lat=52.52001&lon=13.40495&radius=500 to 203.0.113.9 and 2001:db8::7",
  "Authorization: Bearer abc.def.ghi password=s3cr3t-pass token=glc_eyJrIjoiZmFrZSJ9",
].join("\n");
const assertNoLeaks = (value: unknown) => {
  const text = JSON.stringify(value);
  for (const leak of leaks) assert.ok(!text.includes(leak), `${leak} in ${text}`);
};

test("sanitized text keeps diagnostic shape but masks visitor and credential values", () => {
  const text = sanitizeText(leakyMessage);
  assertNoLeaks(text);
  assert.match(text, /postgres:\/\/db:5432\/bloli_nearby/);
  assert.match(text, /\/api\/locations\?\[redacted\]/);
  assert.match(text, /\[ip\] and \[ip\]/);
  assert.match(text, /Authorization: \[redacted\]/);
  assert.equal(sanitizeText("sent Bearer abc.def.ghi"), "sent Bearer [redacted]");
  assert.ok(!text.includes("\n"), "multiline input becomes one line");
  assert.equal(sanitizeText("x".repeat(400)).length, 301);
  assert.equal(sanitizeText("finished 3 of 12 at 14:03:55 in 1.5s"), "finished 3 of 12 at 14:03:55 in 1.5s");
});

test("sanitized errors keep codes and bounded stack frames for multiline exceptions", () => {
  const error = Object.assign(new Error(leakyMessage), { code: "57014" });
  const safe = sanitizeError(error);
  assertNoLeaks(safe);
  assert.equal(safe.code, "57014");
  assert.equal(safe.name, "Error");
  assert.ok(safe.stack && safe.stack.length > 0 && safe.stack.length <= 8);
  assert.ok(safe.stack.every((frame) => frame.startsWith("at ")));
  assert.equal(sanitizeError(new AppError("OSM_VERSION_CONFLICT", 409)).code, "OSM_VERSION_CONFLICT");
  assert.equal(sanitizeError(Object.assign(new Error("x"), { code: "a b; rm" })).code, undefined);
  assert.deepEqual(sanitizeError("plain"), { name: "NonError", message: "plain" });
});

test("an unexpected API failure emits one sanitized event and an unchanged public error", async () => {
  const pool = {
    query: async () => {
      throw Object.assign(new Error(leakyMessage), { code: "57014" });
    },
  } as unknown as pg.Pool;
  const server = createApi(pool).listen(0);
  const capture = captureEvents();
  const previous = { env: process.env.NODE_ENV, revision: process.env.BLOLI_REVISION };
  process.env.NODE_ENV = "production";
  process.env.BLOLI_REVISION = "a".repeat(40);
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address() as { port: number };
    // fetch() cannot set Host; the production site is chosen from it.
    const response = await new Promise<{ status: number; body: string; requestId: unknown }>((resolve, reject) =>
      request(
        {
          port,
          path: "/api/status?lat=52.52001&lon=13.40495",
          headers: { host: "loo.bloli.com", authorization: "Bearer abc.def.ghi", "x-forwarded-for": "203.0.113.9" },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode!, body, requestId: res.headers["x-request-id"] }));
        },
      ).on("error", reject).end(),
    );
    assert.equal(response.status, 503);
    assert.deepEqual(JSON.parse(response.body), { error: "SERVICE_UNAVAILABLE" });
    const events = capture.events();
    assert.equal(events.length, 1);
    const [event] = events;
    assertNoLeaks(event);
    assert.equal(event.event, "api_operation_failed");
    assert.equal(event.level, "error");
    assert.equal(event.site, "loo");
    assert.equal(event.operation, "/api/status");
    assert.equal(event.revision, "a".repeat(40));
    assert.equal(event.error.code, "57014");
    assert.equal(typeof event.durationMs, "number");
    assert.match(event.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(response.requestId, event.requestId);
    assert.ok(!Number.isNaN(Date.parse(event.ts)));
  } finally {
    capture.restore();
    server.close();
    process.env.NODE_ENV = previous.env;
    if (previous.revision === undefined) delete process.env.BLOLI_REVISION;
    else process.env.BLOLI_REVISION = previous.revision;
  }
});

test("client errors and unknown paths are not logged as operation failures", async () => {
  const server = createApi({} as pg.Pool).listen(0);
  const capture = captureEvents();
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${port}/api/settlements?site=loo&country=xx`);
    assert.equal(response.status, 400);
    assert.deepEqual(capture.events(), []);
  } finally {
    capture.restore();
    server.close();
  }
});

const refreshPool = (queries: string[] = []) =>
  ({
    connect: async () => ({
      query: async (sql: string) => {
        queries.push(sql);
        if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
        if (sql.startsWith("INSERT INTO import_jobs")) return { rows: [{ id: "42" }] };
        return { rows: [] };
      },
      release: () => {},
    }),
  }) as unknown as pg.Pool;

test("a country import emits start and completion events with job identity and counts", async () => {
  const capture = captureEvents();
  try {
    const result = await runRefresh(
      refreshPool(),
      "https://download.geofabrik.de/europe/romania-latest.osm.pbf",
      async () => ({ facilities: 3, vendingMachines: 7 }),
      "ro",
    );
    assert.deepEqual(result, { facilities: 3, vendingMachines: 7 }, "CLI result is unchanged");
    const [started, finished] = capture.events();
    assert.equal(started.event, "import_started");
    assert.equal(started.country, "ro");
    assert.equal(started.jobId, "42");
    assert.equal(started.source, "https://download.geofabrik.de/europe/romania-latest.osm.pbf");
    assert.equal(finished.event, "import_finished");
    assert.equal(finished.status, "success");
    assert.equal(finished.level, "info");
    assert.equal(finished.jobId, "42");
    assert.deepEqual(finished.counts, { facilities: 3, vendingMachines: 7 });
    assert.equal(typeof finished.durationMs, "number");
  } finally {
    capture.restore();
  }
});

test("a failed country import emits a sanitized failure and still fails the job", async () => {
  const capture = captureEvents();
  const queries: string[] = [];
  try {
    await assert.rejects(
      runRefresh(refreshPool(queries), "https://example.org/a.pbf", async () => {
        throw new AppError("OSM_VERSION_CONFLICT", 409);
      }, "at"),
      /OSM_VERSION_CONFLICT/,
    );
    await assert.rejects(
      runRefresh(refreshPool(), "https://example.org/a.pbf", async () => {
        throw new Error(leakyMessage);
      }, "hu"),
    );
    const finished = capture.events().filter((event) => event.event === "import_finished");
    assert.equal(finished.length, 2);
    assert.equal(finished[0].status, "failed");
    assert.equal(finished[0].level, "error");
    assert.equal(finished[0].country, "at");
    assert.equal(finished[0].error.code, "OSM_VERSION_CONFLICT");
    assertNoLeaks(finished[1]);
    assert.ok(queries.some((sql) => sql.includes("status='failed'")), "job is still recorded as failed");
  } finally {
    capture.restore();
  }
});

test("schema migration reports whether it applied, skipped or retried", async () => {
  const capture = captureEvents();
  try {
    let failures = 1;
    const pool = (ready: boolean) =>
      ({
        connect: async () => ({
          query: async (sql: string) => {
            if (/CREATE TABLE/.test(sql) && failures-- > 0)
              throw Object.assign(new Error("deadlock detected"), { code: "40P01" });
            return { rows: /to_regclass|FROM schema_state/.test(sql) && ready ? [{ ready: true }] : [] };
          },
          release: () => {},
        }),
      }) as unknown as pg.Pool;
    await migrate(pool(false), { retryDelayMs: 0 });
    await migrate(pool(true));
    const events = capture.events();
    assert.deepEqual(
      events.map((event) => [event.event, event.status ?? event.code]),
      [
        ["schema_migration_retry", "40P01"],
        ["schema_migration", "applied"],
        ["schema_migration", "skipped"],
      ],
    );
    assert.equal(events[1].attempts, 2);
  } finally {
    capture.restore();
  }
});
