# DiceBound

A weird little game I make for fun that turned into a much bigger project.

DiceBound is a single-player RPG/board-game hybrid built around dice movement, escalating road guardians, classes, companions, gear, powerups, Legacy progression, Nightmare/Hell modes, and increasingly ridiculous build combinations.

## Current baseline

**Beta 0.6 — Gear & Guardian Loot Rebuild**

Beta 0.6 is the first complete Git-tracked baseline of the recovered project. The authoritative recovered source is now committed to this repository.

Validated Beta 0.6 identity:

- Version: `0.6`
- Channel: `Beta`
- Save schema: `2`
- Build ID: `dicebound-0.6-49974c0d6ca04ded`
- Runtime content hash: `49974c0d6ca04ded9671e5992bdf85851b84ad8612803f8b506a8a4cc84df3c6`
- Original EXE SHA-256: `85764d2de61b19a2ff0d4bb983d3456f3c77784a608cd8bd27ee0fc995f13a0e`
- Recovered release audit: **32 / 32 checks passed**

## Repository layout

```text
runtime/                 Authoritative shipped browser/game runtime
wrapper-source/          Native Windows WebView2 wrapper/build source
docs/                    Architecture, development, roadmap and release records
.github/                  Issue and pull-request templates
```

The game runtime reports 135 assets / 148 content files in its content-derived Beta 0.6 build metadata.

## Beta 0.6 highlights

- Rebuilt guardian loot around one weighted Artifact-table roll, allowing at most one Artifact per guardian.
- Artifact weights: 30% weapon / 20% boots / 16% legs / 14% ring / 9% hat / 7% amulet / 4% offhand.
- Moved Axel's Coffee Mug, Kratz Headphones and The Jean Jacket Lost at Kelly's from Legendary to Mythical.
- Added generated Legendary gear at 151–210 item points plus one of 20 build-changing Legendary Effects.
- Memory Cache odds: 1/450 Normal, 1/300 Nightmare, 1/200 Hell.
- Miniboss ordinary-equipment chance: 85% Normal / 92% Nightmare / 100% Hell.
- Fixed Board 6 miniboss reward to 10 pet cookies.
- Final Price and Philosopher's Stone signature drop chance: 5% Normal / 10% Nightmare / 15% Hell.

## Building

The exact `runtime/` payload is the Beta 0.6 source of truth.

For the native Windows wrapper, copy `runtime/` to:

```text
wrapper-source/dist/browser/
```

Then run:

```text
python wrapper-source/tools/build_launcher.py
```

The recovered Beta 0.6 source package does not vendor Microsoft's signed x64 `WebView2Loader.dll`; the original sandbox build used the wrapper compatibility fallback. A future production/CI release environment should use the official signed loader.

## Development rules

- `main` is the known-good baseline.
- Use short-lived branches / pull requests for non-trivial changes.
- Git commits/tags are the source identity; EXEs and release ZIPs are derived artifacts.
- Do not commit saves, runtime caches, local logs or generated release packages.
- Preserve save compatibility unless a change explicitly includes a migration.
- Real-player balance evidence takes priority over harness estimates when the two disagree.
- Every release should preserve patch notes, validation evidence, checksums and enough provenance to rebuild it.

## Project docs

- [Architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [GitHub Project layout](docs/GITHUB_PROJECT_SETUP.md)
- [Release process](docs/RELEASE_PROCESS.md)
- [Beta 0.6 recovery baseline](docs/RECOVERY_BASELINE.md)
- [Beta 0.6 gear & loot audit](docs/releases/beta-0.6/GEAR_LOOT_AUDIT.md)
- [Beta 0.6 build audit](docs/releases/beta-0.6/BUILD_AUDIT.md)
- [Beta 0.6 checksums](docs/releases/beta-0.6/CHECKSUMS.txt)
- [Changelog](CHANGELOG.md)

GitHub issues are the actionable backlog. Broad future direction lives in the roadmap until it becomes concrete enough to implement or playtest.
