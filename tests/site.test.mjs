import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brand, carousel, APIs, tutorials, instruments, campaigns } from '../src/content.mjs';
const root=resolve(import.meta.dirname,'..');
const read=path=>readFile(resolve(root,path),'utf8');
const readBuilt=path=>readFile(resolve(root,'dist',path),'utf8');
const unique=list=>new Set(list).size===list.length;

test('the validated editorial promise is intact',()=>{
 assert.equal(brand.promise,'Build software that keeps promises.');
 assert.equal(brand.method,'Refactoring for Kindness');
 assert.equal(brand.schoolUrl,'https://smallstep.care/');
});

test('16 distinct photographic carousel views with separate editable text',async()=>{
 assert.ok(carousel.length>=16);
 assert.ok(unique(carousel.map(x=>x.id)));
 for(const slide of carousel){
  for(const field of ['id','art','eyebrow','title','description']) assert.ok(slide[field]);
  assert.match(slide.art,/^\/assets\/scenes\/scene-\d+\.webp$/);
  const file=resolve(root,slide.art.slice(1)); assert.ok((await stat(file)).size>10000);
 }
});

test('approved visual scenes keep the exact mobile portrait ratio',async()=>{
  for(const slide of carousel){
    const bytes=await readFile(resolve(root,slide.art.slice(1)));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(bytes.toString('ascii',12,16),'VP8 ');
    const width=bytes.readUInt16LE(26)&0x3fff;
    const height=bytes.readUInt16LE(28)&0x3fff;
    assert.deepEqual([width,height],[1320,2868],slide.art);
  }
});

test('API list leads with Practical Possibilities; no fictitious live promises',()=>{
 assert.equal(APIs[0].id,'practical-possibilities');
 assert.equal(APIs[0].title,'Practical Possibilities and Support for Independent Work');
 assert.equal(APIs[0].byline,'At the Center for the Dream');
 assert.ok(APIs.every(x=>/planned|design/i.test(x.status)));
 assert.ok(unique(APIs.map(x=>x.id)));
});

test('Nurture guide set matches six distinct libraries',()=>{
 assert.deepEqual(new Set(tutorials.map(t=>t.place)),new Set(['Dream Library','Venture Library','Pattern Library','Patent Library','Instrument Library','Step Library']));
 assert.ok(tutorials.every(t=>t.steps.length>=3));
});

test('the three preventative care instruments stay individually distinct',async()=>{
 assert.equal(instruments.length,3);
 assert.ok(unique(instruments.map(x=>x.title)));
 assert.ok(instruments.every(x=>x.title.endsWith('Instrument')));
 for(const i of instruments){const p=resolve(root,i.image.slice(1));assert.ok((await stat(p)).size>10000)}
});

test('campaigns are substantive, editable, and unpublished',()=>{
 assert.ok(campaigns.length>=5);
 assert.ok(unique(campaigns.map(c=>c.id)));
 for(const c of campaigns){
  for(const f of ['headline','summary','audience','cta','destination','social','emailSubject','emailBody','art','alt'])assert.ok(c[f],`${c.id}:${f}`);
  assert.match(c.status,/not published/i);
  assert.match(c.art,/^\/assets\/scenes\/scene-\d+\.webp$/);
 }
});

test('pages are present, contain accessible semantics, and avoid public identity spill',async()=>{
 const pages=['index.html','method.html','apis.html','learn.html','campaigns.html'];
 for(const name of pages){
  const html=await read(name);
  assert.match(html,/<main id="main">/);
  assert.match(html,/<nav class="site-nav"/);
  if(name==='index.html') assert.match(html,/<title>A developer’s toolkit for practical possibilities\.<\/title>/);
  else assert.match(html,/<title>.+PromiseStep<\/title>/);
  assert.doesNotMatch(html,/Living Instruments|Santa Clara Services/i);
  assert.match(html,/src="\/src\/main\.mjs"/);
  assert.match(html,/href="\/src\/brand\.css"/);
  assert.match(html,/href="#main"/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(unique(ids),`Duplicate IDs in ${name}`);
 }
});

test('local paths resolve and there are no dead internal links',async()=>{
 const pages=['index.html','method.html','apis.html','learn.html','campaigns.html'];
 for(const name of pages){
  const html=await read(name);
  const links=[...html.matchAll(/(?:href|src)="(\/[^"#?]+)(?:#[^"]*)?"/g)].map(m=>m[1]);
  for(const link of links){const normalized=link.endsWith('/')?link+'index.html':link; const file=resolve(root,'dist','.'+decodeURIComponent(normalized));assert.ok((await stat(file)).isFile(),`${name}: ${link}`)}
 }
});

test('carousel respects manual pause and reduced motion',async()=>{
 const code=await read('src/main.mjs');const css=await read('src/site.css');
 assert.match(code,/prefers-reduced-motion/);
 assert.match(code,/stoppedByUser/);
 assert.match(code,/IntersectionObserver/);
 assert.match(code,/visibilitychange/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('production bundle has an explicit public file allowlist',async()=>{
  for(const name of ['index.html','method.html','apis.html','learn.html','campaigns.html','assets/scenes/scene-01.webp','assets/scenes/scene-16.webp','src/main.mjs','src/content.mjs','src/site.css','robots.txt','_headers']) {
    assert.ok((await stat(resolve(root,'dist',name))).isFile(),name);
  }
  assert.ok((await stat(resolve(root,'dist','docs','human-stewardship.html'))).isFile());
  await assert.rejects(()=>stat(resolve(root,'dist','docs','PRODUCTION_RELEASE_RECEIPT_2026-11-02.md')));
  for(const name of ['design','tests','scripts','.github','README.md','evidence','recovered-promisestep','PROJECT_RETURN.txt']) {
    await assert.rejects(()=>stat(resolve(root,'dist',name)));
  }
});

test('interactive promise rehearsal preserves the working note without claiming real persistence',async()=>{
  const method=await read('method.html');
  const client=await read('src/main.mjs');
  for(const marker of ['data-promise-lab','data-promise-draft','data-promise-fail','data-promise-retry','data-promise-reset','aria-live="polite"'])assert.ok(method.includes(marker),marker);
  assert.match(method,/not a real save/i);
  assert.match(method,/not stored after you leave/i);
  assert.match(client,/hydratePromiseLab/);
  assert.match(client,/retry\.disabled=false/);
  assert.match(client,/draft\.value=original/);
  const isolated=client.slice(client.indexOf('function hydratePromiseLab()'),client.indexOf('function hydrateCopySamples()'));
  assert.doesNotMatch(isolated,/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b\s*\(/);
});


test('public guidance and real local SDK preserve the release boundaries',async()=>{
 const quick=await readBuilt('docs/quickstart.html'); const status=await readBuilt('docs/status.html');const hsg=await readBuilt('docs/human-stewardship.html');
 assert.match(quick,/not published to npm/); assert.match(status,/not verified|not completed|not integrated/i);
 assert.match(hsg,/People Are Not Resources/); assert.match(hsg,/Attention Is a Trust/); assert.match(hsg,/human review|human reviewer/i);
 assert.match(await readBuilt('playground.html'),/data-lab-create/);assert.match(await readBuilt('developer/portal.mjs'),/RecordBook.restore/);
});

test('saved Restore and file-import paths cannot erase newer corrections',async()=>{
 const script=await read('developer/portal.mjs');
 const start=script.indexOf("$('[data-lab-restore]').addEventListener");
 const stop=script.indexOf("$('[data-lab-file]').addEventListener",start);
 assert.ok(start>=0 && stop>start,'Both import and restore handlers must exist');
 const restore=script.slice(start,stop);
 assert.match(restore,/RecordBook\.restore\(archive\)/);
 assert.match(restore,/assessRecordBookImport\(book, restored\)/);
 assert.match(restore,/if \(!check\.importPreservesCurrent\)/);
 assert.match(restore,/RECONCILIATION_REQUIRED/);
 assert.ok(restore.indexOf('if (!check.importPreservesCurrent)')<restore.indexOf('book = restored'),'Must reject before mutating active working copy');
 const importBlock=script.slice(stop,script.indexOf("$('[data-lab-check]').addEventListener",stop));
 assert.match(importBlock,/assessRecordBookImport\(book, restored\)/);
 assert.match(importBlock,/if \(!importCheck\.importPreservesCurrent\)/);
});

test('public status distinguishes verified GitHub repository from complete deployable source', async()=>{
 const page=await readBuilt('docs/status.html');
 assert.match(page,/https:\/\/github\.com\/TodaysStep\/promisestep/);
 assert.match(page,/not an independently restored copy of the newer hosted preview/);
 assert.match(page,/founder’s specific open-source distribution license remains/);
});
