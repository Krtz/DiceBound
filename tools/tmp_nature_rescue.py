from pathlib import Path
import ast, json, re, subprocess

ROOT = Path(__file__).resolve().parents[1]
NATURE_SHA = "d08c81783719c68c27dc941c0d75d925462a5b07"
VERSION = "0.6.3.11"
FRAMES = [f"runtime/assets/combat/effects/nature-poison-vines-{n:02d}.png" for n in range(1, 9)]


def run(*args):
    subprocess.run(list(args), cwd=ROOT, check=True)


run("git", "fetch", "origin", "main", "feat/0.6.3.8-nature-proc-vfx", "--tags")
run("git", "checkout", NATURE_SHA, "--", *FRAMES, "tools/test_nature_proc_vfx_registry.js")

# Combat-effects README.
p = ROOT / "runtime/assets/combat/effects/README.md"
text = p.read_text(encoding="utf-8")
note = """
`nature-poison-vines-01.png` through `nature-poison-vines-08.png` are the
approved transparent 75 ms frames for the Nature Poison Vines proc (#80). The
runtime registry owns their order. The VFX bridge attaches the sequence to the
actual living player/enemy target after a Nature proc; it never substitutes a
board marker or permanent portrait.
"""
if "nature-poison-vines-01.png" not in text:
    p.write_text(text.rstrip() + "\n" + note, encoding="utf-8")

# Inventory: add only approved final runtime frames.
p = ROOT / "runtime/assets/ASSET_INVENTORY.json"
inv = json.loads(p.read_text(encoding="utf-8"))
rels = [f"combat/effects/nature-poison-vines-{n:02d}.png" for n in range(1, 9)]
implemented = inv.setdefault("implemented", [])
added = 0
for rel in rels:
    if rel not in implemented:
        implemented.append(rel)
        added += 1
counts = inv.setdefault("counts", {})
if added:
    for key in ("canonicalRegistryFiles", "implementedCurrent"):
        if isinstance(counts.get(key), int):
            counts[key] += added
p.write_text(json.dumps(inv, indent=2) + "\n", encoding="utf-8")

# Semantic asset registry: preserve current main and add the VFX definition.
p = ROOT / "runtime/js/assets.js"
text = p.read_text(encoding="utf-8")
if "combatEffects:`${ROOT}/combat/effects`" not in text:
    old = "combatBackgrounds:`${ROOT}/combat/backgrounds`,uiCurrencies:"
    new = "combatBackgrounds:`${ROOT}/combat/backgrounds`,combatEffects:`${ROOT}/combat/effects`,uiCurrencies:"
    if old not in text:
        raise SystemExit("Could not find combatBackgrounds path anchor")
    text = text.replace(old, new, 1)
if "naturePoisonVines" not in text:
    m = re.search(r"const manifest=Object\.freeze\(\{version:(\d+),", text)
    if not m:
        raise SystemExit("Could not find asset manifest version")
    text = text[:m.start(1)] + str(int(m.group(1)) + 1) + text[m.end(1):]
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if "combat:Object.freeze({backgrounds:" in line:
            if not line.rstrip().endswith("}),"):
                raise SystemExit("Unexpected combat registry line shape")
            lines[i] = line.rstrip()[:-3] + ",effects:Object.freeze({naturePoisonVines:Object.freeze({frames:Object.freeze([1,2,3,4,5,6,7,8].map(frame=>`${paths.combatEffects}/nature-poison-vines-${String(frame).padStart(2,\"0\")}.png`)),frameDurationMs:75,alt:\"Thorny poison vines erupt, lash, and recede\"})})}),"
            break
    else:
        raise SystemExit("Could not find combat registry")
    text = "\n".join(lines) + "\n"
    resolver_anchor = '  const resolveSoundEffect=(name,pack="custom")=>'
    if resolver_anchor not in text:
        raise SystemExit("Could not find sound resolver anchor")
    text = text.replace(resolver_anchor, '  const resolveCombatEffect=key=>manifest.combat.effects[key]||null;\n' + resolver_anchor, 1)
    export_anchor = "resolveBoardBackground,resolveCombatBackground,resolveSoundEffect"
    if export_anchor not in text:
        raise SystemExit("Could not find DiceboundAssets export anchor")
    text = text.replace(export_anchor, "resolveBoardBackground,resolveCombatBackground,resolveCombatEffect,resolveSoundEffect", 1)
p.write_text(text, encoding="utf-8")

# Presentation bridge remains in the compatibility closure because proc functions are closure-owned.
p = ROOT / "runtime/js/dicebound.js"
text = p.read_text(encoding="utf-8")
if "DiceboundNatureVfxTest" not in text:
    block = r'''

  /* Nature Poison Vines combat VFX (#80, #71).
     Presentation observes completed proc outcomes only: combat damage, targeting,
     RNG and turns remain owned by the live combat pipeline. */
  const DB_NATURE_EFFECT_KEY='naturePoisonVines';
  function dbNatureEffect(){return window.DiceboundAssets?.resolveCombatEffect?.(DB_NATURE_EFFECT_KEY)||null;}
  function dbLivingNatureTargets(enemies=[]){return (enemies||[]).filter(enemy=>enemy&&enemy.hp>0);}
  function dbNatureHostForEnemy(enemy){
    const index=currentEnemies.indexOf(enemy);
    return index<0?null:document.querySelector(`#enemyIcon .stage-enemy[data-enemy-index="${index}"]`);
  }
  function dbPlayNatureVfx(host,target){
    const effect=dbNatureEffect();if(!host||!effect?.frames?.length)return false;
    const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const active=host.querySelector('.db-nature-vines-vfx');active?.remove();
    const node=document.createElement('span'),image=document.createElement('img');
    node.className='db-nature-vines-vfx';node.dataset.natureVfxTarget=target;image.alt='';image.draggable=false;node.append(image);host.append(node);
    const frames=effect.frames,duration=Math.max(40,Math.floor(Number(effect.frameDurationMs)||75));let frame=0;
    const present=()=>{image.src=frames[frame];node.dataset.natureVfxFrame=String(frame+1);if(reduced||frame>=frames.length-1){setTimeout(()=>node.remove(),reduced?180:duration);return;}frame++;setTimeout(present,duration);};
    present();return true;
  }
  function dbPlayNatureOnEnemy(enemy){return enemy?.hp>0&&dbPlayNatureVfx(dbNatureHostForEnemy(enemy),'enemy');}
  function dbPlayNatureOnPlayer(){return player.hp>0&&dbPlayNatureVfx($('combatPlayerIcon'),'player');}
  const dbTriggerElementBase=triggerElementEffect;
  triggerElementEffect=function(key,target=currentEnemy,opts={}){
    const candidates=key==='nature'?[...livingEnemies()]:[],result=dbTriggerElementBase(key,target,opts);
    if(key==='nature'&&result)dbLivingNatureTargets(candidates).forEach(dbPlayNatureOnEnemy);
    return result;
  };
  const dbEnemyElementProcBase=enemyElementProc;
  enemyElementProc=function(enemy){const result=dbEnemyElementProcBase(enemy);if(enemy?.affinity==='nature'&&result&&player.hp>0)dbPlayNatureOnPlayer();return result;};
  if(!document.getElementById('dicebound-nature-vfx-style')){
    const style=document.createElement('style');style.id='dicebound-nature-vfx-style';style.textContent=`
      .db-nature-vines-vfx{position:absolute;z-index:30;left:50%;bottom:-10%;width:clamp(112px,150%,260px);pointer-events:none;transform:translateX(-50%);overflow:visible;filter:drop-shadow(0 8px 10px rgba(20,0,30,.45))}
      .db-nature-vines-vfx img{display:block;width:100%;height:auto;max-width:none!important;max-height:none!important;object-fit:contain}
      #combatPlayerIcon,.stage-enemy{position:relative;isolation:isolate}
      @media(max-width:760px){.db-nature-vines-vfx{width:clamp(96px,135%,185px);bottom:-8%}}
      @media(prefers-reduced-motion:reduce){.db-nature-vines-vfx{filter:none}}
    `;document.head.appendChild(style);
  }
  setTimeout(()=>{const effect=dbNatureEffect();effect?.frames?.forEach(src=>{const image=new Image();image.src=src;});},0);
  window.DiceboundNatureVfxTest=Object.freeze({
    effect:dbNatureEffect,
    livingTargets:enemies=>dbLivingNatureTargets(enemies).map(enemy=>enemy.name||''),
    previewPlayer:dbPlayNatureOnPlayer,
    active:()=>[...document.querySelectorAll('.db-nature-vines-vfx')].map(node=>({target:node.dataset.natureVfxTarget,frame:Number(node.dataset.natureVfxFrame)}))
  });
'''
    pos = text.rfind("\n})();")
    if pos < 0:
        raise SystemExit("Could not find monolith closure end")
    text = text[:pos] + block + text[pos:]
    p.write_text(text, encoding="utf-8")

# Browser/native smoke coverage.
for rel, native in (("tools/smoke_run_resume_browser.js", False), ("tools/smoke_run_resume_native.js", True)):
    p = ROOT / rel
    text = p.read_text(encoding="utf-8")
    if "DiceboundNatureVfxTest" in text:
        continue
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if "assert.equal(created.title,created.expectedTitle)" in line:
            prefix = "native " if native else ""
            addition = [
                "    const vines=await first.evaluate(`(async()=>{const api=window.DiceboundNatureVfxTest,effect=api.effect(),load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error('Could not load '+src));image.src=src;}),frames=await Promise.all(effect.frames.map(load)),targets=api.livingTargets([{name:'defeated',hp:0},{name:'living',hp:4},{name:'missing'}]),preview=api.previewPlayer();await new Promise(resolve=>setTimeout(resolve,110));const active=api.active();await new Promise(resolve=>setTimeout(resolve,620));return {frames,targets,preview,active,after:api.active(),style:!!document.getElementById('dicebound-nature-vfx-style')};})()`);",
                f"    assert.equal(vines.style,true,\"{prefix}Nature VFX stylesheet is missing\");assert.equal(vines.preview,true);assert.deepEqual(vines.targets,['living']);assert.equal(vines.frames.length,8);for(const frame of vines.frames)assert.deepEqual(frame,{{width:272,height:724}});assert.equal(vines.active.length,1);assert.equal(vines.active[0].target,'player');assert.deepEqual(vines.after,[]);",
            ]
            lines[i + 1:i + 1] = addition
            break
    else:
        raise SystemExit(f"Could not find smoke anchor in {rel}")
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")

# Current validator: extend current counts rather than overwriting newer marker/background rules.
p = ROOT / "tools/validate_asset_architecture.py"
text = p.read_text(encoding="utf-8")
if '"combat_effect_assets"' not in text:
    m = re.search(r"EXPECTED=(\{[^\n]+\})", text)
    if not m:
        raise SystemExit("Could not find EXPECTED asset counts")
    expected = ast.literal_eval(m.group(1))
    expected["combat_effect_assets"] = 8
    expected["registry_files"] = int(expected["registry_files"]) + 8
    text = text[:m.start(1)] + repr(expected) + text[m.end(1):]
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.lstrip().startswith("counts={"):
            lines[i] = line.replace('"powerup_assets":', '"combat_effect_assets":len(m["combat"]["effects"]["naturePoisonVines"]["frames"]),"powerup_assets":', 1)
            break
    else:
        raise SystemExit("Could not find validator counts")
    insert_at = None
    for i, line in enumerate(lines):
        if 'count(runtime/"assets/combat/backgrounds"' in line:
            insert_at = i + 1
            break
    if insert_at is None:
        for i, line in enumerate(lines):
            if 'count(runtime/"assets/board/backgrounds"' in line:
                insert_at = i + 1
                break
    if insert_at is None:
        raise SystemExit("Could not find asset-directory count anchor")
    lines.insert(insert_at, '    count(runtime/"assets/combat/effects",EXPECTED["combat_effect_assets"])')
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")

# Release notes: make 0.6.3.10 historical, then add 0.6.3.11.
p = ROOT / "CHANGELOG.md"
text = p.read_text(encoding="utf-8")
text = text.replace("## Unreleased — Beta 0.6.3.10", "## Beta 0.6.3.10", 1)
marker = "This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n"
section = "\n## Unreleased — Beta 0.6.3.11\n\n### Nature Poison Vines proc VFX (#80, #71)\n- Added the approved eight-frame transparent thorny-vines effect to the canonical combat-effects tree and registered it as a reusable elemental-proc animation.\n- Nature procs play on actual living targets without changing RNG, damage, targeting, turns or saves.\n"
if "## Unreleased — Beta 0.6.3.11" not in text:
    text = text.replace(marker, marker + section, 1)
p.write_text(text, encoding="utf-8")

p = ROOT / "runtime/PATCH_NOTES.md"
text = p.read_text(encoding="utf-8")
text = text.replace("# Unreleased — Beta 0.6.3.10", "# Beta 0.6.3.10", 1)
section = "# Unreleased — Beta 0.6.3.11\n\n## Nature Poison Vines VFX (#80)\n- Nature procs now show thorny poison vines erupting, lashing their actual living target, then receding.\n- Player Nature procs animate each surviving affected enemy; enemy Nature procs animate the player.\n- The sequence is visual-only, non-blocking, and skipped for defeated targets.\n\n---\n\n"
if not text.startswith("# Unreleased — Beta 0.6.3.11"):
    text = section + text
p.write_text(text, encoding="utf-8")

run("python", "tools/set_project_version.py", "--version", VERSION, "--channel", "Beta")
run("python", "tools/refresh_runtime_manifest.py", "--version", VERSION, "--channel", "Beta", "--development-state", "Unreleased")
run("node", "tools/test_nature_proc_vfx_registry.js")
run("python", "tools/validate_asset_architecture.py")
run("python", "tools/validate_runtime_architecture.py")
run("node", "--check", "runtime/js/assets.js")
run("node", "--check", "runtime/js/dicebound.js")

run("git", "rm", ".github/workflows/tmp-nature-rescue.yml", "tools/tmp_nature_rescue.py")
run("git", "add", "-A")
run("git", "commit", "-m", "Beta 0.6.3.11: animate Nature poison vines")
run("git", "tag", "-f", "tmp-nature-rescued-0.6.3.11", "HEAD")
run("git", "push", "origin", "refs/tags/tmp-nature-rescued-0.6.3.11", "--force")
