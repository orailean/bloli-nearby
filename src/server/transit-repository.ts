import type pg from "pg";
import type { SearchQuery, Facility } from "../shared/types.js";
export async function transitRows(
  db: pg.PoolClient,
  q: SearchQuery,
): Promise<{
  data: Facility;
  distance: number;
  countryCode: string;
  countryName: string;
  timezone: string;
}[]> {
  const result = await db.query(
    `WITH candidates AS (
 SELECT DISTINCT ON(t.location_id) t.*,l.location,c.data,m.country_code AS "countryCode",co.name AS "countryName",co.timezone,
 COALESCE(t.group_id,t.location_id) AS logical_id,
 ST_Distance(l.location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance
 FROM locations l JOIN transit_components t ON t.location_id=l.id JOIN location_categories c ON c.location_id=l.id AND c.category='transit'
 JOIN country_location_memberships m ON m.category='transit' AND m.location_id=l.id
 JOIN countries co ON co.code=m.country_code AND co.status='active'
 JOIN country_datasets d ON d.country_code=co.code AND d.category='transit'
 WHERE ST_DWithin(l.location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3) AND ($4='all' OR $4=ANY(t.modes))
 ORDER BY t.location_id,m.source_version DESC,m.country_code
 ), eligible AS (
 SELECT n.* FROM candidates n WHERE CASE
 WHEN EXISTS(SELECT 1 FROM transit_components m JOIN country_location_memberships cm ON cm.category='transit' AND cm.location_id=m.location_id JOIN countries cc ON cc.code=cm.country_code AND cc.status='active' JOIN country_datasets cd ON cd.country_code=cc.code AND cd.category='transit' WHERE COALESCE(m.group_id,m.location_id)=n.logical_id AND ($4='all' OR $4=ANY(m.modes)) AND m.kind IN ('entrance','platform')) THEN n.kind IN ('entrance','platform')
 WHEN EXISTS(SELECT 1 FROM transit_components m JOIN country_location_memberships cm ON cm.category='transit' AND cm.location_id=m.location_id JOIN countries cc ON cc.code=cm.country_code AND cc.status='active' JOIN country_datasets cd ON cd.country_code=cc.code AND cd.category='transit' WHERE COALESCE(m.group_id,m.location_id)=n.logical_id AND ($4='all' OR $4=ANY(m.modes)) AND m.kind<>'position') THEN n.kind<>'position'
 ELSE true END
 ), nearest AS (SELECT DISTINCT ON(logical_id) * FROM eligible ORDER BY logical_id,distance,location_id)
 SELECT n.data,n.distance,n.logical_id,n.group_id,n."countryCode",n."countryName",n.timezone,
 (SELECT count(DISTINCT m.location_id)::int FROM transit_components m JOIN country_location_memberships cm ON cm.category='transit' AND cm.location_id=m.location_id JOIN countries cc ON cc.code=cm.country_code AND cc.status='active' JOIN country_datasets cd ON cd.country_code=cc.code AND cd.category='transit' WHERE COALESCE(m.group_id,m.location_id)=n.logical_id AND ($4='all' OR $4=ANY(m.modes))) AS component_count,
 (SELECT jsonb_agg(x) FROM (SELECT m.location_id AS id,m.kind,c.data->>'name' AS name,c.data->'transit'->>'localRef' AS ref,m.modes,c.data->>'wheelchair' AS wheelchair FROM transit_components m JOIN location_categories c ON c.location_id=m.location_id AND c.category='transit' JOIN country_location_memberships cm ON cm.category='transit' AND cm.location_id=m.location_id JOIN countries cc ON cc.code=cm.country_code AND cc.status='active' JOIN country_datasets cd ON cd.country_code=cc.code AND cd.category='transit' WHERE COALESCE(m.group_id,m.location_id)=n.logical_id AND ($4='all' OR $4=ANY(m.modes)) GROUP BY m.location_id,m.kind,c.data,m.modes ORDER BY m.location_id LIMIT 30)x) AS components,
 (SELECT array_agg(DISTINCT mode) FROM transit_components m JOIN country_location_memberships cm ON cm.category='transit' AND cm.location_id=m.location_id JOIN countries cc ON cc.code=cm.country_code AND cc.status='active' JOIN country_datasets cd ON cd.country_code=cc.code AND cd.category='transit' CROSS JOIN unnest(m.modes) mode WHERE COALESCE(m.group_id,m.location_id)=n.logical_id) AS group_modes
 FROM nearest n ORDER BY n.distance,n.logical_id LIMIT $5`,
    [q.lon, q.lat, q.radius, q.mode ?? "all", q.limit + 1],
  );
  return result.rows.map((row) => {
    const item = row.data as Facility;
    const t = item.transit!;
    const group = !!row.group_id;
    const allRoutes = [...t.routes, ...t.groupRoutes];
    const unique = [
      ...new Map(
        allRoutes.map((x) => [`${x.mode}/${x.network}/${x.ref}`, x]),
      ).values(),
    ];
    return {
      distance: Number(row.distance),
      countryCode: row.countryCode,
      countryName: row.countryName,
      timezone: row.timezone,
      data: {
        ...item,
        id: row.logical_id,
        name: group ? t.groupName || item.name : item.name,
        names: group ? { ...item.names, ...t.groupNames } : item.names,
        transit: {
          ...t,
          modes: row.group_modes,
          componentId: item.id,
          componentCount: row.component_count,
          components: row.components,
          approximate: !["entrance", "platform"].includes(t.kind),
          directionsAvailable: t.kind !== "position",
          routes: unique.slice(0, 40),
          groupRoutes: [],
          linesTruncated: unique.length > 40,
        },
      },
    };
  });
}
