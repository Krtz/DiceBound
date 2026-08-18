# DiceBound Architecture

This document describes the Git-era source layout beginning with the recovered Beta 0.6 baseline.

## Source of truth

The authoritative game payload is `runtime/`.

The authoritative Windows packaging/build source is `wrapper-source/`.

Generated EXEs, browser ZIPs, release bundles, runtime caches and user saves are outputs/data, not development source, and should not be committed to `main`.

## Runtime

```text
runtime/
├─ index.html
├─ css/
├─ js/
├─ assets/
├─ build-info.json
├─ build-manifest.json
├─ PATCH_NOTES.md
└─ TODO.md
```

### `runtime/index.html`
Browser/WebView entry point.

### `runtime/js/`
The shipped Beta 0.6 runtime scripts. `dicebound.js` is the main game bundle. Supporting scripts provide asset mapping, deterministic RNG, wrapper contracts, platform abstraction, storage and save handling.

### `runtime/assets/`
Shipped art/audio/UI resources. This includes campsite art, class art/markers, pets, enemies and board/UI backgrounds.

### Build identity
`runtime/build-info.json` is content-derived rather than timestamp-derived. Beta 0.6 identifies itself as:

- version `0.6`
- channel `Beta`
- build ID `dicebound-0.6-49974c0d6ca04ded`
- save schema `2`
- browser/source content hash `49974c0d6ca04ded9671e5992bdf85851b84ad8612803f8b506a8a4cc84df3c6`

`runtime/build-manifest.json` records hashes for the browser payload files.

## Native wrapper

```text
wrapper-source/
├─ assets/
├─ config/project.json
├─ launcher/windows/
├─ tools/build_launcher.py
├─ vendor/webview2/
└─ wrappers/webview2/native-go/
```

The primary desktop target is the native Windows WebView2 wrapper. The browser build is a secondary direct-launch target.

To recreate the native payload, copy `runtime/` to `wrapper-source/dist/browser/`, then run:

```text
python wrapper-source/tools/build_launcher.py
```

The Beta 0.6 recovered package does not vendor Microsoft's signed x64 `WebView2Loader.dll`; the original sandbox build therefore used the wrapper compatibility fallback. Production/CI should eventually use the official signed loader.

## Saves and runtime data

User saves belong under `%LOCALAPPDATA%\Dicebound\saves` in the native application. Disposable frontend/WebView2 cache data belongs under the runtime-cache area. Neither belongs in Git.

Save schema changes must be treated as migrations. Never silently invalidate existing career/progression data without an explicit migration or an intentional documented reset.

## Development direction

Beta 0.6 is a recovered packaged runtime, not yet an ideal human-authored module tree. Future refactors should be incremental and behavior-preserving rather than rewriting the game simply to make the repository prettier.

When code ownership becomes clearer, prefer small modules/registries with deterministic tests while keeping the shipped runtime reproducible from a tagged commit.
