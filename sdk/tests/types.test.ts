import { PromiseStep, RecordBook, assessBoundary, assessJourney, encryptArchive, decryptArchive, SongGraph, pausePoint, inspectReturn, reviewLocalization, prepareStewardshipReview, PublicAPIClient } from '../js/index.mjs';
const promise = PromiseStep.promise({ name: 'Return', intention: 'Keep my work.', criteria: [{ id: 'save', description: 'Restore the draft.' }] });
const book = new RecordBook();
await book.record({ operationId: 'op', recordId: 'work', kind: 'report', author: 'a', payload: { text: 'Original' } });
const archive = await book.export();
await RecordBook.restore(archive);
await encryptArchive(archive, 'long-enough-passphrase');
await decryptArchive(await encryptArchive(archive, 'long-enough-passphrase'), 'long-enough-passphrase');
assessBoundary({ actor: 'a', target: 'work', action: 'read', purpose: 'review', audience: ['b'], fields: ['text'], expectedGrantRevision: 1 }, null);
assessJourney(promise, [], { release: 'r1' });
const point = pausePoint({ workId: 'w', revision: 1, nextAction: 'Resume' });
inspectReturn(point, { workId: 'w', revision: 1 });
reviewLocalization({ sourceId: 's', sourceRevision: 1, sourceText: 'Hi', candidateText: 'Hola', sourceLocale: 'en', targetLocale: 'es' });
new SongGraph().addVersion({ id: 'v', songId: 's', parentIds: [], assetDigest: 'a'.repeat(64), contributorRefs: [], sourceRefs: ['original:s'] });
prepareStewardshipReview({ subject: 'Return', purpose: 'Understand the work.', sourceRefs: ['test:1'] });
await new PublicAPIClient().get('health');
// @ts-expect-error No private API mutation is exposed.
new PublicAPIClient().post('records', {});
// @ts-expect-error A correction must bind the revision it corrects.
book.correct({ operationId: 'x', recordId: 'work', author: 'a', payload: {}, reason: 'r' });
// @ts-expect-error Runtime only accepts declared record kinds.
book.record({ operationId: 'x', recordId: 'new', kind: 'diagnosis', author: 'a', payload: {} });
// @ts-expect-error A public reference client cannot request arbitrary URL paths.
new PublicAPIClient().get('../private');
