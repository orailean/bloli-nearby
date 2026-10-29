import { resolveSite, sites } from "../../shared/sites.js";
import * as loo from "./loo/index.js";
import * as kebab from "./kebab/index.js";
import * as kippe from "./kippe/index.js";
import * as water from "./water/index.js";
import * as transit from "./transit/index.js";
import * as atm from "./atm/index.js";
import * as stay from "./stay/index.js";
import * as charge from "./charge/index.js";
const shellSite = document.documentElement.dataset.site;
export const siteOverride =
  import.meta.env.DEV &&
  /^(localhost|127\.0\.0\.1|\[::1\]|loo\.localhost|kippe\.localhost|kebab\.localhost|water\.localhost|transit\.localhost|charge\.localhost|atm\.localhost|stay\.localhost)$/.test(
    location.hostname,
  )
    ? (new URLSearchParams(location.search).get("site") ?? undefined)
    : undefined;
const resolved = resolveSite(location.host, import.meta.env.PROD, siteOverride);
export const site =
  resolved ??
  Object.values(sites).find((profile) => profile.id === shellSite) ??
  sites.loo;
document.documentElement.dataset.site = site.id;
export const sitePresentation = {
  loo,
  kippe,
  kebab,
  water,
  transit,
  charge,
  atm,
  stay,
};
