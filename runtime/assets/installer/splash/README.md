# Installer / launcher splash art

Canonical repository-owned presentation art for DiceBound's installer/launcher (#23).

Current asset:

- `dicebound-launcher-splash-v2.png` — WPF-validated DiceBound night-road splash used by the permanent Windows launcher. It is a launcher-safe derivative of the approved campsite-road artwork.

The launcher build mirrors this exact file at `installer/assets/dicebound-launcher-splash-v2.png` so `go:embed` can package it into the setup executable. The semantic runtime asset here remains the source of truth; do not independently redesign the build mirror. `tools/validate_launcher_assets.py` validates the complete PNG chunk/CRC structure and exact mirror hash so a truncated image cannot silently ship again.
