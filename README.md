# DiceBound

A weird little game i make for fun, that turned into a bigger project.

DiceBound is a single-player RPG/board-game hybrid built around dice movement, escalating road guardians, classes, companions, gear, powerups, Legacy progression, Nightmare/Hell modes, and increasingly ridiculous build combinations.

## Current baseline

**Beta 0.6 — Gear & Guardian Loot Rebuild**

Beta 0.6 is the first Git-tracked baseline for the recovered project. The validated release source reports **32/32 build-audit checks passed**.

Known Beta 0.6 build identity:

- Version: `0.6`
- Channel: `Beta`
- Build ID: `dicebound-0.6-49974c0d6ca04ded`
- Original EXE SHA-256: `85764d2de61b19a2ff0d4bb983d3456f3c77784a608cd8bd27ee0fc995f13a0e`

## Beta 0.6 highlights

- Rebuilt guardian loot around a single weighted Artifact-table roll, allowing at most one Artifact per guardian.
- Artifact weights: 30% weapon / 20% boots / 16% legs / 14% ring / 9% hat / 7% amulet / 4% offhand.
- Moved Axel's Coffee Mug, Kratz Headphones and The Jean Jacket Lost at Kelly's from Legendary to Mythical.
- Added generated Legendary gear at 151–210 item points plus one of 20 build-changing Legendary Effects.
- Memory Cache odds: 1/450 Normal, 1/300 Nightmare, 1/200 Hell.
- Miniboss ordinary-equipment chance: 85% Normal / 92% Nightmare / 100% Hell.
- Fixed Board 6 miniboss reward to 10 pet cookies.
- Final Price and Philosopher's Stone signature drop chance: 5% Normal / 10% Nightmare / 15% Hell.

## Repository direction

The repository is intended to become the source of truth for DiceBound so release history, code, art, balance decisions and TODOs do not depend on a single ChatGPT conversation surviving forever.

Planned structure:

```text
runtime/                 Authoritative browser/game runtime
wrapper-source/          Native Windows WebView2 wrapper/build source
docs/                    Architecture, roadmap, audits and release notes
.github/                  Issue / pull-request templates and workflow helpers
```

Generated EXEs, release ZIPs, runtime cache and user saves should not be committed to `main`.

## Development policy

- `main` = known-good baseline.
- Feature/fix work should use short-lived branches and pull requests once the full recovered source has been imported.
- Real-player balance evidence takes priority over harness estimates when the two disagree.
- Every release should leave behind patch notes, a deterministic audit/checksum record and enough provenance to rebuild it.

See the open GitHub issues and `docs/ROADMAP.md` for the active backlog.
