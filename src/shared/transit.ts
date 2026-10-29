import { AppError, coordinates } from "./domain.js";
import type { Facility, SourceRecord } from "./types.js";
import {
  TRANSIT_MODES,
  type TransitMode,
  type TransitRoute,
} from "./transit-modes.js";
const lifecycle = [
  "disused",
  "abandoned",
  "demolished",
  "removed",
  "razed",
  "construction",
];
export function normalizeTransit(r: SourceRecord): Facility | null {
  coordinates(r.lat, r.lon);
  if (
    !["node", "way", "relation"].includes(r.sourceType) ||
    !/^\d+$/.test(r.sourceId)
  )
    throw new AppError("INVALID_SOURCE");
  const t = r.tags,
    c = r.transport;
  if (!c || !Array.isArray(c.groups) || !Array.isArray(c.routes))
    throw new AppError("INVALID_TRANSIT_CONTEXT");
  const validRoute = (v: TransitRoute) =>
    v &&
    /^relation\/\d+$/.test(v.id) &&
    TRANSIT_MODES.includes(v.mode) &&
    [v.ref, v.network, v.evidence].every((x) => typeof x === "string");
  if (
    c.routes.some((x) => !validRoute(x)) ||
    c.groups.some(
      (g) =>
        !g ||
        !/^relation\/\d+$/.test(g.id) ||
        !g.tags ||
        typeof g.tags !== "object" ||
        Object.values(g.tags).some((x) => typeof x !== "string") ||
        (g.routes &&
          (!Array.isArray(g.routes) || g.routes.some((x) => !validRoute(x)))),
    )
  )
    throw new AppError("INVALID_TRANSIT_CONTEXT");
  const active = (tags: Record<string, string>) =>
    !["route", "route_master", "collection"].includes(tags.type) &&
    !["railway", "highway", "amenity", "aerialway", "public_transport"].some(
      (key) => lifecycle.includes(tags[key]),
    ) &&
    !lifecycle.some(
      (k) =>
        tags[k] === "yes" ||
        ["railway", "highway", "amenity", "aerialway", "public_transport"].some(
          (key) => !!tags[`${k}:${key}`],
        ),
    ) &&
    (!tags.access ||
      ["yes", "public", "permissive", "customers", "destination"].includes(
        tags.access,
      )) &&
    !["no", "private"].includes(tags.foot) &&
    tags.locked !== "yes" &&
    !tags["access:conditional"] &&
    tags.passenger !== "no" &&
    tags.passengers !== "no" &&
    tags.station !== "freight" &&
    tags.freight !== "only" &&
    !["industrial", "military", "freight"].includes(tags.usage);
  if (
    !active(t) ||
    ["railway", "highway", "amenity", "aerialway", "public_transport"].some(
      (key) => lifecycle.includes(t[key]),
    )
  )
    return null;
  const station =
    t.public_transport === "station" ||
    ["station", "halt"].includes(t.railway) ||
    ["bus_station", "taxi", "ferry_terminal"].includes(t.amenity) ||
    t.aerialway === "station";
  const entrance =
    ["subway_entrance", "train_station_entrance"].includes(t.railway) ||
    t.public_transport === "entrance" ||
    (!!t.entrance && t.entrance !== "no");
  const platform =
    t.public_transport === "platform" ||
    t.railway === "platform" ||
    t.highway === "platform";
  const stop = t.highway === "bus_stop" || t.railway === "tram_stop";
  const position = t.public_transport === "stop_position";
  if (!station && !platform && !stop && !position && !entrance) return null;
  const parents = [...new Map(c.groups.map((g) => [g.id, g])).values()];
  const group =
    parents.length === 1 && active(parents[0].tags) ? parents[0] : null;
  if (entrance && (!group || ["exit", "emergency", "no"].includes(t.entrance)))
    return null;
  const modes = new Set<TransitMode>();
  const mapped = (tags: Record<string, string>) => {
    for (const mode of TRANSIT_MODES) {
      const key =
        mode === "suburban_rail"
          ? "suburban"
          : mode === "cable"
            ? "aerialway"
            : mode;
      if (tags[key] === "yes") modes.add(mode);
    }
    if (
      tags.monorail === "yes" ||
      tags.funicular === "yes" ||
      tags.narrow_gauge === "yes"
    )
      modes.add(tags.funicular === "yes" ? "funicular" : "other_rail");
    const subtype = tags.station;
    if (subtype === "subway") modes.add("subway");
    if (subtype === "light_rail") modes.add("light_rail");
    if (subtype === "funicular") modes.add("funicular");
    if (["monorail", "miniature", "narrow_gauge"].includes(subtype))
      modes.add("other_rail");
    if (tags.highway === "bus_stop" || tags.amenity === "bus_station")
      modes.add("bus");
    if (tags.railway === "tram_stop") modes.add("tram");
    if (tags.amenity === "taxi") modes.add("taxi");
    if (tags.amenity === "ferry_terminal") modes.add("ferry");
    if (tags.aerialway === "station") modes.add("cable");
  };
  mapped(t);
  const direct = c.routes.filter((x) => validRoute(x));
  for (const route of direct) modes.add(route.mode);
  const independentlyMapped = [...modes];
  const related = group?.routes || [];
  if (entrance || (station && !modes.size) || (!modes.size && platform)) {
    if (group) mapped(group.tags);
    for (const route of related) modes.add(route.mode);
  }
  if (["station", "halt"].includes(t.railway) && !modes.size)
    modes.add("train");
  const hadModes = modes.size > 0;
  for (const mode of [...modes]) {
    const key =
      mode === "suburban_rail"
        ? "suburban"
        : mode === "cable"
          ? "aerialway"
          : mode;
    if (t[key] === "no" || (mode === "suburban_rail" && t.train === "no"))
      modes.delete(mode);
  }
  if (!modes.size && hadModes) return null;
  if (
    (t.aeroway ||
      t.aircraft === "yes" ||
      [
        "bicycle_rental",
        "kick-scooter_rental",
        "car_sharing",
        "car_rental",
      ].includes(t.amenity)) &&
    !independentlyMapped.some((m) => m !== "other")
  )
    return null;
  if (!modes.size) modes.add("other");
  const names: Facility["names"] = {};
  for (const lang of ["de", "en", "ro", "hu"] as const)
    if (t[`name:${lang}`]) names[lang] = t[`name:${lang}`];
  const groupNames = Object.fromEntries(
    ["de", "en", "ro", "hu"]
      .filter((lang) => !!group?.tags[`name:${lang}`])
      .map((lang) => [lang, group!.tags[`name:${lang}`]]),
  );
  return {
    id: `${r.sourceType}/${r.sourceId}`,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    lat: r.lat,
    lon: r.lon,
    name: t.name || null,
    names,
    category: "transit",
    fee: "unknown",
    feeText: null,
    charge: null,
    access:
      t.access === "customers" ? "customers" : t.access ? "public" : "unknown",
    wheelchair: ["yes", "no", "limited"].includes(t.wheelchair)
      ? (t.wheelchair as Facility["wheelchair"])
      : "unknown",
    openingHours: t.opening_hours || null,
    operator: t.operator || group?.tags.operator || null,
    notes: t.description || null,
    tags: t,
    transit: {
      modes: [...modes],
      kind: entrance
        ? "entrance"
        : platform
          ? "platform"
          : position
            ? "position"
            : station
              ? "station"
              : "stop",
      groupId: group?.id || null,
      groupCandidates: parents.map((g) => g.id),
      contextWarning: parents.length > 1 ? "AMBIGUOUS_STOP_AREA" : null,
      groupName: group?.tags.name || null,
      groupNames,
      routes: direct,
      groupRoutes: related,
      localRef: t.local_ref || t.ref || null,
      network: t.network || group?.tags.network || null,
    },
  };
}
