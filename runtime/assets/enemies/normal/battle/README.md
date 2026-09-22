# Ordinary enemy battle art

This directory holds full-body combat artwork only. It must never be used as
road-marker art. Every normal-enemy identity has one semantic subdirectory:
`<enemy-id>/`. Battle PNGs must not be added at this directory's root.

`runtime/js/assets.js` resolves an enemy's base battle art from semantic
identity plus Board (1--6). Nightmare and Hell presentation remain separate
runtime aura layers, so no mode effect belongs in these Normal-mode files.

Completed Board-tier families use `board-1.png` through `board-6.png` in their
own folders: Slime, Goblin, Skeleton, Wolf, Demon, and Wraith. Existing
single-art families use `portrait.png` in their own folders. The static board
marker for every family remains independently owned by `../board-markers/`.

Empty authored-art homes are deliberately tracked for Orc, Cultist, and Lich.
Do not fill them with another creature's portrait or marker: retain the normal
missing-art fallback until approved final artwork is supplied.
