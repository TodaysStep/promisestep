"""Browser-level PromiseStep lab checks. Uses isolated browser DOM and a test-only
SHA-256 bridge because this execution environment forbids origin navigation.
This checks UI behavior, not production Safari or native secure-context WebCrypto.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64, hashlib, json, re, tempfile

R=Path(__file__).resolve().parents[1]
html=re.sub(r'<script type="module"[^>]*></script>','',(R/'dist/playground.html').read_text())
portal=(R/'dist/developer/portal.mjs').read_text()
core='data:text/javascript;base64,'+base64.b64encode((R/'dist/sdk/v0.1.0-preview.1/index.mjs').read_bytes()).decode()
portal=portal.replace("await import('/sdk/v0.1.0-preview.1/index.mjs')",'await import('+json.dumps(core)+')')
assert "await import('/sdk/" not in portal

with sync_playwright() as pl:
 browser=pl.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mode,settings in [('desktop',{'viewport':{'width':1366,'height':900}}),('mobile',{'viewport':{'width':440,'height':956},'device_scale_factor':3,'is_mobile':True,'has_touch':True})]:
  context=browser.new_context(accept_downloads=True,**settings)
  page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.expose_function('sha256Bytes',lambda data:list(hashlib.sha256(bytes(data)).digest()))
  page.evaluate("""()=>{
    Object.defineProperty(crypto,'subtle',{value:{digest:async (algorithm,data)=>{if(algorithm!=='SHA-256')throw Error('test bridge accepts SHA256 only');return new Uint8Array(await sha256Bytes([...new Uint8Array(data)])).buffer}}});
    Object.defineProperty(crypto,'randomUUID',{value:()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}});
  }""")
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate("""async code=>{const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));try{await import(url)}finally{URL.revokeObjectURL(url)}}""",portal)
  def click(selector,expected):
   page.locator(selector).click()
   page.wait_for_function('expected=>document.querySelector("[data-lab-status]").textContent.includes(expected)',arg=expected,timeout=10000)
   return page.locator('[data-lab-status]').inner_text()
  def history():return page.locator('[data-lab-history] li').count()
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)/'older.json';newpath=Path(tmp)/'current.json'
   page.locator('[data-lab-intention]').fill('Original from person A.')
   assert 'real local record' in click('[data-lab-create]','real local record')
   assert history()==1
   with page.expect_download() as dl: click('[data-lab-export]','Recovery JSON prepared')
   dl.value.save_as(str(path))
   page.locator('[data-lab-correction]').fill('Correction from person A.')
   click('[data-lab-correct]','correction is a new revision')
   assert history()==2
   # Restore from the earlier export is just as dangerous as importing an older file.
   # The active correction must remain intact and the older saved copy may not replace it.
   click('[data-lab-restore]','RECONCILIATION_REQUIRED')
   assert history()==2,'Restore button erased a newer correction'
   assert 'Correction from person A.' in page.locator('[data-lab-history]').inner_text()
   page.locator('[data-lab-check]').click();page.wait_for_function('()=>document.querySelector("[data-lab-result]").textContent.includes("evidenced_for_scope")',timeout=10000)
   page.locator('[data-lab-boundary]').click();page.wait_for_function('()=>document.querySelector("[data-boundary-result]").textContent.includes("ACTION_OUT_OF_SCOPE")',timeout=10000)
   # An older archive must never replace unexported newer changes.
   page.locator('[data-lab-file]').set_input_files(str(path))
   page.wait_for_function('()=>document.querySelector("[data-lab-status]").textContent.includes("RECONCILIATION_REQUIRED")',timeout=10000)
   assert history()==2,'Import erased a newer correction'
   with page.expect_download() as dl: click('[data-lab-export]','Recovery JSON prepared')
   dl.value.save_as(str(newpath))
   click('[data-lab-interrupt]','in-memory working copy is cleared')
   assert history()==0
   click('[data-lab-restore]','working copy was restored')
   assert history()==2
   click('[data-lab-reset]','example has been cleared')
   assert history()==0
   # First import an older, valid revision into an empty lab; then admit a
   # genuine same-chain extension without erasing the initial record.
   page.locator('[data-lab-file]').set_input_files(str(path))
   page.wait_for_function('()=>document.querySelector("[data-lab-status]").textContent.includes("passed the checksum")',timeout=10000)
   assert history()==1
   page.locator('[data-lab-file]').set_input_files(str(newpath))
   page.wait_for_function('()=>document.querySelector("[data-lab-history]").children.length === 2',timeout=10000)
   assert 'passed the checksum' in page.locator('[data-lab-status]').inner_text()
   assert history()==2
   # Corrupt the downloaded bytes without updating their checksum. Do not lose the active book.
   tampered=json.loads(newpath.read_text());tampered['payload']['events'][0]['payload']['text']='Altered without source';bad=Path(tmp)/'tampered.json';bad.write_text(json.dumps(tampered))
   page.locator('[data-lab-file]').set_input_files(str(bad))
   page.wait_for_function('()=>document.querySelector("[data-lab-status]").textContent.includes("INTEGRITY_MISMATCH")',timeout=10000)
   assert history()==2 and page.locator('[data-lab-file]').input_value()=='', 'Failed imports must remain retryable without discarding work'
   # Retry a valid file after failure using the same picker.
   page.locator('[data-lab-file]').set_input_files(str(newpath))
   page.wait_for_function('()=>document.querySelector("[data-lab-status]").textContent.includes("passed the checksum")',timeout=10000)
   assert history()==2
   assert not errors,errors
   print(f'{mode}: original, correction, scoped observation, refusal, older-archive protection, download, pause/restore, safe-chain extension, tamper refusal and retry passed')
  context.close()
 browser.close()
