from pathlib import Path
import re

MONOLITH = Path("runtime/js/dicebound.js")
TEST = Path("tools/test_pets_lifecycle.js")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match, found {count}")
    return out


# Runtime composition: final released feed semantics now live in pets/lifecycle.js,
# so give that owner the two presentation callbacks its final wrapper contract needs.
text = MONOLITH.read_text(encoding="utf-8")
text = replace_once(
    text,
    '''    addLog:text=>addLog(text),updateMetaUI:()=>updateMetaUI(),updateHUD:()=>updateHUD()\n  });''',
    '''    addLog:text=>addLog(text),updateMetaUI:()=>updateMetaUI(),updateHUD:()=>updateHUD(),\n    renderPetCollection:()=>renderPetCollection(),refreshActivePetArt:()=>db059RefreshActivePetArt?.()\n  });''',
    "Pet lifecycle presentation callback wiring",
)

# Retire the later V27 feed implementation. The earlier compatibility name stays a
# one-line facade forwarder, while the implementation itself now has one owner.
text = regex_once(
    text,
    r'''  // Feeding and pet level-ups are quiet too\. The campsite/pet card updates\n  // immediately, which is enough feedback without queueing extra toasts\.\n  feedActivePet=function\(count=1\)\{\n.*?\n  \};\n''',
    '',
    "V27 feed shadow",
)

# Retire the Friends-patch return/art wrapper too; pets/lifecycle.js deliberately
# preserves that exact frozen-result + active-art-refresh behavior now.
text = regex_once(
    text,
    r'''  const dbFriendFeedActivePetBase=feedActivePet;\n  feedActivePet=function\(count=1\)\{\n.*?\n  \};\n''',
    '',
    "Friends feed shadow",
)

# These V1.7 compatibility names have no remaining callers after facade routing.
text = replace_once(
    text,
    '''  // ---- Pet bond scaling ----------------------------------------------------\n  function v17PetBondLevel(id){return dbPets.bondLevel(id);}\n  function v17PetBonusScale(id){return dbPets.bonusScale(id);}\n  function v17PetDamageExtra(id){return dbPets.damageExtra(id);}\n  function v17PetBonusText(id){return dbPets.bonusText(id);}\n\n''',
    '''  // ---- Pet bond scaling is owned by DiceboundPets / pets/lifecycle.js. -----\n\n''',
    "dead V1.7 Pet aliases",
)
MONOLITH.write_text(text, encoding="utf-8", newline="\n")

# Strengthen the focused owner test so the presentation/API behavior that exposed
# the previous oracle blind spot is permanently guarded too.
test = TEST.read_text(encoding="utf-8")
test = replace_once(
    test,
    '''let runActive=false,petClass=false,saveCount=0,unlockChecks=0,levelSfx=0,coinSfx=0,holySfx=0,metaUpdates=0,hudUpdates=0;''',
    '''let runActive=false,petClass=false,saveCount=0,unlockChecks=0,levelSfx=0,coinSfx=0,holySfx=0,metaUpdates=0,hudUpdates=0,petCollectionRenders=0,activePetArtRefreshes=0;''',
    "Pet lifecycle test counters",
)
test = replace_once(
    test,
    '''  showToast:(...args)=>toasts.push(args),addLog:text=>logs.push(text),updateMetaUI:()=>{metaUpdates++;},updateHUD:()=>{hudUpdates++;}\n});''',
    '''  showToast:(...args)=>toasts.push(args),addLog:text=>logs.push(text),updateMetaUI:()=>{metaUpdates++;},updateHUD:()=>{hudUpdates++;},\n  renderPetCollection:()=>{petCollectionRenders++;},refreshActivePetArt:()=>{activePetArtRefreshes++;}\n});''',
    "Pet lifecycle test presentation callbacks",
)
test = replace_once(
    test,
    '''pets.feed(6);\nassert.deepEqual(JSON.parse(JSON.stringify(meta.pets.fire)),{unlocked:true,level:3,xp:2,xpNext:4,progress:0});\nassert.equal(meta.petCookies,14);assert.equal(saveCount,1);assert.equal(unlockChecks,1);assert.equal(levelSfx,1);assert.equal(coinSfx,0);''',
    '''const feedResult=pets.feed(6);\nassert.deepEqual(JSON.parse(JSON.stringify(meta.pets.fire)),{unlocked:true,level:3,xp:2,xpNext:4,progress:0});\nassert.equal(meta.petCookies,14);assert.equal(saveCount,1);assert.equal(unlockChecks,1);assert.equal(levelSfx,1);assert.equal(coinSfx,0);\nassert.equal(feedResult.ok,true);assert.equal(feedResult.spent,6);assert.equal(feedResult.level,3);assert.equal(Object.isFrozen(feedResult),true,'feed result must retain the final frozen compatibility contract');\nassert.equal(toasts.length,0,'feeding must remain quiet instead of queueing a toast');assert(logs.at(-1).includes('ate <b>6</b> cookies'));\nassert.equal(petCollectionRenders,1,'successful feeding must refresh the Pet collection');assert.equal(activePetArtRefreshes,1,'feeding must refresh active Pet art');\nmeta.petCookies=0;const noFeed=pets.feed(1);assert.equal(noFeed,false);assert.equal(petCollectionRenders,1,'no-op feed must not rerender the collection');assert.equal(activePetArtRefreshes,2,'final wrapper semantics refresh active Pet art even for a no-op feed');''',
    "final feed API/presentation assertions",
)
test = replace_once(
    test,
    '''assert.match(monolith,/syncActivePetBonus:force=>dbPets\\.syncActiveBonus\\(force\\)/,'Player Initialization must route active Pet sync through facade');\nassert.doesNotMatch(monolith,/const PET_STAT_BONUSES=\\{/,'historical Pet stat-bonus implementation must leave the monolith');''',
    '''assert.match(monolith,/syncActivePetBonus:force=>dbPets\\.syncActiveBonus\\(force\\)/,'Player Initialization must route active Pet sync through facade');\nassert.match(monolith,/renderPetCollection:\\(\\)=>renderPetCollection\\(\\),refreshActivePetArt:\\(\\)=>db059RefreshActivePetArt\\?\\.\\(\\)/,'Pet lifecycle composition must provide final feed presentation callbacks');\nassert.doesNotMatch(monolith,/feedActivePet=function\\(count=1\\)/,'late feed implementation reassignments must be retired');\nassert.doesNotMatch(monolith,/dbFriendFeedActivePetBase/,'Friends feed compatibility wrapper must be retired');\nassert.doesNotMatch(monolith,/function v17PetBondLevel\\(/,'dead V1.7 Pet bond aliases must be retired');\nassert.doesNotMatch(monolith,/function v17PetBonusScale\\(/,'dead V1.7 Pet bonus-scale aliases must be retired');\nassert.doesNotMatch(monolith,/function v17PetDamageExtra\\(/,'dead V1.7 Pet damage aliases must be retired');\nassert.doesNotMatch(monolith,/function v17PetBonusText\\(/,'dead V1.7 Pet text aliases must be retired');\nassert.doesNotMatch(monolith,/const PET_STAT_BONUSES=\\{/,'historical Pet stat-bonus implementation must leave the monolith');''',
    "Pet anti-shadow assertions",
)
test = replace_once(
    test,
    '''console.log('Pet lifecycle owner PASS: progression, switching, bond bonuses, facade routing and anti-shadow guards');''',
    '''console.log('Pet lifecycle owner PASS: progression, switching, final feed API/presentation, facade routing and anti-shadow guards');''',
    "Pet lifecycle test summary",
)
TEST.write_text(test, encoding="utf-8", newline="\n")

print("Pet lifecycle finalization patch applied.")
