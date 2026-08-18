# GitHub Project Layout

DiceBound works best as an **Iterative Development** project rather than a one-off Product Launch or Feature Release board. The core loop is patch → playtest → feedback/bugs → tuning → next patch.

## Suggested workflow columns

Use these statuses:

1. **Backlog** — accepted ideas/issues not yet scheduled
2. **Next Patch** — committed scope for the next version
3. **In Progress** — actively being changed
4. **Needs Playtest** — implemented but waiting for real-player validation
5. **Blocked** — cannot move due to dependency/tooling/design question
6. **Done** — shipped or deliberately closed

If the GitHub template starts with Todo / In Progress / Done, rename/expand those rather than creating a second project.

## Suggested custom fields

### Target Version
Single-select examples:
- 0.6.x
- 0.7
- Later Beta
- Post-Beta
- Unscheduled

### Work Type
- Bug
- Balance
- Feature
- Art / UI
- Content
- Release Engineering
- Tech Debt
- Playtest

### Priority
- P0 — release blocker / save corruption / game-breaking
- P1 — important next-patch work
- P2 — normal backlog
- P3 — polish / someday

### Area
Useful values:
- Combat
- Classes
- Companions
- Gear / Loot
- Powerups
- Boards / Enemies
- Legacy / Prestige
- Campsite / UI
- Native Wrapper
- Save System
- Release / CI

## Recommended views

### Next Patch
Filter: `Status:"Next Patch"` or `Target Version:<next version>`
Group by Work Type or Status.

### Playtest Queue
Filter: `Status:"Needs Playtest"`
Group by Area.

### Bugs
Filter: `Work Type:Bug`
Sort Priority ascending (P0 first).

### Balance Lab
Filter: `Work Type:Balance OR Work Type:Playtest`
Group by Area.

### Art Backlog
Filter: `Work Type:"Art / UI"`
Group by Target Version.

### Release Engineering
Filter: `Area:"Release / CI" OR Area:"Native Wrapper"`

## Issue philosophy

Create an issue when a task is concrete enough that it can be implemented, tested, or deliberately rejected. Keep broad directional thinking in `docs/ROADMAP.md` until it becomes concrete.

Issues should usually contain:
- what the player/dev problem is
- current behavior/baseline
- desired direction
- known constraints/interactions
- what would count as done

Balance issues should record actual play evidence separately from harness/simulation evidence. Neither should be silently substituted for the other.

## Version planning

Avoid dumping the entire roadmap into the next patch. For each patch, explicitly move a small set of issues into **Next Patch** and treat that as scope. New discoveries during testing can enter the Backlog unless they are genuine blockers/regressions.

A release is complete when:
- scoped issues are done or intentionally deferred
- relevant playtest items have evidence
- build audit passes
- patch notes/changelog are updated
- release artifacts are tied to a Git commit/tag
- checksums/provenance are recorded
