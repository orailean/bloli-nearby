import {chromium} from '@playwright/test';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'en-GB',reducedMotion:'reduce'});
 const errors=[];const tileFailures=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(r.url().includes('tile.openstreetmap.org'))tileFailures.push(r.failure()?.errorText);});
 await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5173');
 await page.getByRole('button',{name:'Bremen',exact:true}).click();
 await page.locator('.result-select').first().waitFor();
 await page.locator('.result-select').first().click();
 await page.locator('.leaflet-control-attribution a').waitFor();
 await page.evaluate(()=>document.fonts.ready);
 let tilesLoaded=false;try{await page.waitForFunction(()=>{const tiles=[...document.querySelectorAll('.leaflet-tile')];return tiles.length>0&&tiles.every(t=>t.classList.contains('leaflet-tile-loaded'));},{},{timeout:12000});tilesLoaded=true;}catch{}
 await page.screenshot({path:'docs/verification/screenshots/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'docs/verification/screenshots/mobile.png',fullPage:true});
 console.log(JSON.stringify({pageErrors:errors,tilesLoaded,tileFailures:[...new Set(tileFailures)],desktopAndMobileScreenshots:true}));
} finally {await browser.close();}
