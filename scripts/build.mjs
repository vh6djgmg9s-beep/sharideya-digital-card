import {mkdir,readFile,writeFile,copyFile,readdir} from 'node:fs/promises';
import QRCode from 'qrcode';
import {chromium} from 'playwright';
const out = new URL('../docs/',import.meta.url);
await mkdir(out,{recursive:true});
let siteUrl = process.env.SITE_URL || '';
try { if(!siteUrl) siteUrl = (await readFile(new URL('../site-url.txt',import.meta.url),'utf8')).trim(); } catch {}
if(siteUrl){const u=new URL(siteUrl);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.hostname==='localhost')throw Error('SITE_URL must be a public HTTPS URL without query or fragment');siteUrl=u.href;}
const vcard=['BEGIN:VCARD','VERSION:3.0','N:SHARIDEYA;;;;','FN:SHARIDEYA','ORG:SHARIDEYA','TEL;TYPE=WORK,VOICE:+77064256945','ADR;TYPE=WORK:;;;Астана;;;Казахстан','URL:https://www.instagram.com/sharideya_astana_/','X-SOCIALPROFILE;TYPE=WhatsApp:https://wa.me/77064256945',...(siteUrl?['URL:'+siteUrl]:[]),'END:VCARD',''].join('\r\n');
await writeFile(new URL('SHARIDEYA.vcf',out),vcard);
const qrOptions={errorCorrectionLevel:'M',margin:4,width:1000,color:{dark:'#342430',light:'#ffffff'}};
await QRCode.toFile(new URL('qr-contact.png',out).pathname.replace(/^\/([A-Z]:)/,'$1'),vcard,qrOptions);
let meta='';
let qr='<figure><div class="pending">QR-код визитки появится после публикации сайта.</div><figcaption>Открыть визитку<small>Публикация ещё не завершена</small></figcaption></figure>';
if(siteUrl){
 await writeFile(new URL('qr-site.png',out),await QRCode.toBuffer(siteUrl,qrOptions));
 await writeFile(new URL('qr-site.svg',out),await QRCode.toString(siteUrl,{...qrOptions,type:'svg'}));
 await writeFile(new URL('NFC_URL.txt',out),siteUrl+'\r\n');
 const uri=Buffer.concat([Buffer.from([0x04]),Buffer.from(siteUrl.slice(8))]);
 if(uri.length+7>144)throw Error('URL is too long for NTAG213');
 const ndef=Buffer.concat([Buffer.from([0xd1,0x01,uri.length,0x55]),uri]);
 await writeFile(new URL('NFC_URI.ndef',out),ndef);
 await writeFile(new URL('NFC_TYPE2_TLV.bin',out),Buffer.concat([Buffer.from([0x03,ndef.length]),ndef,Buffer.from([0xfe])]));
 const safe=siteUrl.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 meta=`<link rel="canonical" href="${safe}"><meta property="og:url" content="${safe}"><meta property="og:image" content="${safe}SHARIDEYA-card.png">`;
 qr='<figure><img src="qr-site.png" alt="QR-код для открытия цифровой визитки SHARIDEYA" width="176" height="176"><figcaption>Открыть визитку<small>Все способы связи</small></figcaption><a href="qr-site.png" download>PNG ↓</a> <a href="qr-site.svg" download>SVG ↓</a></figure>';
}
let html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
await writeFile(new URL('index.html',out),html.replace('{{META}}',meta).replace('{{SITE_QR}}',qr));
for(const name of ['style.css','app.js','icon.svg'])await copyFile(new URL('../src/'+name,import.meta.url),new URL(name,out));
await writeFile(new URL('.nojekyll',out),'');
const qrData=await QRCode.toDataURL(siteUrl||vcard,qrOptions);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750"><defs><radialGradient id="bg"><stop stop-color="#fcf4ef"/><stop offset="1" stop-color="#eddae0"/></radialGradient><radialGradient id="ball"><stop stop-color="#a97f99"/><stop offset="1" stop-color="#48253e"/></radialGradient></defs><rect width="1200" height="750" rx="32" fill="url(#bg)"/><rect x="32" y="32" width="1136" height="686" rx="24" fill="none" stroke="#bc98a6" stroke-opacity=".5"/><g fill="#48253e" font-family="Segoe UI, Arial, sans-serif"><text x="80" y="111" font-size="38" letter-spacing="8">SHARIDEYA</text><text x="82" y="148" font-size="13" letter-spacing="4">ВОЗДУШНЫЕ ШАРЫ · АСТАНА</text><text x="80" y="286" font-family="Georgia,serif" font-size="59">Праздник начинается</text><text x="80" y="355" font-family="Georgia,serif" font-size="65" font-style="italic">с лёгкости.</text><text x="83" y="425" font-size="22">Воздушные шары и праздничные композиции</text><text x="83" y="526" font-size="31">+7 706 425 69 45</text><text x="83" y="572" font-size="21">Instagram: @sharideya_astana_</text><text x="83" y="610" font-size="21">WhatsApp: +7 706 425 69 45</text><text x="83" y="670" font-size="13" fill="#795667">${escape(siteUrl||'Сохраните контакт — отсканируйте QR-код')}</text></g><ellipse cx="957" cy="176" rx="72" ry="91" fill="url(#ball)"/><ellipse cx="1037" cy="236" rx="58" ry="75" fill="#d7b99b"/><path d="M957 267q-25 70 4 120M1037 311q-30 40-20 70" stroke="#9c7888" fill="none"/><text x="850" y="140" font-size="42" fill="#ac8496">✧</text><image href="${qrData}" x="835" y="402" width="270" height="270"/><text x="970" y="697" text-anchor="middle" font-family="Segoe UI,Arial" font-size="14" fill="#48253e">${siteUrl?'Открыть визитку':'Сохранить контакт'}</text></svg>`;
await writeFile(new URL('SHARIDEYA-card.svg',out),svg);
const browser=await chromium.launch({channel:'msedge',headless:true});
try {const page=await browser.newPage({viewport:{width:1200,height:750},deviceScaleFactor:1});await page.setContent(`<style>body{margin:0}svg{display:block}</style>${svg}`);await page.locator('image').evaluate(async el=>{const img=new Image();img.src=el.getAttribute('href');await img.decode();});await page.screenshot({path:new URL('SHARIDEYA-card.png',out).pathname.replace(/^\/([A-Z]:)/,'$1')});}finally{await browser.close();}
console.log(JSON.stringify({output:'docs',siteUrl:siteUrl||null,files:await readdir(out)}));
