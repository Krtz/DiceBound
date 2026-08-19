# DiceBound Beta 0.6.1

Beta 0.6.1 is a launcher/update validation release built from the current `main` gameplay/runtime state after issue #40 Phase 0 guardrails were merged.

This prerelease intentionally does **not** include the draft Phase 1 Artifact-weight migration. It packages the current runtime asset architecture, including the newer board, enemy, class, pet, powerup, and UI artwork, into a fresh native WebView2 executable.

The Windows build embeds Microsoft's signed x64 WebView2 loader, stamps every active runtime/native version identity as Beta 0.6.1, and preserves save schema version 2. Launcher source also includes the tested no-console helper-process fix and its long-download HTTP policy.

## Validation target

- Confirm `DiceBoundLauncher.exe` detects 0.6.1 from `distribution/latest.json`.
- Confirm the launcher downloads the release asset, verifies byte size and SHA-256, updates safely, and starts it.
- Confirm the native Windows title and runtime title both report `Dicebound: Beta v0.6.1`.
- Confirm current runtime artwork is present in the packaged EXE.
- Confirm existing save data still loads with save schema version 2.

This build remains a prerelease until the real Windows launcher/update smoke test is completed.
