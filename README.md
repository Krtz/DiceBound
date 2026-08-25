# DiceBound

A weird little game I make for fun that turned into a much bigger project.

DiceBound is a single-player RPG/board-game hybrid built around dice movement, escalating road guardians, classes, companions, gear, powerups, Legacy progression, Nightmare/Hell modes, and increasingly ridiculous build combinations.

## Start here

**Want to play/build the game on Windows?** Read [HOW TO INSTALL THE GAME.md](HOW%20TO%20INSTALL%20THE%20GAME.md). It is written for friends/testers who just have the GitHub link and want to build the current game without understanding the development setup.

**Fresh ChatGPT/Codex/project handover?** Start with [issue #84 — DiceBound project handover and new-chat catch-up protocol](https://github.com/Krtz/DiceBound/issues/84), then verify everything against current `main`, recent commits/PRs, and current open issues. GitHub is the source of truth.

## Release baseline and current development

**Current source identity:** see `wrapper-source/config/project.json`; every merged implementation PR advances it to a unique four-component version.

**Current public launcher/distribution:** see `distribution/latest.json`. As of 2026-08-25 it points at the verified **Beta 0.6.3.12** prerelease (`beta-0.6.3.12`). Treat the manifest itself as authoritative if this paragraph later ages.

Every implementation PR receives one unused `MAJOR.MINOR.PATCH.REVISION` identity. A source PR may advance development beyond the currently published launcher build; `distribution/latest.json` only advances after the exact release artifact has been built, verified and published.

**Recovered historical release baseline: Beta 0.6 — Gear & Guardian Loot Rebuild**

Beta 0.6 is the first complete Git-tracked baseline of the recovered project. Its exact historical release records, hashes and audits live under `docs/releases/beta-0.6/` and are not rewritten when current development changes the source tree.

Validated Beta 0.6 identity:

- Version: `0.6`
- Channel: `Beta`
- Save schema: `2`
- Build ID: `dicebound-0.6-49974c0d6ca04ded`
- Runtime content hash: `49974c0d6ca04ded9671e5992bdf85851b84ad8612803f8b506a8a4cc84df3c6`
- Original EXE SHA-256: `85764d2de61b19a2ff0d4bb983d3456f3c77784a608cd8bd27ee0fc995f13a0e`
- Recovered release audit: **32 / 32 checks passed**

Current `main` may contain development/documentation work newer than the published launcher build. Run `tools/refresh_runtime_manifest.py` from a complete checkout before packaging to calculate current content-derived hashes/counts; never infer a published release solely from a source commit.

## Repository layout

```text
runtime/                 Current authoritative browser/game runtime
  assets/                Granular semantic art/audio architecture (see assets/README.md)
wrapper-source/          Native Windows WebView2 wrapper/build source
installer/               Lightweight GitHub-backed installer/launcher source
tools/                   Repository/runtime validation and build helpers
docs/                    Architecture, development, roadmap and release records
.github/                  Issue and pull-request templates
```

### Runtime asset source of truth

Current artwork belongs under semantic folders such as:

```text
runtime/assets/characters/
runtime/assets/enemies/
runtime/assets/equipment/
runtime/assets/powerups/
runtime/assets/camp/
runtime/assets/board/
runtime/assets/combat/
runtime/assets/ui/
runtime/assets/installer/
runtime/assets/audio/
```

`runtime/js/assets.js` owns current runtime asset mappings. `runtime/assets/ASSET_INVENTORY.json` records implemented art, placeholder homes and temporary compatibility mirrors. Empty/future categories are deliberately tracked with README files so new art always has an obvious destination.

Because the recovered Beta 0.6 gameplay bundle still contains some historical fallback path literals, a small number of old folders remain as **read-only compatibility mirrors**. They exist solely so every old pointer still resolves; do not add new artwork to them. See `runtime/assets/README.md` and `docs/ASSET_ARCHITECTURE_MIGRATION.md`.

## Beta 0.6 highlights

- Rebuilt guardian loot around one weighted Artifact-table roll, allowing at most one Artifact per guardian.
- Original Beta 0.6 Artifact weights were 30% weapon / 20% boots / 16% legs / 14% ring / 9% hat / 7% amulet / 4% offhand. Current-development balance changes are tracked separately and do not rewrite the historical release record.
- Moved Axel's Coffee Mug, Kratz Headphones and The Jean Jacket Lost at Kelly's from Legendary to Mythical.
- Added generated Legendary gear at 151–210 item points plus one of 20 build-changing Legendary Effects.
- Memory Cache odds: 1/450 Normal, 1/300 Nightmare, 1/200 Hell.
- Miniboss ordinary-equipment chance: 85% Normal / 92% Nightmare / 100% Hell.
- Fixed Board 6 miniboss reward to 10 pet cookies.
- Final Price and Philosopher's Stone signature drop chance: 5% Normal / 10% Nightmare / 15% Hell.

## Building

For a friend/tester self-build, use [HOW TO INSTALL THE GAME.md](HOW%20TO%20INSTALL%20THE%20GAME.md).

For a development checkout, first validate the runtime and materialize build metadata:

```text
python tools/validate_asset_architecture.py
python tools/refresh_runtime_manifest.py
python tools/validate_asset_architecture.py
```

For a local development wrapper, copy `runtime/` to:

```text
wrapper-source/dist/browser/
```

Then run:

```text
python wrapper-source/tools/build_launcher.py
```

For a production release, point `WEBVIEW2_LOADER_DLL` at the signed x64 loader from the pinned `Microsoft.Web.WebView2` SDK, set `WEBVIEW2_SDK_VERSION`, and run the root release command with the intended version/channel, for example:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build-DiceBoundRelease.ps1 -Version 0.6.3.12 -Channel Beta -PythonExecutable python -RequireSignedLoader
```

The root script stamps and validates release identity, stages the exact runtime tree, requires a valid Microsoft-signed loader, builds the native wrapper, and records the resulting SHA-256, byte size, and build ID. Current production/release validation uses the official loader path; future public Authenticode signing is tracked separately in issue #11.

## Development rules

- `main` is the known-good development baseline; tagged/release records preserve immutable shipped identities.
- Use short-lived branches / pull requests for non-trivial changes.
- Give every implementation PR one unused four-component DiceBound version and record it in the PR and issue evidence.
- Git commits/tags are source identity; EXEs and release ZIPs are derived artifacts.
- Do not commit saves, runtime caches, local logs or generated release packages.
- While DiceBound is in Beta, old saves may be broken deliberately unless a particular change explicitly requires compatibility/migration.
- Real-player balance evidence takes priority over harness estimates when the two disagree.
- Every release should preserve patch notes, validation evidence, checksums and enough provenance to rebuild it.
- New art goes into the semantic asset hierarchy, never into a legacy compatibility mirror.

## Project docs

- [How to install/build the game](HOW%20TO%20INSTALL%20THE%20GAME.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Asset architecture migration](docs/ASSET_ARCHITECTURE_MIGRATION.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [GitHub Project layout](docs/GITHUB_PROJECT_SETUP.md)
- [Release process](docs/RELEASE_PROCESS.md)
- [Beta 0.6 recovery baseline](docs/RECOVERY_BASELINE.md)
- [Beta 0.6 release record](docs/releases/beta-0.6/README.md)
- [Changelog](CHANGELOG.md)
- [Durable AI/new-chat handover — issue #84](https://github.com/Krtz/DiceBound/issues/84)

GitHub issues are the actionable backlog. Broad future direction lives in the roadmap until it becomes concrete enough to implement or playtest.
