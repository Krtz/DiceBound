# Issue #23 — Configurable launcher/updater implementation

## Implemented on `agent/issue-23-launcher-updater`

- First-run install directory selection with `%LOCALAPPDATA%\DiceBound` default.
- Independent Desktop and Start Menu shortcut choices.
- Persistent launcher configuration under `%LOCALAPPDATA%\DiceBoundLauncher`.
- `--configure` entry point to revisit installer choices.
- Dedicated DiceBound splash artwork sourced from the semantic installer asset tree.
- Live splash status showing installed/available version and build ID.
- Rotating hints loaded from `installer/hints.json`; hints intentionally tease systems without exposing secret unlock recipes.
- Existing GitHub-backed `distribution/latest.json` update flow retained.
- SHA-256 and exact byte-size verification before replacement retained.
- Offline fallback starts the existing local build when GitHub cannot be reached.
- Failed updates keep/restore and launch the previous working build when possible.

## Static validation performed

The launcher source was tested in the development sandbox with:

```text
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go vet main_v2.go http_policy.go
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -buildvcs=false -trimpath -ldflags '-s -w -buildid= -H=windowsgui' main_v2.go http_policy.go
```

The output was a Windows amd64 GUI PE executable. The sandbox cannot perform a real Windows/WPF runtime smoke test, so first-install dialog layout, splash presentation, shortcut creation, network fallback and update replacement still require a real Windows test before #23 should be considered complete.

## Safety boundary

The launcher only manages its own config, installed launcher/game executable, install-state metadata, and shortcuts. It does not delete `%LOCALAPPDATA%\DiceBound\saves` or backup data. Download verification happens before the previous game executable is moved, and activation failure attempts to restore the previous executable.
