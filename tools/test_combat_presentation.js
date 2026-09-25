const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'runtime/js/combat/presentation.js');
const source = fs.readFileSync(sourcePath, 'utf8');
assert(!source.includes('Math.random'), 'presentation owner must not use Math.random');
assert(!/\brandom\s*\(/.test(source), 'presentation owner must not call game random()');
assert(!/\brand\s*\(/.test(source), 'presentation owner must not call game rand()');
assert(!/\bpick\s*\(/.test(source), 'presentation owner must not call game pick()');

const sandbox = { window: {}, console, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });
const owner = sandbox.window.DiceboundCombatPresentation;
assert(owner && owner.owner === 'combat/presentation', 'combat presentation owner was not published');

const elements = {
  fire: { icon: '🔥', name: 'Fire' },
  ice: { icon: '❄️', name: 'Ice' },
  nature: { icon: '🌿', name: 'Nature' }
};
const classes = {
  ranger: { id: 'ranger', name: 'Ranger', icon: '🏹', ultimate: { icon: '🌧️', name: 'Arrow Storm', desc: 'Arrows.' } },
  ninja: { id: 'ninja', name: 'Ninja', icon: '🥷', ultimate: { icon: '🌘', name: 'Thousand Shadows', desc: 'Shadows.' } },
  bloodmage: { id: 'bloodmage', name: 'Bloodmage', icon: '🩸', ultimate: { icon: '☄️', name: 'Sanguine Cataclysm', desc: 'Blood.' } },
  summoner: { id: 'summoner', name: 'Summoner', icon: '🌌', ultimate: { icon: '🌌', name: 'Grand Convergence', desc: 'Spirits.' } },
  pokemontrainer: { id: 'pokemontrainer', name: 'Trainer', icon: '🧢', ultimate: { icon: '🌈', name: 'Stampede', desc: 'Roster.' } },
  paladin: { id: 'paladin', name: 'Paladin', icon: '⚔️', ultimate: { icon: '✨', name: 'Oath', desc: 'Grace.' } },
  berserker: { id: 'berserker', name: 'Berserker', icon: '🪓', ultimate: { icon: '💢', name: 'Rage', desc: 'Rage.' } },
  slimerouge: { id: 'slimerouge', name: 'Slime Rouge', icon: '🔴', ultimate: { icon: '🎭', name: 'Borrow', desc: 'Borrowed.' } },
  dragoon: { id: 'dragoon', name: 'Dragoon', icon: '🐉', ultimate: { icon: '🐲', name: 'Dragon Dive', desc: 'Dive.' } },
  invoker: { id: 'invoker', name: 'Invoker', icon: '🔵🟢🔴', ultimate: { icon: '🔵🟢🔴', name: 'Invoke', desc: 'Invoke.' } }
};
const pets = {
  fire: { icon: '🔥', name: 'Ember' },
  ice: { icon: '❄️', name: 'Frost' },
  nature: { icon: '🌿', name: 'Sprout' }
};
const occult = {
  summoner: { builderIcon: '✨', builder: 'Spirit Bolt', spellIcon: '🐾', spell: 'Conjure', cost: 35, gain: 18, desc: 'Build a spirit circle.' },
  invoker: { builderIcon: '🟢', builder: 'Wex Strike', spellIcon: '🔴', spell: 'Elemental Lance', cost: 50, gain: 25, desc: 'Three orb strikes build formulas; Lance converts Echo into damage.' }
};

let rngCalls = 0;
const presentationDelays=[];
let active = new Set(['ranger']);
let mechanics = new Set();
let legendary = new Set();
let legendaryRules = { unstable_ultimate: { name:'Unstable Ultimate', chargeThreshold:70, damageMultiplier:.75 } };
let invokerManaMultiplier=1;
const invokerAttackSpecs = {
  quas:{damage:.85,echoMultiplier:.70},
  wex:{damage:.85,echoMultiplier:1.20},
  exort:{damage:1.20,echoMultiplier:.70}
};
let state = {
  player: {
    classId: 'ranger', hp: 80, maxHp: 100, potions: 2, level: 8, doubleStrike: .25, crit: .2,
    guardCooldown: 0, guardPower: .5, ultimateGuardGain: 20, ultimateCharge: 100, potionPower: .1,
    rangerMarkMax: 5, energyShield: 0
  },
  currentEnemy: { name: 'Wolf', hp: 70, maxHp: 100, attack: 12, defense: 4, weakness: 'fire', affinity: 'ice', dodge: .15, rangerMarks: 4 },
  currentEnemies: [], currentEnemyIndex: 0, currentEncounterLead: null, currentEncounterTurn: 0, combatBusy: false,
  boardLevel: 1, nightmareMode: false, hellMode: false
};
state.currentEnemies = [state.currentEnemy];

function fakeStyle() {
  const props = Object.create(null);
  return {
    setProperty(name, value) { props[name] = String(value); },
    removeProperty(name) { delete props[name]; },
    getPropertyValue(name) { return props[name] || ''; },
    _props: props
  };
}

function fakeClassList() {
  const values = new Set();
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    toggle(name, force) { if (force === undefined ? !values.has(name) : force) values.add(name); else values.delete(name); },
    contains(name) { return values.has(name); }
  };
}
const documentNodes = new Map();
const combatOverlay = { dataset: {}, style: fakeStyle(), classList: fakeClassList() };
const combatPlayerIcon = { classList: fakeClassList(), offsetWidth: 42 };
const attackFx = { classList: fakeClassList(), className: "attack-fx", offsetWidth: 42, textContent: "" };
const enemySprites = [0,1].map(()=>({ classList: fakeClassList(), dataset: {}, offsetWidth: 42 }));
const enemyUnits = enemySprites.map(sprite=>({ classList: fakeClassList(), dataset: {}, querySelector: selector=>selector===".stage-sprite"?sprite:null }));
const combatEnemyIcon = {
  classList: fakeClassList(), offsetWidth: 42,
  querySelector(selector) {
    const match=String(selector).match(/data-enemy-index="(\d+)"/);
    return match?enemyUnits[Number(match[1])]||null:null;
  },
  querySelectorAll(selector) { return selector===".db-enemy-attack-lunge"?enemySprites.filter(sprite=>sprite.classList.contains("db-enemy-attack-lunge")):[]; }
};
const fakeDocument = {
  head: {
    children: [],
    appendChild(node) { this.children.push(node); if (node.id) documentNodes.set(node.id, node); return node; }
  },
  createElement() { return { classList: { add(){}, remove(){}, toggle(){} }, style: fakeStyle(), dataset: {}, addEventListener(){}, appendChild(){}, insertBefore(){}, parentElement: null, textContent: '', id: '' }; },
  getElementById(id) { return documentNodes.get(id) || null; },
  querySelector() { return null; }
};

function runtime() {
  return {
    document: fakeDocument,
    getState: () => state,
    find: id => id === 'combatOverlay' ? combatOverlay : id === 'combatPlayerIcon' ? combatPlayerIcon : id === 'enemyIcon' ? combatEnemyIcon : id === 'attackFx' ? attackFx : null,
    getClasses: () => classes,
    getElements: () => elements,
    getPets: () => pets,
    getOccultSpells: () => occult,
    getManaBuilderGain: (id,{multiplier=1}={}) => {
      const cfg=occult[id]||{},generic=Number(state.player.manaBuilderBonus)||0,classBonus=id==='summoner'?(Number(state.player.summonerManaBonus)||0):0;
      return (Number(cfg.gain)||0)+generic+classBonus ? ((Number(cfg.gain)||0)+generic+classBonus)*multiplier : 0;
    },
    invokerManaMultiplier: () => invokerManaMultiplier,
    getGagInfo: () => ({}),
    enemyBattleArtById: () => null,
    enemyPortraitById: () => null,
    enemyModeAura: mode => ({ id: mode, className: `mode-${mode}` }),
    guardianBattleArt: () => null,
    resolveCombatBackground: (board, mode) => mode === 'hell' ? null : ({ image: `assets/combat/backgrounds/board-${board}-${mode}.png`, focus: '50% 50%' }),
    isClassActive: id => active.has(id),
    hasClassMechanic: id => mechanics.has(id),
    classIdentityId: () => state.player.classId,
    applyClassPortrait() {},
    potionHealValue: () => 23,
    potionTooltip: () => 'Potions currently restore about 23 HP. Potion Healing bonus: +10%. Base healing is 10 + 10% of max HP.',
    describeUltimate: id => `description:${id}`,
    berserkerRageBonus: () => .42,
    hasLegendaryEffect: id => legendary.has(id),
    legendaryEffect: id => legendaryRules[id] || null,
    invokerAttackSpec: key => invokerAttackSpecs[key] || null,
    activeTrainerPetId: () => 'ice',
    selectEnemy() {},
    dragoonActive: () => active.has('dragoon'),
    dragoonJumpCooldown: () => 4,
    onDragoonJump() {},
    performClassAction() {},
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    delay: async ms => { presentationDelays.push(ms); },
    random: () => { rngCalls++; return .5; },
    rand: () => { rngCalls++; return 1; },
    pick: values => { rngCalls++; return values[0]; },
    guardianSpecialInterval: 5
  };
}
owner.configure(runtime());

(async()=>{
function model() {
  const beforePlayer = JSON.stringify(state.player), beforeEnemy = JSON.stringify(state.currentEnemy), beforeRng = rngCalls;
  const out = owner._test.buildViewModel();
  assert.strictEqual(JSON.stringify(state.player), beforePlayer, 'building presentation model mutated player state');
  assert.strictEqual(JSON.stringify(state.currentEnemy), beforeEnemy, 'building presentation model mutated enemy state');
  assert.strictEqual(rngCalls, beforeRng, 'building presentation model consumed RNG');
  return out;
}

let out = model();
assert.strictEqual(out.resource.name, 'Marks on target');
assert.strictEqual(out.resource.value, 4);
assert.strictEqual(out.resource.max, 5);
assert(out.resource.note.includes('Current cap: 5'));
assert(out.enemyHpText.includes('12 ATK · 4 DEF · 15% DODGE'));

active = new Set(['ninja']); state.player.classId = 'ninja'; state.player.ninjaSmoke = 2; state.player.ninjaSmokeNeed = 3;
out = model();
assert.strictEqual(out.resource.name, 'Smoke');
assert(out.resource.note.includes('stronger critical tiers granting more'));

active = new Set(['bloodmage']); state.player.classId = 'bloodmage'; state.player.hp = 51;
out = model();
assert.strictEqual(out.attack.text, '🩸 Bloodletting');
assert.strictEqual(out.guard.text, '💉 Replenish');
assert(out.guard.tip.includes('counts as Guard for the incoming enemy response'));
assert.strictEqual(out.special.text, '🩸 Exsanguinate');
assert.strictEqual(out.resource.name, 'Blood fuel (HP)');

active = new Set(['summoner']); mechanics = new Set(['mana']); state.player.classId = 'summoner'; state.player.mana = 40; state.player.maxMana = 120; state.player.summonerSpirits = ['fire']; state.player.summonerCap = 3; state.player.summonerManaBonus = 2; state.player.manaBuilderBonus=5;
out = model();
assert.strictEqual(out.attack.text, '✨ Spirit Bolt (+25 Mana)');
assert(out.attack.tip.includes('Generates 25 Mana with your current bonuses'));
assert.strictEqual(out.special.text, '🐾 Conjure (35) · 1/3');
assert(out.special.tip.includes('immediately makes your active companion'));
assert.strictEqual(out.resource.name, 'Mana / Spirit Circle');
assert(out.resource.note.includes('🔥 Ember'));
assert(out.guard.tip.includes('channels up to'));

active = new Set(['invoker']); mechanics = new Set(['mana']); state.player.classId = 'invoker'; state.player.mana = 75; state.player.maxMana = 100; state.player.doubleStrike = .80; state.player.manaBuilderBonus=0; invokerManaMultiplier=1.4;
out = model();
assert.strictEqual(out.attack.text, '🟢 Wex Strike (+35 Mana)');
assert.strictEqual(out.attack.className.includes('invoker-wex'), true);
assert.strictEqual(out.invokerAttacks.active, true);
assert.strictEqual(out.invokerAttacks.quas.text, '🔵 Quas Strike');
assert.strictEqual(out.invokerAttacks.exort.text, '🔴 Exort Strike');
assert.strictEqual(out.special.text, '🔴 Elemental Lance (50)');
assert(out.attack.tip.includes('120% of your current Echo chance'));
assert(out.attack.tip.includes('Generates 35 Mana with your current bonuses'));
assert(out.attack.tip.includes('capacity limits this click to 25'));
assert(out.invokerAttacks.quas.tip.includes('70% of your current Echo chance'));
assert(out.invokerAttacks.exort.tip.includes('70% of your current Echo chance'));
assert(out.special.tip.includes('can Crit'));
assert(out.special.tip.includes('Poison'));
assert.strictEqual(out.resource.name, 'Mana / Orb Formula');

active = new Set(['pokemontrainer']); mechanics = new Set(); state.player.classId = 'pokemontrainer'; state.player.trainerRoster = ['fire','ice','nature']; state.player.trainerActiveIndex = 1;
out = model();
assert.strictEqual(out.special.text, '🔄 Switch · ❄️ Frost');
assert.strictEqual(out.resource.name, 'Six-creature roster');

active = new Set(['paladin']); state.player.classId = 'paladin'; state.player.paladinGrace = 75;
out = model(); assert.strictEqual(out.resource.name, 'Oath Grace'); assert.strictEqual(out.resource.value, 75);

active = new Set(['berserker']); state.player.classId = 'berserker';
out = model(); assert.strictEqual(out.resource.name, 'Rage'); assert.strictEqual(out.resource.value, 42);

active = new Set(); state.player.classId = 'slimerouge'; state.player.slimeRougeUltimateClass = 'ranger';
out = model(); assert.strictEqual(out.ultimate.text, '🌧️ Arrow Storm'); assert(out.ultimate.tip.includes('Borrowed Ranger ultimate'));

active = new Set(['ranger']); state.player.classId = 'ranger'; state.player.slimeRougeUltimateClass = null; state.player.ultimateCharge = 69; legendary = new Set(['unstable_ultimate']);
out = model(); assert.strictEqual(out.ultimate.disabled, true); assert(out.ultimate.tip.includes('usable at 70 charge'));
state.player.ultimateCharge = 70; out = model(); assert.strictEqual(out.ultimate.disabled, false);
legendaryRules.unstable_ultimate = { name:'Unstable Ultimate', chargeThreshold:63, damageMultiplier:.42 };
state.player.ultimateCharge = 62; out = model(); assert.strictEqual(out.ultimate.disabled, true); assert(out.ultimate.tip.includes('63 charge')); assert(out.ultimate.tip.includes('42% normal damage'));
state.player.ultimateCharge = 63; out = model(); assert.strictEqual(out.ultimate.disabled, false, 'Unstable tooltip/button threshold must follow the Legendary owner instead of a copied 70');

legendary = new Set(); active = new Set(['dragoon']); state.player.classId = 'dragoon'; state.player.dragoonLandingReady = true; state.player.dragoonAirborneResponses = 0; state.player.dragoonJumpCooldown = 0;
out = model(); assert.strictEqual(out.attack.text, '🐉 Land'); assert.strictEqual(out.guard.disabled, true); assert.strictEqual(out.potion.disabled, true); assert.strictEqual(out.ultimate.disabled, true);

assert(owner.statusDotsHTML(2, 3, 'fire').includes('Fire affinity'));

assert.strictEqual(owner.dodge('player'), true);
assert.strictEqual(combatPlayerIcon.classList.contains('db-dodge-backflip'), true);
assert.strictEqual(owner.dodge('player'), true, 'rapid repeated Dodge must retrigger cleanly');
assert.strictEqual(combatPlayerIcon.classList.contains('db-dodge-backflip'), true);
assert.strictEqual(owner.dodge('enemy'), true, 'the animation API is generic to a combat unit, not Wolf-specific');
assert.strictEqual(combatEnemyIcon.classList.contains('db-dodge-backflip'), true);
owner.clearDodgePresentation();
assert.strictEqual(combatPlayerIcon.classList.contains('db-dodge-backflip'), false);
assert.strictEqual(combatEnemyIcon.classList.contains('db-dodge-backflip'), false);

state.boardLevel = 1; state.nightmareMode = false; state.hellMode = false;
let background = owner.applyCombatBackground();
assert.strictEqual(background.image, 'assets/combat/backgrounds/board-1-normal.png');
assert.strictEqual(combatOverlay.dataset.combatBackground, 'board-1-normal');
assert.strictEqual(combatOverlay.style.getPropertyValue('--db-combat-background-image'), 'url("assets/combat/backgrounds/board-1-normal.png")');
const backgroundStyle = fakeDocument.getElementById('dicebound-combat-background-style');
assert(backgroundStyle, 'combat background presentation style was not installed');
assert(backgroundStyle.textContent.includes('background-size:cover'), 'combat background must cover the overlay');
assert(backgroundStyle.textContent.includes('rgba(19,31,54,.44)'), 'combat modal tint must be exactly 20% more transparent than the 0.6.7.12 .55 baseline');
assert(backgroundStyle.textContent.includes('rgba(4,9,19,.176)')&&backgroundStyle.textContent.includes('rgba(4,9,19,.384)'), 'battle-background atmosphere tint must preserve the same 20% transparency reduction');
owner.ensureCombatStageStyle();
const stageStyle=fakeDocument.getElementById('dicebound-combat-stage-style');
assert(stageStyle,'Combat View must own the battle-stage layout');
assert(!stageStyle.textContent.includes('>.fighter>.bar-label{'), 'HP labels must not return to model-attached fighter layout');
assert(!stageStyle.textContent.includes('>.fighter>.bar{'), 'HP bars must not return to model-attached fighter layout');
assert(stageStyle.textContent.includes('>.fighter-icon{order:2;margin-top:auto!important;margin-bottom:0'), 'player/enemy models must be the bottom-most fighter element on the ground plane');
assert(stageStyle.textContent.includes('>.fighter>.fighter-name{order:0'), 'fighter identity copy must stay above the grounded model rather than consuming ground space below it');
assert(stageStyle.textContent.includes('.enemy-party{position:relative;z-index:4'), 'target chooser must sit above the fixed health HUD and fighter stage');
assert(stageStyle.textContent.includes('.combat-hud{position:relative;z-index:4;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)'), 'player and enemy HP bars must remain parallel in a static top HUD');

state.nightmareMode = true;
background = owner.applyCombatBackground();
assert.strictEqual(background.image, 'assets/combat/backgrounds/board-1-nightmare.png');
assert.strictEqual(combatOverlay.dataset.combatBackground, 'board-1-nightmare');

state.nightmareMode = false; state.hellMode = true;
background = owner.applyCombatBackground();
assert.strictEqual(background, null, 'Hell must keep its explicit no-authored-background contract');
assert.strictEqual(combatOverlay.dataset.combatBackground, undefined, 'Hell must clear stale Normal/Nightmare background identity');
assert.strictEqual(combatOverlay.style.getPropertyValue('--db-combat-background-image'), '', 'Hell must clear stale background image');

const echo1=owner._test.playerAttackTiming('echo','ranger',1),echo2=owner._test.playerAttackTiming('echo','ranger',2),echo10=owner._test.playerAttackTiming('echo','ranger',10),echo100=owner._test.playerAttackTiming('echo','ranger',100);
assert.strictEqual(owner._test.playerAttackTiming('normal','ranger',0).totalMs,590,'ordinary Ranger cadence must preserve released timing');
assert.strictEqual(owner._test.playerAttackTiming('crit','ranger',0).totalMs,650,'Crit cadence must preserve released timing');
assert.strictEqual(echo1.totalMs,590,'the first Echo must read like a second ordinary attack at 100% Echo or lower');
assert.strictEqual(echo2.totalMs,560,'only additional Echoes begin a gradual acceleration');
assert.strictEqual(echo10.totalMs,320);
assert.strictEqual(echo100.totalMs,180,'extreme Echo must retain a readable presentation floor');
assert.ok(echo1.totalMs>echo2.totalMs&&echo2.totalMs>echo10.totalMs&&echo10.totalMs>echo100.totalMs,'Echo cadence must accelerate monotonically after the first Echo');
presentationDelays.length=0;
state.player.classId='ranger';state.currentEnemyIndex=0;
await owner.playerAttack('echo',{echoIndex:1});
assert.strictEqual(presentationDelays.reduce((a,b)=>a+b,0),590,'first-Echo pacing must be owned by presentation and match ordinary attack animation cadence');

presentationDelays.length=0;
const semantic=owner._test.resolveEnemyAttackPresentation({attackerId:'wolf',attackId:'wolf-echo'});
assert.strictEqual(semantic.id,'generic-lunge','unregistered semantic attacks must use the generic fallback');
const inFlight=owner.enemyAttack({attackerId:'wolf',enemyIndex:1,attackId:'wolf-echo',attackName:'Echo Strike',target:'player',hitIndex:1,hitCount:1,outcome:'dodged'});
assert.strictEqual(enemySprites[1].classList.contains('db-enemy-attack-lunge'),true,'the actual attacking pack unit must animate');
assert.strictEqual(enemySprites[0].classList.contains('db-enemy-attack-lunge'),false,'attack presentation must not animate the selected/wrong pack unit');
assert.strictEqual(enemySprites[1].dataset.dbAttackId,'wolf-echo');
const attackResult=await inFlight;
assert.strictEqual(attackResult.presentationId,'generic-lunge');
assert.strictEqual(attackResult.durationMs,160);
assert.strictEqual(enemySprites[1].classList.contains('db-enemy-attack-lunge'),false,'enemy attack animation must clean itself');
assert.deepStrictEqual(presentationDelays,[160]);

const cancelled=owner.enemyAttack({attackerId:'goblin',enemyIndex:0,attackId:'basic-attack',outcome:'blocked'});
owner.clearEnemyAttackPresentation();
assert.strictEqual(enemySprites[0].classList.contains('db-enemy-attack-lunge'),false,'combat-boundary cleanup must cancel attack presentation');
await cancelled;

const css=fs.readFileSync(path.join(root,'runtime','css','dicebound.css'),'utf8');
assert(css.includes('dbEnemyAttackLunge'),'generic enemy attack CSS animation must remain installed');
const extractedCss=fs.readFileSync(path.join(root,'runtime','css','extracted-monolith.css'),'utf8');
assert(source.includes('data-enemy-id=')&&source.includes("escapePortraitLabel(String(e.id||''))"),'battle presentation must publish semantic enemy ids');
assert.strictEqual(owner._test.enemyArtScale({id:'goblin'},1),1);
assert.strictEqual(owner._test.enemyArtScale({id:'goblin'},2),1.15);
assert.strictEqual(owner._test.enemyArtScale({id:'goblin'},6),1.75,'ordinary enemies must grow 15% per Board');
assert.strictEqual(owner._test.enemyArtScale({id:'wolf'},1),.65);
assert.strictEqual(owner._test.enemyArtScale({id:'slime'},1),.65,'Wolf and Slime must be 35% smaller than peer ordinary art on Board 1');
assert.strictEqual(owner._test.enemyArtScale({id:'wolf'},6),1.1375,'Wolf must preserve the exact 65% family factor on top of 75% Board growth');
for(const id of ['skeleton','cultist','orc','bandit'])assert.strictEqual(owner._test.enemyArtScale({id},1),1.15,`${id} must preserve its authored +15% family calibration inside the semantic scale owner`);
for(const id of ['road-merchant','bloodmage-boss','pale-devil']){
  assert.strictEqual(owner._test.enemyArtScale({id,guardian:true},3),2.5,`${id} must use the 2.5× Secret Boss scale`);
  assert.strictEqual(owner._test.enemyArtMetrics({id,guardian:true},3,1).art,215,`${id} desktop art must be 2.5× the former 86px guardian size`);
}
assert(!extractedCss.includes(':has(.db0636-tiered-enemy-art[data-enemy-battle-art="slime"])'),'legacy CSS family sizing must not shadow the semantic scale owner');
assert(!extractedCss.includes('transform:scale(1.15);transform-origin:center bottom'),'family art calibration must not be duplicated in CSS');
assert(stageStyle.textContent.includes('width:var(--db-enemy-art-size,62px)!important'),'Combat Presentation must own actual rendered enemy dimensions via semantic variables');
assert(stageStyle.textContent.includes('min-height:var(--db-enemy-stage-mobile-height,68px)!important'),'mobile enemy dimensions must use the same semantic policy');
assert(stageStyle.textContent.includes('font-size:var(--db-enemy-art-size,62px)'),'fallback enemy icons must use the same semantic desktop art size');
assert(stageStyle.textContent.includes('font-size:var(--db-enemy-art-mobile-size,50px)'),'fallback enemy icons must use the same semantic mobile art size');

assert.strictEqual(rngCalls, 0, 'combat presentation test consumed RNG');
console.log('Combat presentation owner PASS: live Mana generator facts, semantic enemy scaling, Secret Boss sizing, attacks, Echo pacing, backgrounds, statuses and zero-RNG view models are deterministic');
})().catch(error=>{console.error(error);process.exitCode=1;});
