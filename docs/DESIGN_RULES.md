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

## Branch lifecycle

Feature, refactor, release and temporary working branches are disposable once
their work is safely merged. After a merge and any required post-merge release
or reconciliation step has succeeded, delete the merged branch and any obsolete
candidate/materializer branches that no longer contain unique unmerged work.
Never delete `main`, an active PR branch, a protected ref, or a branch that still
contains unique work needed by a follow-up.
