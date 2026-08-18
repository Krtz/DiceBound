# DiceBound Beta 0.6 — Build Audit

Recovered release audit result: **32 / 32 checks passed**.

## Gameplay/content checks

- Node/static syntax check recorded as passed elsewhere in the release validation.
- Beta 0.6 runtime marker present.
- Memory Cache bypasses the old v2.4 wrapper path.
- Memory Cache odds match 1/450 Normal, 1/300 Nightmare, 1/200 Hell.
- Board 6 miniboss awards 10 cookies.
- Named relic migration to Mythical is present.
- Legendary/generated gear budget ranges are correct.
- Artifact system uses a single roll.
- Artifact table has seven entries.
- Artifact weights are `30 / 20 / 16 / 14 / 9 / 7 / 4`, totaling 100.
- Artifact rate matrix matches the agreed values.
- Miniboss ordinary-equipment chance matches the Beta 0.6 values.
- Final Price / Philosopher's Stone Hell rate is 15%.
- Exactly 20 Legendary Effects are registered.
- Echo Chamber Crit→Echo conversion occurs before the attack roll where it can affect Echo count.
- Generated Legendary gear receives a Legendary Effect.
- Random-class campsite placeholder is present.
- Boss/miniboss art binding is present.

## Runtime/wrapper checks

- `index.html` reports Beta 0.6.
- `runtime/js/native-http-host.js` version marker is 0.6.
- `runtime/js/platform.js` version marker is 0.6.
- `runtime/js/save-system.js` version marker is 0.6.
- `runtime/js/wrapper-contract.js` version marker is 0.6.
- Wrapper project configuration reports 0.6.

## Original native build checks

The original validated Beta 0.6 EXE existed at validation time and was recorded as **166,598,656 bytes**.

- PE validation passed.
- Version metadata validation passed.
- Native WebView2 marker validation passed.
- EXE SHA-256: `85764d2de61b19a2ff0d4bb983d3456f3c77784a608cd8bd27ee0fc995f13a0e`

The already-built EXE itself did not survive the later ChatGPT handoff; the source needed to rebuild it did.

## Manifest checks

- Manifest version check passed.
- Build ID check passed: `dicebound-0.6-49974c0d6ca04ded`.
- Recorded runtime manifest hashes matched during release validation.

## Test-environment limitation

The original build sandbox could not honestly claim a successful headless visual/browser runtime test because Chromium was enterprise-policy blocked from local/file/loopback URLs. Static JavaScript parsing, content audit, deterministic packaging and native wrapper metadata were validated instead.

This Markdown record is a durable human-readable copy of the recovered `Dicebound_Beta_0_6_BUILD_AUDIT.json`; its published SHA-256 is recorded in `CHECKSUMS.txt`.
