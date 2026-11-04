# PromiseStep — technical architecture and source map

The project already has a working source-built candidate and an established Cloudflare Pages deployment. **Do not recreate the project, migrate the domain, replace route owners, or use GitHub Actions.** The source tree described below is in the founder's independently verified source archive; the present GitHub main branch is not yet a complete copy of it.

## Existing authored source layout

```text
promisestep/
  src/                    Public editorial source, content, styles, interactions
  art/                    Original text-free SVG art and visual references
  assets/scenes/          Sixteen original photographic scenes
  instruments/            Three distinct instrument images
  developer/              Developer portal, local playground, API handler, builder
  sdk/js/                 Local JS/TypeScript record core and examples
  sdk/python/             Reconciled offline Python local core and reference client
  sdk/java/               Scoped Java public-reference client
  scripts/                Deterministic release/Worker build & safe restore
  tests/                  Journey, boundary, packaging, layout and recovery tests
  docs/                   Authored technical source and historical evidence
  preserved-public/       Pinned immutable published preview.1 downloads
  dist/                   Built output, not the authoring source
```

### Separation of responsibilities

**Editorial experience.** Public pages and the existing source-built navigation carry the method, the approved visual work, researched resources and learning paths. Site builders should change authored source, not patch generated `dist/` HTML without a corresponding source change.

**Developer experience.** The SDK is local-first: an original is retained, corrections append, boundaries return scoped results, and compact canonical archives allow return. Whole-book assessment and protected Clear prevent older/conflicting content from silently replacing more recent work. Python archive/interchange support, correction-reason continuity and the original `RECOVERY_CONFLICT` refusal code were selectively reconciled from authentic preview.2 public bytes; this is not a recovery of preview.2's full authoring tree.

**Public reference API.** The `/api/v1/` root is exact and **read-only**. Keep method restrictions, bounded reads/timeouts and rejection of duplicate JSON. Do not treat a locally constructed role or grant as authority to make an external service perform an effect.

**Build and release.** The authored builder produces allowed public assets and reference JSON; the compiled Pages Worker serves the allowlist. A source archive and a compiled Worker are distinct artifacts. The existing publishing/share preview Worker has its own owner and remains untouched.

## What may be pushed to public GitHub

Publish only files with confirmed public scope and rights. Verify all files against an exact source hash and inventory. Keep confidential Nurture records, legal/household records, personal data, secrets, private research packs, internal stewardship records and unreviewed raw evidence outside the public tree. Original artwork should not be moved, regenerated or relicensed by a repository tidy-up.

A public repository is **not** a software license. Package status remains `UNLICENSED`; do not infer redistribution rights from a downloadable ZIP or the presence of code.

## Reproducibility without CI

The preserved local source documents these commands (execute from the verified source, without GitHub Actions):

```sh
npm run build
npm run test:sdk
npm test
npm run test:types
python3 tests/package_journey.py
```

Run mobile and browser checks proportionately. Compare packaged downloads and checksums, the 81 public static assets and 68 read-only references, the 11 immutable preview.1 artifacts and the 32 original artworks before any release. No self-declared test count establishes hosted browser or independent review.

## Release path

**Before deployment:** recover and authenticate preview.2's complete producing source → reconcile every accepted later change with the verified 489-member source → rebuild and check preserved assets/releases → verify actual hosted HTTPS developer journeys and owner boundaries → inspect the existing Pages HEAD, route ownership and rollback. Do not substitute public preview.2 download fragments for full authoring-source custody.

**Authorized production change:** deploy the smallest reversible change to the existing `promisestep` Pages project; do not use GitHub Actions, create a second environment or silently promote the partial GitHub branch.

**After deployment:** verify live production behavior and HTTPS package bytes, perform physical Safari and applicable service-effect tests, obtain genuine independent Heard/Constitutional review and founder acceptance, then reconcile formal registers **only after** explicit founder approval. A local candidate, a documentation PR or provider success status is not completion.
