# PromiseStep — how the existing repository should work

The repository `TodaysStep/promisestep` is the eventual reviewed home of the authoring source, documentation and reproducible release process—not a replacement for `promisestep.com` or the existing Cloudflare Pages project.

## Current boundary

Before this documentation proposal, `main` held a README only and `sdk-public-source-candidate-20261102` contained an older partial 44-entry tree. Neither is the current 488-member source nor the missing complete preview.2 producing workspace. **Do not merge a partial branch as if it were production.**

This review branch contains **only public-safe project documentation**. It does not import SDK source code, private research, source ZIPs, internal receipts, photography or generated `dist/` output. That is intentional until provenance, publication rights and source completeness are reconciled.

## Proposed repository neighborhoods (future, after verified source audit)

- `src/`: authored public site language, styles and interactions.
- `developer/`: developer portal, API handler, source builder.
- `sdk/js/`, `sdk/python/`, `sdk/java/`: actual packages, language-specific limits, offline examples and tests.
- `art/` and `assets/`: original owned art, pinned manifest, usage/alt-text documentation.
- `tests/`: journey, API boundary, release preservation, mobile and recovery checks.
- `scripts/`: deterministic builder, source guard and public-only manifest validation.
- `docs/`: researched product explanation, system boundaries, safety and release evidence.
- `dist/`: build artifact only; never substitute it for authored source.
- `preserved-public/`: immutable historical release downloads with checksum manifest.

Only include material whose rights, provenance, privacy and current standing have actually been verified. Keep internal review evidence in protected storage, not in a public Git tree.

## Practical workflow (no GitHub Actions)

Prepare a small review branch from the current repository HEAD. Compare every proposed path against the latest verified source, the existing live/preview version, and affected route owners. Perform local targeted tests; retain binary/digest evidence privately. Open a draft PR with purpose, source hash, changed surfaces, test results, limits and rollback. Inspect before merge; do not use automatic deployment. After the actual source gate is satisfied, release through the current Pages project only and verify the live journey.

Use **prototype first** for visual decisions. Do not formalize Journey Registry, Promise-to-Step or Reality Register entries until the founder observes a working production result and explicitly approves.

## Editorial goal

A visitor should first understand the promise, then meet the three-part method, then run one genuine SDK journey, then find the researched APIs and learning resources. A contributor should be able to trace each claim to a source and test without browsing hundreds of historical logs.

This document sets a workflow, not new permissions.
