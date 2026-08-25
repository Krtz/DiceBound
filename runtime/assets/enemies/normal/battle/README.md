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
