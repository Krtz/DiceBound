#!/usr/bin/env python3
"""Static integrity audit for DiceBound's runtime asset architecture (#29)."""
from __future__ import annotations
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path
from runtime_manifest_hash import RUNTIME_EXTENSIONS, sha256_runtime_file

EXPECTED={'classes': 26, 'pets': 13, 'pet_battle_assets': 13, 'normal_enemies': 11, 'normal_enemy_battle_assets': 27, 'normal_enemy_board_markers': 11, 'minibosses': 6, 'bosses': 6, 'secret_bosses': 3, 'board_backgrounds': 6, 'combat_backgrounds': 6, 'powerup_assets': 22, 'powerup_name_mappings': 28, 'registry_files': 272, 'combat_effect_assets': 28, 'equipment_assets': 21}
LEGACY_PREFIXES=("assets/enemies/portraits/","assets/camp/backgrounds/","assets/camp/objects/","assets/pets/portraits/","assets/ui/backgrounds/","assets/ui/class-art/","assets/ui/class-markers/","assets/ui/icon/","assets/ui/icons/","assets/ui/","assets/sounds/")
SEMANTIC_ROOTS=("assets/characters/","assets/enemies/normal/","assets/enemies/minibosses/","assets/enemies/bosses/","assets/enemies/secret-bosses/","assets/equipment/","assets/powerups/","assets/camp/background/","assets/camp/interactions/","assets/camp/decorations/","assets/camp/mode-toggles/","assets/board/","assets/combat/","assets/ui/chrome/","assets/ui/controls/","assets/ui/currencies/","assets/ui/misc/","assets/installer/","assets/audio/")
POINTER_SOURCE_EXTENSIONS={".html",".css",".js"}
POINTER_RX=re.compile(r"assets/[A-Za-z0-9_./-]+(?:\.(?:png|ico|jpg|jpeg|webp|ogg|mp3|wav|webm)|/)")

def fail(msg): raise SystemExit(f"ASSET AUDIT FAILED: {msg}")
def sha256_file(path): return sha256_runtime_file(path)
def source_hash(runtime):
    info=runtime/"build-info.json"; mf=runtime/"build-manifest.json"
    paths=sorted((p for p in runtime.rglob("*") if p.is_file() and p not in {info,mf} and p.suffix.lower() in RUNTIME_EXTENSIONS),key=lambda p:p.relative_to(runtime).as_posix())
    h=hashlib.sha256()
    for p in paths:
        h.update(p.relative_to(runtime).as_posix().encode()); h.update(b"\0"); h.update(sha256_file(p).encode()); h.update(b"\n")
    return h.hexdigest(),len(paths)
def check_js(path):
    p=subprocess.run(["node","--check",str(path)],text=True,capture_output=True)
    if p.returncode: fail(f"JavaScript syntax error in {path}:\n{p.stderr or p.stdout}")
def runtime_scripts(runtime):
    manifest_path=runtime/"js/module-manifest.json"
    if not manifest_path.is_file(): fail(f"runtime module manifest missing: {manifest_path}")
    manifest=json.loads(manifest_path.read_text(encoding="utf-8"))
    modules={str(module.get("id")):module for module in manifest.get("modules",[])}
    scripts=[]
    for module_id in manifest.get("loadOrder",[]):
        module=modules.get(str(module_id))
        if not module: fail(f"runtime load order references unknown module: {module_id}")
        rel=str(module.get("path") or "")
        if not rel.startswith("js/") or not rel.endswith(".js"): fail(f"runtime module {module_id} has invalid script path: {rel!r}")
        if not (runtime/rel).is_file(): fail(f"runtime module {module_id} points to missing script: {rel}")
        scripts.append(rel)
    if not scripts: fail("runtime module manifest has an empty load order")
    return scripts
def load_registry(runtime):
    node='global.window={};global.document=undefined;require(process.argv[1]);const A=window.DiceboundAssets,P=window.DiceboundPowerupArt;console.log(JSON.stringify({files:A.files,manifest:A.manifest,powerupNames:P?.nameKeys||{}}));'
    p=subprocess.run(["node","-e",node,str(runtime/"js/assets.js")],text=True,capture_output=True)
    if p.returncode: fail(f"Could not load asset registry: {p.stderr or p.stdout}")
    return json.loads(p.stdout)
def count(root,expected):
    got=len(list(root.glob("*.png")))
    if got!=expected: fail(f"expected {expected} PNGs in {root}, found {got}")
def collect_live_pointers(runtime):
    out={}
    for path in sorted(p for p in runtime.rglob("*") if p.is_file() and p.suffix.lower() in POINTER_SOURCE_EXTENSIONS):
        refs=sorted(set(POINTER_RX.findall(path.read_text(encoding="utf-8"))))
        if refs: out[path.relative_to(runtime).as_posix()]=refs
    return out

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[1]); ns=ap.parse_args()
    root=ns.root.resolve(); runtime=root/"runtime" if (root/"runtime").is_dir() else root
    scripts=runtime_scripts(runtime)
    for rel in scripts: check_js(runtime/rel)
    reg=load_registry(runtime); m=reg["manifest"]
    counts={"classes":len(m["classes"]),"pets":len(m["pets"]),"pet_battle_assets":sum(1 for entry in m["pets"].values() if entry.get("battle")),"normal_enemies":len(m["enemies"]),"normal_enemy_battle_assets":sum(len(entry.get("battleByBoard",{}))+(1 if entry.get("portrait") else 0) for entry in m["enemies"].values()),"normal_enemy_board_markers":sum(1 for entry in m["enemies"].values() if entry.get("boardMarker")),"minibosses":len(m["minibosses"]),"bosses":len(m["bosses"]),"secret_bosses":len(m["secretBosses"]),"board_backgrounds":len(m["board"]["backgrounds"]),"combat_backgrounds":len(m["combat"]["backgrounds"]["normal"]),"combat_effect_assets":sum(len(entry.get("frames",[]))+(1 if entry.get("image") else 0) for entry in m["combat"]["effects"].values()),"powerup_assets":len(m["powerups"]),"powerup_name_mappings":len(reg["powerupNames"]),"registry_files":len(reg["files"]),"equipment_assets":len(list((runtime/"assets/equipment").rglob("*.png")))}
    if not isinstance(m.get("version"),int) or m["version"]<1: fail(f"invalid asset registry version: {m.get('version')}")
    for k,v in EXPECTED.items():
        if counts[k]!=v: fail(f"{k}: expected {v}, got {counts[k]}")
    for rel in reg["files"]:
        p=runtime/rel
        if not p.is_file() or p.stat().st_size==0: fail(f"registry/preload target missing or empty: {rel}")
    for ctx in ("campsite","battle","markers"): count(runtime/f"assets/characters/classes/{ctx}",EXPECTED["classes"])
    count(runtime/"assets/characters/pets/portraits",13)
    count(runtime/"assets/characters/pets/battle",EXPECTED["pet_battle_assets"])
    for role,expected in (("minibosses",6),("bosses",6),("secret-bosses",3)):
        count(runtime/f"assets/enemies/{role}/battle",expected)
    for role,expected in (("normal",11),("minibosses",6),("bosses",6),("secret-bosses",3)):
        count(runtime/f"assets/enemies/{role}/board-markers",expected)
    count(runtime/"assets/enemies/normal/battle",EXPECTED["normal_enemy_battle_assets"])
    count(runtime/"assets/enemies/normal/board-markers",EXPECTED["normal_enemy_board_markers"])
    count(runtime/"assets/board/backgrounds",6)
    count(runtime/"assets/combat/backgrounds",6)
    count(runtime/"assets/combat/effects/nature",8)
    count(runtime/"assets/combat/effects/donut",1)
    count(runtime/"assets/combat/effects/gun",10)
    count(runtime/"assets/combat/effects/fire",9)
    loose_effects=list((runtime/"assets/combat/effects").glob("*.png"))
    if loose_effects: fail("combat proc PNGs must live in per-element folders: "+", ".join(p.name for p in loose_effects))
    inv=json.loads((runtime/"assets/ASSET_INVENTORY.json").read_text())
    for rel in inv.get("implemented",[]):
        if not (runtime/"assets"/rel).is_file(): fail(f"inventory implemented asset missing: {rel}")
    for rel in inv.get("staged",[]):
        if not (runtime/"assets"/rel).is_file(): fail(f"inventory staged asset missing: {rel}")
    for rel in inv.get("placeholderDocs",[]):
        if not (runtime/"assets"/rel).is_file(): fail(f"placeholder home missing: {rel}")
    bad={k for k in reg["powerupNames"].values() if k not in m["powerups"] and k not in m["ui"]["icons"]}
    if bad: fail("unknown powerup art keys: "+", ".join(sorted(bad)))

    # Check EVERY literal asset pointer in live runtime JS/CSS/HTML. Semantic pointers
    # must exist directly; historical pointers are permitted only under explicit
    # compatibility roots and every concrete file pointer must still resolve.
    pointer_sources=collect_live_pointers(runtime); pointers=sorted({x for refs in pointer_sources.values() for x in refs})
    unknown=[]; missing=[]
    for lit in pointers:
        if lit.startswith(SEMANTIC_ROOTS):
            if re.search(r"\.(?:png|ico|jpg|jpeg|webp|ogg|mp3|wav|webm)$",lit) and not (runtime/lit).is_file(): missing.append(lit)
            continue
        if not lit.startswith(LEGACY_PREFIXES): unknown.append(lit); continue
        if re.search(r"\.(?:png|ico|jpg|jpeg|webp|ogg|mp3|wav|webm)$",lit) and not (runtime/lit).is_file(): missing.append(lit)
    if unknown: fail("unclassified live runtime asset pointers: "+", ".join(unknown))
    if missing: fail("live runtime asset pointers no longer resolve: "+", ".join(missing))

    compat=["assets/enemies/portraits","assets/camp/backgrounds","assets/camp/objects","assets/pets/portraits","assets/ui/backgrounds","assets/ui/class-art","assets/ui/class-markers","assets/ui/icon","assets/ui/icons","assets/sounds"]
    for rel in compat:
        if not (runtime/rel).is_dir(): fail(f"compatibility mirror missing: {rel}")
    required=["assets/characters/random-class/campsite/README.md","assets/characters/random-class/markers/README.md","assets/camp/mode-toggles/hell/README.md","assets/equipment/gloves/README.md","assets/powerups/placeholders/README.md","assets/enemies/minibosses/board-markers/README.md","assets/enemies/bosses/board-markers/README.md","assets/enemies/secret-bosses/board-markers/README.md","assets/combat/status-icons/README.md","assets/installer/splash/README.md"]
    for rel in required:
        if not (runtime/rel).is_file(): fail(f"future art home missing: {rel}")
    info=json.loads((runtime/"build-info.json").read_text()); bm=json.loads((runtime/"build-manifest.json").read_text())
    if bm.get("assetRegistryVersion")!=m["version"]: fail(f"build manifest asset registry version {bm.get('assetRegistryVersion')} does not match live registry {m['version']}")
    if info.get("runtimeScripts")!=scripts: fail(f"build-info runtimeScripts is stale; expected {scripts}, got {info.get('runtimeScripts')}")
    missing_core=[rel for rel in scripts if rel not in bm.get("files",{})]
    if missing_core: fail("build manifest is missing runtime script hashes: "+", ".join(missing_core))
    if info.get("developmentState")!="Unreleased": fail("runtime build metadata is not marked Unreleased")
    mode="git-unreleased"
    if info.get("browserContentHash") is None:
        if info.get("reproducible") is not False or bm.get("browserContentHash") is not None: fail("unhashed Git metadata is inconsistent")
    else:
        mode="materialized"; digest,payload_count=source_hash(runtime)
        if info.get("browserContentHash")!=digest or bm.get("browserContentHash")!=digest: fail("materialized content hash is stale")
        if bm.get("payloadFileCount") not in (None,payload_count): fail("payload file count is stale")
        for rel,expected in bm.get("files",{}).items():
            p=runtime/rel
            if not p.is_file() or sha256_file(p)!=expected: fail(f"materialized core manifest mismatch: {rel}")
    print(json.dumps({"status":"pass","assetRegistryVersion":m["version"],"counts":counts,"canonicalRegistryFilesResolved":len(reg["files"]),"liveRuntimePointerSources":pointer_sources,"liveRuntimePointersClassified":len(pointers),"legacyCompatibilityRoots":compat,"buildMetadataMode":mode,"visualSmoke":"not-run-by-this-static-auditor"},indent=2))
    return 0
if __name__=="__main__": sys.exit(main())
