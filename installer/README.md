# DiceBound installer / launcher

`installer/` contains the small permanent Windows launcher for DiceBound. The large game EXE remains a GitHub Release asset; the launcher reads `distribution/latest.json`, verifies the release payload, updates safely, and starts the installed game.

## Issue #23 launcher flow

The launcher now builds on the lightweight #14 bootstrap with a real first-install and recurring-launch experience:

- Dedicated DiceBound splash art with live install/update status.
- Rotating spoiler-light hints loaded from editable `installer/hints.json`.
- First install lets the player choose an install folder; `%LOCALAPPDATA%\DiceBound` remains the default.
- Desktop and Start Menu shortcuts are independent opt-in choices.
- Launcher choices persist in `%LOCALAPPDATA%\DiceBoundLauncher\launcher-config.json`.
- `DiceBoundLauncher.exe --configure` reopens the install/shortcut choices.
- Installed version/build ID and update status are shown on the splash.
- If GitHub is unreachable but a valid local game exists, the installed game launches offline.
- Updates download to a temporary file and are checked against both byte size and SHA-256 before the old build is touched.
- Failed updates restore/retain the previous runnable game and launch it when possible.
- The launcher never deletes the DiceBound save/backup directories.

## Splash art ownership

The canonical source-controlled artwork lives at:

`runtime/assets/installer/splash/dicebound-launcher-splash.jpg`

The identical file under `installer/assets/` is the build-package mirror embedded into the launcher by `go:embed`. Do not independently edit the mirror; replace the canonical art and copy it into the installer package when updating launcher presentation.

## Distribution model

1. Player downloads `DiceBoundSetup.exe` once.
2. The launcher reads `distribution/latest.json` from `Krtz/DiceBound`.
3. It downloads the native game EXE referenced by that manifest from GitHub Releases.
4. It verifies exact byte size and SHA-256 before activation.
5. The installed launcher stays at `<chosen install dir>\DiceBoundLauncher.exe`.
6. Future launches check `latest.json`; a changed build ID/hash triggers an update.
7. Network failure falls back to the existing installed game when one is present.

## Building

Requires Go. The splash and hints must be present beside the launcher source because they are embedded at compile time. Build both Go source files so `http_policy.go` applies the long-download timeout required for release assets larger than 100 MB.

```powershell
$env:GOOS = 'windows'
$env:GOARCH = 'amd64'
$env:CGO_ENABLED = '0'
go vet .\installer\main_v2.go .\installer\http_policy.go
go build -buildvcs=false -trimpath -ldflags '-s -w -buildid= -H=windowsgui' -o DiceBoundSetup.exe .\installer\main_v2.go .\installer\http_policy.go
```

For release builds, apply the existing DiceBound icon and VERSIONINFO using `wrapper-source/launcher/windows/embed_icon.py` in the same way the native game wrapper is branded.

## Current Beta 0.6 payload

- Size: `166598656` bytes
- SHA-256: `85764d2de61b19a2ff0d4bb983d3456f3c77784a608cd8bd27ee0fc995f13a0e`
- Build ID: `dicebound-0.6-49974c0d6ca04ded`

The manifest currently points to the recovered Beta 0.6 release asset. A later release can replace that target without changing normal launcher logic.

## Validation before merging #23

Minimum static checks:

```powershell
$env:GOOS = 'windows'
$env:GOARCH = 'amd64'
$env:CGO_ENABLED = '0'
go vet .\installer\main_v2.go .\installer\http_policy.go
go build -buildvcs=false -trimpath -ldflags '-s -w -buildid= -H=windowsgui' -o DiceBoundSetup.exe .\installer\main_v2.go .\installer\http_policy.go
```

Then perform real Windows smoke tests for fresh install, custom path, each shortcut choice, update, offline launch, bad hash/failed update fallback, and `--configure`.
