import assert from "node:assert/strict";
import test from "node:test";
import { normalizeView, normalizeSights } from "../src/shared/tourism.js";
import { parseSearch } from "../src/shared/domain.js";
import type { SourceRecord } from "../src/shared/types.js";
const record = (tags: Record<string, string>): SourceRecord => ({
  sourceType: "node",
  sourceId: "123",
  lat: 48.1,
  lon: 11.5,
  tags,
});
test("View accepts explicit viewpoints and observation towers with mapped details", () => {
  const view = normalizeView(
    record({
      tourism: "viewpoint",
      name: "Lookout",
      "name:hu": "Kilátó",
      ele: "1320",
      direction: "90-180",
      fee: "no",
    }),
  );
  assert.equal(view?.category, "view");
  assert.equal(view?.tourist?.type, "viewpoint");
  assert.equal(view?.tourist?.elevation, "1320");
  assert.equal(view?.fee, "free");
  assert.equal(view?.names.hu, "Kilátó");
  assert.equal(view?.openingHours, null);
  assert.equal(
    normalizeView(
      record({
        tourism: "viewpoint",
        man_made: "tower",
        "tower:type": "observation",
      }),
    )?.tourist?.type,
    "tower",
  );
  const unrelated: Record<string, string>[] = [
    { natural: "peak" },
    { man_made: "tower", "tower:type": "communication" },
    { "tower:type": "observation" },
  ];
  for (const tags of unrelated) assert.equal(normalizeView(record(tags)), null);
});
test("Sights uses specific historic evidence before generic attractions, and retains ruins", () => {
  for (const [tags, type] of [
    [{ tourism: "museum" }, "museum"],
    [{ tourism: "attraction", historic: "castle" }, "castle"],
    [{ historic: "ruins", ruins: "yes" }, "ruins"],
    [{ historic: "archaeological_site" }, "archaeological_site"],
    [{ historic: "memorial" }, "memorial"],
  ] as const) {
    assert.equal(normalizeSights(record(tags))?.tourist?.type, type);
  }
  assert.equal(
    normalizeSights(record({ name: "Old Castle", historic: "building" })),
    null,
  );
  assert.equal(normalizeSights(record({ tourism: "viewpoint" })), null);
});
test("tourist places retain uncertain fees, safe contacts and reject restricted or inactive places", () => {
  for (const normalize of [normalizeView, normalizeSights]) {
    const tags = { tourism: "viewpoint", historic: "castle" };
    const excluded: Record<string, string>[] = [
      { access: "private" },
      { locked: "yes" },
      { "access:conditional": "yes @ (Mo-Fr)" },
      { demolished: "yes" },
      { "disused:tourism": "viewpoint" },
    ];
    for (const extra of excluded)
      assert.equal(normalize(record({ ...tags, ...extra })), null);
    const item = normalize(
      record({
        ...tags,
        fee: "yes",
        "fee:conditional": "no @ (Su)",
        website: "javascript:alert(1)",
        "contact:phone": "+49 123",
        opening_hours: "Mo-Fr 09:00-18:00",
      }),
    );
    assert.equal(item?.fee, "unknown");
    assert.equal(item?.website, null);
    assert.equal(item?.tourist?.phone, "+49 123");
  }
});
test("tourist type filters validate category ownership, values and duplicates", () => {
  const query = (s: string) => new URLSearchParams("lat=48&lon=11&" + s);
  assert.equal(
    parseSearch(query("viewType=tower&fee=free"), "view").viewType,
    "tower",
  );
  assert.equal(
    parseSearch(query("sightType=castle&openNow=true"), "sights").sightType,
    "castle",
  );
  for (const category of ["view", "sights", "toilets"] as const) {
    for (const extra of category === "view"
      ? ["sightType=castle", "viewType=castle", "viewType=tower&viewType=tower"]
      : category === "sights"
        ? [
            "viewType=tower",
            "sightType=tower",
            "sightType=museum&sightType=museum",
          ]
        : ["viewType=all", "sightType=all"])
      assert.throws(() => parseSearch(query(extra), category));
  }
});

test("the ten-category sample never assigns conflicting coordinates to an OSM identity", async () => {
  const { readFile } = await import("node:fs/promises");
  const rows = (
    await readFile(
      new URL("./fixtures/multi-site.jsonl", import.meta.url),
      "utf8",
    )
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const positions = new Map<string, string>();
  for (const row of rows) {
    if (!row.sourceId || row.kind === "settlement") continue;
    const key = `${row.sourceType}/${row.sourceId}`,
      point = JSON.stringify([row.lat, row.lon]);
    assert.ok(
      !positions.has(key) || positions.get(key) === point,
      `${key}: inconsistent fixture geometry`,
    );
    positions.set(key, point);
  }
  assert.ok(rows[0].categories.includes("view"));
  assert.ok(rows[0].categories.includes("sights"));
  assert.equal(rows.at(-1).records, rows.length - 2);
});

test("tourist normalizers reject logical networks and person collections", () => {
  for (const type of ["network", "person", "historic:waterway", "water"]) {
    assert.equal(
      normalizeSights({
        ...record({ type, tourism: "attraction", historic: "memorial" }),
        sourceType: "relation",
      }),
      null,
    );
    assert.equal(
      normalizeView({
        ...record({ type, tourism: "viewpoint" }),
        sourceType: "relation",
      }),
      null,
    );
  }
});
