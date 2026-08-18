# Beta 0.6 Recovery Baseline

This document records what was recovered from the Beta 0.6 release handoff so future work has an auditable starting point independent of chat history.

## Recovered release files

The following Beta 0.6 artifacts were recovered and their published checksums matched:

- `Dicebound_Beta_0_6_BROWSER.zip`
- `Dicebound_Beta_0_6_RUNTIME_SOURCE.zip`
- `Dicebound_Beta_0_6_PATCH_NOTES.md`
- `Dicebound_Beta_0_6_TODO.md`
- `Dicebound_Beta_0_6_GEAR_LOOT_AUDIT.md`
- `Dicebound_Beta_0_6_BUILD_AUDIT.json`

The convenience `RELEASE_BUNDLE.zip` itself failed to transfer from the previous ChatGPT conversation, and the already-built original EXE was not recovered as a downloadable file. The authoritative runtime/wrapper source did survive, so the release can be rebuilt.

## Published checksums

- EXE: `85764d2de61b19a2ff0d4bb983d3456f3c77784a608cd8bd27ee0fc995f13a0e`
- Browser ZIP: `95f17dfa137c5c376d054345aa2e1e97bc13f4d736f91fef2fd4a2e48dfb0c05`
- Runtime Source ZIP: `1cdf6ad425c1ab18bd2934f9c6e719ef0eaa826e22ab7884e9312e4cb2c401a9`
- Patch Notes: `bfcafcac14a2c3dcfa7cf476e7a47fc8c4a76cea10ca781c84b81dbee167ba4a`
- TODO: `fc74d5e73d5f9390c2c2454edb9b8d5758a4a2a2b7a6d563226168231c78b622`
- Gear/Loot Audit: `afc753d8faa633a7d1bb3dc8f86f345da8732c4a64a6419199f7cced1b249e9b`
- Build Audit: `77ecd775e0b3d12a8bb47919592665f61594dc12e4742460abcb516c674f71f8`
- Original Release Bundle: `e54c8078277cf94a4ae49273c69e58ba97f84eb72085478ac562f6e83e6de0ce`

## Build audit

The recovered build audit reports **32 / 32 checks passed**. It includes validation for:

- Beta 0.6 runtime/version markers
- Memory Cache implementation and odds
- Board 6 miniboss cookie correction
- Mythical migration
- generated gear budget ranges
- one-roll Artifact system and exact rate matrix
- guardian ordinary-equipment odds
- Final Price / Philosopher's Stone Hell rate
- all 20 Legendary Effects
- Echo Chamber attack-pipeline fix
- native wrapper/version metadata
- executable identity / SHA-256
- manifest version/build ID/hashes

The audit explicitly does **not** claim a successful headless visual/browser runtime test because Chromium in the build sandbox was enterprise-policy blocked from local/file/loopback pages.

## Git recovery completed

The complete recovered source package contained **160 files**: 149 under `runtime/`, 10 under `wrapper-source/`, plus the source-status note. The source was imported through 12 browser commits after GitHub Actions proved unavailable on the account during recovery.

The repository now contains the authoritative `runtime/` and `wrapper-source/` trees. Runtime metadata reports build ID `dicebound-0.6-49974c0d6ca04ded`, save schema 2 and content hash `49974c0d6ca04ded9671e5992bdf85851b84ad8612803f8b506a8a4cc84df3c6`.

## Source-of-truth rule

**Git `main` now supersedes the handoff ZIPs as the authoritative development baseline.** Future release artifacts should be generated from and tied to a specific Git commit/tag. Chat transcripts and recovery ZIPs are supporting historical context, not source control.
