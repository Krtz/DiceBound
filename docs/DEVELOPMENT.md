# DiceBound Development Guide

## Branching

- `main` is the current known-good development baseline.
- Use short-lived branches for features, balance work, fixes and release engineering.
- Suggested names: `feature/<short-name>`, `fix/<short-name>`, `balance/<short-name>`, `art/<short-name>`.
- Prefer pull requests for non-trivial changes so the reason, test evidence and player impact survive outside chat history.

## Before changing code

1. Read the relevant open issue and current roadmap entry.
2. Confirm which file actually owns the live behavior; the recovered project contains historical/fallback paths and duplicated presentation assets.
3. Preserve save compatibility unless the change explicitly includes a migration.
4. For balance work, record the current values before changing them.

## Testing philosophy

DiceBound has both deterministic/harness testing and real career playtesting. They answer different questions.

- Static/regression checks are useful for catching broken paths, missing definitions, invalid ranges and deterministic regressions.
- Real-player careers are the authority for pacing, difficulty, unlock feel and whether builds are actually fun.
- Do not silently replace real-play evidence with harness estimates when they conflict.

For gameplay changes, document:

- what was tested
- class/mode/board where relevant
- expected behavior
- observed behavior
- whether the evidence came from deterministic tests, browser/native smoke tests or real play

## Versioning

Current baseline: Beta 0.6.

Use patch releases for fixes/tuning that do not redefine a major system. Use the next minor Beta version when introducing a substantial new system or redesign.

Every shipped release should update:

- `CHANGELOG.md`
- runtime patch notes when player-facing
- affected audits/docs
- build/version metadata
- Git tag/release provenance

## Source rules

Commit:

- `runtime/`
- `wrapper-source/`
- source art/assets required by the shipped game
- docs, audits and project metadata

Do not commit:

- built EXEs
- generated release ZIPs
- local runtime caches
- saves/backups
- temporary extraction/build directories
- machine-specific logs

## Balance changes

Avoid broad value sweeps without a stated goal. For loot, powerups, classes, boards and unlock pacing, prefer a small number of explicit hypotheses that can be playtested.

When possible, keep probabilities/tables centralized so future tuning changes values rather than requiring another system rewrite.

## Bug fixes

A useful bug issue/PR records:

- reproduction steps
- current result
- expected result
- root cause if known
- affected save/runtime state
- regression risk
- validation performed

Game-breaking, save-corrupting or run-blocking bugs should be treated as P0/P1 work even if the visual impact looks small.

## Art/UI changes

Keep source filenames stable when practical. Machine-dependent emoji placeholders should gradually be replaced by repository-owned DiceBound assets. Test small marker/icon art at the actual in-game size, not only at source resolution.

## Release discipline

The Git commit/tag is the source identity. Release binaries are derived artifacts. See `docs/RELEASE_PROCESS.md` for the intended release flow.
