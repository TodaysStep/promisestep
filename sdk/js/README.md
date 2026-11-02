# PromiseStep local core

A developer’s toolkit for practical possibilities. Refactoring for Kindness.

## Run the example without a service

Requires Node.js 20 or later. There are no runtime dependencies, accounts or API keys.

```sh
node example.mjs
```

```js
import { PromiseStep, RecordBook } from './index.mjs';
const promise = PromiseStep.promise({
  name: 'Better onboarding',
  intention: 'Let a person pause without losing their work.'
});
const book = new RecordBook();
await book.record({
  operationId: 'capture-1', recordId: promise.id, kind: 'promise',
  author: 'example-developer', payload: { intention: promise.intention }
});
const archive = await book.export();
const restored = await RecordBook.restore(JSON.stringify(archive));
console.log(await restored.get(promise.id));
```

## What is implemented here

`PromiseStep.promise` / `createPromise`: exact intention, criteria, source references and identity; never claims automatic fulfillment.
`RecordBook`: in-memory originals and append-only corrections with revision checks, serialized writes and idempotency. Choose your own persistence layer.
`createArchive` / `readArchive`: bounded, versioned portable JSON and SHA-256 integrity checking.
`encryptArchive` / `decryptArchive`: optional local AES-256-GCM with a fresh nonce and salt, PBKDF2-SHA256 (600,000 iterations), and no retained password. Losing the passphrase means the archive cannot be recovered through this toolkit.
`assessBoundary`: five-state assessment of an explicit authority snapshot, with scope, expiry and freshness. **Not an authenticated grant or server-side enforcement.**
`assessJourney`: checks supplied, source-linked observations against a particular promise revision and release; contrary evidence is not outvoted. **Does not independently authenticate the observations or certify a person's experience.**
`pausePoint` / `inspectReturn`: a return position that refuses to silently overwrite a newer revision or grant access.
`SongGraph`: local version lineage and attributed location observations, not internet surveillance or rights determination.
`draftSongInvite`: an unsent, scoped draft; not delivery, acceptance, ownership transfer or an access grant.
`reviewLocalization`: source-preserving placeholder and protected-term checks; actual translation and human meaning review remain separate.
`prepareStewardshipReview`: the ten canonical review questions, without invented findings, a reviewer, or approval.
`PublicAPIClient`: bounded, cancellable GETs of public reference resources, no private write API.

## Important boundaries

A hash checks consistency with a recorded digest, not authorship or truth. An attacker who can replace an unkeyed archive and its digest can create a new self-consistent archive. Use authenticated custody or the optional encrypted archive where appropriate. A supplied authority snapshot may be stale or false: the owning service must authenticate identity and enforce permissions at the real effect boundary. A local JSON export is not a backup until it has been retained and restoration tested.

Original wording and original record kind survive corrections. A report does not become a finding. Silence, funding, role, contribution, invitation or proximity does not create unrelated authority. Existing laws, duties, contracts and emergency procedures are not overridden by a local check.

The first HTTP API is read-only. Do not send private evidence, song drafts, credentials or case records to it. The core functions make no network calls. Only the explicitly constructed PublicAPIClient uses a network transport.

## Release standing

Version 0.1.0-preview.1 is a developer preview of these named functions, not the completed instrument collection. The broader family adapters, full HSG conformance, authenticated owner integrations, and production release review remain separate work. No recovered historical test total is used to verify this code. See LICENSE-STATUS.txt: the final distribution license requires the founder's decision. No registry publication is implied by the package name.
