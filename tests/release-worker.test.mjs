import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
import worker from '../release/promisestep-pages-worker-20261102.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const base='https://promisestep.com';
const get=(url,method='GET',headers={})=>worker.fetch(new Request(base+url,{method,headers}));
test('existing independent site remains readable with exact title',async()=>{
 const r=await get('/');const html=await r.text();assert.equal(r.status,200);
 assert.match(html,/<title>A developer’s toolkit for practical possibilities\.<\/title>/);
 assert.match(html,/data-carousel/);assert.match(html,/Get started/);assert.match(html,/Try the SDK/);
 assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
});
test('all historical main public pages remain readable',async()=>{
 for(const p of ['/index.html','/method.html','/apis.html','/learn.html','/campaigns.html']){
  const r=await get(p);assert.equal(r.status,200,p);assert.match(r.headers.get('content-type'),/text\/html/);assert.ok((await r.text()).includes('PromiseStep'));
 }
});
test('the new quickstart, human stewardship and playground work as complete public files',async()=>{
 for(const p of ['/docs/quickstart.html','/docs/human-stewardship.html','/docs/status.html','/playground.html','/sdk/v0.1.0-preview.1/index.mjs','/downloads/promisestep-sdk-0.1.0-preview.1.tgz']){
  const r=await get(p);assert.equal(r.status,200,p);assert.ok((await r.arrayBuffer()).byteLength>1000,p);
 }
});
test('all original 16 images remain bit-identical to public build',async()=>{
 for(let i=1;i<=16;i++){
  const p=`/assets/scenes/scene-${String(i).padStart(2,'0')}.webp`;
  const source=await readFile(resolve(import.meta.dirname,'../dist',p.slice(1)));
  const r=await get(p);assert.equal(r.status,200,p);assert.deepEqual(Buffer.from(await r.arrayBuffer()),source,p);
 }
});
test('published release status names its real preview and open gaps',async()=>{
 const r=await get('/api/v1/release');assert.equal(r.status,200);
 const x=await r.json();assert.equal(x.standing,'developer-preview');assert.equal(x.privateRecordWrites,false);assert.equal(x.independentReview,'not_completed');
});
test('JSON API returns exact source-backed guidelines',async()=>{
 const r=await get('/api/v1/guidelines');const x=await r.json();assert.equal(r.status,200);assert.equal(x.id,'human-stewardship-guidelines');assert.equal(x.reviewQuestions.length,10);assert.ok(x.limits.some(s=>s.includes('human review')));
});
test('public reference API is read only and has explicit media/release types',async()=>{
 const r=await get('/api/v1/health');assert.equal(r.status,200);assert.equal((await r.json()).status,'ok');assert.equal(r.headers.get('x-promisestep-release'),'ps-local-core-20261102.1');
 const bad=await get('/api/v1/health','POST');assert.equal(bad.status,405);assert.equal((await bad.json()).error.code,'READ_ONLY_API');
 const q=await get('/api/v1/health?private=work');assert.equal(q.status,400);assert.equal((await q.json()).error.code,'UNSUPPORTED_QUERY');
 const opt=await get('/api/v1/health','OPTIONS');assert.equal(opt.status,204);assert.match(opt.headers.get('allow'),/HEAD/);
});
test('HEAD, ETag, not modified, and unknown path are honest',async()=>{
 const r=await get('/api/v1/health');const tag=r.headers.get('etag');assert.ok(tag);
 const head=await get('/api/v1/health','HEAD');assert.equal(head.status,200);assert.equal((await head.text()).length,0);
 const conditional=await get('/api/v1/health','GET',{'If-None-Match':tag});assert.equal(conditional.status,304);assert.equal((await conditional.text()).length,0);
 const unknown=await get('/api/v1/private-records');assert.equal(unknown.status,404);
 const staticMissing=await get('/private/record.json');assert.equal(staticMissing.status,404);
});
test('deployment never serves private source files',async()=>{
 for(const p of ['/README.md','/evidence/worker-build.json','/.github/workflows/ci.yml','/docs/PRODUCTION_BASELINE.md','/developer/resources.json']){
  const r=await get(p);assert.equal(r.status,404,p);
 }
});
