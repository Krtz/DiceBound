# DiceBound Development Guide

This guide describes the current day-to-day development contract. For the exact released checkpoint, read **#404**; for executable priority, read **#130**. Live `main` and newer issue/PR evidence always win over stale planning prose.

## Branching

- `main` is the reconciled known-good released baseline after the launcher-manifest commit.
- Start significant work from that reconciled `main`, not from an old feature branch or the pre-reconciliation release-source commit.
- Use short-lived branches for fixes/features/balance/art/docs.
- Useful names include `fix/<version>-<slice>`, `feature/<version>-<slice>`, `balance/<version>-<slice>` and `docs/<topic>`.
- Prefer pull requests for non-trivial changes so intent, exact validation and player impact survive outside chat history.
- Do not stack new work on a branch whose release state is uncertain. First verify release + `distribution/latest.json` + current `main`.

## Before changing code

1. Read #404 and the relevant issue(s).
2. Inspect live `main`, current version/build metadata, open PRs and recent issue comments.
3. Identify the **coherent responsibility slice** selected by the bug/feature.
4. Find the current canonical public owner/focused internal owner for that slice.
5. Characterize released behavior that should remain: values, RNG order/count, action order, targets, save/checkpoint state and presentation semantics as relevant.
6. Inspect the whole touched slice for stale wrappers, duplicate ownership or monolith sediment before implementing the change.

Do not assume an old chat, old issue body or historical helper still owns live behavior.

## Maintenance rule: feature/bug chooses the slice

DiceBound is no longer in a broad architecture-extraction phase.

> **A real bug or feature chooses the coherent responsibility slice. Clean that touched slice until ownership is obvious, then implement the requested behavior there.**

That means:

- do more than a one-line patch when the reported bug exposes duplicated/misplaced ownership in the same responsibility;
- remove touched obsolete/shadow paths rather than leaving two live implementations;
- add anti-return coverage when ownership is drained;
- do **not** launch unrelated monolith archaeology just because nearby code looks old.

Current architecture remains 12 public subsystem families plus the explicit Composition / Bootstrap / Tooling root in `runtime/js/dicebound.js`.

## Testing philosophy

DiceBound uses both deterministic/regression validation and real career playtesting. They answer different questions.

Deterministic/static/browser/native checks are authoritative for contracts such as:

- exact RNG draw order/count/final state;
- action/event sequencing;
- stable IDs/registries;
- target/rounding semantics;
- save/checkpoint invariants;
- owner/facade routing and anti-shadow rules;
- browser/Edge/native presentation behavior that can be automated.

Real-player careers are authoritative for:

- pacing and difficulty feel;
- unlock timing;
- whether an action/build is actually worth using;
- readability and moment-to-moment feel;
- whether simulated balance predictions match real play.

Do not silently replace repeated real-play evidence with harness estimates when they conflict. Reproduce the mechanics, then explain the difference.

For gameplay changes, record:

- reproduction/current result;
- expected or approved change;
- responsibility owner/slice;
- what behavior is intentionally frozen;
- deterministic tests run;
- Edge/browser/native evidence;
- real-play evidence where feel/balance is involved.

## Versioning

New implementation releases use one **unused four-component** identity:

`MAJOR.MINOR.PATCH.REVISION`

Example: `0.6.7.7`.

Historical three-component versions remain readable, but new runtime/release work must not reuse an existing version.

Use the repository tools rather than editing scattered strings by hand:

```text
python tools/set_project_version.py --version <version> --channel Beta
python tools/refresh_runtime_manifest.py --version <version> --channel Beta --development-state Unreleased
python tools/validate_pr_version.py --base-ref origin/main
```

Docs/verified-metadata/audit-only changes that the version gate explicitly exempts do not need a fake runtime version bump merely to satisfy process. If a change affects runtime, wrapper, installer, workflow or release behavior, treat the version gate as strict.

## Persistence / save policy

Do **not** use the old blanket rule “preserve every Beta save forever.”

Current policy:

- historical Beta saves are disposable unless Axel explicitly requests compatibility for the active change;
- current save/checkpoint/backup/resume semantics are still protected behavior and must not drift accidentally;
- when adding a current-schema field, normalize missing current-state values where appropriate rather than relying on undefined behavior;
- do not add speculative migrations solely to recover old Beta history unless requested.

## Source rules

Commit source and authoritative metadata:

- `runtime/`
- `wrapper-source/`
- `installer/`
- source art/assets required by the shipped game
- `tools/`
- docs/audits/project metadata
- workflow source when deliberately changing CI/release behavior

Do not commit generated/local outputs such as:

- built EXEs
- generated release ZIPs
- local runtime caches
- saves/backups
- temporary extraction/materializer directories
- machine-specific logs

Temporary CI/materializer helpers used to construct an exact tested commit must be removed from the final PR unless they are themselves an approved permanent tool.

## Gameplay / balance changes

Avoid broad value sweeps without a reproduced problem and stated goal.

For loot, Powerups, classes, enemies, Boards and unlock pacing:

1. capture the current composed/effective behavior;
2. identify the canonical formula/policy owner;
3. test representative low/mid/high cases or boundaries;
4. use seeded distributions when probability behavior matters;
5. make the smallest coherent approved tuning change;
6. derive player-facing descriptions from the same authority where possible;
7. playtest when the question is feel rather than only correctness.

Preserve RNG order/count unless the approved design change genuinely requires a different random process; document that deliberate change when it does.

## Bug fixes

A strong bug issue/PR records:

- reproduction steps;
- released/current result;
- intended result;
- root cause when known;
- complete touched responsibility slice;
- affected save/runtime state;
- regression risk;
- characterization tests protecting unrelated behavior;
- focused + full validation evidence.

Run-blocking, save-corrupting or major correctness bugs take priority over lower-value polish even if their visual symptom is small.

## Art / UI changes

Read `docs/DESIGN_RULES.md` first.

- Use semantic repository-owned asset paths/IDs.
- Do not put new art into legacy compatibility mirrors.
- Test artwork at the actual in-game size/context.
- Presentation owners should consume semantic game state rather than infer mechanics from display strings.
- Keep gameplay/RNG out of pure presentation work.
- Touch/mobile and reduced-motion behavior should be considered when motion/hover/input semantics change.

## Architecture / ownership changes

A responsibility is drained only when:

1. the authoritative implementation lives in the correct owner;
2. ordinary callers use that owner/facade or one justified composition adapter;
3. old live monolith/wrapper/shadow implementations are removed;
4. tests prevent the old ownership from returning.

A facade is not required to be one file. Focused internals are encouraged when they form real responsibilities.

`docs/HISTORICAL_LAYER_CENSUS.md` is diagnostic evidence, not an automatic refactor queue.

## Release discipline

For a significant runtime-bearing change:

1. branch from reconciled released `main`;
2. characterize/freeze released behavior;
3. implement/clean the coherent responsibility slice;
4. run focused + repository validation;
5. materialize the exact tested source commit if CI materialization is required;
6. stamp one unused four-component Beta version;
7. remove temporary materializer helpers;
8. open a PR;
9. require official PR workflow success, including Edge/browser and native WebView2 validation;
10. squash-merge;
11. require protected-main release publication;
12. verify the GitHub Release asset, checksum/bytes, `distribution/latest.json`, and the manifest reconciliation commit on `main`;
13. only then call the version shipped and refresh #404/#130/#209 where needed.

A red protected-main run must be investigated at the failed step: GitHub infrastructure can fail after the game/build has already passed. Do not label a release broken until the actual failure is understood and final public/reconciled state is verified.

See `docs/RELEASE_PROCESS.md` for the exact CI/publication flow.
