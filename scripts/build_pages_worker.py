"""Deterministic, complete, public-only Cloudflare Pages Worker from the exact local release.

The independent Pages project remains the production owner. This script never deploys;
it produces a complete rollbackable artifact with the same previously published assets.
"""
from pathlib import Path
from hashlib import sha256
import base64,json,mimetypes
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
RESOURCES=json.loads((ROOT/'developer/resources.json').read_text())
assert '/api/v1/health' in RESOURCES and '/api/v1/openapi.json' in RESOURCES
MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.txt':'text/plain; charset=utf-8','.tgz':'application/gzip','.zip':'application/zip'}
FILES={}
for item in sorted(DIST.rglob('*')):
 if not item.is_file():continue
 name='/'+item.relative_to(DIST).as_posix()
 data=item.read_bytes()
 if any(part.startswith('.') or part in ('evidence','private','design','tests') for part in item.relative_to(DIST).parts):
  # A .git or private tree must never appear in production.
  raise ValueError('Unexpected private path '+name)
 FILES[name]=[MIME.get(item.suffix,'application/octet-stream'),base64.b64encode(data).decode('ascii')]
assert len(FILES)==69, len(FILES)
assert len(RESOURCES)==68, len(RESOURCES)
# All public inputs are compiled from the exact same generated resource inventory.
HEAD='''/** PromiseStep 0.1.0-preview.1 Pages Worker. Independent, public-only, no remote write APIs. */
const FILES=__FILES__;
const REFERENCE_RESOURCES=__RESOURCES__;
const API_BODY=new Map(Object.entries(REFERENCE_RESOURCES).map(([key,v])=>[key,JSON.stringify(v)]));
const RELEASE='ps-local-core-20261102.1';
const SECURE={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"};
const READ_METHODS='GET, HEAD, OPTIONS';
const encoder=new TextEncoder();
async function apiResponse(request,url){
 const headers={'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','X-PromiseStep-Release':RELEASE,'Cache-Control':'no-store'};
 const error=(status,code,message,extra={})=>new Response(request.method==='HEAD'?null:JSON.stringify({error:{code,message},release:RELEASE,docs:'/docs/api.html'}),{status,headers:{...headers,...extra}});
 if(!['GET','HEAD','OPTIONS'].includes(request.method)) return error(405,'READ_ONLY_API','This public reference API accepts no writes.',{Allow:READ_METHODS});
 if(url.search) return error(400,'UNSUPPORTED_QUERY','Do not submit private work, credentials, or parameters to this public reference API.');
 const body=API_BODY.get(url.pathname);
 if(body===undefined)return error(404,'RESOURCE_NOT_FOUND','No public reference resource exists at this path.');
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,Allow:READ_METHODS,'Access-Control-Allow-Methods':READ_METHODS,'Access-Control-Allow-Headers':'Accept, If-None-Match','Access-Control-Max-Age':'600'}});
 const bytes=encoder.encode(body);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const etag='"'+hash+'"';
 const h={...headers,ETag:etag,'Cache-Control':'public, max-age=60','Access-Control-Expose-Headers':'ETag, X-PromiseStep-Release','Content-Length':String(bytes.length)};
 const client=(request.headers.get('if-none-match')||'').split(',').map(x=>x.trim().replace(/^W\\//,''));
 if(client.includes(etag)||client.includes('*')){delete h['Content-Length'];return new Response(null,{status:304,headers:h})}
 return new Response(request.method==='HEAD'?null:bytes,{status:200,headers:h});
}
export default {async fetch(request){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/'))return apiResponse(request,url);
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD',...SECURE}});
 let path=url.pathname;
 try{path=decodeURIComponent(path)}catch{return new Response('Bad Request',{status:400,headers:SECURE})}
 if(path==='/'||path==='/index')path='/index.html';
 if(path.endsWith('/'))path+='index.html';
 if(['/method','/apis','/learn','/campaigns','/playground'].includes(path))path+='.html';
 const entry=FILES[path];
 if(!entry)return new Response('Not Found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8',...SECURE}});
 const [mime,base64]=entry;
 const h=new Headers({'Content-Type':mime,...SECURE});
 h.set('Cache-Control',mime.startsWith('text/html')?'public, max-age=60':'public, max-age=900');
 const bytes=Uint8Array.from(atob(base64),x=>x.charCodeAt(0));
 h.set('Content-Length',String(bytes.length));
 return new Response(request.method==='HEAD'?null:bytes,{status:200,headers:h});
}};
'''
code=HEAD.replace('__FILES__',json.dumps(FILES,separators=(',',':'),ensure_ascii=False)).replace('__RESOURCES__',json.dumps(RESOURCES,separators=(',',':'),ensure_ascii=False))
OUT=ROOT/'release/promisestep-pages-worker-20261102.js'; OUT.parent.mkdir(exist_ok=True)
OUT.write_text(code)
result={'workerBytes':OUT.stat().st_size,'workerSHA256':sha256(OUT.read_bytes()).hexdigest(),'pageFiles':len(FILES),'apiResources':len(RESOURCES),'originalArt':len(list((DIST/'assets/scenes').glob('*.webp'))),'release':'ps-local-core-20261102.1'}
(ROOT/'evidence/worker-build.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
