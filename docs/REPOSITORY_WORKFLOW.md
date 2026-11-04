# PromiseStep — how the existing repository should work

The repository `TodaysStep/promisestep` is the eventual reviewed home of the authoring source, documentation and reproducible release process—not a replacement for `promisestep.com` or the existing Cloudflare Pages project.

## Current boundary

Before this documentation proposal, `main` held a README only and `sdk-public-source-candidate-20261102` contained an older partial 44-entry tree. Neither is the current 489-member source nor the missing complete preview.2 producing workspace. **Do not merge a partial branch as if it were production.**

This review branch contains **only public-safe project documentation and a conservative staging guard**. It does not import SDK source code, private research, source ZIPs, internal receipts, photography or generated `dist/` output. That is intentional until provenance, publication rights and source completeness are reconciled.

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

## Public-source staging boundary

The independently verified 489-member local source contains **206 evidence files, 81 generated `dist/` files, 11 immutable `preserved-public/` files, and 32 original artworks**. This is **not** a 488-file public GitHub publication list. Its local `.gitignore` excluded ordinary caches and `.env` files but did not exclude these founder-controlled evidence or publication categories.

The review branch's root `.gitignore` now conservatively excludes evidence, generated output, historical bundles, private recovery files, archival packages and original art **from automatic staging**. This is a preventive staging guard, not a privacy or access-control system. Already tracked files and explicit `git add -f` can bypass it. It does not establish source completeness, authoring provenance or a license.

When the authentic preview.2 producing source and publication rights are established, review proposed source files **one at a time by path and digest**. Include authored code, tests and public editorial documents only after comparing them with the current verified source and their actual owners. Review historical downloads and artwork separately for byte preservation and publication scope; never silently repackage or relicense them. Keep source/recovery evidence out of this public repo. Do not bulk-extract and commit the entire recovery ZIP.

A source-review commit should have a readable changed-file inventory, clear purpose, byte/source hashes for relevant published artifacts, focused tests and rollback. An ignored path being force-added is a decision requiring specific review, not a shortcut.

## Practical workflow (no GitHub Actions)

Prepare a small review branch from the current repository HEAD. Compare every proposed path against the latest verified source, the existing live/preview version, and affected route owners. Perform local targeted tests; retain binary/digest evidence privately. Open a draft PR with purpose, source hash, changed surfaces, test results, limits and rollback. Inspect before merge; do not use automatic deployment. After the actual source gate is satisfied, release through the current Pages project only and verify the live journey.

Use **prototype first** for visual decisions. Do not formalize Journey Registry, Promise-to-Step or Reality Register entries until the founder observes a working production result and explicitly approves.

## Editorial goal

A visitor should first understand the promise, then meet the three-part method, then run one genuine SDK journey, then find the researched APIs and learning resources. A contributor should be able to trace each claim to a source and test without browsing hundreds of historical logs.

This document sets a workflow, not new permissions.
