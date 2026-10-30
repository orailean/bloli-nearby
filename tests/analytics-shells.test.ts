import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sites } from "../src/shared/sites.js";

test("built site shells each include only their assigned Cloudflare beacon", () => {
  const tokens = {
    view: "66e9fa7dd6aa48dea133dfb9a1611a12",
    loo: "e801fcd3a63d4dab89cdf795c0c065df",
    kippe: "a88104d9b5474836b0b83c7c3040667a",
    kebab: "8c9c02f97f134755a37d8e278a57fa17",
    water: "a851083a4af84e56a8a4ddbf1952ffaf",
    transit: "f7546bb7f5844f3a8e881c5860103442",
    charge: "6d0915767d0c4e79ade418897dcc12ff",
    atm: "19d2b3ccec7048d5a752c81573edef0b",
    stay: "4f5af3ea8f3642c4a6904f61fafe2018",
  };
  const temp = mkdtempSync(join(tmpdir(), "bloli-analytics-"));
  try {
    mkdirSync(join(temp, "scripts"));
    mkdirSync(join(temp, "dist"));
    copyFileSync(
      "scripts/build-site-shells.mjs",
      join(temp, "scripts/build-site-shells.mjs"),
    );
    // Exercise the real generator without depending on a previous Vite build.
    copyFileSync("index.html", join(temp, "dist/index.html"));
    execFileSync(process.execPath, [
      join(temp, "scripts/build-site-shells.mjs"),
    ]);
    assert.deepEqual(
      Object.keys(tokens).sort(),
      Object.keys(sites)
        .filter((id) => id !== "sights")
        .sort(),
    );
    for (const [id, expectedToken] of Object.entries(tokens)) {
      const html = readFileSync(join(temp, `dist/index-${id}.html`), "utf8");
      const scripts = [
        ...html.matchAll(
          /<script\b[^>]*\bsrc=['"]https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js['"][^>]*><\/script>/g,
        ),
      ];
      assert.equal(scripts.length, 1, `${id}: exactly one beacon`);
      assert.match(scripts[0][0], /type=['"]module['"]/);
      const beacon = scripts[0][0].match(/data-cf-beacon='([^']+)'/);
      assert.ok(beacon, `${id}: beacon configuration`);
      assert.deepEqual(JSON.parse(beacon[1]), { token: expectedToken });
      for (const token of Object.values(tokens)) {
        assert.equal(
          html.includes(token),
          token === expectedToken,
          `${id}: token isolation`,
        );
      }
      assert.ok(html.indexOf(scripts[0][0]) < html.indexOf("</body>"));
    }
    for (const id of ["sights"]) {
      const html = readFileSync(join(temp, `dist/index-${id}.html`), "utf8");
      assert.doesNotMatch(html, /cloudflareinsights|data-cf-beacon/);
      assert.ok(html.includes(`data-site="${id}"`));
      assert.ok(html.includes(`https://${id}.bloli.com/`));
    }
    assert.doesNotMatch(
      readFileSync("index.html", "utf8"),
      /cloudflareinsights|data-cf-beacon/,
    );
    assert.doesNotMatch(
      readFileSync(join(temp, "dist/index.html"), "utf8"),
      /cloudflareinsights|data-cf-beacon/,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
