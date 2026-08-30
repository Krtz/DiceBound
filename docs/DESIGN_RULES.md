# DiceBound design rules

These durable rules apply to new destinations and to refactors of existing UI.

## Persistent dismissal

Every full-screen, modal or independently scrollable destination must provide a
clearly labelled Done, Back or Exit control in persistent top-right chrome.
It must remain available at wide, compact and short-wide viewport sizes. A
dismissal control is not ordinary scrollable content and must not depend on a
late z-index override.

## Responsive destinations

UI must remain usable after resize while open. Layouts should preserve safe
areas, keep essential controls visible, and use a dedicated responsive owner
instead of scattered compatibility style patches.

## Ownership and semantics

Presentation owners render semantic IDs, selected authored art and hit targets.
Domain owners retain mechanics, data, persistence, RNG and progression policy.
Do not duplicate computed values or make UI text the source of gameplay truth.

## Progression and secrets

Locked content must remain understandable without exposing secret content ahead
of its intended reveal. New progression options should use the authoritative
achievement/unlock policy rather than a UI-only eligibility check.
