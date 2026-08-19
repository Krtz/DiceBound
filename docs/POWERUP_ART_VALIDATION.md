# Powerup Art Validation

The temporary one-shot import workflow has been retired. Powerup art is now validated as part of the permanent runtime asset architecture.

## Current checks

`python tools/validate_asset_architecture.py` verifies:

- the canonical powerup asset registry contains the expected 22 art entries;
- the rendered-choice bridge contains the expected 28 powerup-name/tier mappings;
- every canonical registered/preloaded image exists and is non-empty;
- every rendered powerup name points to a valid asset-registry key;
- `runtime/js/assets.js` passes `node --check`;
- `runtime/js/dicebound.js` passes `node --check`;
- the powerup paths coexist with the wider class/pet/enemy/camp/board/equipment asset audit.

The current Glass Needle image is preserved as the canonical `runtime/assets/powerups/rare/glass-needle.png` source. Current Heavy Purse uses `runtime/assets/powerups/poor/heavy-purse.png`; the older Beta-era image is retained only under `powerups/_legacy/` for provenance and is not a live resolver target.

## Visual smoke testing

Static/path validation does not substitute for opening a real powerup choice UI. A supported desktop/browser/native environment should visually confirm representative Poor/Common/Uncommon/Rare/Epic/Legendary/shared mappings before a release. The sandbox used for the #29 migration could not complete a trustworthy headless Chromium local-runtime visual launch, so no visual pass is claimed from that environment.
