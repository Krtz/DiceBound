# Temporary Beta 0.6 monolith compatibility

The authoritative campsite background now lives in `background/campsite.png`. The recovered Beta 0.6 monolith still contains a CSS fallback that directly references `assets/camp/backgrounds/campsite.png`, so `backgrounds/` remains as a read-only mirror.

`objects/` is also retained as a read-only mirror because the recovered monolith contains fallback literals for the old camp-object paths. New art belongs in `interactions/`, `decorations/`, or `mode-toggles/`.

Do not add new/current campsite art under `backgrounds/` or `objects/`.
