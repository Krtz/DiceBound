# DiceBound lightweight installer / launcher

This folder contains a tiny Windows bootstrapper for players. It deliberately does **not** embed the ~160 MB game runtime.

## Player flow

1. Player downloads `DiceBoundSetup.exe` once.
2. The launcher reads `distribution/latest.json` from the public `Krtz/DiceBound` repository.
3. It downloads the native game EXE referenced by that manifest from GitHub Releases.
4. It verifies exact byte size and SHA-256 before installing.
5. The game is installed under `%LOCALAPPDATA%\DiceBound`, so elevation/admin rights are not required.
6. Desktop and Start Menu shortcuts point to the installed launcher.
7. Future launches check `latest.json`; a new `buildId`/hash causes an update before the game starts.
8. If GitHub cannot be reached but a game is already installed, the launcher starts the installed version offline.

## Why Releases instead of Git history?

The native DiceBound EXE is currently ~159 MiB. Large generated binaries belong in GitHub Releases, while source code and the tiny update manifest belong in Git.

## Current Beta 0.6 payload

The recovered Beta 0.6 EXE is reproducible from the Git-tracked runtime/wrapper source and has:

- Size: `166598656` bytes
- SHA-256: `85764d2de61b19a2ff0d4bb983d3456f3c77784a608cd8bd27ee0fc995f13a0e`
- Build ID: `dicebound-0.6-49974c0d6ca04ded`

`distribution/latest.json` currently expects that file as the `Dicebound_Beta_0_6.exe` asset on the `beta-0.6-recovery-source` GitHub Release. This can later point at a cleaner public release tag without changing the launcher itself.

## Building

Requires Go. From the repository root on any machine with Go installed:

```powershell
$env:GOOS = 'windows'
$env:GOARCH = 'amd64'
$env:CGO_ENABLED = '0'
go build -buildvcs=false -trimpath -ldflags '-s -w -buildid=' -o DiceBoundSetup.exe .\installer\main.go
```

For release builds, apply the existing DiceBound icon and VERSIONINFO using `wrapper-source/launcher/windows/embed_icon.py` in the same way the native game wrapper is branded.

## Release process

For each new game release:

1. Build/test the native DiceBound EXE.
2. Upload it as a GitHub Release asset.
3. Calculate its exact byte count and SHA-256.
4. Update `distribution/latest.json` with the release URL, build ID, byte count and SHA-256.
5. Test a clean install and an update from the previous release.

The launcher normally does not need to be rebuilt for each game release.
