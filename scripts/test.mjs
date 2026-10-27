import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import jsQR from 'jsqr';
import {serve} from './serve.mjs';
await mkdir('artifacts',{recursive:true});
const results=[];
const check=(name,fn)=>{fn();results.push(name);};
const vcf=await readFile('docs/SHARIDEYA.vcf','utf8');
check('vCard 3.0, CRLF, business name, phone, city and actual social URLs',()=>{assert(vcf.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));assert(vcf.endsWith('END:VCARD\r\n'));for(const s of ['FN:SHARIDEYA','ORG:SHARIDEYA','TEL;TYPE=WORK,VOICE:+77064256945','Астана','Казахстан','https://wa.me/77064256945','https://www.instagram.com/sharideya_astana_/'])assert(vcf.includes(s));});
function decode(bytes){const p=PNG.sync.read(bytes);return jsQR(new Uint8ClampedArray(p.data),p.width,p.height)?.data;}
check('Contact QR decoded by jsQR exactly matches VCF',()=>{});
assert.equal(decode(await readFile('docs/qr-contact.png')),vcf);
let url='';try{url=(await readFile('docs/NFC_URL.txt','utf8')).trim();}catch{}
if(url){assert.equal(decode(await readFile('docs/qr-site.png')),url);results.push('Site PNG QR decodes exactly to NFC URL');const ndef=await readFile('docs/NFC_URI.ndef');assert.deepEqual([...ndef.subarray(0,5)],[0xd1,1,ndef.length-4,0x55,4]);assert.equal('https://'+ndef.subarray(5).toString(),url);const tlv=await readFile('docs/NFC_TYPE2_TLV.bin');assert(tlv.length<=144);results.push('NDEF URI and NTAG213/215/216 payload capacity verified');}
const server=serve(4175);await new Promise(resolve=>server.on('listening',resolve));
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],external=[],badResponses=[];
try{
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4175/')&&!r.url().startsWith('data:'))external.push(r.url());});
 page.on('response',r=>{if(r.status()>=400)badResponses.push(r.url());});
 for(const width of [320,375,390,430,768,1280]){
  await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:4175/');await page.emulateMedia({reducedMotion:'reduce'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow at '+width);
  for(const a of await page.locator('.button').all()){assert(await a.isVisible());const box=await a.boundingBox();assert(box.height>=44);}
  await page.screenshot({path:`artifacts/viewport-${width}.png`,fullPage:true});results.push(`Viewport ${width}px: no overflow, action targets >=44px`);
 }
 assert.equal(await page.locator('a[href^="tel:"]').getAttribute('href'),'tel:+77064256945');
 for(const href of ['https://wa.me/77064256945','https://www.instagram.com/sharideya_astana_/','https://go.2gis.com/MC1As']){const a=page.locator(`a[href="${href}"]`);assert.equal(await a.count(),1);assert((await a.getAttribute('rel')).includes('noopener'));}
 results.push('Phone, WhatsApp, Instagram and 2GIS links and external-link isolation');
 const downloadPromise=page.waitForEvent('download');await page.locator('a[download="SHARIDEYA.vcf"]').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'SHARIDEYA.vcf');assert.equal(await readFile(await download.path(),'utf8'),vcf);results.push('VCF browser download and byte content');
 const imageDownload=page.waitForEvent('download');await page.locator('a[download="SHARIDEYA-card.png"]').click();const image=await imageDownload;assert.equal(image.suggestedFilename(),'SHARIDEYA-card.png');assert.equal(PNG.sync.read(await readFile(await image.path())).width,1200);results.push('Card PNG browser download, 1200px');
 const expectedUrl=url||'http://127.0.0.1:4175/';
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.shared=data}})});await page.locator('#share').click();assert.equal(await page.evaluate(()=>window.shared.url),expectedUrl);results.push('Native share API payload (mocked)');
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text}}})});await page.locator('#share').click();assert.equal(await page.evaluate(()=>window.copied),expectedUrl);assert.match(await page.locator('#status').innerText(),/скопирована/);results.push('Clipboard fallback (mocked clipboard)');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}}));await page.locator('#share').click();assert(await page.locator('#manual-copy').isVisible());assert.equal(await page.locator('#card-url').inputValue(),expectedUrl);await page.locator('#select-url').click();assert.equal(await page.locator('#card-url').evaluate(el=>el.selectionEnd-el.selectionStart),expectedUrl.length);results.push('Clipboard denied: manual copy/select fallback');
 await page.reload();await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelled','AbortError')}}));await page.locator('#share').click();assert.equal(await page.locator('#status').innerText(),'');assert(!(await page.locator('#share').isDisabled()));results.push('Share cancellation handled without error');
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw Error('Unavailable')}});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.copied=text}})});await page.locator('#share').click();assert.equal(await page.evaluate(()=>window.copied),expectedUrl);results.push('Share failure uses copy fallback');
 if(url){const svgPage=await browser.newPage({viewport:{width:1100,height:1100}});await svgPage.setContent('<img src="http://127.0.0.1:4175/qr-site.svg" width="1000" height="1000">');await svgPage.locator('img').evaluate(img=>img.decode());const svgShot=await svgPage.locator('img').screenshot();await svgPage.close();assert.equal(decode(svgShot),url);results.push('Site SVG QR decoded from browser rendering');}
 const plain=await browser.newContext({javaScriptEnabled:false});const nojs=await plain.newPage();await nojs.goto('http://127.0.0.1:4175/');assert.equal(await nojs.locator('.button').count(),5);assert(await nojs.locator('noscript').isVisible());await plain.close();results.push('Core actions available without JavaScript / no backend');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(badResponses,[]);results.push('No browser JS/CSP errors, failed resources, or external requests');
 console.log(JSON.stringify({passed:results.length,results,publication:url||'not published',physicalNfc:'not tested'},null,2));
 await writeFile('artifacts/test-results.json',JSON.stringify({date:new Date().toISOString(),results,errors,external,badResponses,publication:url||null,physicalNfc:'not tested'},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
