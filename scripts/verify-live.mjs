import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import jsQR from 'jsqr';
const url=(await readFile('site-url.txt','utf8')).trim();
const checked=[];
for(const name of ['index.html','app.js','style.css','SHARIDEYA.vcf','qr-site.png','qr-site.svg','qr-contact.png','NFC_URL.txt','NFC_URI.ndef','SHARIDEYA-card.png']){
 const response=await fetch(new URL(name,url),{cache:'no-store',signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,name);
 assert.equal(new URL(response.url).protocol,'https:');
 const actual=Buffer.from(await response.arrayBuffer());
 assert.deepEqual(actual,await readFile('docs/'+name),name+' differs from tested local asset');
 if(name==='qr-site.png'){const p=PNG.sync.read(actual);assert.equal(jsQR(new Uint8ClampedArray(p.data),p.width,p.height)?.data,url);}
 checked.push(name);
}
await writeFile('artifacts/live-verification.json',JSON.stringify({url,date:new Date().toISOString(),checked},null,2));
console.log('Verified live HTTPS site and exact final artifacts: '+url);
