import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordBook, assessRecordBookImport } from '../js/index.mjs';

const make = () => new RecordBook({ clock: () => '2026-11-02T00:00:00.000Z' });
const first = async () => {
  const book = make();
  await book.record({ operationId: 'capture', recordId: 'original', kind: 'report', author: 'person',
    sourceRefs: ['source:original'], payload: { text: 'Original authored account' } });
  return book;
};
const corrected = async (book, op, text = 'Corrected statement') => book.correct({
  operationId: op, recordId: 'original', expectedRevision: (await book.get('original')).revision,
  reason: 'Explicit sourced correction', author: 'person', sourceRefs: ['source:correction'], payload: { text }
});

test('no active book: a separately restored and checked book can be considered without mutations', async () => {
  const incoming = await RecordBook.restore(await (await first()).export());
  const before = await incoming.snapshot();
  const plan = await assessRecordBookImport(null, incoming);
  assert.equal(plan.state, 'new_book'); assert.equal(plan.importPreservesCurrent, true);
  assert.equal(plan.writesData, false); assert.equal(plan.authenticatesAuthorship, false); assert.equal(plan.changesPermissions, false);
  assert.deepEqual(await incoming.snapshot(), before);
});

test('identical archived history is a safe no-op; records keep their standing', async () => {
  const book = await first(); const restored = await RecordBook.restore(await book.export());
  const plan = await assessRecordBookImport(book, restored);
  assert.equal(plan.state, 'identical'); assert.equal(plan.matchingPrefixEvents, 1);
  assert.equal((await restored.history('original'))[0].kind, 'report');
});

test('incoming extension preserves every existing event, including separate records', async () => {
  const book = await first();
  await book.record({ operationId: 'unrelated-capture', recordId: 'second', kind: 'interpretation', author: 'another', payload: { text: 'Keep this separate' }, sourceRefs: ['source:second'] });
  const incoming = await RecordBook.restore(await book.export());
  await corrected(incoming, 'correct-1');
  const plan = await assessRecordBookImport(book, incoming);
  assert.equal(plan.state, 'extends_current'); assert.equal(plan.importPreservesCurrent, true);
  assert.equal(plan.currentEvents, 2); assert.equal(plan.incomingEvents, 3);
  assert.equal((await incoming.history('original'))[0].payload.text, 'Original authored account');
  assert.equal((await incoming.history('original'))[1].kind, 'report');
  assert.equal((await incoming.history('second'))[0].kind, 'interpretation');
});

test('older incoming version cannot displace a later correction', async () => {
  const book = await first(); const old = await RecordBook.restore(await book.export());
  await corrected(book, 'correct-1'); const before = await book.snapshot();
  const plan = await assessRecordBookImport(book, old);
  assert.equal(plan.state, 'older_snapshot'); assert.equal(plan.importPreservesCurrent, false);
  assert.equal(plan.requiresReconciliation, true); assert.deepEqual(await book.snapshot(), before);
});

test('same-length conflicting correction is not misclassified as identical', async () => {
  const base = await first(); const original = await base.export();
  const left = await RecordBook.restore(original), right = await RecordBook.restore(original);
  await corrected(left, 'correct-left', 'Version A'); await corrected(right, 'correct-right', 'Version B');
  const plan = await assessRecordBookImport(left, right);
  assert.equal(plan.state, 'conflicting_history'); assert.equal(plan.matchingPrefixEvents, 1);
  assert.equal(plan.importPreservesCurrent, false);
});

test('different books and reordered events are treated as conflicts, not merges', async () => {
  const book = await first();
  const unrelated = make(); await unrelated.record({ operationId: 'other', recordId: 'other', kind: 'work', author: 'person', payload: { text: 'Not the same book' }, sourceRefs: ['source:other'] });
  assert.equal((await assessRecordBookImport(book, unrelated)).state, 'conflicting_history');
});

test('corrupt archive is rejected before it becomes a comparison candidate', async () => {
  const book = await first(); const archive = JSON.parse(JSON.stringify(await book.export()));
  archive.payload.events[0].payload.text = 'Tampered';
  await assert.rejects(RecordBook.restore(archive), e => e.code === 'INTEGRITY_MISMATCH');
});

test('invalid book inputs are rejected explicitly', async () => {
  const book = await first();
  await assert.rejects(assessRecordBookImport({}, book), e => e.code === 'INVALID_INPUT');
  await assert.rejects(assessRecordBookImport(book, {}), e => e.code === 'INVALID_INPUT');
});
