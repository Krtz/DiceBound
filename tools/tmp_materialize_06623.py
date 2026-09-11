from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]

patch_path=ROOT/'runtime/PATCH_NOTES.md'
patch=patch_path.read_text(encoding='utf-8')
section='''# Unreleased — Beta 0.6.6.23\n\n## Beta 0.6.6.23 Merchant UI ownership (#313)\n- `ui/merchant.js` is now the authoritative Merchant offer presentation and purchase-interaction owner; the original renderer plus six superseded `renderMerchant` replacement implementations are retired from `dicebound.js`.\n- Merchant transaction reservation, commit and Legendary-choice settlement remain owned by `events/merchant-transaction.js`; stock generation, prices, gear generation, RNG, Board routing and secret-Merchant progression remain in their existing domain owners.\n- The compatibility monolith keeps one thin `renderMerchant()` adapter. Focused transaction/boundary/shadow guards and the real Windows Edge Merchant regression preserve sold/reserved state, weaker-gear confirmation, Sovereign/Legendary choice flow, refunds and exact stock-array visit identity.\n- Architecture-only: no Merchant balance, item odds, RNG, save/checkpoint or Board behavior change is intended. Runtime architecture is 69 modules (68 extracted + one compatibility monolith), with the validator measuring `dicebound.js` at 752,414 bytes / 7,465 physical lines.\n\n'''
if not patch.startswith('# Unreleased — Beta 0.6.6.23'):
    patch_path.write_text(section+patch,encoding='utf-8')

change_path=ROOT/'CHANGELOG.md'
change=change_path.read_text(encoding='utf-8')
entry='''## Beta 0.6.6.23\n\n### Merchant UI ownership (#313)\n- `runtime/js/ui/merchant.js` now owns Merchant offer rendering and purchase interaction orchestration while `events/merchant-transaction.js` remains authoritative for reservation, commit and active Legendary-choice state.\n- Removed the original Merchant renderer plus six historical `renderMerchant` replacement implementations from `dicebound.js`, leaving one thin compatibility adapter.\n- Preserved stock identity, sold/reserved state, weaker-gear confirmation, Sovereign/Legendary choice/refund semantics, Gold accounting and Merchant return behavior; stock generation, price formulas, gear generation, RNG, Board routing and Merchant balance are unchanged.\n- Focused transaction/ownership guards plus the real Windows Edge Merchant regression pass; runtime architecture is 69 modules (68 extracted + one compatibility monolith), and the validator reports the monolith at 752,414 bytes / 7,465 physical lines.\n\n'''
if '## Beta 0.6.6.23\n' not in change:
    marker='## Beta 0.6.6.22\n'
    if marker not in change: raise SystemExit('CHANGELOG insertion point missing')
    change_path.write_text(change.replace(marker,entry+marker,1),encoding='utf-8')

def run(*args):
    print('+',' '.join(map(str,args)),flush=True)
    subprocess.run([sys.executable,*map(str,args)],cwd=ROOT,check=True)

run('tools/set_project_version.py','--version','0.6.6.23','--channel','Beta')
run('tools/prepare_release.py','--version','0.6.6.23','--channel','Beta','--output-dir','wrapper-source/release/generated')
run('tools/refresh_runtime_manifest.py','--version','0.6.6.23','--channel','Beta','--development-state','Unreleased')
run('tools/validate_version_identity.py','--version','0.6.6.23','--channel','Beta','--release-spec','wrapper-source/release/generated/release-spec.json','--release-notes','wrapper-source/release/generated/release-notes.md')

(ROOT/'.github/workflows/tmp-materialize-06623.yml').unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
print('0.6.6.23 release metadata materialized and validated')
