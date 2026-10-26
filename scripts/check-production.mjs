import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const base=process.env.LIVE_URL||'https://loo.bloli.com';
const status=await fetch(`${base}/api/status`).then(r=>r.json());
assert.equal(status.ready,true,'Germany dataset must be ready');
const locations={Munich:[48.137,11.576],Berlin:[52.52,13.405],Hamburg:[53.5511,9.9937]};
const checks={dataset:status,cities:{}};
for(const [city,[lat,lon]] of Object.entries(locations)){
 const response=await fetch(`${base}/api/toilets?${new URLSearchParams({lat,lon,radius:5000,limit:100})}`);
 assert.equal(response.status,200);const body=await response.json();assert.ok(body.items.length>0,`${city} must have results`);
 checks.cities[city]={results:body.items.length,truncated:body.truncated};
}
const postcodes=await fetch(`${base}/api/settlements?q=81243`).then(r=>r.json());assert.ok(postcodes.items.some(p=>p.postcode==='81243'));
const browser=await chromium.launch();
try{
 const context=await browser.newContext({locale:'fr-FR',viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await expect(page.locator('html')).toHaveAttribute('lang','de');
 await page.getByLabel('Sprache',{exact:true}).selectOption('en');
 await page.getByLabel('Town or postcode',{exact:true}).fill('81243');await page.getByRole('button',{name:'Search',exact:true}).click();
 await expect(page.locator('.place-option').first()).toBeVisible();await page.locator('.place-option').first().click();
 await expect(page.locator('.result-select').first()).toBeVisible();
 await page.locator('.result-select').first().click();
 await expect(page.getByRole('link',{name:'Walk there',exact:true})).toHaveAttribute('href',/travelmode=walking/);
 await page.getByLabel('Language',{exact:true}).selectOption('ro');await expect(page.locator('html')).toHaveAttribute('lang','ro');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
 assert.deepEqual(errors,[]);checks.browser={germanFallback:true,postcodeSearch:true,romanianSwitch:true,mobileWidth:true,pageErrors:errors};
 console.log(JSON.stringify(checks,null,2));
}finally{await browser.close();}
