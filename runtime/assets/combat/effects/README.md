# Combat effects

Combat-only visual effect assets belong here when effects move beyond CSS/generated shapes.

`nature-poison-vines-01.png` through `nature-poison-vines-08.png` are the
approved transparent 75 ms frames for the Nature Poison Vines proc (#80). The
runtime registry owns their order. The VFX bridge attaches the sequence to the
actual living player/enemy target after a Nature proc; it never substitutes a
board marker or permanent portrait.
