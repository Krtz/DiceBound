# DiceBound Release Process

This is the intended Git-era release flow. Beta 0.6 predates the finished CI setup and is the recovered baseline.

## 1. Freeze scope

Move the concrete release issues into the current Target Version / Next Patch scope. Defer unrelated discoveries unless they are regressions or release blockers.

## 2. Stamp and validate version identity

Version and channel are explicit release inputs. Do not edit scattered runtime/native strings by hand:

```text
python tools/set_project_version.py --version 0.6.1 --channel Beta
python tools/refresh_runtime_manifest.py --version 0.6.1 --channel Beta --development-state Unreleased
python tools/validate_version_identity.py --version 0.6.1 --channel Beta
```

The stamper updates the project identity, central `runtime/js/version.js`, static HTML fallback identity and native Go wrapper identity. Browser runtime consumers read `window.DiceboundVersion`; adding a new consumer requires declaring `version` in `runtime/js/module-manifest.json`.

The validator reconciles project config, runtime module ownership/load order, visible HTML identity, content-derived build metadata, native title/log/URL markers and the matching `.release/<tag>` spec/notes. Its mutation suite proves stale central/native/module/distribution values fail closed:

```text
python tools/test_version_identity_validator.py
node tools/test_version_identity.js
```

Player-facing changelog and patch-note prose remains authored content, but must mention the release identity represented by the release spec.

## 3. Validate source

Run all available static/deterministic checks. A release should fail closed when required source markers, manifests or expected content are missing.

Do not claim a visual/native/browser test succeeded unless it was actually executed in an environment capable of running it.

## 4. Build browser payload

The shipped browser/runtime payload must match the authoritative `runtime/` tree for that release.

## 5. Build native Windows wrapper

Copy the release runtime to:

```text
wrapper-source/dist/browser/
```

Then run:

```text
python wrapper-source/tools/build_launcher.py
```

Production/CI should use Microsoft's official signed x64 `WebView2Loader.dll` rather than relying on the compatibility fallback used by the recovered Beta 0.6 sandbox build.

## 6. Smoke test

At minimum test:

- launch/startup
- save load/write
- campsite and class selection
- start a run
- movement/board rendering
- combat actions
- powerup selection
- gear/equipment UI
- native save/export/options actions when testing the EXE

For balance/system releases, also exercise the changed mechanics directly rather than relying on startup smoke tests.

## 7. Record provenance

For each release preserve:

- Git tag
- source commit SHA
- build ID/content hash
- save schema
- build audit result
- SHA-256 checksums for published artifacts
- known test-environment limitations

## 8. Publish artifacts

Use GitHub Releases for generated distribution artifacts such as:

- Windows EXE
- browser ZIP
- source/recovery bundle if desired
- checksums
- release notes

Do not commit generated release binaries to `main`.

## 9. Close the loop

After publishing:

- generate `distribution/latest.json` from `wrapper-source/release/release-metadata.json`, then reconcile both before committing:

```text
python tools/write_distribution_manifest.py --release-metadata wrapper-source/release/release-metadata.json --output distribution/latest.json --repository Krtz/DiceBound
python tools/validate_version_identity.py --version 0.6.1 --channel Beta --release-metadata wrapper-source/release/release-metadata.json --distribution distribution/latest.json
```

- update `CHANGELOG.md`
- close completed issues
- move playtest-dependent work to Needs Playtest rather than declaring it finished prematurely
- create follow-up issues for known debt/tuning instead of burying it in release notes

## Beta 0.6 recovery reference

The recovered Beta 0.6 build reports 32/32 build-audit checks passing. Its original EXE checksum is recorded even though the already-built EXE itself did not survive the conversation handoff. The source/runtime did survive and is now the repository baseline.
