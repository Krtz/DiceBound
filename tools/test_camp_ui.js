#!/usr/bin/env node
/* Deterministic contract checks for the extracted Camp presentation owner. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'runtime/js/ui/camp.js'),'utf8');
const sandbox={window:{},console,setTimeout,clearTimeout};
sandbox.window.window=sandbox.window;
vm.runInNewContext(source,sandbox,{filename:'camp.js'});

const camp=sandbox.window.DiceboundCamp;
assert(camp,'Camp module should publish its one public owner');
assert.deepStrictEqual([...camp.layouts].map(layout=>layout.id),['wide-desktop','compact-desktop','stacked-or-short']);
assert.strictEqual(camp.layoutForViewport(1360,650).id,'wide-desktop');
assert.strictEqual(camp.layoutForViewport(1359,650).id,'compact-desktop');
assert.strictEqual(camp.layoutForViewport(999,900).id,'stacked-or-short');
assert.strictEqual(camp.layoutForViewport(1600,640).id,'stacked-or-short');
assert.strictEqual(typeof camp.ensureOptionsButton,'function','Camp owns the semantic Options object too');
assert.strictEqual(typeof camp.applyStageLayout,'function','Camp must own one final stage-layout writer');
assert(Object.isFrozen(camp.stageAnchors),'stage anchors should not be mutable by late patch code');
assert.deepStrictEqual(Object.keys(camp.stageAnchors),['campOptionsBtn','campTalentBtn','campMoonBtn','campNightmareBtn','campHellBtn','campClassBtn','campInfoBtn','campBonfire','campGoBtn','campChestBtn','campAchievementBtn','campPetBtn']);
assert.deepStrictEqual({...camp.stageAnchors.campOptionsBtn},{x:.085,y:.105,w:110},'Options must retain its approved stage anchor');
assert.deepStrictEqual({...camp.stageAnchors.campClassBtn},{x:.39,y:.55,w:235},'Class Choice must sit 10% lower on the authored Camp stage');
assert.deepStrictEqual({...camp.stageAnchors.campInfoBtn},{x:.26,y:.78,w:145},'Info must sit in the lower-left flow between Pet and Trophy');
assert.deepStrictEqual({...camp.stageAnchors.campBonfire},{x:.50,y:.72,w:170},'Bonfire must remain grounded in the lower clearing');
assert.deepStrictEqual({...camp.stageAnchors.campGoBtn},{x:.85,y:.74,w:440,h:250},'Start Run must remain a major lower-right scene anchor with a matching hit area');
assert.deepStrictEqual({...camp.stageAnchors.campChestBtn},{x:.64,y:.76,w:245,h:150},'Chest must remain lower-middle/right without overlapping Start Run');
assert.deepStrictEqual({...camp.stageAnchors.campPetBtn},{x:.39,y:.80,w:220},'Pet Choice must sit 10% lower on the authored Camp stage');
assert.ok(camp.stageAnchors.campPetBtn.x>camp.stageAnchors.campInfoBtn.x&&camp.stageAnchors.campInfoBtn.x>camp.stageAnchors.campAchievementBtn.x,'Pet, Info and Trophy must retain their left-side visual flow');
assert.deepStrictEqual({...camp.stageFrame(1360,800)},{left:0,top:17.5,width:1360,height:765,scale:.85},'wide Camp must fit the authored 16:9 stage without distortion');
assert.deepStrictEqual({...camp.stageFrame(1200,540)},{left:120,top:0,width:960,height:540,scale:.68},'short/wide Camp must letterbox rather than eject objects off-screen');
assert.deepStrictEqual({...camp.stageFrame(1120,760)},{left:0,top:65,width:1120,height:630,scale:.7},'compact Camp must preserve the stage center and scale');

for(const layout of camp.layouts.slice(0,2)){
  const rules=Object.fromEntries(layout.rules);
  assert.equal(rules['#campOptionsBtn'],'left:8.5%;top:10.5%;translate:none',`${layout.id} must use the approved visible Options anchor`);
  assert.equal(rules['#campTalentBtn'],'left:30.5%;top:12.5%;translate:none',`${layout.id} must use the approved visible Talents anchor`);
  assert.equal(rules['#campMoonBtn'],'left:48%;top:11.5%;translate:none',`${layout.id} must use the approved visible Prestige anchor`);
  assert.equal(rules['#campClassBtn'],'left:39%;top:55%;translate:none',`${layout.id} must place Class Choice 10% lower`);
  assert.equal(layout.rules.length,4,`${layout.id} must not retain translated legacy Camp coordinates`);
}
const shortRules=Object.fromEntries(camp.layouts[2].rules);
assert.equal(shortRules['#campTalentBtn'],'left:30.5%;top:18%;translate:none','short Camp layout must keep the full Talent artwork entirely onscreen');
assert.equal(shortRules['#campMoonBtn'],'left:48%;top:20%;translate:none','short Camp layout must keep Prestige entirely onscreen');
assert.equal(shortRules['#campClassBtn'],'left:39%;top:68%;translate:none','short Camp layout must move Class Choice 10% downward');
assert.equal(typeof camp.applyViewportPositions,'function','Camp must reassert its coordinates after legacy inline layout writes');
assert.equal(typeof camp.clampShortViewportPositions,'function','Camp must keep short desktop controls inside the viewport');
assert.equal(typeof camp.renderClassFigure,'function','Camp must own semantic selected-class figure rendering');
assert.match(source,/db058-camp-class-fullbody/,'Camp selected class must use the approved full-body art class');
assert.doesNotMatch(source,/renderClassPortrait/,'Camp must not use the portrait-card renderer');
assert.doesNotMatch(source,/assets\/ui\/class-art/,'Camp must not fall back to the retired portrait-art compatibility path');
assert.equal(typeof camp.renderPetFigure,'function','Camp must own semantic selected-pet figure rendering');
assert.match(source,/camp-pet-portrait/,'Camp selected Pet must use Camp-owned semantic art');

const ids=[...camp.requiredSemanticIds()];
for(const id of ['campTalentBtn','campInfoBtn','campMoonBtn','campOptionsBtn','campNightmareBtn','campHellBtn','campClassBtn','campPetBtn','campChestBtn','campAchievementBtn','campGoBtn'])assert(ids.includes(id),`missing semantic Camp control ${id}`);
assert(Object.isFrozen(camp.layouts),'layout definitions should not be mutable by late patch code');
assert.doesNotMatch(source,/positionedLayoutControls/,'Camp must not retain the old partial-coordinate reassertion helper');
assert.match(source,/function applyStageLayout\(/,'Camp must own the complete 16:9 stage calculation');
assert.match(source,/function stageSpec\(/,'Camp must derive each object position from one stage-anchor table');
assert.doesNotMatch(source,/data-db064-hit-target="painted-object"/,'Camp layout rules must not retain late translated hit-target patches');

const monolith=fs.readFileSync(path.join(root,'runtime/js/dicebound.js'),'utf8');
const rewards=fs.readFileSync(path.join(root,'runtime/js/events/reward-policy.js'),'utf8');
const stylesheet=fs.readFileSync(path.join(root,'runtime/css/dicebound.css'),'utf8');
const assets=fs.readFileSync(path.join(root,'runtime/js/assets.js'),'utf8');
const chooser=fs.readFileSync(path.join(root,'runtime/js/ui/class-chooser.js'),'utf8');
assert.match(assets,/campFigure:`\$\{paths\.classBattle\}\/\$\{id\}\.png/, 'the Camp class semantic must resolve full-body art');
assert.match(assets,/headshot:`\$\{paths\.classCampsite\}\/\$\{id\}\.png/, 'chooser-card headshots must retain their own semantic path');
assert.match(chooser,/art\?\.headshot\|\|art\?\.campsite\|\|art\?\.battle/, 'the Class chooser must preserve its compact headshot preference');
assert(monolith.includes('const db064Camp=window.DiceboundCamp;'),'monolith should configure the extracted Camp owner');
assert(!monolith.includes('function db064PaintedCampBounds('),'painted hit-target implementation must not remain in the monolith');
assert(!monolith.includes('function db058SetArt('),'Camp authored-art implementation must not remain in the monolith');
assert(!monolith.includes('const scene=document.createElement(\'div\');scene.id=\'campScene\';'),'Camp scene construction must not remain in the monolith');
assert(monolith.includes('function beta042EnsureCampOptions(){return window.DiceboundCamp?.ensureOptionsButton();}'),'the legacy Options caller must remain a thin Camp adapter');
assert.doesNotMatch(monolith,/renderClassPortrait:\(element,classId\)=>applyClassPortrait/,'the Camp adapter must not retain the portrait-card art path');
assert.doesNotMatch(monolith,/campClassIcon\.dataset\.portraitClass!==String\(selectedClassId/,'legacy Camp refresh must not repaint the Class figure as a portrait card');
assert.doesNotMatch(monolith,/db059SetPetArt\(\$\('campPetIcon'\)/,'legacy Pet art must not repaint the Camp figure outside the Camp owner');
assert(monolith.includes('window.DiceboundCamp?.refreshArt?.();'),'legacy Camp refresh must delegate Class art to the Camp owner');
assert.doesNotMatch(monolith,/db0633CampObjectMarkup|db0633AttachCampObject|db0633BindCampObject/,'progression may decide reveals, but Camp must own the controls it creates');
assert.doesNotMatch(monolith,/const v23CampRefresh=/,'the monolith must not reassert Camp scene dimensions after the stage owner refreshes');
assert.doesNotMatch(monolith,/\.legacy-camp-modal\{max-width:1100px/,'historical Camp base styles must live with the Camp owner');
assert.doesNotMatch(monolith,/#startOverlay\.camp-fullscreen/,'the monolith must not retain any final Camp stylesheet block');
assert.match(source,/function syncProgressionReveals\(/,'Camp must own progression-controlled object DOM lifecycle');
assert.match(source,/function syncHeirloomStorageChest\(/,'Camp must remove the Chest entirely until Storage is unlocked');
assert.match(source,/button\.hidden=!unlocked/,'locked modes must remove their painted control from layout and hit testing');
assert.match(source,/function hideLegacyCampDestinations\(/,'Camp must own the hiding of legacy mode/storage inputs recreated by older paths');
assert.match(source,/#startOverlay\.camp-fullscreen #nightmareBox,#startOverlay\.camp-fullscreen #hellBox,#startOverlay\.camp-fullscreen #startHeirloom\{display:none!important\}/,'Camp fullscreen must suppress all legacy mode/storage presentation at the destination layer');
assert.match(source,/assets\/camp\/interactions\/talent-star\.png/,'Camp Talents must resolve the canonical interaction asset');
assert.doesNotMatch(source,/assets\/camp\/objects\/talent-star\.png/,'Camp must not retain an obsolete Talent-object fallback pointer');
assert.match(source,/campGoBtn:Object\.freeze\(\{x:\.85,y:\.74,w:440,h:250\}\)/,'Start Run must retain its minimum authored scene footprint');
assert.match(source,/const CAMP_BASE_STYLE=/,'Camp must own its responsive base/grid presentation style');
for(const retiredCampLayer of ['function beta043RefreshCampIcons(','function beta045RefreshCampLayout(','function db046RefreshCamp(','function db047RefreshCamp(','const db055Style=','const db057Style=','const db058Style=','const db0510Style=','const db0512Style=','const db060CampStyle='])assert(!monolith.includes(retiredCampLayer),`retired Camp style/wrapper remains in dicebound.js: ${retiredCampLayer}`);
assert.doesNotMatch(monolith,/#startOverlay\.camp-fullscreen #camp(?:Options|Talent|Moon|Class|Info|Pet|Chest|Achievement|Go|Nightmare|Hell)Btn/,'monolith must not retain final Camp-object CSS ownership');
assert.doesNotMatch(stylesheet,/Alpha 3\.1(?: asset-backed camp art|\.2 campsite composition|\.3 — caravan start control)/,'shared stylesheet must not retain historical Camp presentation ownership');
assert.doesNotMatch(stylesheet,/#startOverlay\.camp-fullscreen \.camp-(?:scene|ground|sky|spot|bonfire|popup|panel|journey)/,'shared stylesheet must not retain final Camp layout ownership');
for(const retiredRewardPolicyOwner of ['campAnchors','function scaleCamp(','#startOverlay.camp-fullscreen','#campScene .camp-spot'])assert(!rewards.includes(retiredRewardPolicyOwner),`event reward policy retained Camp presentation ownership: ${retiredRewardPolicyOwner}`);

assert.match(source,/\.camp-panel\.active > \.camp-panel-head\{position:sticky!important;top:0!important/,'Camp panel header must stay visible while panel content scrolls');
assert.match(source,/\.camp-panel-head \.camp-close-btn\{margin-left:auto!important/,'Camp Done/Exit control must stay pinned to the top-right header');

console.log('Camp UI owner PASS: deterministic layouts, semantic controls and monolith drain contract');
