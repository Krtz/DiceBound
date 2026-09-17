# DiceBound Release Process

This is the current Git-era validation/publication flow for DiceBound.

For exact current release provenance, use **#84** and `distribution/latest.json`. The workflow source `.github/workflows/dicebound-release.yml` is authoritative if this document ever disagrees with CI.

## Release model

Implementation releases use one unused four-component version:

`MAJOR.MINOR.PATCH.REVISION`

Historical three-component releases remain valid history, but new implementation work must not reuse an earlier version.

The normal path is:

```text
reconciled released main
  -> short-lived feature/fix branch
  -> exact validated/versioned PR head
  -> official PR workflow
  -> squash merge
  -> protected-main workflow
  -> GitHub prerelease + DiceBound.exe
  -> verified distribution/latest.json commit
  -> reconciled main
```

A release is not considered shipped merely because the PR merged. Publication, asset verification and launcher-manifest reconciliation must all complete.

## 1. Freeze the coherent responsibility slice

Before release work:

1. read the active issue(s) and #84/#130;
2. branch from **reconciled released `main`**;
3. characterize released behavior that should remain;
4. implement and clean the responsibility slice chosen by the bug/feature;
5. defer unrelated discoveries unless they are blockers/regressions.

Do not use release work as an excuse for unrelated architecture churn.

## 2. Select and stamp an unused version

Use the repository tools; do not edit scattered version strings manually.

```text
python tools/set_project_version.py --version <version> --channel Beta
python tools/refresh_runtime_manifest.py --version <version> --channel Beta --development-state Unreleased
python tools/validate_pr_version.py --base-ref origin/main
python tools/prepare_release.py
python tools/validate_version_identity.py --version <version> --channel Beta --release-spec wrapper-source/release/generated/release-spec.json --release-notes wrapper-source/release/generated/release-notes.md
```

The centralized identity covers project config, `runtime/js/version.js`, runtime/build metadata, native wrapper identity and generated release identity.

`tools/prepare_release.py` derives the tag/title/artifact label/release spec/release notes from committed Version/Channel. Do not maintain a second hand-written release identity.

Mutation/ownership validation includes:

```text
python tools/test_version_identity_validator.py
node tools/test_version_identity.js
```

The PR version gate deliberately exempts qualifying docs/verified-metadata/audit-only changes. Runtime/wrapper/installer/workflow/release-behavior changes remain strict and require the appropriate unique implementation version.

## 3. Validate the exact source

The official workflow runs on Windows and fails closed if committed source does not match regenerated identity/metadata.

It performs, among other checks:

- JavaScript syntax checks across runtime modules;
- all `tools/test_*.js` tests;
- all `tools/test_*.py` tests;
- runtime architecture validation;
- asset architecture validation;
- launcher asset validation;
- installer Go tests + `go vet`;
- browser/Edge tests invoked by the repository suite;
- version/release identity checks.

Do not weaken an oracle/anti-return/native/browser test merely to make a patch green. If a historical test is genuinely asserting retired ownership rather than behavior, update it to the canonical responsibility and keep equivalent regression protection.

## 4. Stage the official WebView2 loader

CI restores the pinned `Microsoft.Web.WebView2` SDK and locates:

```text
build/native/x64/WebView2Loader.dll
```

The workflow verifies that loader's Authenticode signature before exposing it to the release build.

Production release builds require this official signed x64 loader. Do not silently fall back to an arbitrary local DLL.

## 5. Build and validate the native release

The workflow invokes the root build script against the committed version/channel and exact runtime source.

The resulting release metadata records at least:

- Version / Channel;
- release build ID;
- runtime/browser content hash;
- EXE SHA-256;
- EXE byte size;
- Windows file/product version;
- WebView2 loader mode/source.

The build also validates the materialized browser payload and native wrapper identity.

## 6. Upload the validation artifact

Before public release publication, GitHub Actions uploads a validation artifact containing:

- `DiceBound.exe`;
- release metadata;
- generated release spec/notes;
- browser build-info/build-manifest.

This is CI evidence/temporary artifact storage, not the public launcher channel.

## 7. Official PR gate

For a normal implementation PR, require the official `DiceBound validation and release` PR workflow to finish successfully before merge.

The PR run validates source and builds the native package, but does **not** publish the public prerelease or advance `distribution/latest.json`.

When materialization is required to create an exact tested commit object:

- validate the exact materialized commit;
- remove temporary materializer workflow/script files from the final tree;
- ensure the PR head points at the exact validated commit;
- then let the official PR workflow validate that final head.

## 8. Squash-merge to protected `main`

Merge the exact validated PR head, normally via squash merge.

Record the resulting squash/release-source SHA. Do not assume the branch head SHA becomes the public release source after squash.

The push to protected `main` starts the publication workflow automatically. `distribution/latest.json` itself is ignored by that push trigger so the later reconciliation commit does not recursively republish the same version.

## 9. Protected-main credentials

Public GitHub Release creation/upload uses the workflow's normal `GITHUB_TOKEN`/`${{ github.token }}`.

Advancing the launcher manifest on protected `main` uses the dedicated **DiceBound manifest publisher GitHub App**, configured with repository Actions secrets:

- `DICEBOUND_RELEASE_APP_ID`
- `DICEBOUND_RELEASE_APP_PRIVATE_KEY`

The workflow uses `actions/create-github-app-token` to mint a short-lived token for **Krtz/DiceBound** with requested `contents: write` permission.

Before publication continues, CI verifies that:

- both App credentials exist;
- the App installation includes `Krtz/DiceBound`;
- the minted token can read `distribution/latest.json`.

Do not replace this with a broad personal token unless the release architecture is deliberately redesigned and reviewed.

## 10. Publish the derived prerelease

On an eligible `main` push (or explicit publish-enabled workflow dispatch), CI derives the tag/title from committed release identity.

If the tag/release does not exist, it creates the prerelease targeting the release-source SHA and uploads `DiceBound.exe`.

If the release already exists, the workflow edits its title/notes and uploads the EXE with clobber semantics. This makes a failed publication step rerunnable without inventing another version solely for GitHub infrastructure noise.

After upload, CI re-reads release assets and requires the public `DiceBound.exe` byte size to match the built release metadata.

### Transient GitHub upload failures

GitHub can fail at the release-upload layer even when DiceBound source/tests/native build are fully valid. For example, Beta 0.6.7.6's first publication attempt received:

`HTTP 500: Error creating asset temp dir`

after source validation, Edge, native WebView2 build and Actions artifact upload had already passed. Rerunning the failed job succeeded without source changes.

When this occurs:

1. inspect the exact failed step/log;
2. distinguish repository/build failure from GitHub infrastructure failure;
3. rerun only when source identity is unchanged and the failure is clearly external/transient;
4. still verify the final public asset and launcher manifest before calling the release shipped.

## 11. Generate and validate `distribution/latest.json`

After the public EXE exists, CI generates the launcher manifest from verified release metadata:

```text
python tools/write_distribution_manifest.py --release-metadata wrapper-source/release/release-metadata.json --output distribution/latest.json --repository Krtz/DiceBound
python tools/validate_version_identity.py --version <version> --channel Beta --release-spec wrapper-source/release/generated/release-spec.json --release-notes wrapper-source/release/generated/release-notes.md --release-metadata wrapper-source/release/release-metadata.json --distribution distribution/latest.json
```

The manifest contains the public asset URL, version/channel, release build ID, SHA-256, byte size and executable name.

## 12. Commit the launcher manifest through the GitHub App

The workflow reads the current `distribution/latest.json` blob from protected `main`, then performs a Contents API PUT using the short-lived manifest App token.

Commit message convention:

```text
distribution: point launcher at <version>
```

The resulting manifest-only commit is the **reconciled released `main`** checkpoint from which the next significant branch should start.

### HTTP-error-after-success hardening

GitHub's API can occasionally return a failure after the remote write actually succeeded. The workflow therefore does not blindly trust one PUT response.

If the PUT/curl status is not successful, CI:

1. logs a redacted diagnostic;
2. re-fetches `distribution/latest.json` from `main` up to three times;
3. decodes the remote file;
4. compares it byte-for-text with the already verified local manifest;
5. treats reconciliation as successful if the remote manifest already matches exactly;
6. otherwise fails closed.

Afterward, it performs one final exact remote/local manifest comparison regardless.

## 13. Verify the shipped state

Before saying a version is shipped, verify live GitHub state:

- PR is merged and its release-source/squash SHA is known;
- protected-main release workflow completed successfully (or an understood external failure was retried to success);
- expected prerelease/tag exists;
- `DiceBound.exe` exists on the release;
- asset byte size matches release metadata;
- release asset digest/checksum matches the built SHA-256 where GitHub exposes it;
- `distribution/latest.json` has the same Version / build ID / URL / SHA-256 / bytes;
- `main` contains the manifest reconciliation commit;
- no unexpected open PR/release recovery branch remains active.

Only then refresh durable trackers such as #84/#130/#209 and call the release complete.

## 14. Close the loop

After a verified release:

- close issues genuinely satisfied by the shipped implementation;
- update current queue/handover issues when their checkpoint or ordering changed;
- update player-facing release notes/changelog as appropriate;
- keep playtest-dependent work open/parked until real evidence supports closure;
- create focused follow-ups for newly discovered debt instead of burying it in release notes.

## Manual `workflow_dispatch`

`workflow_dispatch` exists as a controlled fallback. It validates by default and publishes only when its explicit `publish` input is enabled.

Manual dispatch does not waive version/source/identity requirements. It should not be used to publish an arbitrary local tree or bypass the PR/reconciled-main process.

## Historical recovery note

Beta 0.6 is the recovered Git baseline and predates the mature protected-main/App-token publication flow. Its immutable evidence under `docs/releases/beta-0.6/` remains historical reference; current releases follow the pipeline above.
