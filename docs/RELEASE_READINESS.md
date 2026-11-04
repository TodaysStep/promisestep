# PromiseStep — verified standing and release gates

**Source standing: November 3, 2026, updated for preview.2 recovery-conflict compatibility; locally built and tested; NOT deployed.** This document is a scoped receipt index, not production approval.

## Verified local source

- Current independently saved source: `PromiseStep_Preview2_Recovery_Conflict_Compatibility_Source_2026-11-03.zip`.
- Archive size: **19,259,614 bytes**, 489 ZIP members (488 files + manifest).
- Source SHA-256: `3f8668aecebb407e9a3aa9bff133821cf6e8ef05e9d338218cc8f4eb0c8a369a`.
- Rebuilt Worker SHA-256: `97a52edf3ce8d146edb87d5ac75ee4a2cffd7788c6ef2f99614913de3032fe40`.
- The source receipt reports **88/88 website tests** (including preview.2 `RECOVERY_CONFLICT` code compatibility on refused import/restore, without changing newer refusal logic) and isolated layout/browser checks. The parent receipts report **171/171 JS SDK**, **38/38 Python**, strict TypeScript and focused restore tests; these are historical evidence for unchanged portions, not new hosted acceptance.
- Verified package inventory: 81 public static assets, 68 public JSON reference resources, 32 retained original artwork files, 11 byte-identical immutable preview.1 release artifacts.
- The previous 488-member source (`77118b97…`) remains the exact parent. Authentic preview.2 used `RECOVERY_CONFLICT` for unsafe Restore/import, while the parent displayed `RECONCILIATION_REQUIRED`. The current source restores the original code on those two branches; the newer Create guard still uses `RECONCILIATION_REQUIRED`, and import safety is unchanged. Two focused assertions failed against the parent and passed after repair; clean source restoration and changed-path local browser checks passed.
- Earlier sources and evidence remain intact; the 471-member authoring candidate is historical, not this source's replacement.

## Provider standing (previous verified observation, not a live lease)

- Existing Cloudflare Pages project: `promisestep`, production branch `main`.
- Production deployment `f95c5b61-45e4-45cb-bf2a-302c2a94da83`.
- Separate hosted preview.2 `61a11ae8-0999-4e55-9a3b-95e2ebcc5ef4`.
- The authentic preview.2 *public* SDK ZIP, tarball, Python archive, portal files and checksums were recovered and tested. **The entire producing workspace (website, builder, tests and compiled Worker source) was not.** Public output is not equivalent to its producing source.

## Pre-deployment safety gates

The following are conditions for a production write, not claims that a local build has already earned release authority.

1. **Authentic source and reconciliation:** recover the complete preview.2 producing website/build/Worker workspace with provenance and bytes; compare it with the latest verified 489-member source. Preserve every accepted correction, including `RECOVERY_CONFLICT`, Python archives, authored reasons, accessibility, protected Clear, imports, mobile, original art and prior release bytes.
2. **Actual authority and privacy:** preserve `UNLICENSED`, the exact read-only `/api/v1/` boundary, private records, and owner-service permission checks. No local roles or example grants may trigger externally owned effects.
3. **Hosted preview acceptance:** verify real HTTPS package downloads and installed examples, original → reasoned correction → scoped refusal → export → pause/restore → older/conflicting/tampered import refusal → protected Clear → return. Verify native browser behavior and mobile interaction without a test-only SHA bridge; identify physical Safari as an explicit separate check, not an assumed pass.
4. **Reversible same-project cutover:** refresh Cloudflare deployment identity and route ownership immediately before a write; preserve published preview.1 bytes, preview.2, its recovery path, the independent sharing Worker and a tested rollback. Do not change DNS, infrastructure or GitHub Actions.

**Hold production while authentic source custody and hosted reconciliation remain missing.** The current local Worker is not a safe replacement for a later un-reconciled hosted deployment.

## Production verification and constitutional completion (after an authorized release)

A successful deployment is not final acceptance. Check the actual production domain's complete developer journey, current HTTPS package hashes, read-only API refusal and relevant real-service permission/effect boundaries. Record any physical iPhone Safari observation separately from simulated mobile results.

Independent Heard stewardship and Constitutional Review require genuine commissioning and review, not a capability read or self-reported consensus. Founder production acceptance follows an observable working result. Only after the founder explicitly approves should the existing formal journeys, models, registers and handoff records be reconciled. Do not treat these post-deployment confirmations as already completed *pre-deployment* tests, nor make founder production acceptance a logically impossible prerequisite to observing production.

## Non-goals

No Lovable writes, GitHub Actions, paid browser, new Pages project, DNS change, service permission change, release relabeling, license invention, npm/PyPI publication, Step002 rerun or status-only receipts. Do not use a successful local build as permission to overwrite the hosted preview.

**Publishing this documentation to GitHub does not deploy the website, grant a license, recover production source, or establish release acceptance.**
