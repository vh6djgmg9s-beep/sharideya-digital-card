import {writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const supplied=process.argv[2];
if(!supplied)throw Error('Usage: node scripts/finalize-url.mjs https://ACTUAL-PUBLISHED-URL/');
const url=new URL(supplied);
if(url.protocol!=='https:'||url.search||url.hash||url.username||url.password)throw Error('A clean public HTTPS URL is required');
const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error('Published page returned HTTP '+response.status);
const html=await response.text();
if(!html.includes('SHARIDEYA')||!html.includes('77064256945'))throw Error('This URL does not serve the SHARIDEYA card');
if(new URL(response.url).protocol!=='https:')throw Error('HTTPS redirect required');
await writeFile('site-url.txt',response.url+'\n');
for(const script of ['scripts/build.mjs','scripts/test.mjs']){const result=spawnSync(process.execPath,[script],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log('URL verified; final assets built and tested. Publish the updated docs directory, then verify with scripts/verify-live.mjs.');
