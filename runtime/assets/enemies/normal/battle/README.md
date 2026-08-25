# Ordinary enemy battle art

This directory holds full-body combat artwork only. It must never be used as
road-marker art.

`slime-board-1.png` through `slime-board-6.png` are the approved Normal-mode
base forms for Slime. `runtime/js/assets.js` selects a form from semantic enemy
identity plus Board (1--6). Nightmare and Hell auras are separate runtime
presentation classes, so no mode effect is baked into these transparent files.

The static Slime board marker is owned independently by the normal
`board-markers/` context (#82); this battle progression neither creates nor
changes marker variants.

`wolf-board-1.png` through `wolf-board-6.png` follow the same resolver and
presentation rules for Wolf. Board 5 and 6 may depict two Direwolves, but the
art alone does not alter encounter pack size, turn count or combat mechanics.
The static `board-markers/wolf.png` remains unchanged.
