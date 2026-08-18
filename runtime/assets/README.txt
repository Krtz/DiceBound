DICEBOUND ASSET CONVENTION
==========================

PURPOSE
-------
Game code should refer to external artwork through js/assets.js rather than hard-coded file paths in combat/rendering logic.

FOLDER CONVENTION
-----------------
assets/
  enemies/
    portraits/       Normal enemy portraits
  bosses/
    portraits/       Guardian and secret-boss portraits
  classes/
    portraits/       Class selection / hero portraits
  pets/
    portraits/       Companion portraits
  items/
    icons/           Equipment and special-item art
  camp/
    backgrounds/     Campsite background art
    objects/         Camp props and interactable art
  ui/
    icons/           Reusable interface icons
    backgrounds/     General board/modal/interface backgrounds
  effects/           Visual-effect image assets
  music/             Music tracks
  sounds/            Sound effects

NAMING
------
- lowercase filenames
- use hyphens for multiple words (example: pale-devil.png)
- one canonical asset per entity unless a suffix is meaningful (example: wolf-enraged.png)
- portrait images should preferably be square and have transparent backgrounds where appropriate

MANIFEST
--------
js/assets.js is the canonical registry for external assets.
Artwork should be added there before gameplay/rendering code references it.

FALLBACK ART
------------
Dicebound still contains procedural SVG fallbacks for entities that do not yet have external artwork.
An entity with a manifest-backed external portrait bypasses the procedural portrait renderer entirely.
