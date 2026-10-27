import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const url=(await readFile('site-url.txt','utf8')).trim();
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],requests=[],bad=[];
try{const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()})});
for(const width of [320,375,390,430,768,1280]){await page.setViewportSize({width,height:1000});const response=await page.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),url);assert.equal(await page.locator('figure img').count(),2);await page.screenshot({path:`artifacts/live-${width}.png`,fullPage:true});}
const dl=page.waitForEvent('download');await page.locator('a[download="SHARIDEYA.vcf"]').click();const download=await dl;assert.equal(await readFile(await download.path(),'utf8'),await readFile('docs/SHARIDEYA.vcf','utf8'));
assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert(requests.every(r=>r.startsWith(url)));
const result={url,date:new Date().toISOString(),widths:[320,375,390,430,768,1280],download:'VCF matches',errors,bad,externalRequests:requests.filter(r=>!r.startsWith(url))};await writeFile('artifacts/live-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));}finally{await browser.close()}
