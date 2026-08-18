# Powerup Art Validation

Before the GitHub import was staged, the one-shot patch was run against the recovered Beta 0.6 runtime locally. Validation performed:

- all 20 generated PNG assets extracted successfully;
- every asset was registered and preloaded through `runtime/js/assets.js`;
- every registry key was referenced by the intended powerup mapping in `runtime/js/dicebound.js`;
- `node --check runtime/js/assets.js` passed;
- `node --check runtime/js/dicebound.js` passed.

The one-shot GitHub integration workflow repeats the JavaScript syntax and file-path validation on `main` before committing the integrated runtime.
