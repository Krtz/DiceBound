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
assert.deepStrictEqual({...camp.stageAnchors.campClassBtn},{x:.225,y:.405,w:235},'Class must retain its approved full-body stage anchor');
assert.deepStrictEqual({...camp.stageFrame(1360,800)},{left:0,top:17.5,width:1360,height:765,scale:.85},'wide Camp must fit the authored 16:9 stage without distortion');
assert.deepStrictEqual({...camp.stageFrame(1200,540)},{left:120,top:0,width:960,height:540,scale:.68},'short/wide Camp must letterbox rather than eject objects off-screen');
assert.deepStrictEqual({...camp.stageFrame(1120,760)},{left:0,top:65,width:1120,height:630,scale:.7},'compact Camp must preserve the stage center and scale');

for(const layout of camp.layouts.slice(0,2)){
  const rules=Object.fromEntries(layout.rules);
  assert.equal(rules['#campOptionsBtn'],'left:8.5%;top:10.5%;translate:none',`${layout.id} must use the approved visible Options anchor`);
  assert.equal(rules['#campTalentBtn'],'left:31.5%;top:12.5%;translate:none',`${layout.id} must use the approved visible Talents anchor`);
  assert.equal(rules['#campMoonBtn'],'left:42.5%;top:11.5%;translate:none',`${layout.id} must use the approved visible Prestige anchor`);
  assert.equal(rules['#campClassBtn'],'left:22.5%;top:40.5%;translate:none',`${layout.id} must use the approved Class figure anchor`);
  assert.equal(layout.rules.length,4,`${layout.id} must not retain translated legacy Camp coordinates`);
}
const shortRules=Object.fromEntries(camp.layouts[2].rules);
assert.equal(shortRules['#campTalentBtn'],'left:31.5%;top:18%;translate:none','short Camp layout must keep the full Talent artwork entirely onscreen');
assert.equal(shortRules['#campMoonBtn'],'left:42.5%;top:24%;translate:none','short Camp layout must keep Prestige entirely onscreen');
assert.equal(typeof camp.applyViewportPositions,'function','Camp must reassert its coordinates after legacy inline layout writes');
assert.equal(typeof camp.clampShortViewportPositions,'function','Camp must keep short desktop controls inside the viewport');
assert.equal(typeof camp.renderClassFigure,'function','Camp must own semantic selected-class figure rendering');
assert.match(source,/db058-camp-class-fullbody/,'Camp selected class must use the approved full-body art class');
assert.doesNotMatch(source,/renderClassPortrait/,'Camp must not use the portrait-card renderer');

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
assert(monolith.includes('const db064Camp=window.DiceboundCamp;'),'monolith should configure the extracted Camp owner');
assert(!monolith.includes('function db064PaintedCampBounds('),'painted hit-target implementation must not remain in the monolith');
assert(!monolith.includes('function db058SetArt('),'Camp authored-art implementation must not remain in the monolith');
assert(!monolith.includes('const scene=document.createElement(\'div\');scene.id=\'campScene\';'),'Camp scene construction must not remain in the monolith');
assert(monolith.includes('function beta042EnsureCampOptions(){return window.DiceboundCamp?.ensureOptionsButton();}'),'the legacy Options caller must remain a thin Camp adapter');
assert.doesNotMatch(monolith,/renderClassPortrait:\(element,classId\)=>applyClassPortrait/,'the Camp adapter must not retain the portrait-card art path');
assert.doesNotMatch(monolith,/campClassIcon\.dataset\.portraitClass!==String\(selectedClassId/,'legacy Camp refresh must not repaint the Class figure as a portrait card');
assert(monolith.includes('window.DiceboundCamp?.refreshArt?.();'),'legacy Camp refresh must delegate Class art to the Camp owner');
assert.doesNotMatch(monolith,/db0633CampObjectMarkup|db0633AttachCampObject|db0633BindCampObject/,'progression may decide reveals, but Camp must own the controls it creates');
assert.doesNotMatch(monolith,/const v23CampRefresh=/,'the monolith must not reassert Camp scene dimensions after the stage owner refreshes');
assert.doesNotMatch(monolith,/\.legacy-camp-modal\{max-width:1100px/,'historical Camp base styles must live with the Camp owner');
assert.doesNotMatch(monolith,/#startOverlay\.camp-fullscreen/,'the monolith must not retain any final Camp stylesheet block');
assert.match(source,/function syncProgressionReveals\(/,'Camp must own progression-controlled object DOM lifecycle');
assert.match(source,/const CAMP_BASE_STYLE=/,'Camp must own its responsive base/grid presentation style');
for(const retiredCampLayer of ['function beta043RefreshCampIcons(','function beta045RefreshCampLayout(','function db046RefreshCamp(','function db047RefreshCamp(','const db055Style=','const db057Style=','const db058Style=','const db0510Style=','const db0512Style=','const db060CampStyle='])assert(!monolith.includes(retiredCampLayer),`retired Camp style/wrapper remains in dicebound.js: ${retiredCampLayer}`);
assert.doesNotMatch(monolith,/#startOverlay\.camp-fullscreen #camp(?:Options|Talent|Moon|Class|Info|Pet|Chest|Achievement|Go|Nightmare|Hell)Btn/,'monolith must not retain final Camp-object CSS ownership');
assert.doesNotMatch(stylesheet,/Alpha 3\.1(?: asset-backed camp art|\.2 campsite composition|\.3 — caravan start control)/,'shared stylesheet must not retain historical Camp presentation ownership');
assert.doesNotMatch(stylesheet,/#startOverlay\.camp-fullscreen \.camp-(?:scene|ground|sky|spot|bonfire|popup|panel|journey)/,'shared stylesheet must not retain final Camp layout ownership');
for(const retiredRewardPolicyOwner of ['campAnchors','function scaleCamp(','#startOverlay.camp-fullscreen','#campScene .camp-spot'])assert(!rewards.includes(retiredRewardPolicyOwner),`event reward policy retained Camp presentation ownership: ${retiredRewardPolicyOwner}`);

assert.match(source,/\.camp-panel\.active > \.camp-panel-head\{position:sticky!important;top:0!important/,'Camp panel header must stay visible while panel content scrolls');
assert.match(source,/\.camp-panel-head \.camp-close-btn\{margin-left:auto!important/,'Camp Done/Exit control must stay pinned to the top-right header');

console.log('Camp UI owner PASS: deterministic layouts, semantic controls and monolith drain contract');
