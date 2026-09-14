from pathlib import Path

path = Path(__file__).resolve().parent / "test_powerups_oracle.js"
source = path.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one {label} fragment, found {count}")
    source = source.replace(old, new)


replace_once(
    "{const before=restore('achievement-gate',{metaPatch:{achievements:{}}});const locked=power.eligible().some(x=>x.id==='plague_lord');progression.patchMeta({achievements:{nature_master:true}});const unlocked=power.eligible().some(x=>x.id==='plague_lord');finish({name:'achievement-gate',locked,unlocked,gate:progression.achievementGate('nature_master')},before);}",
    "{const before=restore('achievement-gate',{metaPatch:{elementProgress:{nature:499}}});const locked=power.eligible().some(x=>x.id==='plague_lord'),gateBefore=progression.achievementGate('nature_master');progression.patchMeta({elementProgress:{nature:500}});const unlocked=power.eligible().some(x=>x.id==='plague_lord'),gateAfter=progression.achievementGate('nature_master');finish({name:'achievement-gate',locked,unlocked,gateBefore,gateAfter},before);}",
    "achievement-gate",
)

replace_once(
    "{const before=restore('unique-exclusion',{playerPatch:{upgradeCounts:{}}});const initial=power.eligible().some(x=>x.id==='legendary_golden_law');progression.patchPlayer({upgradeCounts:{legendary_golden_law:1}});const after=power.eligible().some(x=>x.id==='legendary_golden_law');finish({name:'unique-exclusion',initial,after},before);}",
    "{const before=restore('unique-exclusion',{playerPatch:{upgradeCounts:{}}});const initial=power.eligible().some(x=>x.id==='execute');progression.patchPlayer({upgradeCounts:{execute:1}});const after=power.eligible().some(x=>x.id==='execute');finish({name:'unique-exclusion',id:'execute',initial,after},before);}",
    "unique-exclusion",
)

old_cleanup = "} finally {try{page?.socket?.close();}catch(_){}try{child?.kill();}catch(_){}await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true});}"
new_cleanup = """} finally {try{page?.socket?.close();}catch(_){}try{child?.kill();}catch(_){}if(process.platform==='win32'&&child?.pid){try{childProcess.spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch(_){}}await sleep(500);await new Promise(r=>server.close(r));try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:12,retryDelay:150});}catch(err){console.warn(`Powerups oracle temp-profile cleanup warning: ${err.message}`);}}"""
replace_once(old_cleanup, new_cleanup, "cleanup")

anchor = "  assert.equal(actual.cases.find(c=>c.name===\"apply-d20\")?.rngCalls,1,\"D20 Powerup application must consume exactly one RNG draw\");\n"
extra = (
    "  assert.deepEqual({locked:actual.cases.find(c=>c.name===\"achievement-gate\")?.locked,unlocked:actual.cases.find(c=>c.name===\"achievement-gate\")?.unlocked,gateBefore:actual.cases.find(c=>c.name===\"achievement-gate\")?.gateBefore,gateAfter:actual.cases.find(c=>c.name===\"achievement-gate\")?.gateAfter},{locked:false,unlocked:true,gateBefore:false,gateAfter:true},\"nature_master must stay locked at 499 Nature progress and unlock exactly at 500\");\n"
    "  assert.deepEqual({initial:actual.cases.find(c=>c.name===\"unique-exclusion\")?.initial,after:actual.cases.find(c=>c.name===\"unique-exclusion\")?.after},{initial:true,after:false},\"ungated Unique power execute must be eligible once then excluded by upgradeCounts\");\n"
)
replace_once(anchor, anchor + extra, "semantic assertion anchor")

path.write_text(source, encoding="utf-8")
print("Powerups oracle harness evidence/cleanup patch applied")
