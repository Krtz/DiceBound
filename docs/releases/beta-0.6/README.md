# Beta 0.6 release record

This directory preserves durable records for the recovered **Beta 0.6 — Gear & Guardian Loot Rebuild** baseline. These files describe the actually validated Beta 0.6 package and are historical evidence; current-development migrations must not rewrite them as if they existed in the release.

- `GEAR_LOOT_AUDIT.md` — exact loot/rarity/effect design audit from the release handoff.
- `BUILD_AUDIT.md` / `BUILD_AUDIT.json` — human- and machine-readable records of the recovered 32/32 build audit.
- `CHECKSUMS.txt` — published SHA-256 checksums for the original release artifacts.
- `BROWSER_BUILD_INFO.json` — exact `runtime/build-info.json` from the recovered Beta 0.6 browser payload before later Git development changed the runtime tree.
- `BROWSER_BUILD_MANIFEST.json` — exact `runtime/build-manifest.json` from that recovered payload, including its original paths and hashes.

Player-facing patch history is preserved in `../../../runtime/PATCH_NOTES.md` and the Git-era summary in `../../../CHANGELOG.md`.

The original already-built EXE and all-in-one release bundle did not survive the ChatGPT handoff as downloadable files. The validated runtime and wrapper source did survive and became the Git baseline. The repository's current `runtime/build-info.json` / `build-manifest.json` may therefore differ from these archived files as Unreleased development proceeds.
