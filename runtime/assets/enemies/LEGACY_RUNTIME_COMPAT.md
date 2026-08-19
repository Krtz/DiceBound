# Temporary Beta 0.6 monolith compatibility

The semantic source-of-truth folders are `normal/`, `minibosses/`, `bosses/` and `secret-bosses/`. The recovered Beta 0.6 `dicebound.js` still contains one direct guardian-art table pointing at `assets/enemies/portraits/`; this compatibility tree keeps that untouched monolith path functional while #29 moves all authoritative registry ownership to the granular folders.

Do not add new art to `portraits/`. New/replacement art belongs in the role-specific folders. This compatibility tree can be removed when the direct guardian table is extracted from the recovered monolith.
