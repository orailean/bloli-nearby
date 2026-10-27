import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailFields } from "../src/web/sites/kebab/index.js";
import { siteDictionaries } from "../src/web/i18n.js";
import type { Facility } from "../src/shared/types.js";
test("Kebab details show only mapped food claims and safe HTTP links", () => {
  const t = siteDictionaries.kebab.en;
  const render = (value: object) =>
    renderToStaticMarkup(
      createElement(DetailFields, { t, item: value as Facility }),
    );
  const empty = render({});
  assert.doesNotMatch(empty, /Halal|Vegan|Takeaway|Delivery/);
  const mapped = render({
    cuisine: ["kebab"],
    takeaway: "yes",
    dietary: { halal: "no" },
    website: "javascript:alert(1)",
    menuUrl: "https://example.com/menu",
  });
  assert.match(mapped, /Halal/);
  assert.match(mapped, /No/);
  assert.match(mapped, /https:\/\/example.com\/menu/);
  assert.doesNotMatch(mapped, /javascript:/);
  for (const unsafe of [
    "data:text/html,test",
    "//evil.test",
    "https://user:pass@example.com",
    "https://example.com/\nmalicious",
  ])
    assert.doesNotMatch(render({ website: unsafe }), /href=/);
});
