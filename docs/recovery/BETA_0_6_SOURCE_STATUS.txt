Dicebound Beta 0.6 source status

This release continues the runtime+wrapper-source packaging introduced in 0.5.11.
The exact patched browser runtime in runtime/ is the authoritative source of truth for Beta 0.6, together with the native WebView2 wrapper/build source used to package it.

Beta 0.6 centralizes guardian Artifact drop chances, adds generated Legendary equipment/effects, moves the three named Memory relics to Mythical rarity, and changes the equipment point-budget ladder.

Build note
----------
To rebuild the native wrapper from this package, copy runtime/ to wrapper-source/dist/browser/ and run wrapper-source/tools/build_launcher.py. The official signed WebView2Loader.dll is not vendored in this sandbox package; this build therefore used the wrapper's compatibility fallback.
