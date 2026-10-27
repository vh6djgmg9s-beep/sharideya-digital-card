import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
export function serve(port=4173){
 const root=resolve('docs');
 const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.vcf':'text/vcard; charset=utf-8','.txt':'text/plain; charset=utf-8'};
 return createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const path=resolve(root,'.'+name);if(!path.startsWith(root+sep)){res.writeHead(403).end();return}const bytes=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(bytes);}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1');
}
if(process.argv[1]?.endsWith('serve.mjs'))serve().on('listening',()=>console.log('Local: http://127.0.0.1:4173'));
