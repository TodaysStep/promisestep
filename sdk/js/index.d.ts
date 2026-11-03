export type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue };
export type JSONObject = { [key: string]: JSONValue };
export declare const version: '0.1.0-preview.1';
export declare const formatVersion: 1;
export declare class PromiseStepError extends Error { readonly code: string; constructor(code: string, message: string); }
export declare function canonicalJSON(value: JSONValue): string;
export declare function digest(value: JSONValue): Promise<string>;
export interface Criterion { id: string; description: string; requiresHumanReview?: boolean; }
export interface PromiseInput { id?: string; name: string; intention: string; criteria?: Criterion[]; sourceRefs?: string[]; extensions?: JSONValue; }
export interface PromiseRecord { readonly format: 'promisestep/promise'; readonly formatVersion: 1; readonly id: string; readonly revision: number; readonly name: string; readonly intention: string; readonly criteria: readonly Criterion[]; readonly sourceRefs: readonly string[]; readonly extensions: JSONValue; readonly createdAt: string; readonly standing: 'intention'; readonly fulfillment: 'not_assessed'; }
export interface CreationOptions { now?: string; createId?: () => string; }
export declare function createPromise(input: PromiseInput, options?: CreationOptions): PromiseRecord;
export declare const PromiseStep: Readonly<{ version: typeof version; promise: typeof createPromise }>;
export type RecordKind = 'promise'|'work'|'observation'|'report'|'interpretation'|'investigation'|'finding'|'evidence'|'decision'|'order'|'boundary'|'receipt'|'song-version'|'translation'|'pause';
export declare const recordKinds: readonly RecordKind[];
export interface RecordInput { operationId: string; recordId: string; kind: RecordKind; payload: JSONValue; author: string; sourceRefs?: string[]; }
export interface CorrectionInput { operationId: string; recordId: string; expectedRevision: number; reason: string; payload: JSONValue; author: string; sourceRefs?: string[]; }
export interface RecordEvent { readonly sequence: number; readonly eventId: string; readonly operationId: string; readonly operationDigest: string; readonly recordId: string; readonly revision: number; readonly action: 'recorded'|'corrected'; readonly kind: RecordKind; readonly author: string; readonly sourceRefs: readonly string[]; readonly payload: JSONValue; readonly reason: string|null; readonly previousEventId: string|null; readonly recordedAt: string; }
export interface BookSnapshot { readonly format: 'promisestep/recordbook'; readonly formatVersion: 1; readonly events: readonly RecordEvent[]; }
export interface Archive<T = JSONValue> { readonly format: 'promisestep/archive'; readonly formatVersion: 1; readonly algorithm: 'SHA-256'; readonly digest: string; readonly payload: T; }
export interface BookOptions { clock?: () => string; createId?: () => string; }
export declare class RecordBook {
  constructor(options?: BookOptions);
  record(input: RecordInput): Promise<RecordEvent>;
  correct(input: CorrectionInput): Promise<RecordEvent>;
  get(recordId: string): Promise<RecordEvent|null>;
  history(recordId: string): Promise<readonly RecordEvent[]>;
  snapshot(): Promise<BookSnapshot>;
  export(): Promise<Archive<BookSnapshot>>;
  static restore(archive: string | Archive<BookSnapshot>, options?: BookOptions): Promise<RecordBook>;
}
export interface RecordBookImportAssessment {
  readonly state: 'new_book'|'identical'|'extends_current'|'older_snapshot'|'conflicting_history';
  readonly importPreservesCurrent: boolean;
  readonly requiresReconciliation: boolean;
  readonly currentEvents: number;
  readonly incomingEvents: number;
  readonly matchingPrefixEvents: number;
  readonly changesPermissions: false;
  readonly authenticatesAuthorship: false;
  readonly writesData: false;
}
export declare function assessRecordBookImport(currentBook: RecordBook|null, incomingBook: RecordBook): Promise<RecordBookImportAssessment>;
export declare function createArchive<T extends JSONValue>(payload: T): Promise<Archive<T>>;
export declare function readArchive<T = JSONValue>(archive: string | Archive<T>): Promise<T>;
export interface EncryptedArchive { readonly format: 'promisestep/encrypted-archive'; readonly formatVersion: 1; readonly cipher: 'AES-256-GCM'; readonly kdf: 'PBKDF2-SHA256'; readonly iterations: 600000; readonly salt: string; readonly iv: string; readonly ciphertext: string; }
export declare function encryptArchive<T>(archive: Archive<T>, password: string): Promise<EncryptedArchive>;
export declare function decryptArchive<T = JSONValue>(archive: string | EncryptedArchive, password: string): Promise<Archive<T>>;
export type ExecutionState = 'allowed'|'denied'|'requires_human_review'|'not_yet_determined'|'unavailable';
export declare const executionStates: readonly ExecutionState[];
export interface BoundaryRequest { actor: string; target: string; action: string; purpose: string; audience: string[]; fields: string[]; expectedGrantRevision: number; requiresHumanReview?: boolean; }
export interface GrantSnapshot { id: string; revision: number; actor: string; target: string; actions: string[]; purposes: string[]; audiences: string[]; fields: string[]; validFrom: string; expiresAt: string; checkedAt: string; freshUntil: string; revoked: boolean; sourceRefs: string[]; }
export interface BoundaryAssessment { readonly state: ExecutionState; readonly reasons: readonly string[]; readonly evaluatedAt: string; readonly scope: 'supplied_snapshot_only'; readonly ownerRecheckRequired: true; readonly evidenceRefs: readonly string[]; }
export declare function assessBoundary(request: BoundaryRequest, grant: GrantSnapshot|null, options?: { now?: string; ownerAvailable?: boolean }): BoundaryAssessment;
export interface JourneyObservation { id: string; promiseId: string; promiseRevision: number; criterionId: string; release: string; outcome: 'met'|'unmet'|'unknown'; evidenceRefs: string[]; observedAt: string; standing: 'observation'|'report'; }
export interface JourneyAssessment { readonly state: 'unmet_for_scope'|'requires_human_review'|'not_yet_determined'|'evidenced_for_scope'; readonly scope: 'supplied_evidence_only'; readonly promiseId: string; readonly promiseRevision: number; readonly release: string; readonly evaluatedAt: string; readonly checks: readonly { criterionId: string; state: 'unmet'|'requires_human_review'|'not_yet_determined'|'evidenced'; evidenceIds: string[] }[]; readonly excludedObservationIds: readonly string[]; readonly independentVerification: false; }
export declare function assessJourney(promise: PromiseRecord, observations: JourneyObservation[], options: { release: string; now?: string }): JourneyAssessment;
export interface PauseInput { workId: string; revision: number; nextAction: string; context?: JSONValue; sourceRefs?: string[]; }
export interface PausePoint extends PauseInput { readonly format: 'promisestep/pause'; readonly formatVersion: 1; readonly id: string; readonly pausedAt: string; }
export declare function pausePoint(input: PauseInput, options?: CreationOptions): PausePoint;
export declare function inspectReturn(checkpoint: PausePoint, current: { workId: string; revision: number }): Readonly<{ state: 'different_work'|'needs_reconciliation'|'same_revision'; nextAction: string; overwritesWork: false; grantsAccess: false }>;
export interface LocalizationInput { sourceId: string; sourceRevision: number; sourceText: string; candidateText: string; sourceLocale: string; targetLocale: string; protectedTerms?: string[]; }
export interface LocalizationReview { readonly state: 'needs_correction'|'requires_human_review'; readonly sourceId: string; readonly sourceRevision: number; readonly sourceText: string; readonly candidateText: string; readonly targetLocale: string; readonly issues: readonly string[]; readonly missingTerms: readonly string[]; readonly meaningVerified: false; readonly changesPermissions: false; }
export declare function reviewLocalization(input: LocalizationInput): LocalizationReview;
export interface SongVersionInput { id: string; songId: string; parentIds: string[]; assetDigest: string; contributorRefs: string[]; sourceRefs: string[]; }
export interface SongLocation { versionId: string; url: string; standing: 'reported'|'observed'; sourceRef: string; observedAt: string; }
export declare class SongGraph {
  addVersion(input: SongVersionInput): Readonly<{ data: SongVersionInput; attributionStanding: 'asserted'; ownershipDetermined: false }>;
  addLocation(input: SongLocation): Readonly<SongLocation>;
  snapshot(): Readonly<{ format: 'promisestep/songgraph'; formatVersion: 1; versions: readonly { data: SongVersionInput; attributionStanding: 'asserted'; ownershipDetermined: false }[]; locations: readonly SongLocation[]; coverage: 'caller_supplied_only'; internetMonitoring: false }>;
}
export interface SongInviteInput { id: string; inviter: string; invitee: string; songId: string; versionIds: string[]; purpose: string; scopes: ('listen'|'comment'|'submit-contribution')[]; expiresAt: string; authorityRef: string; }
export declare function draftSongInvite(input: SongInviteInput): Readonly<SongInviteInput & { format: 'promisestep/song-invite'; formatVersion: 1; state: 'draft'; sent: false; conveysOwnership: false; grantsAccess: false }>;
export type StewardshipOutcome = 'Aligned'|'Needs Stewardship'|'Needs Context'|'Needs Continuity'|'Needs Hospitality'|'Needs Clarification'|'Needs Preservation';
export declare const stewardshipOutcomes: readonly StewardshipOutcome[];
export declare const stewardshipQuestions: readonly string[];
export declare function prepareStewardshipReview(input: { subject: string; purpose: string; sourceRefs: string[] }): Readonly<{ format: 'promisestep/review-preparation'; formatVersion: 1; subject: string; purpose: string; sourceRefs: string[]; questions: string[]; findings: never[]; recommendations: never[]; concluded: false; reviewer: null; outcome: null }>;
export type PublicResource = 'health'|'capabilities'|'guidelines'|'schemas'|'openapi.json'|'release';
export declare class PublicAPIClient {
  constructor(options?: { baseURL?: string; fetch?: typeof globalThis.fetch; timeoutMs?: number });
  get(resource: PublicResource, options?: { signal?: AbortSignal }): Promise<JSONValue>;
}
