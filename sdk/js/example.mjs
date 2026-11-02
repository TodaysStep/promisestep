import { PromiseStep, RecordBook, assessJourney, pausePoint, inspectReturn } from './index.mjs';

const promise = PromiseStep.promise({
  id: 'onboarding', name: 'Better onboarding', intention: 'Let a person pause without losing their work.',
  criteria: [{ id: 'return', description: 'The original draft is available after a pause.' }]
});
const book = new RecordBook();
await book.record({ operationId: 'draft-1', recordId: promise.id, kind: 'promise', author: 'example-developer', payload: { name: promise.name, intention: promise.intention } });
const checkpoint = pausePoint({ workId: promise.id, revision: 1, nextAction: 'Continue the draft.' });
const backup = await book.export();
const restored = await RecordBook.restore(JSON.stringify(backup));
const recovered = await restored.get(promise.id);
const outcome = assessJourney(promise, [{
  id: 'restore-observation', promiseId: promise.id, promiseRevision: 1, criterionId: 'return',
  release: 'local-example', outcome: recovered.payload.intention === promise.intention ? 'met' : 'unmet',
  standing: 'observation', evidenceRefs: ['local-example:byte-comparison'], observedAt: new Date().toISOString()
}], { release: 'local-example' });
console.log(JSON.stringify({ restored: recovered.payload, return: inspectReturn(checkpoint, { workId: promise.id, revision: recovered.revision }), assessment: outcome }, null, 2));
