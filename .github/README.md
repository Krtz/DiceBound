# Repository workflow

- Use the issue templates for bugs, features and balance/playtest findings.
- Use the pull-request template for non-trivial code/content changes.
- The GitHub Project layout is documented in `../docs/GITHUB_PROJECT_SETUP.md`.
- The actionable work map is in `../docs/PROJECT_BACKLOG.md`.

Every PR must stamp one unused four-component DiceBound version before merge. `tools/validate_pr_version.py` enforces the rule against `origin/main`.

`.github/workflows/dicebound-release.yml` is version-agnostic: it derives build/release identity from committed project Version/Channel, validates PRs, and publishes only through an explicit manual dispatch. Local Windows validation remains authoritative while hosted Actions are unavailable for the account.
