import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTransit } from "../src/shared/transit.js";
import { resolveSite } from "../src/shared/sites.js";
import { parseSearch } from "../src/shared/domain.js";
const row = (
  tags: Record<string, string | undefined>,
  transport: any = { groups: [], routes: [] },
) => ({
  sourceType: "node" as const,
  sourceId: "8",
  lat: 48.1,
  lon: 11.4,
  tags: Object.fromEntries(
    Object.entries(tags).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  ),
  transport,
});
test("Transit legacy and PTv2 modes retain explicit evidence and exclusions", () => {
  for (const [tags, mode] of [
    [{ railway: "station" }, "train"],
    [{ railway: "station", station: "subway" }, "subway"],
    [{ railway: "tram_stop" }, "tram"],
    [{ highway: "bus_stop" }, "bus"],
    [{ amenity: "taxi" }, "taxi"],
    [{ amenity: "ferry_terminal" }, "ferry"],
    [{ aerialway: "station" }, "cable"],
    [{ public_transport: "platform", trolleybus: "yes" }, "trolleybus"],
  ] as [Record<string, string>, string][])
    assert.ok(
      normalizeTransit(row(tags))?.transit?.modes.includes(mode as any),
    );
  for (const tags of [
    { railway: "yard" },
    { amenity: "taxi", access: "private" },
    { railway: "station", passenger: "no" },
    { highway: "bus_stop", "disused:highway": "bus_stop" },
    { amenity: "taxi", type: "route" },
    { amenity: "bicycle_rental" },
  ] as Record<string, string>[])
    assert.equal(normalizeTransit(row(tags)), null);
});
test("Transit S-Bahn uses relation evidence, not station names or light rail alone", () => {
  assert.ok(
    !normalizeTransit(
      row({ railway: "station", station: "light_rail", name: "S1" }),
    )?.transit?.modes.includes("suburban_rail"),
  );
  const routes = [
    {
      id: "relation/12",
      mode: "suburban_rail",
      ref: "S1",
      network: "MVV",
      evidence: "route=train;ref=S1;network=MVV",
    },
  ];
  const p = normalizeTransit(
    row({ railway: "station" }, { groups: [], routes }),
  )!;
  assert.ok(p.transit?.modes.includes("suburban_rail"));
  assert.ok(
    !normalizeTransit(
      row({ railway: "station", train: "no" }, { groups: [], routes }),
    )?.transit?.modes.includes("suburban_rail"),
  );
});
test("Transit context is required and ambiguous parent links stay ungrouped", () => {
  assert.throws(
    () =>
      normalizeTransit({
        ...row({ highway: "bus_stop" }),
        transport: undefined,
      }),
    /TRANSIT_CONTEXT/,
  );
  const p = normalizeTransit(
    row(
      { public_transport: "platform", bus: "yes" },
      {
        groups: [
          { id: "relation/1", tags: { name: "Hub" } },
          { id: "relation/2", tags: { name: "Other" } },
        ],
        routes: [],
      },
    ),
  )!;
  assert.equal(p.transit?.groupId, null);
  assert.equal(p.transit?.contextWarning, "AMBIGUOUS_STOP_AREA");
  const e = normalizeTransit(
    row(
      { railway: "subway_entrance" },
      {
        groups: [{ id: "relation/1", tags: { name: "Hub", subway: "yes" } }],
        routes: [],
      },
    ),
  )!;
  assert.equal(e.transit?.kind, "entrance");
  assert.ok(e.transit?.modes.includes("subway"));
});
test("Transit capability contract hides service availability and isolates mode filters", () => {
  assert.equal(
    resolveSite("transit.bloli.com", true)?.capabilities.openNow,
    false,
  );
  assert.equal(
    parseSearch(new URLSearchParams("lat=48&lon=11&mode=subway"), "transit")
      .mode,
    "subway",
  );
  for (const suffix of [
    "fee=all",
    "sellerType=all",
    "openNow=false",
    "mode=bogus",
    "mode=bus&mode=train",
  ])
    assert.throws(() =>
      parseSearch(new URLSearchParams("lat=48&lon=11&" + suffix), "transit"),
    );
  assert.throws(() =>
    parseSearch(new URLSearchParams("lat=48&lon=11&mode=bus"), "water"),
  );
});
test("Transit rejects negated-only modes and exit-only entrances", () => {
  assert.equal(normalizeTransit(row({ highway: "bus_stop", bus: "no" })), null);
  assert.equal(
    normalizeTransit(
      row(
        { railway: "subway_entrance", entrance: "exit" },
        { groups: [{ id: "relation/1", tags: { subway: "yes" } }], routes: [] },
      ),
    ),
    null,
  );
  assert.ok(
    normalizeTransit(
      row({ public_transport: "platform", monorail: "yes" }),
    )?.transit?.modes.includes("other_rail"),
  );
});
test("Transit excludes owner-excluded airport/shared mobility fallback but retains real bus stops there", () => {
  for (const tags of [
    { public_transport: "platform", aeroway: "gate", aircraft: "yes" },
    { public_transport: "station", amenity: "bicycle_rental" },
    { public_transport: "station", amenity: "car_sharing" },
  ])
    assert.equal(normalizeTransit(row(tags)), null);
  assert.ok(
    normalizeTransit(
      row({ highway: "bus_stop", name: "Airport bus stop" }),
    )?.transit?.modes.includes("bus"),
  );
});
test("Transit primary lifecycle values override PTv2 passenger tags", () => {
  for (const tags of [
    {
      public_transport: "platform",
      railway: "construction",
      construction: "platform",
      train: "yes",
    },
    { public_transport: "station", railway: "disused", train: "yes" },
  ])
    assert.equal(normalizeTransit(row(tags)), null);
});
test("Excluded and inactive parent context cannot make airport gates or entrances usable", () => {
  const groups = [{ id: "relation/100", tags: { subway: "yes" } }];
  assert.equal(
    normalizeTransit(
      row(
        { public_transport: "platform", aeroway: "gate", aircraft: "yes" },
        { groups, routes: [] },
      ),
    ),
    null,
  );
  assert.equal(
    normalizeTransit(
      row(
        { entrance: "main" },
        {
          groups: [
            {
              id: "relation/100",
              tags: {
                public_transport: "stop_area",
                railway: "disused",
                train: "yes",
              },
            },
          ],
          routes: [],
        },
      ),
    ),
    null,
  );
});
