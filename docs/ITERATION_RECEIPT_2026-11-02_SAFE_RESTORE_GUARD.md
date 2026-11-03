# PromiseStep SDK — safe Restore guard and source-consistent release status

Checkpoint: 2026-11-02 Pacific / 2026-11-03 UTC. This is a NEW **source-built and locally tested** candidate, not a production release.

## Implemented here
- Browser example's **Restore** button now validates saved archive against *all* current events using `assessRecordBookImport` before assigning a restored book. Restoring an older, diverging, or otherwise history-losing archive fails with `RECONCILIATION_REQUIRED` and retains the active original and corrections.
- Existing file-import guards remain; same-chain extension, integrity checks, same-file retry, and explicit interrupt/restore have not been removed.
- Desktop and iPhone-sized Chromium DOM simulation was extended with an actual older-export Restore button test, not just file import.
- Added a source-level site regression check and corrected the generated release-status page to acknowledge the now-verified public `TodaysStep/promisestep` repository. It does **not** misrepresent the partial source branch as complete preview recovery, licensed open source, or npm publication.
- Source of generated page is `developer/build.py`; derived `public-docs/status.html` and `dist/docs/status.html` are rebuilt from it.

## Verification receipts (local only)
- SDK: 130/130 Node checks PASS, from `npm run test:sdk`.
- Website + release: 24/24 Node checks PASS, from `npm run test`.
- Strict TypeScript: `npm run test:types` PASS.
- Python public-reference client: 10/10 checks PASS.
- Java 21 public-reference client: 13/13 checks PASS using the standalone loopback test.
- Browser: desktop + 440x956 CSS pixel iPhone-like Chromium passes original/correction/refusal/scoped observation, old saved Restore refusal, file-import conflict, safe extension, tamper refusal, retry, export and interruption/return. Uses a **test-only WebCrypto SHA-256 bridge** because this sandbox forbids browser network origins. It is **not Safari or real production browser interaction**.
- A clean npm `--offline --ignore-scripts` installation of the actual built tarball passes original -> correction -> restore -> refusal -> evidence -> pause/return; all four download artifact digests checked. Not an HTTPS download proof.
- Rebuilt standalone Pages Worker: 3,654,063 bytes; SHA-256 `756bd4433df72d7e496d123cec42e6cbf4ac3f95b9495b714e0dcda0da4c24bb`. The build includes 69 public static files, 68 JSON read-only reference resources, and does **not** expose source, private records or writable APIs.
- Source/provenance: recovered original 231-file production-source ZIP from **actual Library visibility and byte-level materialization**. Its SHA-256 equals `7d1409571edf0d2381572a3312fae5cd0fa30b7a01d7e53318a9dc041483d60b`. Confirmed the 16 photographs, 13 SVGs and 3 instrument images (32 on-disk public image files) match this original byte-for-byte. Original share Worker and public iMessage previews untouched.

## Provider state and guard (read-only)
- Account `517938c6ca3fc177d65148886337f2b3`, existing Pages project `promisestep`, production branch `main`.
- Production deployment `f95c5b61-45e4-45cb-bf2a-302c2a94da83`, status `success`; earlier verified rollback baseline `4efe4099-74bc-4a42-84c8-eaef5e6190b8` retained.
- Newer hosted preview `61a11ae8-0999-4e55-9a3b-95e2ebcc5ef4`, status `success`, with independent `RECOVERY_CONFLICT` safeguard, is NOT in this candidate's source. This candidate has been reconstructed from an older archived branch and is **not** a verified export of preview.2.
- Cloudflare project lists the two Pages script names, but the ordinary Worker script download returns `404 Worker does not exist on your account`; Pages deployment metadata/logs expose no executable preview source. No new paid browser use was incurred.
- **Do not deploy this source over production or preview.2 without first recovering and reconciling the exact newer preview source.** A successful local build cannot authorize erasing later approved behavior.

## Open production and institutional gates
- Exact newer preview.2 source recovery and full new-versus-old behavior parity.
- Real hosted browser/edit/correction/export/restore, production HTTPS package download/clean install, physical iPhone Safari.
- Actual owner-service grant/effect enforcement, language-binding parity, source-license disclosure and founder-selected redistribution grant. Public package remains `UNLICENSED` and no npm/PyPI registry release is claimed.
- Independent Heard steward commissioning and genuine Constitutional Review consensus (charter reads are not commissions). HSG source standing I–V ratified, later volumes only planned.
- No formal Journey Registry / Promise-to-Step / Reality Register / Experience Stewardship / Company Operations updates before live founder review and explicit approval.
- No new environment, DNS, existing sharing Worker, paid services, third-party contact, Lovable writes, private publication, GitHub Actions or Step002 re-execution occurred.

**Status separation:** designed/source-built=yes; locally tested=yes; packaged=yes; deployed=no; production-verified=no; constitutionally reviewed=no.
