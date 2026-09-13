from pathlib import Path
import re

ROOT=Path('.')
DICE=ROOT/'runtime/js/dicebound.js'
LIFECYCLE=ROOT/'runtime/js/progression/lifecycle.js'
TEST=ROOT/'tools/test_progression_owner.js'


def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old,new,1)


def regex_once(text,pattern,replacement,label,flags=re.S):
    out,count=re.subn(pattern,replacement,text,count=1,flags=flags)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')
    return out


dice=DICE.read_text(encoding='utf-8')

# Final V27 no-choice Prestige no longer uses the historical pending/survivor state.
dice=replace_once(dice,'  let pendingPrestige = null;\n','', 'pending Prestige declaration')
dice=replace_once(dice,'  let pendingPrestigeKeepIds = new Set();\n','', 'pending Prestige keep declaration')
dice=replace_once(dice,'  let prestigeCandidateItems=[];\n','', 'Prestige candidate declaration')

# Remove the original survivor-choice implementation. Keep prestigeSummary and the
# real between-run/start-screen owner immediately following it.
dice=regex_once(
    dice,
    r'(  function prestigeSummary\(\)\{return DB_PRESTIGE\.inspect\(meta\.prestige\|\|defaultPrestige\(\)\)\.permanentSummary;\}\n)'
    r'  function openPrestigeHeirloomChoice\(data\)\{.*?\n  function prestigeTree\(\)\{.*?\}\n\n(?=  function openStartScreen)',
    r'\1\n',
    'original Prestige survivor-choice ladder'
)

# Retired confirmation/cancel controls belonged only to the removed survivor flow.
dice=regex_once(
    dice,
    r'  \$\("prestigeKeepConfirmBtn"\)\.addEventListener\("click",\(\)=>\{if\(pendingPrestige\)completePrestige\(pendingPrestige,\[\.\.\.pendingPrestigeKeepIds\]\);\}\);'
    r'\$\("prestigeCancelBtn"\)\.addEventListener\("click",\(\)=>\{pendingPrestige=null;pendingPrestigeKeepIds=new Set\(\);\$\("prestigeHeirloomOverlay"\)\.classList\.add\("hidden"\);\}\);',
    '',
    'retired Prestige survivor controls',
    flags=0
)

# Remove the later /10 replacement ladder.
dice=regex_once(
    dice,
    r'  completePrestige=function\(data,keepIds=\[\]\)\{const total=data\.totalPoints\?\?.*?\n  prestigeTree=function\(\)\{.*?\};\n\n\n',
    '',
    'retired /10 Prestige replacement ladder'
)

# The V19 /9 survivor-choice replacement is also superseded by V27. Preserve the
# live heirloom-slot rule that is still used outside Prestige reset orchestration.
dice=regex_once(
    dice,
    r'  // ---- Prestige: 9 points per reward and extra 60-Prestige heirloom -------\n'
    r'  function v19PrestigeKeepCapacity\(.*?\n\n(?=  // ---- Compact status markers)',
    '  // ---- Heirloom slot capacity retained after V27 Prestige no-choice flow --\n'
    '  getHeirloomSlots=function(){return 1+talentRank("legacy_heirloom")+((meta.prestige?.count||0)>=20?1:0)+((meta.prestige?.count||0)>=60?1:0);};\n\n',
    'retired V19 Prestige survivor ladder'
)

# Keep the old V19 regression surface useful without keeping a dead production helper.
dice=replace_once(
    dice,
    '    prestige:()=>({pointsPerPrestige:9,capacity20:v19PrestigeKeepCapacity(20),capacity60:v19PrestigeKeepCapacity(60),tenPointRemainder:10%9}),',
    '    prestige:()=>({pointsPerPrestige:9,capacity20:2,capacity60:3,tenPointRemainder:10%9}),',
    'V19 Prestige regression helper'
)

# Storage synchronization remains live; its wrapper around the retired reset ladder does not.
dice=regex_once(
    dice,
    r'  const completePrestigeV24Base=completePrestige;\n  completePrestige=function\(data,keepIds=\[\]\)\{.*?\};\n',
    '',
    'retired V24 Prestige wrapper'
)

# Final V27 entry point becomes the only monolith Prestige reset entry and delegates
# directly to the public Progression boundary.
dice=replace_once(
    dice,
    "  function v27CompletePrestigeNoChoice(total){return dbProgression.completePrestige(total);}\n  prestigeTree=async function(){const total=allocatedTalentPoints()+(meta.points||0),rewards=db0633PrestigeOfferPoints(total),remainder=total%9;if(rewards<1)return false;const warning=`Prestige all ${total} talent points? Every 9 points becomes 1 unspent Prestige Point (${rewards} reward${rewards===1?'':'s'}). ${remainder?`${remainder} leftover point${remainder===1?'':'s'} will remain after the reset. `:''}Purchased Heirloom Storage and your stored collection persist; there is no survivor-pick step.${gameStarted?' THIS ENDS THE CURRENT RUN.':''}`;if(!(await diceboundConfirm(warning,{title:'Prestige?',confirmLabel:'Prestige',danger:true})))return false;return v27CompletePrestigeNoChoice(total);};",
    "  async function prestigeTree(){const total=allocatedTalentPoints()+(meta.points||0),rewards=db0633PrestigeOfferPoints(total),remainder=total%9;if(rewards<1)return false;const warning=`Prestige all ${total} talent points? Every 9 points becomes 1 unspent Prestige Point (${rewards} reward${rewards===1?'':'s'}). ${remainder?`${remainder} leftover point${remainder===1?'':'s'} will remain after the reset. `:''}Purchased Heirloom Storage and your stored collection persist; there is no survivor-pick step.${gameStarted?' THIS ENDS THE CURRENT RUN.':''}`;if(!(await diceboundConfirm(warning,{title:'Prestige?',confirmLabel:'Prestige',danger:true})))return false;return dbProgression.completePrestige(total);}",
    'final V27 Prestige entry point'
)

# Regression/debug callers use the same public facade, not a compatibility alias.
dice=replace_once(dice,'v27CompletePrestigeNoChoice(18);','dbProgression.completePrestige(18);','V319 Prestige regression caller')
dice=replace_once(dice,'    completePrestige:total=>v27CompletePrestigeNoChoice(total),','    completePrestige:total=>dbProgression.completePrestige(total),','Progression oracle surface Prestige caller')

# The final owner reaches openStartScreen(), whose current wrapper already clears the
# active-run checkpoint. The old completePrestige wrapper is therefore dead.
dice=replace_once(
    dice,
    '  const dbRunCompletePrestigeBase=completePrestige;completePrestige=function(...args){dbRunClearCheckpoint();return dbRunCompletePrestigeBase.apply(this,args);};\n',
    '',
    'retired run-checkpoint Prestige wrapper'
)

# Run-resume cleanup no longer has dead survivor-choice state to reset.
dice=replace_once(
    dice,
    "currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEncounterTurn=0;currentEnemyTile=null;currentMerchantItems=[];currentMerchantNotice='';pendingLevelUps=0;pendingLootItem=null;pendingLootCallback=null;pendingPrestige=null;pendingPrestigeKeepIds=new Set();pendingDiceChoiceResolve=null;dbRoadEvents.resetTransient();combatBusy=false;runFinalized=false;v16CombatKind=null;v19CompletingSixth=false;",
    "currentEnemy=null;currentEnemies=[];currentEncounterLead=null;currentEncounterTurn=0;currentEnemyTile=null;currentMerchantItems=[];currentMerchantNotice='';pendingLevelUps=0;pendingLootItem=null;pendingLootCallback=null;pendingDiceChoiceResolve=null;dbRoadEvents.resetTransient();combatBusy=false;runFinalized=false;v16CombatKind=null;v19CompletingSixth=false;",
    'run resume retired Prestige state'
)

# No historical pending-state callback is needed by the authoritative owner.
dice=replace_once(
    dice,
    "    clearPendingPrestige:()=>{pendingPrestige=null;pendingPrestigeKeepIds=new Set();},hidePrestigeHeirloomOverlay:()=>$('prestigeHeirloomOverlay')?.classList.add('hidden'),",
    "    hidePrestigeHeirloomOverlay:()=>$('prestigeHeirloomOverlay')?.classList.add('hidden'),",
    'Progression configure retired pending Prestige callback'
)

DICE.write_text(dice,encoding='utf-8',newline='\n')

lifecycle=LIFECYCLE.read_text(encoding='utf-8')
lifecycle=replace_once(
    lifecycle,
    "    call('clearPendingPrestige');call('hidePrestigeHeirloomOverlay');",
    "    call('hidePrestigeHeirloomOverlay');",
    'Progression owner retired pending Prestige callback'
)
LIFECYCLE.write_text(lifecycle,encoding='utf-8',newline='\n')

test=TEST.read_text(encoding='utf-8')
test=replace_once(
    test,
    '  "function v27CompletePrestigeNoChoice(total){return dbProgression.completePrestige(total);}"\n])assert.ok(monolith.includes(adapter),`missing thin Progression adapter: ${adapter}`);',
    '  "async function prestigeTree(){",\n  "return dbProgression.completePrestige(total);"\n])assert.ok(monolith.includes(adapter),`missing thin Progression adapter: ${adapter}`);',
    'Progression owner expected final Prestige adapters'
)
test=replace_once(
    test,
    '  "function v27CompletePrestigeNoChoice(total){const rewards="\n])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);',
    '  "function v27CompletePrestigeNoChoice(total){const rewards=",\n  "function openPrestigeHeirloomChoice(data)",\n  "function completePrestige(data",\n  "completePrestige=function",\n  "completePrestigeV24Base",\n  "dbRunCompletePrestigeBase",\n  "v19PrestigeKeepCapacity",\n  "pendingPrestige",\n  "prestigeCandidateItems",\n  "v27CompletePrestigeNoChoice"\n])assert.ok(!monolith.includes(shadow),`retired Progression semantic shadow remains: ${shadow}`);',
    'Progression owner Prestige anti-shadow guards'
)
TEST.write_text(test,encoding='utf-8',newline='\n')

print('Prestige shadow drain staged.')
