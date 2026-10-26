import test from "node:test";
import assert from "node:assert/strict";
import { resolveSite } from "../src/shared/sites.js";
test("domain profiles are explicit and reject unknown production hosts", () => {
  assert.equal(resolveSite("loo.bloli.com:443", true)?.category, "toilets");
  assert.equal(resolveSite("KIPPE.BLOLI.COM", true)?.category, "tobacco");
  assert.equal(resolveSite("kippe.bloli.com.evil.example", true), null);
  assert.equal(resolveSite("localhost", true), null);
  assert.equal(resolveSite("kippe.localhost:5173")?.id, "kippe");
  assert.equal(resolveSite("127.0.0.1:3100")?.id, "loo");
  assert.equal(resolveSite("localhost", false, "kippe")?.id, "kippe");
  assert.equal(resolveSite("loo.bloli.com", true, "kippe")?.id, "loo");
});
