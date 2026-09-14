from pathlib import Path

ROOT=Path('.')
LIFECYCLE=ROOT/'runtime/js/progression/lifecycle.js'
DICE=ROOT/'runtime/js/dicebound.js'
OWNER_TEST=ROOT/'tools/test_progression_owner.js'


def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)

# Public Progression facade: expose the existing focused Prestige domain through
# the ordinary subsystem boundary. The pure math/state rules stay in
# progression/prestige.js; this facade only coordinates the live career state.
lifecycle=LIFECYCLE.read_text(encoding='utf-8')
anchor="""  function completePrestige(total){
    const rewards=prestigeOffer(total),remainder=Math.max(0,Number(total)||0)%9;
    if(rewards<1)return false;
    const state=meta();state.prestige=PRESTIGE.award(state.prestige,rewards);state.purchased={};state.level=1;state.xp=0;state.xpNext=legacyXpForLevel(1);state.points=remainder;
    call('hidePrestigeHeirloomOverlay');
    if(call('storageUnlocked'))call('syncStorage');
    const cap=call('getHeirloomSlots');state.heirlooms=(state.heirlooms||[]).slice(0,cap).map(item=>call('normalizeSavedItem',item));
    call('saveMeta');checkDynamicClassUnlocks();call('sfxHoly');call('showToast',`Prestige gained ${rewards} unspent Prestige Point${rewards===1?'':'s'}`);call('renderTalents');call('updateMetaUI');call('openStartScreen');return true;
  }

"""
moon_methods="""  function prestigeInspect(){return PRESTIGE.inspect(meta().prestige);}
  function prestigePurchase(id){
    const state=meta(),result=PRESTIGE.purchase(state.prestige,id,()=>call('random'));
    if(result.ok)state.prestige=result.prestige;
    return result;
  }
  function prestigeRefundAll(){const state=meta(),result=PRESTIGE.refundAll(state.prestige);state.prestige=result.prestige;return result;}
  function prestigeFormatStats(stats){return PRESTIGE.formatStats(stats);}

"""
if anchor not in lifecycle:
    raise SystemExit('Prestige lifecycle anchor missing')
lifecycle=lifecycle.replace(anchor,anchor+moon_methods,1)
old_api="    legacyXpForLevel,grantLegacyXp,finalizeRun,prestigeOffer,completePrestige,\n"
new_api="    legacyXpForLevel,grantLegacyXp,finalizeRun,prestigeOffer,completePrestige,prestigeInspect,prestigePurchase,prestigeRefundAll,prestigeFormatStats,\n"
lifecycle=replace_once(lifecycle,old_api,new_api,'Progression Prestige facade exports')
LIFECYCLE.write_text(lifecycle,encoding='utf-8',newline='\n')

# Compatibility runtime: route ordinary Prestige Moon/summary consumers and the
# characterization surface through DiceboundProgression. Keep the low-level
# Prestige domain available only for bootstrap/storage internals that are
# explicitly outside this public-facade slice.
dice=DICE.read_text(encoding='utf-8')
dice=replace_once(
    dice,
    "    getTilesMovedThisRun:()=>tilesMovedThisRun,isNightmare:()=>!!nightmareMode,updateMetaUI:()=>updateMetaUI(),",
    "    getTilesMovedThisRun:()=>tilesMovedThisRun,isNightmare:()=>!!nightmareMode,random:()=>random(),updateMetaUI:()=>updateMetaUI(),",
    'Progression RNG composition callback'
)
dice=replace_once(
    dice,
    "  function prestigeSummary(){return DB_PRESTIGE.inspect(meta.prestige||defaultPrestige()).permanentSummary;}",
    "  function prestigeSummary(){return dbProgression.prestigeInspect().permanentSummary;}",
    'Prestige summary facade routing'
)
dice=replace_once(
    dice,
    "      return {prestige:DB_PRESTIGE.inspect(meta.prestige),canPrestige:offer>0,prestigeOffer:offer,prestigeDescription:'Every 9 total Talent Points becomes one unspent Prestige Point. Each unspent point grants one held stat point.',status:'Moon Forge cost is intentionally TBD until balance review.'};",
    "      return {prestige:dbProgression.prestigeInspect(),canPrestige:offer>0,prestigeOffer:offer,prestigeDescription:'Every 9 total Talent Points becomes one unspent Prestige Point. Each unspent point grants one held stat point.',status:'Moon Forge cost is intentionally TBD until balance review.'};",
    'Prestige Moon inspect routing'
)
dice=replace_once(
    dice,
    "      const result=DB_PRESTIGE.purchase(meta.prestige,id,random);\n      if(!result.ok){showToast(result.reason);return result;}\n      meta.prestige=result.prestige;",
    "      const result=dbProgression.prestigePurchase(id);\n      if(!result.ok){showToast(result.reason);return result;}",
    'Prestige Moon purchase routing'
)
dice=replace_once(
    dice,
    "else showToast(`${result.node.label}: ${DB_PRESTIGE.formatStats(result.stats)}.`);",
    "else showToast(`${result.node.label}: ${dbProgression.prestigeFormatStats(result.stats)}.`);",
    'Prestige Moon stat copy routing'
)
dice=replace_once(
    dice,
    "      const current=DB_PRESTIGE.inspect(meta.prestige);",
    "      const current=dbProgression.prestigeInspect();",
    'Prestige Moon refund inspect routing'
)
dice=replace_once(
    dice,
    "      const result=DB_PRESTIGE.refundAll(meta.prestige);meta.prestige=result.prestige;saveMeta();updateMetaUI();showToast(`Refunded ${result.refunded} Prestige Point${result.refunded===1?'':'s'}.`);return true;",
    "      const result=dbProgression.prestigeRefundAll();saveMeta();updateMetaUI();showToast(`Refunded ${result.refunded} Prestige Point${result.refunded===1?'':'s'}.`);return true;",
    'Prestige Moon refund routing'
)
dice=replace_once(
    dice,
    "    prestigeInspect:()=>dbRunClone(DB_PRESTIGE.inspect(meta.prestige)),\n    prestigeDomainPurchase:id=>{const result=DB_PRESTIGE.purchase(meta.prestige,id,random);if(result.ok)meta.prestige=result.prestige;return dbRunClone(result);},\n    prestigeDomainRefund:()=>{const result=DB_PRESTIGE.refundAll(meta.prestige);meta.prestige=result.prestige;return dbRunClone(result);},",
    "    prestigeInspect:()=>dbRunClone(dbProgression.prestigeInspect()),\n    prestigeDomainPurchase:id=>dbRunClone(dbProgression.prestigePurchase(id)),\n    prestigeDomainRefund:()=>dbRunClone(dbProgression.prestigeRefundAll()),",
    'Progression oracle Prestige-domain facade routing'
)
DICE.write_text(dice,encoding='utf-8',newline='\n')

# Strengthen permanent ownership guards: ordinary Moon/summary code must not
# regress to direct Prestige-domain state mutation after this wave.
test=OWNER_TEST.read_text(encoding='utf-8')
test=replace_once(
    test,
    'for(const owned of ["achievementDone","achievementConditionText","achievementRewardText","achievementGateUnlocked","heroMasteryEntries","achievementCount","isClassUnlocked","commitClassUnlock","unlockClass","checkDynamicClassUnlocks"])',
    'for(const owned of ["prestigeInspect","prestigePurchase","prestigeRefundAll","prestigeFormatStats","achievementDone","achievementConditionText","achievementRewardText","achievementGateUnlocked","heroMasteryEntries","achievementCount","isClassUnlocked","commitClassUnlock","unlockClass","checkDynamicClassUnlocks"])',
    'Progression owned capability list'
)
insert='''assert.ok(monolith.includes("function prestigeSummary(){return dbProgression.prestigeInspect().permanentSummary;}"),"Prestige summary must route through DiceboundProgression");
assert.ok(monolith.includes("const result=dbProgression.prestigePurchase(id);"),"Prestige Moon purchases must route through DiceboundProgression");
assert.ok(monolith.includes("const result=dbProgression.prestigeRefundAll();"),"Prestige Moon refunds must route through DiceboundProgression");
for(const shadow of ["DB_PRESTIGE.purchase(meta.prestige,id,random)","DB_PRESTIGE.refundAll(meta.prestige)","DB_PRESTIGE.inspect(meta.prestige)"])assert.ok(!monolith.includes(shadow),`ordinary Prestige Moon shadow remains: ${shadow}`);
'''
needle='assert.ok(monolith.includes("function achievementGateUnlocked(gate){return dbProgression.achievementGateUnlocked(gate);}"),"ordinary powerup gates must route through DiceboundProgression");\n'
if needle not in test:
    raise SystemExit('Progression owner assertion anchor missing')
test=test.replace(needle,insert+needle,1)
test=replace_once(
    test,
    'console.log("Progression owner PASS: Talent/Legacy/Prestige/Achievement/class-unlock orchestration routes through DiceboundProgression.");',
    'console.log("Progression owner PASS: Talent/Legacy/Prestige Moon/reset/Achievement/class-unlock orchestration routes through DiceboundProgression.");',
    'Progression owner success copy'
)
OWNER_TEST.write_text(test,encoding='utf-8',newline='\n')

print('Progression Prestige Moon facade routing staged.')
