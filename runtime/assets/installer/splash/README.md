# Installer / launcher splash art

Canonical repository-owned presentation art for DiceBound's installer/launcher (#23).

Current asset:

- `dicebound-launcher-splash.jpg` — generated DiceBound night-camp / Impossible Road splash used by the permanent Windows launcher.

The launcher build mirrors this exact file at `installer/assets/dicebound-launcher-splash.jpg` so `go:embed` can package it into the setup executable. The semantic runtime asset here remains the source of truth; do not independently redesign the build mirror.
