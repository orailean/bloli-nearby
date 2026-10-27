import { resolveSite, sites } from "../../shared/sites.js";
import * as loo from "./loo/index.js";
import * as kebab from "./kebab/index.js";
import * as kippe from "./kippe/index.js";
const shellSite = document.documentElement.dataset.site;
export const siteOverride =
  import.meta.env.DEV &&
  /^(localhost|127\.0\.0\.1|\[::1\]|loo\.localhost|kippe\.localhost|kebab\.localhost)$/.test(
    location.hostname,
  )
    ? (new URLSearchParams(location.search).get("site") ?? undefined)
    : undefined;
const resolved = resolveSite(location.host, import.meta.env.PROD, siteOverride);
export const site =
  resolved ??
  (shellSite === "kebab"
    ? sites.kebab
    : shellSite === "kippe"
      ? sites.kippe
      : sites.loo);
document.documentElement.dataset.site = site.id;
export const sitePresentation = { loo, kippe, kebab };
