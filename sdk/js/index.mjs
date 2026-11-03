/** PromiseStep local core. These tools preserve supplied work; they do not confer authority. */
export const version = '0.1.0-preview.1';
export const formatVersion = 1;
const MAX_BYTES = 2_000_000;
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export class PromiseStepError extends Error {
  constructor(code, message) { super(message); this.name = 'PromiseStepError'; this.code = code; }
}
function fail(code, message) { throw new PromiseStepError(code, message); }
function need(ok, code, message) { if (!ok) fail(code, message); }
function text(v, field, max = 8192) {
  need(typeof v === 'string' && v.trim().length > 0 && v.length <= max, 'INVALID_INPUT', `${field} must be a nonempty string of at most ${max} characters.`);
  return v;
}
function id(v, field = 'id') {
  text(v, field, 160);
  need(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(v), 'INVALID_INPUT', `${field} has unsupported characters.`);
  return v;
}
function instant(v, field = 'timestamp') {
  text(v, field, 40);
  need(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v) && Number.isFinite(Date.parse(v)), 'INVALID_INPUT', `${field} must be an ISO UTC timestamp.`);
  const date = new Date(v);
  need(date.toISOString().slice(0, 19) === v.slice(0, 19), 'INVALID_INPUT', `${field} is not a calendar date.`);
  return v;
}
function stringList(v, field, { min = 0, max = 128 } = {}) {
  need(Array.isArray(v) && v.length >= min && v.length <= max, 'INVALID_INPUT', `${field} must be an array with ${min}–${max} strings.`);
  v.forEach(x => text(x, field, 1000));
  need(new Set(v).size === v.length, 'INVALID_INPUT', `${field} must not contain duplicates.`);
  return v;
}
function plainObject(value) { return value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null); }
export function canonicalJSON(value) {
  let nodes = 0;
  const visiting = new Set();
  const visit = (v, depth) => {
    need(++nodes <= 100_000 && depth <= 24, 'LIMIT_EXCEEDED', 'JSON complexity limit exceeded.');
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number') { need(Number.isFinite(v), 'INVALID_INPUT', 'JSON numbers must be finite.'); return JSON.stringify(v); }
    need(Array.isArray(v) || plainObject(v), 'INVALID_INPUT', 'Only plain JSON values are supported.');
    need(!visiting.has(v), 'INVALID_INPUT', 'Cyclic data is not supported.');
    need(Object.getOwnPropertySymbols(v).length === 0, 'INVALID_INPUT', 'Symbol keys are not supported.');
    visiting.add(v);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    for (const [k, d] of Object.entries(descriptors)) {
      need(!forbidden.has(k) && !d.get && !d.set, 'INVALID_INPUT', 'Unsafe property name or accessor.');
      if (Array.isArray(v) && k !== 'length') need(/^(0|[1-9]\d*)$/.test(k) && Number(k) < v.length, 'INVALID_INPUT', 'Arrays must not carry extra properties.');
      else if (!Array.isArray(v)) need(d.enumerable, 'INVALID_INPUT', 'Non-enumerable data would be lost.');
    }
    let out;
    if (Array.isArray(v)) {
      const parts = [];
      for (let i = 0; i < v.length; i++) { need(Object.hasOwn(v, i), 'INVALID_INPUT', 'Sparse arrays are not supported.'); parts.push(visit(v[i], depth + 1)); }
      out = '[' + parts.join(',') + ']';
    } else out = '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + visit(v[k], depth + 1)).join(',') + '}';
    visiting.delete(v);
    return out;
  };
  const serialized = visit(value, 0);
  need(enc.encode(serialized).byteLength <= MAX_BYTES, 'LIMIT_EXCEEDED', 'JSON exceeds the 2 MB local input limit.');
  return serialized;
}
function copy(v) { return JSON.parse(canonicalJSON(v)); }
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
function cryptoApi() { need(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues, 'UNAVAILABLE', 'Web Crypto requires a supported secure runtime.'); return globalThis.crypto; }
function uid() { return cryptoApi().randomUUID(); }
export async function digest(value) {
  return Array.from(new Uint8Array(await cryptoApi().subtle.digest('SHA-256', enc.encode(canonicalJSON(value)))), b => b.toString(16).padStart(2, '0')).join('');
}
function knownKeys(obj, fields) { need(plainObject(obj), 'INVALID_INPUT', 'Expected a JSON object.'); for (const k of Object.keys(obj)) need(fields.includes(k), 'INVALID_INPUT', `Unexpected field: ${k}. Use extensions for application data.`); }
function criteria(v) {
  need(Array.isArray(v) && v.length <= 128, 'INVALID_INPUT', 'criteria must be an array.');
  const seen = new Set();
  for (const item of v) {
    knownKeys(item, ['id', 'description', 'requiresHumanReview']);
    id(item.id, 'criterion.id'); text(item.description, 'criterion.description');
    need(!seen.has(item.id), 'INVALID_INPUT', 'Criterion IDs must be unique.'); seen.add(item.id);
    need(item.requiresHumanReview === undefined || typeof item.requiresHumanReview === 'boolean', 'INVALID_INPUT', 'requiresHumanReview must be a boolean.');
  }
  return v;
}
export function createPromise(input, { now = new Date().toISOString(), createId = uid } = {}) {
  const v = copy(input);
  knownKeys(v, ['id', 'name', 'intention', 'criteria', 'sourceRefs', 'extensions']);
  text(v.name, 'name', 200); text(v.intention, 'intention'); criteria(v.criteria ?? []); stringList(v.sourceRefs ?? [], 'sourceRefs');
  return freeze({ format: 'promisestep/promise', formatVersion, id: id(v.id ?? createId()), revision: 1, name: v.name,
    intention: v.intention, criteria: v.criteria ?? [], sourceRefs: v.sourceRefs ?? [], extensions: v.extensions ?? {},
    createdAt: instant(now), standing: 'intention', fulfillment: 'not_assessed' });
}
export const PromiseStep = Object.freeze({ version, promise: createPromise });

export const recordKinds = Object.freeze(['promise', 'work', 'observation', 'report', 'interpretation', 'investigation', 'finding', 'evidence', 'decision', 'order', 'boundary', 'receipt', 'song-version', 'translation', 'pause']);
function recordRequest(input, action) {
  const v = copy(input);
  const fields = ['operationId', 'recordId', 'payload', 'author', 'sourceRefs'];
  knownKeys(v, action === 'recorded' ? [...fields, 'kind'] : [...fields, 'expectedRevision', 'reason']);
  id(v.operationId, 'operationId'); id(v.recordId, 'recordId'); text(v.author, 'author', 300);
  stringList(v.sourceRefs ?? [], 'sourceRefs');
  need(Object.hasOwn(v, 'payload'), 'INVALID_INPUT', 'payload is required; empty data is not inferred.');
  if (action === 'recorded') need(recordKinds.includes(v.kind), 'INVALID_INPUT', 'Unknown record kind.');
  else { need(Number.isSafeInteger(v.expectedRevision) && v.expectedRevision > 0, 'INVALID_INPUT', 'expectedRevision is required.'); text(v.reason, 'reason'); }
  return { ...v, sourceRefs: v.sourceRefs ?? [] };
}
function requestFromEvent(e) {
  const r = { operationId: e.operationId, recordId: e.recordId, payload: e.payload, author: e.author, sourceRefs: e.sourceRefs };
  return e.action === 'recorded' ? { ...r, kind: e.kind } : { ...r, expectedRevision: e.revision - 1, reason: e.reason };
}
export class RecordBook {
  #events = []; #operations = new Map(); #latest = new Map(); #queue = Promise.resolve(); #clock; #id;
  constructor({ clock = () => new Date().toISOString(), createId = uid } = {}) {
    need(typeof clock === 'function' && typeof createId === 'function', 'INVALID_INPUT', 'clock and createId must be functions.');
    this.#clock = clock; this.#id = createId;
  }
  #enqueue(fn) { const task = this.#queue.then(fn); this.#queue = task.catch(() => {}); return task; }
  #append(input, action) {
    const request = recordRequest(input, action);
    return this.#enqueue(async () => {
      const operationDigest = await digest({ action, request });
      const prior = this.#operations.get(request.operationId);
      if (prior) { need(prior.operationDigest === operationDigest, 'IDEMPOTENCY_CONFLICT', 'This operation ID was already used for different input.'); return prior; }
      need(this.#events.length < 5000, 'LIMIT_EXCEEDED', 'RecordBook event limit reached; export this book before starting another.');
      const latest = this.#latest.get(request.recordId);
      if (action === 'recorded') need(!latest, 'RECORD_EXISTS', 'Record exists. Append a sourced correction instead of replacing it.');
      else { need(latest, 'NOT_FOUND', 'Original record is unavailable.'); need(request.expectedRevision === latest.revision, 'REVISION_CONFLICT', 'Record changed; inspect the current revision before correcting.'); }
      const event = freeze({ sequence: this.#events.length + 1, eventId: id(this.#id(), 'eventId'), operationId: request.operationId,
        operationDigest, recordId: request.recordId, revision: (latest?.revision ?? 0) + 1, action,
        kind: latest?.kind ?? request.kind, author: request.author, sourceRefs: request.sourceRefs,
        payload: request.payload, reason: action === 'corrected' ? request.reason : null,
        previousEventId: latest?.eventId ?? null, recordedAt: instant(this.#clock()) });
      need(!this.#events.some(x => x.eventId === event.eventId), 'ID_CONFLICT', 'Event identifier already exists.');
      canonicalJSON({ format: 'promisestep/recordbook', formatVersion, events: [...this.#events, event] });
      this.#events.push(event); this.#latest.set(event.recordId, event); this.#operations.set(event.operationId, event);
      return event;
    });
  }
  record(input) { return this.#append(input, 'recorded'); }
  correct(input) { return this.#append(input, 'corrected'); }
  async get(recordId) { id(recordId); await this.#queue; return this.#latest.get(recordId) ?? null; }
  async history(recordId) { id(recordId); await this.#queue; return freeze(this.#events.filter(e => e.recordId === recordId)); }
  async snapshot() { await this.#queue; return freeze(copy({ format: 'promisestep/recordbook', formatVersion, events: this.#events })); }
  async export() { return createArchive(await this.snapshot()); }
  static async restore(archive, options = {}) {
    const snapshot = await readArchive(archive);
    knownKeys(snapshot, ['format', 'formatVersion', 'events']);
    need(snapshot.format === 'promisestep/recordbook' && snapshot.formatVersion === 1, 'UNSUPPORTED_VERSION', 'Unsupported recordbook format.');
    need(Array.isArray(snapshot.events) && snapshot.events.length <= 5000, 'LIMIT_EXCEEDED', 'Unsupported event count.');
    const book = new RecordBook(options); const seen = new Set();
    for (const e of snapshot.events) {
      knownKeys(e, ['sequence', 'eventId', 'operationId', 'operationDigest', 'recordId', 'revision', 'action', 'kind', 'author', 'sourceRefs', 'payload', 'reason', 'previousEventId', 'recordedAt']);
      need(['recorded', 'corrected'].includes(e.action), 'INVALID_ARCHIVE', 'Unsupported event action.');
      instant(e.recordedAt); id(e.eventId);
      need(!seen.has(e.eventId), 'INVALID_ARCHIVE', 'Duplicate event identifier.'); seen.add(e.eventId);
      const req = recordRequest(requestFromEvent(e), e.action);
      need(e.operationDigest === await digest({ action: e.action, request: req }), 'INTEGRITY_MISMATCH', 'Operation digest mismatch.');
      need(!book.#operations.has(e.operationId), 'INVALID_ARCHIVE', 'Repeated operation ID in history.');
      const previous = book.#latest.get(e.recordId);
      need(e.sequence === book.#events.length + 1 && e.revision === (previous?.revision ?? 0) + 1, 'INVALID_ARCHIVE', 'History order or revision mismatch.');
      need(e.previousEventId === (previous?.eventId ?? null), 'INVALID_ARCHIVE', 'Broken correction chain.');
      need(e.action === (previous ? 'corrected' : 'recorded') && (!previous || e.kind === previous.kind), 'INVALID_ARCHIVE', 'A correction cannot change original record standing.');
      need(e.action === 'corrected' || e.reason === null, 'INVALID_ARCHIVE', 'An original cannot masquerade as a correction.');
      freeze(e); book.#events.push(e); book.#latest.set(e.recordId, e); book.#operations.set(e.operationId, e);
    }
    return book;
  }
}
/** Inspect a validated incoming book without replacing active work. This is not an authority or backup receipt. */
export async function assessRecordBookImport(currentBook, incomingBook) {
  need(currentBook === null || currentBook instanceof RecordBook, 'INVALID_INPUT', 'Current work must be a RecordBook or null.');
  need(incomingBook instanceof RecordBook, 'INVALID_INPUT', 'Incoming work must first pass RecordBook.restore validation.');
  const incoming = (await incomingBook.snapshot()).events;
  const current = currentBook === null ? [] : (await currentBook.snapshot()).events;
  let matchingPrefixEvents = 0;
  while (matchingPrefixEvents < Math.min(current.length, incoming.length) &&
         canonicalJSON(current[matchingPrefixEvents]) === canonicalJSON(incoming[matchingPrefixEvents])) matchingPrefixEvents++;
  const state = currentBook === null ? 'new_book' :
    matchingPrefixEvents !== Math.min(current.length, incoming.length) ? 'conflicting_history' :
    incoming.length < current.length ? 'older_snapshot' :
    incoming.length === current.length ? 'identical' : 'extends_current';
  const importPreservesCurrent = ['new_book', 'identical', 'extends_current'].includes(state);
  return freeze({ state, importPreservesCurrent, requiresReconciliation: !importPreservesCurrent,
    currentEvents: current.length, incomingEvents: incoming.length, matchingPrefixEvents,
    changesPermissions: false, authenticatesAuthorship: false, writesData: false });
}

export async function createArchive(payload) {
  const value = copy(payload);
  const archive = { format: 'promisestep/archive', formatVersion, algorithm: 'SHA-256', digest: await digest(value), payload: value };
  canonicalJSON(archive);
  return freeze(archive);
}
export async function readArchive(input) {
  let v;
  if (typeof input === 'string') {
    need(enc.encode(input).byteLength <= MAX_BYTES, 'LIMIT_EXCEEDED', 'Archive is too large.');
    try { v = JSON.parse(input); } catch { fail('INVALID_ARCHIVE', 'Archive must be valid JSON.'); }
  } else v = input;
  v = copy(v); knownKeys(v, ['format', 'formatVersion', 'algorithm', 'digest', 'payload']);
  need(v.format === 'promisestep/archive' && v.formatVersion === 1, 'UNSUPPORTED_VERSION', 'Unsupported archive format/version.');
  need(v.algorithm === 'SHA-256' && /^[0-9a-f]{64}$/.test(v.digest), 'INVALID_ARCHIVE', 'Unsupported digest.');
  need(await digest(v.payload) === v.digest, 'INTEGRITY_MISMATCH', 'Archive content no longer matches its recorded digest.');
  return freeze(v.payload);
}
function base64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s); }
function unbase64(value, max = MAX_BYTES * 2) {
  need(typeof value === 'string' && value.length <= max && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value), 'INVALID_ARCHIVE', 'Invalid base64 encoding.');
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
async function derive(password, salt, usages) {
  text(password, 'password', 1024); need(password.length >= 12, 'INVALID_INPUT', 'Use a passphrase of at least 12 characters.');
  const c = cryptoApi(); const material = await c.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return c.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 }, material, { name: 'AES-GCM', length: 256 }, false, usages);
}
export async function encryptArchive(archive, password) {
  archive = copy(archive);
  await readArchive(archive);
  const c = cryptoApi(), salt = c.getRandomValues(new Uint8Array(16)), iv = c.getRandomValues(new Uint8Array(12));
  const aad = enc.encode('promisestep/encrypted-archive/1');
  const key = await derive(password, salt, ['encrypt']);
  const result = await c.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, enc.encode(canonicalJSON(archive)));
  return freeze({ format: 'promisestep/encrypted-archive', formatVersion, cipher: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: 600000, salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(result)) });
}
export async function decryptArchive(input, password) {
  const v = typeof input === 'string' ? (() => { need(input.length <= MAX_BYTES * 2, 'LIMIT_EXCEEDED', 'Encrypted input too large.'); try { return JSON.parse(input); } catch { fail('INVALID_ARCHIVE', 'Invalid encrypted JSON.'); } })() : input;
  // Read the known envelope without invoking accessors or accepting unbounded KDF parameters.
  need(plainObject(v) && Object.getOwnPropertySymbols(v).length === 0, 'INVALID_ARCHIVE', 'Invalid encrypted envelope.');
  for (const d of Object.values(Object.getOwnPropertyDescriptors(v))) need(!d.get && !d.set && d.enumerable, 'INVALID_ARCHIVE', 'Invalid encrypted property.');
  knownKeys(v, ['format', 'formatVersion', 'cipher', 'kdf', 'iterations', 'salt', 'iv', 'ciphertext']);
  need(v.format === 'promisestep/encrypted-archive' && v.formatVersion === 1 && v.cipher === 'AES-256-GCM' && v.kdf === 'PBKDF2-SHA256' && v.iterations === 600000, 'UNSUPPORTED_VERSION', 'Unsupported encrypted archive parameters.');
  const salt = unbase64(v.salt, 24), iv = unbase64(v.iv, 16), ciphertext = unbase64(v.ciphertext);
  need(salt.length === 16 && iv.length === 12 && ciphertext.length >= 16, 'INVALID_ARCHIVE', 'Invalid encrypted archive lengths.');
  const key = await derive(password, salt, ['decrypt']);
  let data;
  try { data = await cryptoApi().subtle.decrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('promisestep/encrypted-archive/1'), tagLength: 128 }, key, ciphertext); }
  catch { fail('DECRYPTION_FAILED', 'The passphrase is incorrect or the archive was changed.'); }
  const plain = dec.decode(data); await readArchive(plain); return freeze(JSON.parse(plain));
}

export const executionStates = Object.freeze(['allowed', 'denied', 'requires_human_review', 'not_yet_determined', 'unavailable']);
export function assessBoundary(request, grant, { now = new Date().toISOString(), ownerAvailable = true } = {}) {
  const req = copy(request); instant(now); const ms = Date.parse(now);
  knownKeys(req, ['actor', 'target', 'action', 'purpose', 'audience', 'fields', 'expectedGrantRevision', 'requiresHumanReview']);
  for (const key of ['actor', 'target', 'action', 'purpose']) text(req[key], key, 300);
  stringList(req.audience, 'audience', { min: 1 }); stringList(req.fields, 'fields', { min: 1 });
  need(Number.isSafeInteger(req.expectedGrantRevision) && req.expectedGrantRevision > 0, 'INVALID_INPUT', 'expectedGrantRevision is required.');
  need(req.requiresHumanReview === undefined || typeof req.requiresHumanReview === 'boolean', 'INVALID_INPUT', 'requiresHumanReview must be boolean.');
  need(typeof ownerAvailable === 'boolean', 'INVALID_INPUT', 'ownerAvailable must be boolean.');
  const result = (state, reasons, evidenceRefs = []) => freeze({ state, reasons, evaluatedAt: now, scope: 'supplied_snapshot_only', ownerRecheckRequired: true, evidenceRefs });
  if (!ownerAvailable) return result('unavailable', ['OWNER_UNAVAILABLE']);
  if (grant == null) return result('not_yet_determined', ['NO_AUTHORITY_SNAPSHOT']);
  const g = copy(grant);
  knownKeys(g, ['id', 'revision', 'actor', 'target', 'actions', 'purposes', 'audiences', 'fields', 'validFrom', 'expiresAt', 'checkedAt', 'freshUntil', 'revoked', 'sourceRefs']);
  id(g.id); need(Number.isSafeInteger(g.revision) && g.revision > 0, 'INVALID_INPUT', 'Grant revision required.');
  text(g.actor, 'grant.actor', 300); text(g.target, 'grant.target', 300);
  for (const key of ['actions', 'purposes', 'audiences', 'fields']) stringList(g[key], `grant.${key}`, { min: 1 });
  for (const key of ['validFrom', 'expiresAt', 'checkedAt', 'freshUntil']) instant(g[key], key);
  need(typeof g.revoked === 'boolean', 'INVALID_INPUT', 'revoked must be explicit.'); stringList(g.sourceRefs, 'sourceRefs');
  need(Date.parse(g.validFrom) < Date.parse(g.expiresAt) && Date.parse(g.checkedAt) <= Date.parse(g.freshUntil), 'INVALID_INPUT', 'Grant validity interval is inverted.');
  if (g.revoked) return result('denied', ['REVOKED'], g.sourceRefs);
  if (ms < Date.parse(g.validFrom) || ms >= Date.parse(g.expiresAt)) return result('denied', ['OUTSIDE_VALIDITY'], g.sourceRefs);
  if (g.revision !== req.expectedGrantRevision) return result('not_yet_determined', ['GRANT_REVISION_CHANGED'], g.sourceRefs);
  if (ms < Date.parse(g.checkedAt) || ms >= Date.parse(g.freshUntil) || g.sourceRefs.length === 0) return result('not_yet_determined', ['STALE_OR_UNSOURCED_AUTHORITY'], g.sourceRefs);
  const mismatches = [];
  if (req.actor !== g.actor) mismatches.push('ACTOR_OUT_OF_SCOPE');
  if (req.target !== g.target) mismatches.push('TARGET_OUT_OF_SCOPE');
  if (!g.actions.includes(req.action)) mismatches.push('ACTION_OUT_OF_SCOPE');
  if (!g.purposes.includes(req.purpose)) mismatches.push('PURPOSE_OUT_OF_SCOPE');
  if (!req.audience.every(x => g.audiences.includes(x))) mismatches.push('AUDIENCE_OUT_OF_SCOPE');
  if (!req.fields.every(x => g.fields.includes(x))) mismatches.push('FIELDS_OUT_OF_SCOPE');
  if (mismatches.length) return result('denied', mismatches, g.sourceRefs);
  if (req.requiresHumanReview) return result('requires_human_review', ['HUMAN_JUDGMENT_REQUIRED'], g.sourceRefs);
  return result('allowed', ['SNAPSHOT_MATCHES_SCOPE_NOT_AN_ACCESS_TOKEN'], g.sourceRefs);
}
export function assessJourney(promise, observations, { release, now = new Date().toISOString() } = {}) {
  const p = copy(promise), obs = copy(observations); text(release, 'release', 200); instant(now);
  need(p.format === 'promisestep/promise' && p.formatVersion === 1, 'UNSUPPORTED_VERSION', 'Expected a supported promise.');
  id(p.id); need(Number.isSafeInteger(p.revision) && p.revision > 0, 'INVALID_INPUT', 'Promise revision required.'); criteria(p.criteria);
  need(Array.isArray(obs) && obs.length <= 10000, 'LIMIT_EXCEEDED', 'Unsupported observations.');
  const seen = new Set();
  for (const o of obs) {
    knownKeys(o, ['id', 'promiseId', 'promiseRevision', 'criterionId', 'release', 'outcome', 'evidenceRefs', 'observedAt', 'standing']);
    id(o.id); need(!seen.has(o.id), 'INVALID_INPUT', 'Duplicate observation ID.'); seen.add(o.id);
    id(o.promiseId); id(o.criterionId); text(o.release, 'observation.release', 200); instant(o.observedAt);
    need(Number.isSafeInteger(o.promiseRevision) && o.promiseRevision > 0, 'INVALID_INPUT', 'Observation promise revision required.');
    need(['met', 'unmet', 'unknown'].includes(o.outcome), 'INVALID_INPUT', 'Unknown observation outcome.');
    need(['observation', 'report'].includes(o.standing), 'INVALID_INPUT', 'Observation standing must be explicit.');
    stringList(o.evidenceRefs, 'evidenceRefs');
  }
  const included = obs.filter(o => o.promiseId === p.id && o.promiseRevision === p.revision && o.release === release && Date.parse(o.observedAt) <= Date.parse(now) && o.standing === 'observation' && o.evidenceRefs.length > 0);
  const checks = p.criteria.map(c => {
    const matches = included.filter(o => o.criterionId === c.id);
    return { criterionId: c.id, state: matches.some(o => o.outcome === 'unmet') ? 'unmet' : c.requiresHumanReview ? 'requires_human_review' : matches.some(o => o.outcome === 'unknown') || !matches.some(o => o.outcome === 'met') ? 'not_yet_determined' : 'evidenced', evidenceIds: matches.map(o => o.id) };
  });
  const state = checks.some(c => c.state === 'unmet') ? 'unmet_for_scope' : checks.some(c => c.state === 'requires_human_review') ? 'requires_human_review' : !checks.length || checks.some(c => c.state === 'not_yet_determined') ? 'not_yet_determined' : 'evidenced_for_scope';
  return freeze({ state, scope: 'supplied_evidence_only', promiseId: p.id, promiseRevision: p.revision, release, evaluatedAt: now, checks, excludedObservationIds: obs.filter(o => !included.includes(o) || !p.criteria.some(c => c.id === o.criterionId)).map(o => o.id), independentVerification: false });
}
export function pausePoint(input, { now = new Date().toISOString(), createId = uid } = {}) {
  const v = copy(input); knownKeys(v, ['workId', 'revision', 'nextAction', 'context', 'sourceRefs']); id(v.workId);
  need(Number.isSafeInteger(v.revision) && v.revision > 0, 'INVALID_INPUT', 'Positive work revision required.'); text(v.nextAction, 'nextAction'); stringList(v.sourceRefs ?? [], 'sourceRefs');
  return freeze({ format: 'promisestep/pause', formatVersion, id: id(createId()), ...v, context: v.context ?? {}, sourceRefs: v.sourceRefs ?? [], pausedAt: instant(now) });
}
export function inspectReturn(checkpoint, current) {
  const p = copy(checkpoint), c = copy(current); need(p.format === 'promisestep/pause' && p.formatVersion === 1, 'UNSUPPORTED_VERSION', 'Unsupported pause point.');
  id(p.workId); id(c.workId); need(Number.isSafeInteger(p.revision) && p.revision > 0 && Number.isSafeInteger(c.revision) && c.revision > 0, 'INVALID_INPUT', 'Positive revisions required.');
  return freeze({ state: c.workId !== p.workId ? 'different_work' : c.revision !== p.revision ? 'needs_reconciliation' : 'same_revision', nextAction: p.nextAction, overwritesWork: false, grantsAccess: false });
}
export function reviewLocalization(input) {
  const v = copy(input); knownKeys(v, ['sourceId', 'sourceRevision', 'sourceText', 'candidateText', 'sourceLocale', 'targetLocale', 'protectedTerms']);
  id(v.sourceId); need(Number.isSafeInteger(v.sourceRevision) && v.sourceRevision > 0, 'INVALID_INPUT', 'sourceRevision required.');
  text(v.sourceText, 'sourceText'); text(v.candidateText, 'candidateText');
  for (const k of ['sourceLocale', 'targetLocale']) { text(v[k], k, 60); try { Intl.getCanonicalLocales(v[k]); } catch { fail('INVALID_INPUT', `Invalid ${k}.`); } }
  stringList(v.protectedTerms ?? [], 'protectedTerms');
  const placeholders = s => (s.match(/\{\{[A-Za-z_][A-Za-z0-9_.-]*\}\}|\{[A-Za-z_][A-Za-z0-9_.-]*\}/g) ?? []).sort();
  const a = placeholders(v.sourceText), b = placeholders(v.candidateText), missingTerms = (v.protectedTerms ?? []).filter(t => !v.candidateText.includes(t));
  const issues = [...(JSON.stringify(a) === JSON.stringify(b) ? [] : ['PLACEHOLDER_MISMATCH']), ...(missingTerms.length ? ['PROTECTED_TERM_MISSING'] : [])];
  return freeze({ state: issues.length ? 'needs_correction' : 'requires_human_review', sourceId: v.sourceId, sourceRevision: v.sourceRevision, sourceText: v.sourceText, candidateText: v.candidateText, targetLocale: v.targetLocale, issues, missingTerms, meaningVerified: false, changesPermissions: false });
}
export class SongGraph {
  #versions = new Map(); #locations = [];
  addVersion(input) {
    const v = copy(input); knownKeys(v, ['id', 'songId', 'parentIds', 'assetDigest', 'contributorRefs', 'sourceRefs']);
    id(v.id); id(v.songId); stringList(v.parentIds, 'parentIds'); stringList(v.contributorRefs, 'contributorRefs'); stringList(v.sourceRefs, 'sourceRefs', { min: 1 });
    need(/^[0-9a-f]{64}$/.test(v.assetDigest), 'INVALID_INPUT', 'assetDigest must be a SHA-256 hex digest.');
    const prior = this.#versions.get(v.id); if (prior) { need(canonicalJSON(prior.data) === canonicalJSON(v), 'REVISION_CONFLICT', 'Version identifier already describes different material.'); return prior; }
    need(this.#versions.size < 5000, 'LIMIT_EXCEEDED', 'Song graph limit reached.');
    for (const parent of v.parentIds) { const p = this.#versions.get(parent); need(p && p.data.songId === v.songId, 'NOT_FOUND', 'Parents must be existing versions of this song.'); }
    const record = freeze({ data: v, attributionStanding: 'asserted', ownershipDetermined: false }); this.#versions.set(v.id, record); return record;
  }
  addLocation(input) {
    const v = copy(input); knownKeys(v, ['versionId', 'url', 'standing', 'sourceRef', 'observedAt']);
    need(this.#versions.has(v.versionId), 'NOT_FOUND', 'Version not found.'); text(v.url, 'url', 2048);
    let url; try { url = new URL(v.url); } catch { fail('INVALID_INPUT', 'Invalid location URL.'); }
    need(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password, 'INVALID_INPUT', 'Locations must be HTTP(S) URLs without credentials.');
    need(['reported', 'observed'].includes(v.standing), 'INVALID_INPUT', 'Location standing required.'); text(v.sourceRef, 'sourceRef'); instant(v.observedAt);
    need(this.#locations.length < 5000, 'LIMIT_EXCEEDED', 'Location limit reached.');
    const old = this.#locations.find(x => canonicalJSON(x) === canonicalJSON(v)); if (old) return old;
    freeze(v); this.#locations.push(v); return v;
  }
  snapshot() { return freeze(copy({ format: 'promisestep/songgraph', formatVersion, versions: [...this.#versions.values()], locations: this.#locations, coverage: 'caller_supplied_only', internetMonitoring: false })); }
}
export function draftSongInvite(input) {
  const v = copy(input); knownKeys(v, ['id', 'inviter', 'invitee', 'songId', 'versionIds', 'purpose', 'scopes', 'expiresAt', 'authorityRef']);
  for (const k of ['id', 'songId']) id(v[k]); for (const k of ['inviter', 'invitee', 'purpose', 'authorityRef']) text(v[k], k, 1000);
  stringList(v.versionIds, 'versionIds', { min: 1 }); stringList(v.scopes, 'scopes', { min: 1 }); instant(v.expiresAt);
  need(v.scopes.every(x => ['listen', 'comment', 'submit-contribution'].includes(x)), 'INVALID_INPUT', 'Draft invitation supports listen, comment, or submit-contribution only.');
  return freeze({ ...v, format: 'promisestep/song-invite', formatVersion, state: 'draft', sent: false, conveysOwnership: false, grantsAccess: false });
}
export const stewardshipOutcomes = Object.freeze(['Aligned', 'Needs Stewardship', 'Needs Context', 'Needs Continuity', 'Needs Hospitality', 'Needs Clarification', 'Needs Preservation']);
export const stewardshipQuestions = Object.freeze([
  'Does this protect human dignity?', 'Does this respect attention?', 'Does this improve understanding?',
  'Does this preserve context?', 'Does this preserve rationale?', 'Does it help quiet contributors participate?',
  'Does it reduce unnecessary complexity?', 'Does AI remain assistive rather than authoritative?',
  'Will someone understand this years from now?', 'Does this leave people more capable than before?'
]);
export function prepareStewardshipReview(input) {
  const v = copy(input); knownKeys(v, ['subject', 'purpose', 'sourceRefs']); text(v.subject, 'subject'); text(v.purpose, 'purpose'); stringList(v.sourceRefs, 'sourceRefs', { min: 1 });
  return freeze({ ...v, format: 'promisestep/review-preparation', formatVersion, questions: [...stewardshipQuestions], findings: [], recommendations: [], concluded: false, reviewer: null, outcome: null });
}
export class PublicAPIClient {
  #base; #fetch; #timeout;
  constructor({ baseURL = 'https://promisestep.com/api/v1/', fetch: fetcher = globalThis.fetch, timeoutMs = 10000 } = {}) {
    const u = new URL(baseURL); need(u.protocol === 'https:' || (u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)), 'INVALID_INPUT', 'Use HTTPS or local loopback.');
    need(!u.username && !u.password && !u.search && !u.hash && u.pathname.endsWith('/'), 'INVALID_INPUT', 'Base URL must have a trailing slash and no credentials, query, or fragment.');
    need(typeof fetcher === 'function' && Number.isFinite(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 60000, 'INVALID_INPUT', 'A fetch transport and bounded timeout are required.');
    this.#base = u; this.#fetch = fetcher; this.#timeout = timeoutMs;
  }
  async get(resource, { signal } = {}) {
    need(['health', 'capabilities', 'guidelines', 'schemas', 'openapi.json', 'release'].includes(resource), 'INVALID_INPUT', 'Unknown public reference resource.');
    const controller = new AbortController(); let timedOut = false;
    const abort = () => controller.abort(); if (signal?.aborted) fail('CANCELLED', 'Request cancelled.'); signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.#timeout);
    try {
      const response = await this.#fetch(new URL(resource, this.#base), { method: 'GET', redirect: 'error', credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller.signal });
      need(response.ok, 'HTTP_ERROR', `Public API returned HTTP ${response.status}.`);
      need((response.headers.get('content-type') ?? '').includes('application/json'), 'INVALID_RESPONSE', 'Expected JSON, not an HTML fallback.');
      const length = Number(response.headers.get('content-length') ?? 0); need(length <= MAX_BYTES, 'LIMIT_EXCEEDED', 'Response exceeds limit.');
      need(response.body?.getReader, 'INVALID_RESPONSE', 'Streaming response body is required.');
      const reader = response.body.getReader(); const chunks = []; let total = 0;
      try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; need(total <= MAX_BYTES, 'LIMIT_EXCEEDED', 'Response exceeds limit.'); chunks.push(value); } }
      catch (e) { await reader.cancel().catch(() => {}); throw e; }
      const joined = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
      let result; try { result = JSON.parse(dec.decode(joined)); } catch { fail('INVALID_RESPONSE', 'Response is not valid JSON.'); }
      return freeze(copy(result));
    } catch (e) {
      if (timedOut) fail('TIMEOUT', 'Read timed out; no write was attempted.');
      if (signal?.aborted) fail('CANCELLED', 'Request cancelled; no write was attempted.');
      if (e instanceof PromiseStepError) throw e;
      fail('UNAVAILABLE', 'Public reference API is unavailable. Local tools remain usable.');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
}
