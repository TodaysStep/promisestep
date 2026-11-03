const $ = selector => document.querySelector(selector);
for (const button of document.querySelectorAll('[data-copy-code]')) {
  button.addEventListener('click', async () => {
    const text = document.getElementById(button.dataset.copyCode)?.textContent;
    if (!text) return;
    try { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; }
    catch { button.textContent = 'Select the example to copy'; }
  });
}
const filter = $('[data-contract-filter]');
if (filter) {
  const items = [...document.querySelectorAll('[data-contract-item]')];
  const apply = () => { const q = filter.value.toLocaleLowerCase(); let count = 0; for (const item of items) { const matches = item.textContent.toLocaleLowerCase().includes(q); item.hidden = !matches; if (matches) count++; } $('[data-search-count]').textContent = `${count} reference families shown. This is an architecture inventory, not a completed integration count.`; };
  filter.addEventListener('input', apply); apply();
}
const lab = $('[data-sdk-lab]');
if (lab) {
  const S = await import('/sdk/v0.1.0-preview.1/index.mjs');
  let book = null, archive = null, promise = null, original = null, serial = 0;
  const status = $('[data-lab-status]');
  const say = (message, error = false) => { status.textContent = message; status.dataset.error = String(error); };
  const render = async () => {
    const history = book ? await book.history('demo:work') : [];
    const host = $('[data-lab-history]'); host.replaceChildren();
    for (const e of history) { const li = document.createElement('li'), a = document.createElement('article'), title = document.createElement('strong'), p = document.createElement('p'); title.textContent = `Revision ${e.revision} · ${e.action} · ${e.kind}`; p.textContent = e.payload.text; a.append(title, p); if (e.reason) { const reason = document.createElement('p'); reason.textContent = `Correction reason: ${e.reason}`; a.append(reason); } li.append(a); host.append(li); }
    $('[data-lab-create]').disabled = Boolean(book);
    for (const selector of ['[data-lab-correct]', '[data-lab-export]', '[data-lab-interrupt]']) $(selector).disabled = !book;
    $('[data-lab-restore]').disabled = !archive;
    $('[data-lab-check]').disabled = !book || !promise || !original;
    $('[data-lab-empty]').hidden = history.length > 0;
  };
  const run = fn => async () => { const buttons = [...lab.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true); try { await fn(); } catch (e) { say(`${e.code ?? 'ERROR'}: ${e.message}. The existing working copy has not been replaced.`, true); } finally { buttons.forEach(b => b.disabled = false); await render(); } };
  $('[data-lab-create]').addEventListener('click', run(async () => {
    const intention = $('[data-lab-intention]').value;
    promise = S.PromiseStep.promise({ id: 'demo:promise', name: 'Return to my work', intention, criteria: [{ id: 'original-preserved', description: 'The original text remains available after correction and return.' }] });
    const nextBook = new S.RecordBook();
    await nextBook.record({ operationId: 'demo:capture', recordId: 'demo:work', kind: 'work', author: 'example-participant', payload: { text: intention }, sourceRefs: ['example:typed-text'] });
    book = nextBook; original = intention; archive = null; serial = 0;
    say('Your example has a real local record. It is only in this page’s memory until you export it. Nothing was sent to a server.');
  }));
  $('[data-lab-correct]').addEventListener('click', run(async () => {
    const head = await book.get('demo:work');
    await book.correct({ operationId: `demo:correction-${crypto.randomUUID()}`, recordId: 'demo:work', expectedRevision: head.revision, author: 'example-participant', reason: 'An explicit correction in this example.', payload: { text: $('[data-lab-correction]').value }, sourceRefs: ['example:typed-correction'] });
    say('The correction is a new revision. The original text, source, and record kind remain available below.');
  }));
  $('[data-lab-export]').addEventListener('click', run(async () => {
    archive = await book.export();
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob), a = document.createElement('a'); a.href = href; a.download = 'promisestep-example-recovery.json'; a.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
    say('Recovery JSON prepared for download. Keep the downloaded file: this page does not keep it after you leave.');
  }));
  $('[data-lab-interrupt]').addEventListener('click', run(async () => {
    archive = await book.export(); book = null;
    say('The in-memory working copy is cleared for this exercise. A recovery archive is still held in this page. Restore it next; this does not simulate a server backup.');
  }));
  $('[data-lab-restore]').addEventListener('click', run(async () => {
    const restored = await S.RecordBook.restore(archive);
    const check = await S.assessRecordBookImport(book, restored);
    if (!check.importPreservesCurrent)
      throw new S.PromiseStepError('RECONCILIATION_REQUIRED', 'The saved recovery copy is ' + check.state + ' and cannot replace newer or different working history');
    book = restored;
    say('The working copy was restored from the archive, including its original and corrections. No website account or remote save was involved.');
  }));
  $('[data-lab-file]').addEventListener('change', run(async () => {
    const picker = $('[data-lab-file]');
    try {
      const file = picker.files?.[0]; if (!file) return;
      if (file.size > 2000000) throw new S.PromiseStepError('LIMIT_EXCEEDED', 'The example accepts recovery files up to 2 MB');
      const restored = await S.RecordBook.restore(await file.text());
      const history = await restored.history('demo:work');
      if (!history.length) throw new S.PromiseStepError('NOT_FOUND', 'This file contains another project; it was not substituted for the example');
      if (!history.every(e => typeof e.payload?.text === 'string' && e.payload.text.length <= 2000))
        throw new S.PromiseStepError('INVALID_ARCHIVE', 'This example requires text in each imported revision');
      const importCheck = await S.assessRecordBookImport(book, restored);
      if (!importCheck.importPreservesCurrent)
        throw new S.PromiseStepError('RECONCILIATION_REQUIRED', 'The selected file would replace current work (' + importCheck.state + '). Export your current example before deliberately clearing it, then import the file');
      // Only a proven same-chain extension may replace an active example.
      const nextArchive = await restored.export();
      const nextPromise = S.PromiseStep.promise({ id: 'demo:promise', name: 'Return to my work', intention: 'Preserve the imported original.', criteria: [{ id: 'original-preserved', description: 'The imported original remains available.' }] });
      book = restored; archive = nextArchive; original = history[0].payload.text; promise = nextPromise;
      say('The selected example file passed the checksum and correction-chain checks. Its contents are still only in this page’s memory.');
    } finally {
      // Make the same file selectable again after a failed import without discarding work.
      picker.value = '';
    }
  }));
  $('[data-lab-check]').addEventListener('click', run(async () => {
    const h = await book.history('demo:work');
    const assessment = S.assessJourney(promise, [{ id: `demo:observation-${++serial}`, promiseId: promise.id, promiseRevision: promise.revision, criterionId: 'original-preserved', release: S.version, outcome: h[0]?.payload.text === original ? 'met' : 'unmet', evidenceRefs: ['example:original-text-comparison'], observedAt: new Date().toISOString(), standing: 'observation' }], { release: S.version });
    $('[data-lab-result]').textContent = JSON.stringify(assessment, null, 2);
    say(`Assessment: ${assessment.state}. It covers this example’s original-text comparison—not independent certification or the whole instrument collection.`);
  }));
  $('[data-lab-boundary]').addEventListener('click', run(async () => {
    const now = new Date(), before = new Date(now.getTime() - 60000).toISOString(), after = new Date(now.getTime() + 60000).toISOString();
    const grant = { id: 'example:listen-only', revision: 1, actor: 'listener', target: 'song:example', actions: ['listen'], purposes: ['review'], audiences: ['listener'], fields: ['preview'], validFrom: before, expiresAt: after, checkedAt: before, freshUntil: after, revoked: false, sourceRefs: ['example:explicit-listen-only-scope'] };
    const result = S.assessBoundary({ actor: 'listener', target: 'song:example', action: 'publish', purpose: 'review', audience: ['listener'], fields: ['preview'], expectedGrantRevision: 1 }, grant);
    $('[data-boundary-result]').textContent = `${result.state}: ${result.reasons.join(', ')}. An invitation to listen does not include publication. This is a local check; a real service still enforces its own permissions.`;
  }));
  $('[data-lab-reset]').addEventListener('click', run(async () => {
    book = null; archive = null; promise = null; original = null; serial = 0; $('[data-lab-file]').value = ''; $('[data-lab-result]').textContent = ''; $('[data-boundary-result]').textContent = '';
    say('This page’s example has been cleared. Any file you downloaded is unchanged.');
  }));
  await render();
}
