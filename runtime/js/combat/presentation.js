(() => {
  "use strict";

  let runtime = null;
  let dragoonLandingTimer = 0;
  const dodgeTimers = new Map();
  const enemyAttackTokens = new Map();

  const ECHO_PRESENTATION = Object.freeze({ stepMs: 30, floorMs: 180 });
  const GENERIC_ENEMY_ATTACK = Object.freeze({ id: "generic-lunge", className: "db-enemy-attack-lunge", durationMs: 160 });
  // Bespoke attack art/animation definitions can be added here by semantic
  // attacker + attack IDs. An empty registry is deliberate: 0.6.7.7 ships the
  // stable lookup/fallback pipeline first, without inventing one-off name hacks.
  const ENEMY_ATTACK_PRESENTATIONS = Object.freeze({});

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatPresentation must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat presentation runtime is required.");
    const required = [
      "getState","find","getClasses","getElements","getPets","getOccultSpells","getGagInfo","enemyBattleArtById","enemyPortraitById","enemyModeAura","guardianBattleArt","resolveCombatBackground",
      "isClassActive","hasClassMechanic","classIdentityId","applyClassPortrait",
      "potionHealValue","potionTooltip","describeUltimate","berserkerRageBonus","hasLegendaryEffect","legendaryEffect",
      "activeTrainerPetId","invokerAttackSpec","selectEnemy","dragoonActive","dragoonJumpCooldown","onDragoonJump","performClassAction","clamp","delay"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat presentation runtime missing ${name}().`);
    if (!nextRuntime.document || typeof nextRuntime.document.createElement !== "function") throw new Error("Combat presentation runtime missing document.");
    runtime = nextRuntime;
    return api;
  }

  function ensureCombatBackgroundStyle() {
    const rt = requireRuntime(), doc = rt.document;
    const existing = typeof doc.getElementById === "function" ? doc.getElementById("dicebound-combat-background-style") : null;
    if (existing) return existing;
    const style = doc.createElement("style");
    style.id = "dicebound-combat-background-style";
    style.textContent = `
      #combatOverlay[data-combat-background]{isolation:isolate;overflow:hidden;background:#07101c!important}
      #combatOverlay[data-combat-background]::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background-image:var(--db-combat-background-image);background-size:cover;background-position:center;transform:scale(1.01)}
      #combatOverlay[data-combat-background]::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(4,9,19,.176),rgba(4,9,19,.384))}
      #combatOverlay[data-combat-background]>.modal{position:relative;z-index:2;background:linear-gradient(180deg,rgba(19,31,54,.44),rgba(7,14,28,.576))!important}
    `;
    doc.head?.appendChild(style);
    return style;
  }

  function ensureCombatStageStyle() {
    const rt=requireRuntime(),doc=rt.document;
    const existing=typeof doc.getElementById==="function"?doc.getElementById("dicebound-combat-stage-style"):null;
    if(existing)return existing;
    const style=doc.createElement("style");style.id="dicebound-combat-stage-style";
    style.textContent=`
      #combatOverlay .enemy-party{position:relative;z-index:4;margin:2px auto 6px!important}
      #combatOverlay .combat-hud{position:relative;z-index:4;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(28px,8vw,110px);align-items:start;width:min(880px,100%);margin:0 auto 4px}
      #combatOverlay .combat-hud-side{min-width:0}
      #combatOverlay .combat-hud .bar-label{margin:0 0 5px}
      #combatOverlay .combat-hud .bar{margin:0 0 3px}
      #combatOverlay .combat-hud .status-dots{justify-content:center;margin:2px 1px 0}
      #combatOverlay .combat-head{min-height:clamp(260px,34vh,350px);align-items:stretch!important;margin-top:0!important}
      #combatOverlay .combat-head>.fighter{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;min-height:inherit}
      #combatOverlay .combat-head>.fighter:first-of-type{position:relative}
      #combatOverlay .combat-head>.fighter>.fighter-name{order:0}
      #combatOverlay .combat-head>.fighter>.enemy-weakness{order:1}
      #combatOverlay .combat-head>.fighter>.fighter-icon{order:2;margin-top:auto!important;margin-bottom:0;transform-origin:center bottom}
      #combatOverlay .combat-head>.fighter:first-of-type>.combat-pet{position:absolute!important;left:clamp(2px,8%,34px);bottom:2px;margin:0!important;z-index:9;transform-origin:center bottom}
      #combatOverlay .vs{align-self:center}
      @media(max-width:700px){#combatOverlay .combat-hud{gap:14px}#combatOverlay .combat-head{min-height:clamp(210px,30vh,280px)}#combatOverlay .combat-head>.fighter>.fighter-icon{margin-top:auto!important}#combatOverlay .combat-head>.fighter:first-of-type>.combat-pet{left:0;bottom:0}}
    `;
    doc.head?.appendChild(style);return style;
  }

  function applyCombatBackground() {
    const rt = requireRuntime(), state = rt.getState();
    const board = Math.min(6, Math.max(1, Math.floor(Number(state.boardLevel) || 1)));
    const mode = state.hellMode ? "hell" : state.nightmareMode ? "nightmare" : "normal";
    const entry = rt.resolveCombatBackground(board, mode) || null;
    const overlay = rt.find("combatOverlay");
    ensureCombatBackgroundStyle();
    if (!overlay) return entry;
    if (entry?.image) {
      overlay.dataset.combatBackground = `board-${board}-${mode}`;
      overlay.style.setProperty("--db-combat-background-image", `url("${entry.image}")`);
    } else {
      delete overlay.dataset.combatBackground;
      overlay.style.removeProperty("--db-combat-background-image");
    }
    return entry;
  }

  function statusDotsHTML(barriers = 0, poison = 0, affinity = null, confused = false) {
    const rt = requireRuntime(), elements = rt.getElements();
    let html = "";
    barriers = Math.max(0, Number(barriers) || 0);
    poison = Math.max(0, Number(poison) || 0);
    if (barriers >= 5) html += `<span class="status-count barrier-count" title="${barriers} Barrier stacks">🛡️ ${barriers}</span>`;
    else for (let i = 0; i < barriers; i++) html += '<span class="status-dot barrier" title="Barrier"></span>';
    if (poison >= 5) html += `<span class="status-count poison-count" title="${poison} Poison stacks">☠️ ${poison}</span>`;
    else for (let i = 0; i < poison; i++) html += '<span class="status-dot poison" title="Poison"></span>';
    if (affinity && elements[affinity]) html += `<span class="status-affinity" title="${elements[affinity].name} affinity">${elements[affinity].icon}</span>`;
    if (confused) html += '<span class="status-confusion" title="Confused: next offensive action will misfire">🧮</span>';
    return html;
  }

  function classResource(type, name, value, max, note) {
    return { type, name, value, max, note: note || "", textMode: false };
  }

  function textResource(type, name, text, note) {
    return { type, name, value: 0, max: 0, note: note || "", text: String(text || ""), textMode: true };
  }

  function buildViewModel() {
    const rt = requireRuntime();
    const state = rt.getState();
    const player = state.player || {};
    const enemy = state.currentEnemy || null;
    const classes = rt.getClasses();
    const elements = rt.getElements();
    const pets = rt.getPets();
    const cls = classes[player.classId] || classes.ranger || { ultimate: { icon: "⭐", name: "Ultimate", desc: "" } };
    const combatBusy = !!state.combatBusy;

    const attack = {
      text: "⚔️ Attack",
      disabled: combatBusy,
      tip: `Attack the selected enemy. Echo ${Math.round((player.doubleStrike || 0) * 100)}%, Crit Chance ${Math.round((player.crit || 0) * 100)}%; every strike rolls crit, Poison and elements separately.`
    };
    const guard = {
      text: (player.guardCooldown || 0) > 0 ? "🛡️ Guard (1 turn)" : "🛡️ Guard",
      disabled: combatBusy || (player.guardCooldown || 0) > 0,
      tip: `Reduce ordinary attacks by ${Math.round((player.guardPower || 0) * 100)}% and gain ${player.ultimateGuardGain || 0} ultimate. Guardian specials ignore Dodge and barriers, but Guard reduces them.`
    };
    const potion = {
      text: null,
      disabled: combatBusy || (player.potions || 0) <= 0 || (player.hp || 0) >= (player.maxHp || 1),
      tip: rt.potionTooltip()
    };
    const ultimate = {
      text: `${cls.ultimate?.icon || "⭐"} ${cls.ultimate?.name || "Ultimate"}`,
      disabled: combatBusy || (player.ultimateCharge || 0) < 100,
      tip: rt.describeUltimate(player.classId)
    };
    const special = {
      hidden: true,
      className: "combat-btn special action-tooltip",
      text: "",
      tip: "",
      disabled: false,
      ready: false
    };
    let hasSpecial = false;
    let resource = null;
    const invokerStrikeTip=(key,orb)=>{
      const spec=rt.invokerAttackSpec(key);
      if(!spec)throw new Error(`Combat presentation missing Invoker ${key} attack spec.`);
      return `${Math.round(spec.damage*100)}% normal strike damage, uses ${Math.round(spec.echoMultiplier*100)}% of your current Echo chance, and forms a ${orb} orb. Crit Chance, Poison, elements and Lifesteal remain normal.`;
    };
    const invokerAttacks = {
      active: false,
      quas: { text: "🔵 Quas Strike", tip: invokerStrikeTip("quas","Blue"), disabled: combatBusy },
      exort: { text: "🔴 Exort Strike", tip: invokerStrikeTip("exort","Red"), disabled: combatBusy }
    };

    const identityId = rt.classIdentityId();
    if (rt.isClassActive("invoker")) {
      const cfg = rt.getOccultSpells()[identityId];
      attack.text = "🟢 Wex Strike";
      attack.className = "combat-btn primary action-tooltip invoker-wex";
      attack.tip = `${invokerStrikeTip("wex","Green")} Generates up to ${cfg?.gain || 0} base Mana.`;
      special.hidden = false; hasSpecial = true;
      special.text = `🔴 Elemental Lance (${cfg?.cost || 50})`;
      special.tip = `${cfg?.desc || "Spend Mana for a heavy Red attack."} It can Crit, roll normal elements, apply Poison at Echo × Poison chance, and Lifesteal from direct plus elemental damage.`;
      special.disabled = combatBusy || (player.mana || 0) < (cfg?.cost || 50);
      resource = classResource("mana", "Mana / Orb Formula", player.mana || 0, player.maxMana || 0, cfg?.desc || "Build three orbs to Invoke.");
      invokerAttacks.active = true;
    } else if (rt.hasClassMechanic("mana")) {
      const cfg = rt.getOccultSpells()[identityId];
      if (cfg) {
        attack.text = `${cfg.builderIcon} ${cfg.builder}`;
        attack.tip = `${cfg.builder} is your Mana-building attack. It uses the class-authored strike profile, still rolls Crit Chance/Echo/elements, and grants up to ${cfg.gain} Mana.`;
        special.hidden = false; hasSpecial = true;
        special.text = `${cfg.spellIcon} ${cfg.spell} (${cfg.cost})`;
        special.tip = identityId === "sorcerer"
          ? `${cfg.desc} Current Lifesteal: ${Math.round(Math.max(0, player.lifeSteal || 0) * 100)}%.`
          : cfg.desc;
        special.disabled = combatBusy || (player.mana || 0) < cfg.cost;
        resource = classResource("mana", "Mana", player.mana || 0, player.maxMana || 0, cfg.desc);
      }
    } else if (rt.isClassActive("bloodmage")) {
      attack.text = "🩸 Bloodletting";
      attack.tip = "A normal basic attack with extra Lifesteal. Bloodletting restores HP so you can spend that HP as fuel on Exsanguinate.";
      guard.text = "💉 Replenish";
      guard.tip = "Replenish heals you and the selected enemy, restores Ultimate charge, and counts as Guard for the incoming enemy response.";
      special.hidden = false; hasSpecial = true;
      special.text = "🩸 Exsanguinate";
      special.tip = "Spend max-HP-scaled health without killing yourself. Exsanguinate converts part of Echo chance into damage, can Crit, rolls normal elements, and uses Echo-weighted Poison.";
      special.disabled = combatBusy || (player.hp || 0) <= 1;
      resource = classResource("blood", "Blood fuel (HP)", player.hp || 0, player.maxHp || 1, "Bloodmage has no Mana. Your HP bar is your spell resource; Bloodletting restores fuel and Exsanguinate spends it.");
    } else if (rt.isClassActive("rogue")) {
      special.hidden = false; hasSpecial = true; special.className += " steal";
      special.text = player.rogueStealUsed ? "🗡️ Steal (used)" : "🗡️ Steal";
      special.tip = `Attempt once per battle. Success scales with Luck and steals gold, can steal a potion, and at high Luck can even steal a random powerup.${player.rogueStealStatFraction ? " Stat Heist also steals part of the target's ATK/DEF for this battle." : ""}`;
      special.disabled = combatBusy || !!player.rogueStealUsed;
    } else if (rt.isClassActive("cleric")) {
      special.hidden = false; hasSpecial = true; special.className += " faith";
      special.text = "☀️ Consecration";
      special.tip = "At full Faith: heal, raise a Barrier and deal a pack-wide holy attack that can Crit. Healing builds Faith.";
      special.disabled = combatBusy || (player.clericFaith || 0) < 100;
      special.ready = !special.disabled && (player.clericFaith || 0) >= 100;
      resource = classResource("mana", "Faith", player.clericFaith || 0, 100, "Healing builds Faith. Consecration becomes available at 100.");
    } else if (rt.isClassActive("beastmaster")) {
      const stance = player.beastStance || "aggressive";
      special.hidden = false; hasSpecial = true;
      special.text = `🐾 ${stance}`;
      special.tip = "Cycle pet orders without spending a combat turn: Aggressive boosts pet damage, Defensive raises a Barrier after the pet attacks, and Support adds a small heal.";
      special.disabled = combatBusy;
      resource = classResource("mana", "Pack order", ["aggressive", "defensive", "support"].indexOf(stance) + 1, 3, "Aggressive → Defensive → Support. The button cycles the active companion order.");
    } else if (rt.isClassActive("monk")) {
      resource = classResource("combo", "Flowing Combo", player.monkCombo || 0, player.monkComboMax || 5, `Consecutive basics build up to ${player.monkComboMax || 5} Combo. Each stack adds damage, Echo and Dodge; Guard or Potion resets it.`);
    } else if (rt.isClassActive("ninja")) {
      resource = classResource("smoke", "Smoke", player.ninjaSmoke || 0, player.ninjaSmokeNeed || 3, `Critical tiers build Smoke, with stronger critical tiers granting more. At ${player.ninjaSmokeNeed || 3}, the next basic strike becomes Smoke Execution.`);
    } else if (rt.isClassActive("ranger")) {
      const cap = Math.max(3, Number(player.rangerMarkMax) || 3), marks = enemy?.rangerMarks || 0;
      resource = classResource("mark", "Marks on target", marks, cap, `Each landed basic strike or Echo adds 1 Mark. Marks add Crit Chance against that target; Arrow Storm consumes every mark in the pack. Current cap: ${cap}.`);
    } else if (rt.isClassActive("fighter")) {
      resource = classResource("combo", "Counterblows", player.fighterCounterStacks || 0, player.fighterCounterMax || 1, "Guard stores a Counterblow. Each stored stack empowers one future basic attack.");
    } else if (rt.isClassActive("turtle")) {
      resource = classResource("combo", "Shell Momentum", player.turtleGuardChain || 0, player.turtleGuardMax || 5, "Consecutive Guards build Shell Momentum. Certain milestones raise a Barrier; your next basic attack consumes the chain for bonus damage per stack.");
    } else if (rt.isClassActive("clown")) {
      resource = textResource("gag", "Opening Gag", player.clownGimmick || "No gag yet", player.clownGimmick ? (rt.getGagInfo()[player.clownGimmick] || player.clownGimmick) : "A random gag appears when combat begins.");
    } else if (rt.isClassActive("ceo")) {
      const tier = (player.gold || 0) >= 1000 ? 3 : (player.gold || 0) >= 500 ? 2 : (player.gold || 0) >= 250 ? 1 : 0;
      resource = classResource("mana", "Executive tier", tier, 3, `${player.gold || 0} gold. Executive power scales with wealth; reaching the top wealth tier also starts battles with a Barrier.`);
    }

    if (rt.isClassActive("summoner")) {
      const cfg = rt.getOccultSpells().summoner, spirits = player.summonerSpirits || [], gain = cfg.gain + (player.summonerManaBonus || 0);
      attack.tip = `Spirit Bolt is your Mana-building attack. It uses the class-authored strike profile and grants up to ${gain} Mana.`;
      special.hidden = false; hasSpecial = true;
      special.text = `🐾 Conjure (${cfg.cost}) · ${spirits.length}/${player.summonerCap || 3}`;
      special.tip = `Spend ${cfg.cost} Mana to conjure a spirit. Conjure immediately makes your active companion and every spirit attack with a small temporary damage boost.`;
      special.disabled = combatBusy || (player.mana || 0) < cfg.cost;
      resource = classResource("mana", "Mana / Spirit Circle", player.mana || 0, player.maxMana || 0, `${cfg.desc} Active spirits: ${spirits.length ? spirits.map(id => `${pets[id]?.icon || "🐾"} ${pets[id]?.name || id}`).join(", ") : "none"}.`);
    } else if (rt.isClassActive("pokemontrainer")) {
      const roster = player.trainerRoster || [], id = rt.activeTrainerPetId();
      special.hidden = false; hasSpecial = true;
      special.text = `🔄 Switch · ${pets[id]?.icon || "🐾"} ${pets[id]?.name || "Creature"}`;
      special.tip = "Switch to the next creature in your current roster without spending a combat turn. The active creature attacks harder and can call a roster assist.";
      special.disabled = combatBusy || !roster.length;
      resource = classResource("mana", "Six-creature roster", (player.trainerActiveIndex || 0) + 1, Math.max(1, roster.length), `Run roster: ${roster.map((x, i) => `${i === player.trainerActiveIndex ? "▶ " : ""}${pets[x]?.icon || "🐾"} ${pets[x]?.name || x}`).join(" · ")}`);
    } else if (rt.isClassActive("paladin")) {
      resource = classResource("faith", "Oath Grace", player.paladinGrace || 0, 100, "Healing stores Grace. Guard can consume stored Grace to strengthen Guard and raise Barriers.");
    }

    if (rt.isClassActive("alchemist")) {
      special.hidden = false; hasSpecial = true;
      special.className = "combat-btn special action-tooltip alchemist-special";
      special.text = `🧪 Volatile Flask (${player.potions || 0})`;
      special.tip = `Consume 1 potion to damage the enemy pack using Potion Healing and Attack. The Flask can Crit and uses amplified Poison chance on each surviving target. Current potion heal: ${rt.potionHealValue()} HP.`;
      special.disabled = combatBusy || (player.potions || 0) <= 0;
      resource = classResource("mana", "Combat Distillery", player.alchemistBrewCounter || 0, player.alchemistBrewNeed || 3, `Every ${player.alchemistBrewNeed || 3} basic attacks creates a potion. Drink them to heal or throw them with Volatile Flask.`);
    }

    if (player.classId === "slimerouge" && (player.slimeRougeUltimateClass || player.v28BorrowedUltimateClass)) {
      const donorId = player.slimeRougeUltimateClass || player.v28BorrowedUltimateClass, donor = classes[donorId];
      if (donor) {
        ultimate.text = `${donor.ultimate.icon} ${donor.ultimate.name}`;
        ultimate.tip = `Borrowed ${donor.name} ultimate — ${rt.describeUltimate(donor.id)}`;
      }
    }
    if (rt.isClassActive("berserker")) {
      const rage = Math.round(rt.berserkerRageBonus() * 100);
      resource = classResource("rage", "Rage", rage, 100, `Every 1% missing HP grants +1% damage. Current Rage bonus: +${rage}% damage.`);
    }
    if (rt.hasLegendaryEffect("unstable_ultimate")) {
      const effect=rt.legendaryEffect("unstable_ultimate"),threshold=Number(effect?.chargeThreshold),multiplier=Number(effect?.damageMultiplier);
      if(!Number.isFinite(threshold)||!Number.isFinite(multiplier))throw new Error("Combat presentation requires authoritative Unstable Ultimate values.");
      ultimate.disabled = combatBusy || !enemy || (player.ultimateCharge || 0) < threshold;
      ultimate.tip = `${effect.name}: usable at ${threshold} charge for ${Math.round(multiplier*100)}% normal damage. Current charge: ${Math.round(player.ultimateCharge || 0)}.`;
    }

    if (rt.dragoonActive()) {
      const landing = !!player.dragoonLandingReady;
      attack.text = landing ? "🐉 Land" : "⚔️ Attack";
      if (landing) { guard.disabled = true; potion.disabled = true; ultimate.disabled = true; }
    }

    if (guard && rt.hasClassMechanic("mana")) guard.tip += ` Guard also channels up to ${player.guardManaGain || 6} Mana.`;

    let enemyHpText = "";
    if (enemy) {
      enemyHpText = `${Math.max(0, enemy.hp || 0)} / ${enemy.maxHp || 0} · ${enemy.attack || 0} ATK · ${enemy.defense || 0} DEF`;
      if ((enemy.dodge || 0) > 0) enemyHpText += ` · ${Math.round(enemy.dodge * 100)}% DODGE`;
    }

    return { attack, guard, potion, ultimate, special, hasSpecial, resource, invokerAttacks, cls, elements, enemyHpText };
  }

  function ensureResourceWrap() {
    const rt = requireRuntime(), doc = rt.document, find = rt.find;
    let wrap = find("classResourceWrap");
    if (wrap) return wrap;
    const ultimateWrap = doc.querySelector("#combatOverlay .ultimate-wrap");
    if (!ultimateWrap) return null;
    wrap = doc.createElement("div"); wrap.id = "classResourceWrap"; wrap.className = "class-resource-wrap hidden";
    wrap.innerHTML = '<div class="class-resource-label"><span id="classResourceName">Class resource</span><span id="classResourceText">0 / 100</span></div><div class="class-resource-bar"><i id="classResourceFill"></i></div><div class="class-resource-note" id="classResourceNote"></div>';
    ultimateWrap.parentNode.insertBefore(wrap, ultimateWrap);
    return wrap;
  }

  function renderResource(resource) {
    const rt = requireRuntime(), find = rt.find, wrap = ensureResourceWrap();
    if (!wrap) return;
    if (!resource) { wrap.className = "class-resource-wrap hidden"; return; }
    wrap.className = `class-resource-wrap ${resource.type || ""}`;
    const name = find("classResourceName"), text = find("classResourceText"), fill = find("classResourceFill"), note = find("classResourceNote");
    if (name) name.textContent = resource.name;
    if (text) text.textContent = resource.textMode ? resource.text : `${Math.round(resource.value)} / ${Math.round(resource.max)}`;
    if (fill) fill.style.width = resource.textMode ? "0%" : `${rt.clamp(resource.max ? resource.value / resource.max * 100 : 0, 0, 100)}%`;
    if (note) note.textContent = resource.note;
  }

  function renderSummonerSpirits() {
    const rt = requireRuntime(), doc = rt.document, find = rt.find, player = rt.getState().player || {}, pets = rt.getPets();
    let row = find("v17SummonerSpirits");
    if (!rt.isClassActive("summoner")) { row?.remove(); return; }
    if (!row) { row = doc.createElement("div"); row.id = "v17SummonerSpirits"; row.className = "summoner-spirit-row"; const pet = find("combatPet"); pet?.parentElement?.insertBefore(row, pet.nextSibling); }
    const ids = player.summonerSpirits || [];
    row.innerHTML = ids.map(id => `<span class="summoner-spirit-token" title="${pets[id]?.name || id}">${pets[id]?.icon || "🐾"}</span>`).join("");
  }

  const PROCEDURAL_ENEMY_SHAPES=Object.freeze({
    goblin:`<path d="M10 30l13-8 3-13 10 10 13-10 1 14 13 7-12 4q4 21-15 24Q17 56 21 34z" fill="#758b42" stroke="#aec76c" stroke-width="2"/><circle cx="29" cy="34" r="3" fill="#ffe26c"/><circle cx="44" cy="33" r="3" fill="#ffe26c"/><path d="M31 47l10-3" stroke="#2c311c" stroke-width="3"/>`,
    skeleton:`<circle cx="36" cy="30" r="18" fill="#d4cfbd" stroke="#f2eddc" stroke-width="2"/><circle cx="29" cy="28" r="5" fill="#19191c"/><circle cx="44" cy="28" r="5" fill="#19191c"/><path d="M36 34l-3 6h6z" fill="#19191c"/><path d="M25 47h22M28 51h16" stroke="#6a665e" stroke-width="3"/>`,
    orc:`<path d="M13 58q0-25 12-35L21 8l13 10 12-9 4 15q12 9 8 34z" fill="#587644" stroke="#9ab977" stroke-width="2"/><circle cx="29" cy="32" r="3" fill="#ffd56a"/><circle cx="45" cy="32" r="3" fill="#ffd56a"/><path d="M26 46l6-6 4 8 5-8 7 6" fill="#e9dfbe"/>`,
    cultist:`<path d="M10 60q4-34 26-50 22 16 26 50z" fill="#39213f" stroke="#815589" stroke-width="2"/><path d="M19 28Q24 11 36 11t17 17l-8-4H27z" fill="#211329"/><circle cx="29" cy="33" r="2.5" fill="#ed65db"/><circle cx="44" cy="33" r="2.5" fill="#ed65db"/><path d="M36 42l5 8-5 5-5-5z" fill="#a9489d"/>`,
    lich:`<path d="M11 59q3-30 25-42 22 12 25 42z" fill="#2b2848" stroke="#716fa0" stroke-width="2"/><path d="M20 21l5-11 11 7 9-9 7 13-5 7H24z" fill="#7c6aac"/><circle cx="29" cy="33" r="3" fill="#8cf5ff"/><circle cx="44" cy="33" r="3" fill="#8cf5ff"/><path d="M53 14v39M48 18l5-8 5 8" stroke="#b8dfff" stroke-width="3"/>`
  });
  const REQUIRED_ENEMY_ART_IDS=new Set(["slime","wolf","wraith","devil","bandit","troll"]);
  function portraitHash(value){let h=2166136261;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return Math.abs(h>>>0);}
  function escapePortraitLabel(value){return String(value||"Enemy").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function proceduralEnemyPortrait(enemy,board){
    const id=String(enemy?.id||""),shape=PROCEDURAL_ENEMY_SHAPES[id];
    if(!shape)return "";
    const palettes=[null,["#15271c","#4a724b","#9bc26c"],["#15172e","#51448b","#8eb5ff"],["#1b0d25","#6d275f","#dd6dad"],["#160f21","#755b31","#e3c36c"],["#0b1720","#356c78","#80e1dd"],["#0b1720","#356c78","#80e1dd"]];
    const [bg1,bg2]=palettes[Math.min(6,Math.max(1,Math.floor(Number(board)||1)))],gid=`enemy_${portraitHash(enemy?.name||id)}`,label=escapePortraitLabel(enemy?.name||id);
    return `<svg class="enemy-art-frame" viewBox="0 0 72 72" role="img" aria-label="${label}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect x="2" y="2" width="68" height="68" rx="17" fill="#060a10"/><rect x="4" y="4" width="64" height="64" rx="15" fill="url(#${gid})"/><g transform="translate(0 2)">${shape}</g></svg>`;
  }
  function enemyPortraitHTML(enemy){
    const rt=requireRuntime(),state=rt.getState(),id=String(enemy?.id||""),board=Math.min(6,Math.max(1,Math.floor(Number(state.boardLevel)||1))),mode=state.hellMode?"hell":state.nightmareMode?"nightmare":"normal",label=escapePortraitLabel(enemy?.name||id||"Enemy");
    if(id){
      const tiered=rt.enemyBattleArtById(id,board);
      if(tiered){const aura=rt.enemyModeAura(mode);return `<span class="db0636-tiered-enemy-art ${aura.className}" data-enemy-battle-art="${tiered.key}" data-enemy-battle-board="${tiered.board}" data-enemy-battle-mode="${aura.id}"><img class="enemy-art-frame enemy-art-image db0636-tiered-enemy-image" src="${tiered.src}" alt="${escapePortraitLabel(tiered.alt)} · Board ${tiered.board}" draggable="false"></span>`;}
      const guardianSrc=rt.guardianBattleArt(id);
      if(guardianSrc)return `<img class="enemy-art-frame enemy-art-image db060-guardian-art" src="${guardianSrc}" alt="${label}" draggable="false">`;
      const portrait=rt.enemyPortraitById(id);
      if(portrait)return `<img class="enemy-art-frame enemy-art-image" src="${portrait.src}" alt="${escapePortraitLabel(portrait.alt||enemy?.name||id)}" draggable="false">`;
      const procedural=proceduralEnemyPortrait(enemy,board);if(procedural)return procedural;
      if(REQUIRED_ENEMY_ART_IDS.has(id)||enemy?.guardian||enemy?.boss)throw new Error(`Missing required combat art for enemy ${id}`);
    }
    return `<span class="enemy-art-fallback" role="img" aria-label="${label}">${enemy?.icon||"👹"}</span>`;
  }

  function renderEnemyParty() {
    const rt = requireRuntime(), state = rt.getState(), find = rt.find, doc = rt.document, elements = rt.getElements();
    const strip = find("enemyParty"), stage = find("enemyIcon"); if (!strip || !stage) return;
    const enemies = state.currentEnemies || [], index = state.currentEnemyIndex || 0;
    strip.innerHTML = ""; stage.className = "fighter-icon enemy-stage-icons";
    stage.innerHTML = enemies.map((e, i) => `<span class="stage-enemy${i === index && e.hp > 0 ? " selected" : ""}${e.hp <= 0 ? " defeated" : ""}${e.guardian ? " guardian" : ""}${e.miniBoss ? " miniboss" : ""}${e.finalBoss ? " final-boss" : ""}" data-enemy-index="${i}" data-enemy-id="${escapePortraitLabel(String(e.id||''))}" title="${e.name} · ${Math.max(0, e.hp)}/${e.maxHp} HP · ${e.attack || 0} ATK · ${e.defense || 0} DEF${e.affinity ? ` · ${elements[e.affinity]?.name || e.affinity} affinity` : ""}"><span class="stage-sprite">${enemyPortraitHTML(e)}</span><span class="stage-affinity">${e.affinity ? elements[e.affinity]?.icon || "" : ""}</span>${e.rangerMarks ? `<span class="stage-mark">🏹 ×${e.rangerMarks}</span>` : ""}<span class="stage-mini-status">${statusDotsHTML(e.enemyBarrier || 0, e.poisonStacks || 0, null, (e.confusionActions || 0) > 0)}</span></span>`).join("");
    enemies.forEach((e, i) => { const b = doc.createElement("button"); b.className = `enemy-chip${i === index && e.hp > 0 ? " active" : ""}${e.hp <= 0 ? " dead" : ""}`; b.disabled = e.hp <= 0; b.title = `${e.name} · ${Math.max(0, e.hp)}/${e.maxHp} HP · ${e.defense || 0} DEF`; b.innerHTML = `<strong class="target-number">${i + 1}</strong>`; b.addEventListener("click", () => rt.selectEnemy(i)); strip.appendChild(b); });
    stage.classList.toggle("db0636-tiered-enemy-stage", !!stage.querySelector?.(".db0636-tiered-enemy-art"));
  }

  function syncEnergyShieldBars() {
    const rt = requireRuntime(), find = rt.find, doc = rt.document, player = rt.getState().player || {};
    [["hpFill", "energyShieldFill"], ["combatPlayerFill", "combatEnergyShieldFill"]].forEach(([base, id]) => { const fill = find(base), bar = fill?.parentElement; if (bar && !find(id)) { const shield = doc.createElement("i"); shield.id = id; shield.className = "energy-shield-fill"; shield.style.width = "0%"; bar.appendChild(shield); } });
    const pct = rt.clamp((player.energyShield || 0) / Math.max(1, player.maxHp || 1) * 100, 0, 100);
    if (find("energyShieldFill")) find("energyShieldFill").style.width = `${pct}%`;
    if (find("combatEnergyShieldFill")) find("combatEnergyShieldFill").style.width = `${pct}%`;
    if ((player.energyShield || 0) > 0) {
      if (find("hpText")) find("hpText").textContent = `${Math.round(player.hp)} / ${Math.round(player.maxHp)} · 🔵 ${Math.round(player.energyShield)}`;
      if (find("combatPlayerHp")) find("combatPlayerHp").textContent = `${Math.round(player.hp)} / ${Math.round(player.maxHp)} · 🔵 ${Math.round(player.energyShield)}`;
    }
  }

  function renderBossSpecialIndicator() {
    const rt = requireRuntime(), state = rt.getState(), lead = state.currentEncounterLead, box = rt.find("bossSpecialIndicator"); if (!box) return;
    if (!lead?.guardian || (!lead.miniBoss && !lead.finalBoss && !lead.merchantBoss && !lead.devilBoss)) { box.classList.add("hidden"); return; }
    const interval = rt.guardianSpecialInterval || 10, remaining = interval - ((state.currentEncounterTurn || 0) % interval);
    box.classList.remove("hidden"); box.classList.toggle("imminent", remaining <= 2); box.textContent = `⚠️ ${lead.specialName || "Guardian special"} in ${remaining} turn${remaining === 1 ? "" : "s"}`;
  }

  function baseAttackTiming(mode="normal",classId=""){
    const windups={fighter:360,ranger:460,sorcerer:460,monk:420,clown:500,rouge:450,berserker:500};
    const windup=mode==="crit"?520:(windups[classId]||460);
    return Object.freeze({mode,totalMs:windup+130,windupMs:windup,impactMs:130,echoIndex:0});
  }
  function playerAttackTiming(mode="normal",classId="",echoIndex=1){
    if(mode==="echo"){
      const ordinal=Math.max(1,Math.floor(Number(echoIndex)||1));
      const first=baseAttackTiming("normal",classId).totalMs;
      const total=Math.max(ECHO_PRESENTATION.floorMs,first-(ordinal-1)*ECHO_PRESENTATION.stepMs);
      const impact=Math.max(60,Math.round(total*.22));
      return Object.freeze({mode:"echo",totalMs:total,windupMs:total-impact,impactMs:impact,echoIndex:ordinal});
    }
    return baseAttackTiming(mode,classId);
  }

  async function playerAttack(mode="normal",options={}){
    const rt=requireRuntime(),state=rt.getState(),player=state.player||{},classes=rt.getClasses(),cls=classes[player.classId]||{};
    const icon=rt.find("combatPlayerIcon"),stage=rt.find("enemyIcon"),fx=rt.find("attackFx");
    if(!icon?.classList||!stage?.classList||!fx?.classList)return false;
    const enemy=stage.querySelector?.(`.stage-enemy[data-enemy-index="${state.currentEnemyIndex||0}"]`)||stage;
    const timing=playerAttackTiming(mode,player.classId,options.echoIndex);
    icon.classList.remove("attack-lunge");fx.className="attack-fx";void fx.offsetWidth;icon.classList.add("attack-lunge");
    fx.textContent=mode==="crit"?"💥✦":mode==="echo"?`↯ ${cls.attackIcon||"⚔️"}`:(cls.fxIcon||cls.attackIcon||"⚔️");
    fx.classList.add(mode==="crit"?"crit-attack":mode==="echo"?"echo-attack":player.classId||"fighter");
    try{
      await rt.delay(timing.windupMs);
      enemy.classList?.add("enemy-hit");
      await rt.delay(timing.impactMs);
    }finally{
      enemy.classList?.remove("enemy-hit");
      icon.classList.remove("attack-lunge");
    }
    return timing;
  }

  function resolveEnemyAttackPresentation(fact={}){
    const attackerId=String(fact.attackerId||fact.enemy?.id||"*"),attackId=String(fact.attackId||"basic-attack");
    return ENEMY_ATTACK_PRESENTATIONS[`${attackerId}:${attackId}`]||GENERIC_ENEMY_ATTACK;
  }
  function enemyAttackElement(fact={}){
    const rt=requireRuntime(),state=rt.getState(),stage=rt.find("enemyIcon");
    if(!stage)return null;
    let index=Number.isInteger(fact.enemyIndex)?fact.enemyIndex:-1;
    if(index<0&&fact.enemy&&Array.isArray(state.currentEnemies))index=state.currentEnemies.indexOf(fact.enemy);
    if(index<0)index=Math.max(0,Number(state.currentEnemyIndex)||0);
    const unit=stage.querySelector?.(`.stage-enemy[data-enemy-index="${index}"]`);
    return unit?.querySelector?.(".stage-sprite")||unit||stage;
  }
  async function enemyAttack(fact={}){
    const rt=requireRuntime(),sprite=enemyAttackElement(fact);
    if(!sprite?.classList)return false;
    const spec=resolveEnemyAttackPresentation(fact),token=Symbol("enemy-attack");
    enemyAttackTokens.set(sprite,token);
    sprite.classList.remove(spec.className);void sprite.offsetWidth;sprite.classList.add(spec.className);
    if(sprite.dataset){
      sprite.dataset.dbAttackId=String(fact.attackId||"basic-attack");
      sprite.dataset.dbAttackOutcome=String(fact.outcome||"attempt");
    }
    try{await rt.delay(spec.durationMs);}
    finally{
      if(enemyAttackTokens.get(sprite)===token){
        sprite.classList.remove(spec.className);enemyAttackTokens.delete(sprite);
        if(sprite.dataset){delete sprite.dataset.dbAttackId;delete sprite.dataset.dbAttackOutcome;}
      }
    }
    return Object.freeze({...fact,presentationId:spec.id,durationMs:spec.durationMs});
  }
  function clearEnemyAttackPresentation(){
    for(const sprite of enemyAttackTokens.keys()){
      enemyAttackTokens.delete(sprite);
      sprite.classList?.remove(GENERIC_ENEMY_ATTACK.className);
      if(sprite.dataset){delete sprite.dataset.dbAttackId;delete sprite.dataset.dbAttackOutcome;}
    }
    const stage=requireRuntime().find("enemyIcon");
    stage?.querySelectorAll?.(".db-enemy-attack-lunge")?.forEach?.(sprite=>sprite.classList.remove("db-enemy-attack-lunge"));
  }

  function combatUnitElement(unit = "player") {
    const rt = requireRuntime();
    if (unit && typeof unit === "object" && unit.classList) return unit;
    if (unit === "player") return rt.find("combatPlayerIcon");
    if (unit === "enemy" || unit === "target") return rt.find("enemyIcon");
    return typeof unit === "string" ? rt.find(unit) : null;
  }

  function dodge(unit = "player") {
    const icon = combatUnitElement(unit);
    if (!icon?.classList) return false;
    const prior = dodgeTimers.get(icon);
    if (prior != null) clearTimeout(prior);
    icon.classList.remove("db-dodge-backflip");
    void icon.offsetWidth;
    icon.classList.add("db-dodge-backflip");
    const timer = setTimeout(() => {
      icon.classList.remove("db-dodge-backflip");
      dodgeTimers.delete(icon);
    }, 420);
    dodgeTimers.set(icon, timer);
    return true;
  }

  function clearDodgePresentation(unit = null) {
    const rt = requireRuntime();
    const targets = unit == null ? [...dodgeTimers.keys()] : [combatUnitElement(unit)].filter(Boolean);
    for (const icon of targets) {
      const timer = dodgeTimers.get(icon);
      if (timer != null) clearTimeout(timer);
      dodgeTimers.delete(icon);
      icon.classList?.remove("db-dodge-backflip");
    }
    if (unit == null) {
      rt.find("combatPlayerIcon")?.classList?.remove("db-dodge-backflip");
      rt.find("enemyIcon")?.classList?.remove("db-dodge-backflip");
    }
  }

  function syncDragoonPresentation() {
    const rt = requireRuntime(), player = rt.getState().player || {}, icon = rt.find("combatPlayerIcon"), airborne = rt.dragoonActive() && ((player.dragoonAirborneResponses || 0) > 0 || !!player.dragoonLandingReady);
    if (icon) { if (airborne) icon.classList.remove("db-dragoon-landing"); icon.classList.toggle("db-dragoon-airborne", airborne); }
  }

  function dragoonLandPresentation() {
    const rt = requireRuntime(), icon = rt.find("combatPlayerIcon"); if (!icon) return;
    icon.classList.remove("db-dragoon-airborne"); icon.classList.add("db-dragoon-landing"); clearTimeout(dragoonLandingTimer); dragoonLandingTimer = setTimeout(() => icon.classList.remove("db-dragoon-landing"), 240);
  }

  function ensureInvokerAttackButtons() {
    const rt = requireRuntime(), doc = rt.document, find = rt.find, actions = doc.querySelector("#combatOverlay .combat-actions");
    if (!actions) return { quas: null, exort: null };
    let quas = find("invokerQuasBtn"), exort = find("invokerExortBtn");
    if (!quas) {
      quas = doc.createElement("button"); quas.id = "invokerQuasBtn"; quas.type = "button";
      quas.className = "combat-btn special action-tooltip invoker-quas";
      quas.addEventListener("click", () => rt.performClassAction("invoker-quas"));
      actions.insertBefore(quas, find("attackBtn") || null);
    }
    if (!exort) {
      exort = doc.createElement("button"); exort.id = "invokerExortBtn"; exort.type = "button";
      exort.className = "combat-btn special action-tooltip invoker-exort";
      exort.addEventListener("click", () => rt.performClassAction("invoker-exort"));
      actions.insertBefore(exort, find("specialAttackBtn") || find("guardBtn") || null);
    }
    return { quas, exort };
  }

  function ensureDragoonJumpButton() {
    const rt = requireRuntime(), doc = rt.document, find = rt.find, actions = doc.querySelector("#combatOverlay .combat-actions"); if (!actions) return null;
    let button = find("dragoonJumpBtn");
    if (!button) { button = doc.createElement("button"); button.id = "dragoonJumpBtn"; button.type = "button"; button.className = "combat-btn special action-tooltip"; button.addEventListener("click", rt.onDragoonJump); actions.insertBefore(button, find("guardBtn") || null); }
    return button;
  }

  function clearDragoonPresentation() { clearTimeout(dragoonLandingTimer); dragoonLandingTimer = 0; }

  function update() {
    const rt = requireRuntime(), state = rt.getState(), player = state.player || {}, enemy = state.currentEnemy; if (!enemy) return;
    ensureCombatStageStyle();
    const find = rt.find, elements = rt.getElements(), model = buildViewModel(), weak = elements[enemy.weakness], aff = elements[enemy.affinity];
    if (find("enemyName")) find("enemyName").textContent = `Target ${(state.currentEnemyIndex || 0) + 1}: ${enemy.name}`;
    if (find("enemyWeakness")) find("enemyWeakness").textContent = `${weak ? `Weakness: ${weak.icon} ${weak.name}` : "Weakness: Unknown"}${aff ? ` · Affinity: ${aff.icon} ${aff.name}` : " · No elemental affinity"}`;
    if (find("combatPlayerHp")) find("combatPlayerHp").textContent = `${Math.round(player.hp)} / ${Math.round(player.maxHp)}`;
    if (find("combatPlayerFill")) find("combatPlayerFill").style.width = `${rt.clamp(player.hp / Math.max(1, player.maxHp) * 100, 0, 100)}%`;
    if (find("enemyHpText")) find("enemyHpText").textContent = model.enemyHpText;
    if (find("enemyHpFill")) find("enemyHpFill").style.width = `${rt.clamp(enemy.hp / Math.max(1, enemy.maxHp) * 100, 0, 100)}%`;
    if (find("playerStatusDots")) {
      find("playerStatusDots").innerHTML = statusDotsHTML(player.combatShield || 0, 0, null, (player.confusionActions || 0) > 0);
      if ((player.devilBurnStacks || 0) > 0) find("playerStatusDots").insertAdjacentHTML("beforeend", `<span class="burn-status" title="${player.devilBurnStacks} Hellfire stacks · uncapped max-HP-scaled damage">🔥×${player.devilBurnStacks}</span>`);
      if ((player.db0511BurnStacks || 0) > 0) find("playerStatusDots").insertAdjacentHTML("beforeend", `<span class="db0511-player-status" title="Burn: max-HP-scaled damage each action">🔥×${player.db0511BurnStacks}</span>`);
      if ((player.db0511PoisonStacks || 0) > 0) find("playerStatusDots").insertAdjacentHTML("beforeend", `<span class="db0511-player-status" title="Enemy Poison">☠️×${player.db0511PoisonStacks}</span>`);
      if (player._db0511SkipAction) find("playerStatusDots").insertAdjacentHTML("beforeend", `<span class="db0511-player-status">${player._db0511SkipAction.startsWith("❄️") ? "❄️ FROZEN" : "⚡ STUNNED"}</span>`);
    }
    if (find("enemyStatusDots")) {
      find("enemyStatusDots").innerHTML = statusDotsHTML(enemy.enemyBarrier || 0, enemy.poisonStacks || 0, enemy.affinity, (enemy.confusionActions || 0) > 0);
      if ((enemy.burnStacks || 0) > 0) find("enemyStatusDots").insertAdjacentHTML("beforeend", `<span class="burn-status" title="${enemy.burnStacks} Burn stacks · max-HP-scaled damage each turn">🔥×${enemy.burnStacks}</span>`);
    }
    [["attackBtn", model.attack], ["guardBtn", model.guard], ["potionBtn", model.potion], ["ultimateBtn", model.ultimate]].forEach(([id, spec]) => { const b = find(id); if (!b) return; b.disabled = !!spec.disabled; if (spec.text != null) b.textContent = spec.text; if (id === "attackBtn") b.className = spec.className || "combat-btn primary action-tooltip"; else if (spec.className) b.className = spec.className; b.dataset.tip = spec.tip || ""; });
    const special = find("specialAttackBtn"); if (special) { special.hidden = !!model.special.hidden; special.className = model.special.className; special.textContent = model.special.text; special.dataset.tip = model.special.tip; special.disabled = !!model.special.disabled; special.classList.toggle("ready", !!model.special.ready); }
    const invokerButtons = ensureInvokerAttackButtons();
    [["quas", invokerButtons.quas], ["exort", invokerButtons.exort]].forEach(([key, button]) => { if (!button) return; const spec = model.invokerAttacks[key]; button.hidden = !model.invokerAttacks.active; button.disabled = !model.invokerAttacks.active || !!spec.disabled; button.textContent = spec.text; button.dataset.tip = spec.tip; });
    const actions = rt.document.querySelector("#combatOverlay .combat-actions"); actions?.classList.toggle("has-special", !!model.hasSpecial); actions?.classList.toggle("invoker-actions", !!model.invokerAttacks.active);
    const cls = model.cls; rt.applyClassPortrait(find("combatPlayerIcon"), cls.id, true);
    renderResource(model.resource); renderSummonerSpirits(); renderEnemyParty(); syncEnergyShieldBars(); renderBossSpecialIndicator(); syncDragoonPresentation();
    const jump = ensureDragoonJumpButton();
    if (jump) { const landing = rt.dragoonActive() && !!player.dragoonLandingReady; jump.hidden = !rt.dragoonActive(); jump.disabled = !rt.dragoonActive() || state.combatBusy || landing || (player.dragoonAirborneResponses || 0) > 0 || (player.dragoonJumpCooldown || 0) > 0; jump.textContent = (player.dragoonAirborneResponses || 0) > 0 ? "🐉 Airborne" : (player.dragoonJumpCooldown || 0) > 0 ? `🐉 Jump (${player.dragoonJumpCooldown})` : "🐉 Jump"; }
    return model;
  }

  const api = Object.freeze({
    owner: "combat/presentation",
    configure,
    applyCombatBackground,
    ensureCombatStageStyle,
    update,
    renderEnemyParty,
    renderBossSpecialIndicator,
    statusDotsHTML,
    syncEnergyShieldBars,
    playerAttack,
    enemyAttack,
    clearEnemyAttackPresentation,
    dodge,
    clearDodgePresentation,
    syncDragoonPresentation,
    dragoonLandPresentation,
    ensureDragoonJumpButton,
    ensureInvokerAttackButtons,
    clearDragoonPresentation,
    _test: Object.freeze({ buildViewModel, playerAttackTiming, resolveEnemyAttackPresentation })
  });
  window.DiceboundCombatPresentation = api;
})();
