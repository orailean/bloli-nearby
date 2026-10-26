import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { siteDictionaries } from '../src/web/i18n.js';
for (const group of ['locales/common','sites/loo/locales','sites/kippe/locales']) {
 test(`${group} has matching translated keys`,()=>{
  const dictionaries=['de','en','ro'].map(locale=>JSON.parse(readFileSync(new URL(`../src/web/${group}/${locale}.json`,import.meta.url),'utf8')));
  for(const dict of dictionaries) {
   assert.deepEqual(Object.keys(dict).sort(),Object.keys(dictionaries[0]).sort());
   for(const value of Object.values(dict)) assert.ok(typeof value==='string'&&value.length);
  }
 });
}
test('Kippe includes availability wording and no toilet branding in site content',()=>{
 for(const locale of ['en','de','ro'] as const) {
  assert.ok(siteDictionaries.kippe[locale].availability);
  assert.equal(siteDictionaries.kippe[locale].brandName,'kippe');
  assert.notEqual(siteDictionaries.kippe[locale].hero,siteDictionaries.loo[locale].hero);
 }
});
