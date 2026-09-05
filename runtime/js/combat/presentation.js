(() => {
  "use strict";

  let runtime = null;
  let dragoonLandingTimer = 0;

  function requireRuntime() {
    if (!runtime) throw new Error("DiceboundCombatPresentation must be configured before use.");
    return runtime;
  }

  function configure(nextRuntime) {
    if (!nextRuntime || typeof nextRuntime !== "object") throw new Error("Combat presentation runtime is required.");
    const required = [
      "getState","find","getClasses","getElements","getPets","getOccultSpells","getGagInfo",
      "isClassActive","hasClassMechanic","classIdentityId","applyClassPortrait","enemyPortraitHTML",
      "potionHealValue","potionTooltip","describeUltimate","berserkerRageBonus","hasLegendaryEffect",
      "activeTrainerPetId","selectEnemy","dragoonActive","dragoonJumpCooldown","onDragoonJump","clamp"
    ];
    for (const name of required) if (typeof nextRuntime[name] !== "function") throw new Error(`Combat presentation runtime missing ${name}().`);
    if (!nextRuntime.document || typeof nextRuntime.document.createElement !== "function") throw new Error("Combat presentation runtime missing document.");
    runtime = nextRuntime;
    return api;
  }

  function statusDotsHTML(barriers = 0, poison = 0, affinity = null) {
    const rt = requireRuntime(), elements = rt.getElements();
    let html = "";
    for (let i = 0; i < Math.min(12, barriers || 0); i++) html += '<i class="status-dot barrier" title="Barrier"></i>';
    for (let i = 0; i < Math.min(16, poison || 0); i++) html += '<i class="status-dot poison" title="Poison stack"></i>';
    if (affinity && elements[affinity]) html += `<i class="status-dot element" title="${elements[affinity].name} affinity">${elements[affinity].icon}</i>`;
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
      tip: `Attack the selected enemy. Echo ${Math.round((player.doubleStrike || 0) * 100)}%, Crit ${Math.round((player.crit || 0) * 100)}%; every strike rolls crit, Poison and elements separately.`
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
      tip: cls.ultimate?.desc || ""
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

    const identityId = rt.classIdentityId();
    if (rt.hasClassMechanic("mana")) {
      const cfg = rt.getOccultSpells()[identityId];
      if (cfg) {
        attack.text = `${cfg.builderIcon} ${cfg.builder}`;
        attack.tip = `${cfg.builder} is your Mana-building attack. It deals about 82% normal basic damage, still rolls Crit/Echo/elements, and grants up to ${cfg.gain} Mana.`;
        special.hidden = false;
        hasSpecial = true;
        special.text = `${cfg.spellIcon} ${cfg.spell} (${cfg.cost})`;
        special.tip = rt.isClassActive("sorcerer") ? `${cfg.desc} Current Echo conversion: +${Math.round(Math.max(0, player.doubleStrike || 0) * 50)}% Arcane Lance damage. Current Lifesteal: ${Math.round(Math.max(0, player.lifeSteal || 0) * 100)}%.` : cfg.desc;
        special.disabled = combatBusy || (player.mana || 0) < cfg.cost;
        resource = classResource("mana", "Mana", player.mana || 0, player.maxMana || 0, cfg.desc);
      }
    } else if (rt.isClassActive("bloodmage")) {
      attack.text = "🩸 Bloodletting";
      attack.tip = "A normal basic attack with extra Lifesteal. Bloodletting restores HP so you can spend that HP as fuel on Exsanguinate.";
      guard.text = "💉 Replenish";
      guard.tip = "Restore 16% max HP to yourself and 14% max HP to the selected enemy, then gain 20 Ultimate. This does not reduce the next enemy attack.";
      special.hidden = false;
      hasSpecial = true;
      special.text = "🩸 Exsanguinate";
      special.tip = "Spend 12% max HP without killing yourself to deal a brutal blood-fuelled attack.";
      special.disabled = combatBusy || (player.hp || 0) <= 1;
      resource = classResource("blood", "Blood fuel (HP)", player.hp || 0, player.maxHp || 1, "Bloodmage has no Mana. Your HP bar is your spell resource; Bloodletting restores fuel and Exsanguinate spends it.");
    } else if (rt.isClassActive("rogue")) {
      special.hidden = false;
      special.className += " steal";
      hasSpecial = true;
      special.text = player.rogueStealUsed ? "🗡️ Steal (used)" : "🗡️ Steal";
      special.tip = "Attempt once per battle. Success scales with Luck and steals gold, can steal a potion, and at high Luck can even steal a random powerup (chance starts above 50 Luck and caps at 35%).";
      special.disabled = combatBusy || !!player.rogueStealUsed;
    } else if (rt.isClassActive("cleric")) {
      special.hidden = false;
      special.className += " faith";
      hasSpecial = true;
      special.text = "☀️ Consecration";
      special.tip = "At 100 Faith: heal, raise a Barrier and damage the enemy pack. Healing builds Faith.";
      special.disabled = combatBusy || (player.clericFaith || 0) < 100;
      special.ready = !special.disabled && (player.clericFaith || 0) >= 100;
      resource = classResource("mana", "Faith", player.clericFaith || 0, 100, "Healing builds Faith. Consecration becomes available at 100.");
    } else if (rt.isClassActive("beastmaster")) {
      special.hidden = false;
      hasSpecial = true;
      special.text = `🐾 ${player.beastStance || "aggressive"}`;
      special.tip = "Cycle pet orders without spending a combat turn: Aggressive = +50% pet damage, Defensive = Barrier after pet attack, Support = small heal after pet attack.";
      special.disabled = combatBusy;
      resource = classResource("mana", "Pack order", ["aggressive", "defensive", "support"].indexOf(player.beastStance) + 1, 3, "Aggressive → Defensive → Support. The button cycles the active companion order.");
    } else if (rt.isClassActive("monk")) {
      resource = classResource("combo", "Flowing Combo", player.monkCombo || 0, 5, "Basic attacks build Combo. Each stack increases damage, Echo and Dodge. Guard or Potion resets it.");
    } else if (rt.isClassActive("ninja")) {
      resource = classResource("smoke", "Smoke", player.ninjaSmoke || 0, 3, "Critical hits build Smoke. At 3, the next basic strike ignores Defense and deals greatly increased damage.");
    } else if (rt.isClassActive("ranger")) {
      resource = classResource("mark", "Marks on target", enemy?.rangerMarks || 0, 3, "Basic attacks mark the selected enemy. Marks add Crit against that target; Arrow Storm consumes every mark in the pack for bonus damage.");
    } else if (rt.isClassActive("fighter")) {
      resource = classResource("combo", "Counterstance", player.fighterCounterReady ? 1 : 0, 1, "Guard primes the next basic attack for +55% damage.");
    } else if (rt.isClassActive("turtle")) {
      resource = classResource("combo", "Shell Crush", player.turtleCrushReady ? 1 : 0, 1, "Guard primes the next basic attack for a Defense-scaled crushing counter.");
    } else if (rt.isClassActive("clown")) {
      resource = classResource("mana", "Opening Gag", player.clownGimmick ? 1 : 0, 1, player.clownGimmick ? `This battle's gimmick: ${player.clownGimmick}.` : "A random gimmick appears when combat begins.");
    } else if (rt.isClassActive("ceo")) {
      const tier = (player.gold || 0) >= 1000 ? 3 : (player.gold || 0) >= 500 ? 2 : (player.gold || 0) >= 250 ? 1 : 0;
      resource = classResource("mana", "Executive tier", tier, 3, `${player.gold || 0} gold. The class's main identity is an absurd +200% gold engine; 1000+ gold also starts battles with a Barrier.`);
    }

    if (rt.isClassActive("summoner")) {
      const cfg = rt.getOccultSpells().summoner;
      const spirits = player.summonerSpirits || [];
      const gain = (cfg?.gain || 0) + (player.summonerManaBonus || 0);
      attack.tip = `Spirit Bolt is your Mana-building attack. It deals about 82% normal basic damage and grants up to ${gain} Mana.`;
      special.hidden = false;
      hasSpecial = true;
      special.text = `🐾 Conjure (${cfg.cost}) · ${spirits.length}/${player.summonerCap || 3}`;
      special.tip = `Spend ${cfg.cost} Mana to conjure a spirit. Conjure immediately makes your active companion and every spirit attack with a small temporary damage boost.`;
      special.disabled = combatBusy || (player.mana || 0) < cfg.cost;
      resource = classResource("mana", "Mana / Spirit Circle", player.mana || 0, player.maxMana || 0, `${cfg.desc} Active spirits: ${spirits.length ? spirits.map(id => `${pets[id]?.icon || "🐾"} ${pets[id]?.name || id}`).join(", ") : "none"}.`);
    } else if (rt.isClassActive("pokemontrainer")) {
      const roster = player.trainerRoster || [];
      const id = rt.activeTrainerPetId();
      special.hidden = false;
      hasSpecial = true;
      special.text = `🔄 Switch · ${pets[id]?.icon || "🐾"} ${pets[id]?.name || "Creature"}`;
      special.tip = "Switch to the next creature in your six-member roster without spending a combat turn. The active creature attacks harder and can call a roster assist.";
      special.disabled = combatBusy || !roster.length;
      resource = classResource("mana", "Six-creature roster", (player.trainerActiveIndex || 0) + 1, Math.max(1, roster.length), `Run roster: ${roster.map((x, i) => `${i === player.trainerActiveIndex ? "▶ " : ""}${pets[x]?.icon || "🐾"} ${pets[x]?.name || x}`).join(" · ")}`);
    }

    if (rt.isClassActive("fighter")) resource = classResource("combo", "Counterblows", player.fighterCounterStacks || 0, player.fighterCounterMax || 1, "Guard stores one Counterblow. Each stored stack empowers one future basic attack by +55% damage.");
    if (rt.isClassActive("ranger")) resource = classResource("mark", "Marks on target", enemy?.rangerMarks || 0, player.rangerMarkMax || 3, `Basic attacks mark the selected enemy up to ${player.rangerMarkMax || 3}. Marks add Crit; Arrow Storm consumes the pack's marks for bonus damage.`);
    if (rt.isClassActive("monk")) resource = classResource("combo", "Flowing Combo", player.monkCombo || 0, player.monkComboMax || 5, `Consecutive basics build up to ${player.monkComboMax || 5} Combo. Each stack adds damage, Echo and Dodge; Guard or Potion resets it.`);
    if (rt.isClassActive("turtle")) resource = classResource("combo", "Shell Momentum", player.turtleGuardChain || 0, player.turtleGuardMax || 5, "Consecutive Guards build Shell Momentum. Later Guards are stronger; stacks 3 and 5 raise a Barrier. Your next basic attack consumes the chain for +18% damage per stack.");
    if (rt.isClassActive("clown")) resource = textResource("gag", "Opening Gag", player.clownGimmick || "No gag yet", player.clownGimmick ? (rt.getGagInfo()[player.clownGimmick] || "") : "A random gag appears when combat begins.");
    if (rt.isClassActive("alchemist")) {
      special.hidden = false;
      hasSpecial = true;
      special.className = "combat-btn special action-tooltip alchemist-special";
      special.text = `🧪 Volatile Flask (${player.potions || 0})`;
      special.tip = `Consume 1 potion to damage the enemy pack. Damage scales with the same Potion Healing bonuses that increase your ${rt.potionHealValue()} HP drink.`;
      special.disabled = combatBusy || (player.potions || 0) <= 0;
      resource = classResource("mana", "Combat Distillery", player.alchemistBrewCounter || 0, player.alchemistBrewNeed || 3, `Every ${player.alchemistBrewNeed || 3} basic attacks creates a potion. Drink them to heal or throw them with Volatile Flask.`);
    }

    if (rt.hasClassMechanic("mana")) guard.tip += ` Guard also channels up to ${player.guardManaGain || 6} Mana.`;
    if (rt.isClassActive("bloodmage")) guard.tip = "Replenish heals you and the selected enemy, grants 20 Ultimate, and counts as Guard for the incoming enemy response.";
    potion.tip = rt.potionTooltip();

    if (rt.isClassActive("paladin")) resource = classResource("faith", "Oath Grace", player.paladinGrace || 0, 100, "Healing stores Grace. Guard consumes it for up to +20% Guard power and 1 Barrier per 25 Grace.");
    if (rt.isClassActive("ninja")) resource = classResource("smoke", "Smoke", player.ninjaSmoke || 0, player.ninjaSmokeNeed || 3, `Every critical tier grants 1 Smoke — a double crit grants 2, triple crit 3, including Echoes. At ${player.ninjaSmokeNeed || 3}, the next basic strike becomes Smoke Execution.`);

    if (player.classId === "slimerouge" && (player.slimeRougeUltimateClass || player.v28BorrowedUltimateClass)) {
      const donor = classes[player.slimeRougeUltimateClass || player.v28BorrowedUltimateClass];
      if (donor) {
        ultimate.text = `${donor.ultimate.icon} ${donor.ultimate.name}`;
        ultimate.tip = `Borrowed ${donor.name} ultimate — ${rt.describeUltimate(donor.id)}`;
      }
    }
    if (rt.isClassActive("berserker")) {
      const rage = Math.round(rt.berserkerRageBonus() * 100);
      resource = classResource("rage", "Rage", rage, 100, `Every 1% missing HP grants +1% damage. Current Rage bonus: +${rage}% damage.`);
    }
    if (rt.isClassActive("ranger")) {
      const marks = enemy?.rangerMarks || 0, cap = Math.max(3, Number(player.rangerMarkMax) || 3);
      resource = classResource("mark", "Marks on target", marks, cap, `Each landed basic strike or Echo adds 1 Mark. Marks add Crit against that target; Arrow Storm consumes every mark in the pack. Current cap: ${cap}.`);
    }

    if (rt.hasLegendaryEffect("unstable_ultimate")) {
      ultimate.disabled = combatBusy || !enemy || (player.ultimateCharge || 0) < 70;
      ultimate.tip = `Unstable Ultimate: usable at 70 charge for 75% normal damage. Current charge: ${Math.round(player.ultimateCharge || 0)}.`;
    }

    const dragoonActive = rt.dragoonActive();
    const landing = dragoonActive && !!player.dragoonLandingReady;
    const jump = {
      hidden: !dragoonActive,
      disabled: !dragoonActive || combatBusy || landing || (player.dragoonAirborneResponses || 0) > 0 || (player.dragoonJumpCooldown || 0) > 0,
      text: (player.dragoonAirborneResponses || 0) > 0 ? "🐉 Airborne" : (player.dragoonJumpCooldown || 0) > 0 ? `🐉 Jump (${player.dragoonJumpCooldown})` : "🐉 Jump"
    };
    if (dragoonActive) {
      attack.text = landing ? "🐉 Land" : "⚔️ Attack";
      if (landing) {
        guard.disabled = true;
        potion.disabled = true;
        ultimate.disabled = true;
      }
    }

    return {
      state,
      cls,
      attack, guard, potion, ultimate, special, hasSpecial, resource, jump,
      enemyName: enemy ? `Target ${state.currentEnemyIndex + 1}: ${enemy.name}` : "",
      enemyWeakness: enemy ? `${elements[enemy.weakness] ? `Weakness: ${elements[enemy.weakness].icon} ${elements[enemy.weakness].name}` : "Weakness: Unknown"}${elements[enemy.affinity] ? ` · Affinity: ${elements[enemy.affinity].icon} ${elements[enemy.affinity].name}` : " · No elemental affinity"}` : "",
      playerHpText: `${Math.round(player.hp || 0)} / ${Math.round(player.maxHp || 0)}`,
      playerHpPct: rt.clamp((player.hp || 0) / Math.max(1, player.maxHp || 1) * 100, 0, 100),
      enemyHpText: enemy ? `${Math.max(0, enemy.hp || 0)} / ${enemy.maxHp || 0} · ${enemy.attack || 0} ATK · ${enemy.defense || 0} DEF${(enemy.dodge || 0) > 0 ? ` · ${Math.round(enemy.dodge * 100)}% DODGE` : ""}` : "",
      enemyHpPct: enemy ? rt.clamp((enemy.hp || 0) / Math.max(1, enemy.maxHp || 1) * 100, 0, 100) : 0
    };
  }

  function ensureResourceUI() {
    const rt = requireRuntime(), doc = rt.document;
    let wrap = rt.find("classResourceWrap");
    if (wrap) return wrap;
    const ultimateWrap = doc.querySelector("#combatOverlay .ultimate-wrap");
    if (!ultimateWrap) return null;
    wrap = doc.createElement("div");
    wrap.id = "classResourceWrap";
    wrap.className = "class-resource-wrap hidden";
    wrap.innerHTML = '<div class="class-resource-label"><span id="classResourceName">Class resource</span><span id="classResourceText">0 / 100</span></div><div class="class-resource-bar"><i id="classResourceFill"></i></div><div class="class-resource-note" id="classResourceNote"></div>';
    ultimateWrap.parentNode.insertBefore(wrap, ultimateWrap);
    return wrap;
  }

  function renderResource(resource) {
    const rt = requireRuntime(), wrap = ensureResourceUI();
    if (!wrap) return;
    if (!resource) { wrap.className = "class-resource-wrap hidden"; return; }
    wrap.className = `class-resource-wrap ${resource.type || ""}`;
    const name = rt.find("classResourceName"), text = rt.find("classResourceText"), fill = rt.find("classResourceFill"), note = rt.find("classResourceNote");
    if (name) name.textContent = resource.name;
    if (text) text.textContent = resource.textMode ? resource.text : `${Math.round(resource.value)} / ${Math.round(resource.max)}`;
    if (fill) fill.style.width = resource.textMode ? "0%" : `${rt.clamp(resource.max ? resource.value / resource.max * 100 : 0, 0, 100)}%`;
    if (note) note.textContent = resource.note || "";
  }

  function syncSummonerSpirits() {
    const rt = requireRuntime(), doc = rt.document, state = rt.getState(), player = state.player || {}, pets = rt.getPets();
    let row = rt.find("v17SummonerSpirits");
    if (!rt.isClassActive("summoner")) { row?.remove(); return; }
    if (!row) {
      row = doc.createElement("div"); row.id = "v17SummonerSpirits"; row.className = "summoner-spirit-row";
      const pet = rt.find("combatPet"); pet?.parentElement?.insertBefore(row, pet.nextSibling);
    }
    const ids = player.summonerSpirits || [];
    row.innerHTML = ids.map(id => `<span class="summoner-spirit-token" title="${pets[id]?.name || id}">${pets[id]?.icon || "🐾"}</span>`).join("");
  }

  function renderEnemyParty() {
    const rt = requireRuntime(), state = rt.getState(), enemies = state.currentEnemies || [], elements = rt.getElements();
    const strip = rt.find("enemyParty"), stage = rt.find("enemyIcon");
    if (!strip || !stage) return;
    strip.innerHTML = "";
    stage.className = "fighter-icon enemy-stage-icons";
    stage.innerHTML = enemies.map((enemy, index) => {
      const poison = enemy.poisonStacks || 0;
      const compactPoison = poison >= 10 ? `<span class="v17-poison-count poison-count-compact" title="${poison} Poison stacks">${poison}×☠️</span>` : "";
      const miniStatus = statusDotsHTML(enemy.enemyBarrier || 0, poison >= 10 ? 0 : poison) + compactPoison;
      const affinity = enemy.affinity && elements[enemy.affinity];
      return `<span class="stage-enemy${index === state.currentEnemyIndex && enemy.hp > 0 ? " selected" : ""}${enemy.hp <= 0 ? " defeated" : ""}${enemy.guardian ? " guardian" : ""}${enemy.miniBoss ? " miniboss" : ""}${enemy.finalBoss ? " final-boss" : ""}" data-enemy-index="${index}" title="${enemy.name} · ${Math.max(0, enemy.hp)}/${enemy.maxHp} HP · ${enemy.attack || 0} ATK · ${enemy.defense || 0} DEF${affinity ? ` · ${affinity.name} affinity` : ""}"><span class="stage-sprite">${rt.enemyPortraitHTML(enemy)}</span><span class="stage-affinity">${affinity ? affinity.icon : ""}</span>${enemy.rangerMarks ? `<span class="stage-mark">🏹 ×${enemy.rangerMarks}</span>` : ""}<span class="stage-mini-status">${miniStatus}</span></span>`;
    }).join("");
    stage.classList.toggle("db0636-tiered-enemy-stage", !!stage.querySelector(".db0636-tiered-enemy-art"));
    enemies.forEach((enemy, index) => {
      const button = rt.document.createElement("button");
      button.className = `enemy-chip${index === state.currentEnemyIndex && enemy.hp > 0 ? " active" : ""}${enemy.hp <= 0 ? " dead" : ""}`;
      button.disabled = enemy.hp <= 0;
      button.title = `${enemy.name} · ${Math.max(0, enemy.hp)}/${enemy.maxHp} HP · ${enemy.defense || 0} DEF`;
      button.innerHTML = `<strong class="target-number">${index + 1}</strong>`;
      button.addEventListener("click", () => rt.selectEnemy(index));
      strip.appendChild(button);
    });
  }

  function renderBossSpecialIndicator() {
    const rt = requireRuntime(), state = rt.getState(), lead = state.currentEncounterLead, box = rt.find("bossSpecialIndicator");
    if (!box) return;
    if (!lead?.guardian || (!lead.miniBoss && !lead.finalBoss && !lead.merchantBoss && !lead.devilBoss)) { box.classList.add("hidden"); return; }
    const interval = Math.max(1, rt.guardianSpecialInterval || 5);
    const remaining = interval - ((state.currentEncounterTurn || 0) % interval);
    box.classList.remove("hidden");
    box.classList.toggle("imminent", remaining <= 2);
    box.textContent = `⚠️ ${lead.specialName || "Guardian special"} in ${remaining} turn${remaining === 1 ? "" : "s"}`;
  }

  function ensureEnergyShieldBars() {
    const rt = requireRuntime();
    [["hpFill", "energyShieldFill"], ["combatPlayerFill", "combatEnergyShieldFill"]].forEach(([base, id]) => {
      const fill = rt.find(base), bar = fill?.parentElement;
      if (bar && !rt.find(id)) {
        const shield = rt.document.createElement("i"); shield.id = id; shield.className = "energy-shield-fill"; shield.style.width = "0%"; bar.appendChild(shield);
      }
    });
  }

  function syncEnergyShieldBars() {
    const rt = requireRuntime(), { player = {} } = rt.getState();
    ensureEnergyShieldBars();
    const pct = rt.clamp((player.energyShield || 0) / Math.max(1, player.maxHp || 1) * 100, 0, 100);
    if (rt.find("energyShieldFill")) rt.find("energyShieldFill").style.width = `${pct}%`;
    if (rt.find("combatEnergyShieldFill")) rt.find("combatEnergyShieldFill").style.width = `${pct}%`;
    if ((player.energyShield || 0) > 0) {
      if (rt.find("hpText")) rt.find("hpText").textContent = `${Math.round(player.hp)} / ${Math.round(player.maxHp)} · 🔵 ${Math.round(player.energyShield)}`;
      if (rt.find("combatPlayerHp")) rt.find("combatPlayerHp").textContent = `${Math.round(player.hp)} / ${Math.round(player.maxHp)} · 🔵 ${Math.round(player.energyShield)}`;
    }
  }

  function ensureDragoonJumpButton() {
    const rt = requireRuntime(), actions = rt.document.querySelector("#combatOverlay .combat-actions");
    if (!actions) return null;
    let button = rt.find("dragoonJumpBtn");
    if (!button) {
      button = rt.document.createElement("button"); button.id = "dragoonJumpBtn"; button.type = "button"; button.className = "combat-btn special action-tooltip";
      button.addEventListener("click", () => rt.onDragoonJump());
      actions.insertBefore(button, rt.find("guardBtn") || null);
    }
    return button;
  }

  function syncDragoonPresentation() {
    const rt = requireRuntime(), { player = {} } = rt.getState();
    const icon = rt.find("combatPlayerIcon"), airborne = rt.dragoonActive() && ((player.dragoonAirborneResponses || 0) > 0 || !!player.dragoonLandingReady);
    if (icon) {
      if (airborne) icon.classList.remove("db-dragoon-landing");
      icon.classList.toggle("db-dragoon-airborne", airborne);
    }
  }

  function dragoonLandPresentation() {
    const rt = requireRuntime(), icon = rt.find("combatPlayerIcon");
    if (!icon) return;
    icon.classList.remove("db-dragoon-airborne");
    icon.classList.add("db-dragoon-landing");
    clearTimeout(dragoonLandingTimer);
    dragoonLandingTimer = setTimeout(() => icon.classList.remove("db-dragoon-landing"), 240);
  }

  function clearDragoonPresentation() {
    const rt = requireRuntime();
    clearTimeout(dragoonLandingTimer);
    rt.find("combatPlayerIcon")?.classList.remove("db-dragoon-airborne", "db-dragoon-landing");
  }

  function update() {
    const rt = requireRuntime(), vm = buildViewModel(), state = vm.state, player = state.player || {}, enemy = state.currentEnemy;
    if (!enemy) return;
    const classes = rt.getClasses();
    const setText = (id, text) => { const node = rt.find(id); if (node) node.textContent = text; };
    const setTip = (id, tip) => { const node = rt.find(id); if (node) node.dataset.tip = tip || ""; };

    setText("enemyName", vm.enemyName);
    setText("enemyWeakness", vm.enemyWeakness);
    setText("combatPlayerHp", vm.playerHpText);
    if (rt.find("combatPlayerFill")) rt.find("combatPlayerFill").style.width = `${vm.playerHpPct}%`;
    setText("enemyHpText", vm.enemyHpText);
    if (rt.find("enemyHpFill")) rt.find("enemyHpFill").style.width = `${vm.enemyHpPct}%`;

    const playerStatus = rt.find("playerStatusDots");
    if (playerStatus) {
      playerStatus.innerHTML = statusDotsHTML(player.combatShield || 0, 0, null);
      if ((player.devilBurnStacks || 0) > 0) playerStatus.insertAdjacentHTML("beforeend", `<span class="burn-status" title="${player.devilBurnStacks} Hellfire stacks · uncapped · 1% max HP each">🔥×${player.devilBurnStacks}</span>`);
      if ((player.db0511BurnStacks || 0) > 0) playerStatus.insertAdjacentHTML("beforeend", `<span class="db0511-player-status" title="Burn: 1% max HP per stack each action">🔥×${player.db0511BurnStacks}</span>`);
      if ((player.db0511PoisonStacks || 0) > 0) playerStatus.insertAdjacentHTML("beforeend", `<span class="db0511-player-status" title="Enemy Poison">☠️×${player.db0511PoisonStacks}</span>`);
      if (player._db0511SkipAction) playerStatus.insertAdjacentHTML("beforeend", `<span class="db0511-player-status">${player._db0511SkipAction.startsWith("❄️") ? "❄️ FROZEN" : "⚡ STUNNED"}</span>`);
    }
    const enemyStatus = rt.find("enemyStatusDots");
    if (enemyStatus) {
      enemyStatus.innerHTML = statusDotsHTML(enemy.enemyBarrier || 0, enemy.poisonStacks || 0, enemy.affinity);
      if ((enemy.burnStacks || 0) > 0) enemyStatus.insertAdjacentHTML("beforeend", `<span class="burn-status" title="Burn ${enemy.burnStacks}/10: takes ${enemy.burnStacks}% max HP damage each turn">🔥×${enemy.burnStacks}</span>`);
    }

    const attack = rt.find("attackBtn"), guard = rt.find("guardBtn"), potion = rt.find("potionBtn"), ultimate = rt.find("ultimateBtn"), special = rt.find("specialAttackBtn"), actions = rt.document.querySelector("#combatOverlay .combat-actions");
    if (attack) { attack.disabled = vm.attack.disabled; attack.textContent = vm.attack.text; attack.dataset.tip = vm.attack.tip; }
    if (guard) { guard.disabled = vm.guard.disabled; guard.textContent = vm.guard.text; guard.dataset.tip = vm.guard.tip; }
    if (potion) { potion.disabled = vm.potion.disabled; potion.dataset.tip = vm.potion.tip; }
    if (ultimate) { ultimate.disabled = vm.ultimate.disabled; ultimate.textContent = vm.ultimate.text; ultimate.dataset.tip = vm.ultimate.tip; }
    if (special) {
      special.hidden = vm.special.hidden; special.className = vm.special.className; special.textContent = vm.special.text; special.dataset.tip = vm.special.tip; special.disabled = vm.special.disabled;
      special.classList.toggle("ready", !!vm.special.ready);
    }
    actions?.classList.toggle("has-special", !!vm.hasSpecial);

    const cls = classes[player.classId] || classes.ranger;
    rt.applyClassPortrait(rt.find("combatPlayerIcon"), cls?.id || "ranger", true);
    renderResource(vm.resource);
    syncSummonerSpirits();
    renderEnemyParty();
    renderBossSpecialIndicator();

    const echo = rt.find("echoText");
    if (echo) {
      const scale = Math.round((player.echoDamageScale || .70) * 100);
      echo.title = `${Math.round((player.doubleStrike || 0) * 100)}% Echo Strike chance. Each Echo currently deals ${scale}% of normal strike damage.${scale > 70 ? ` (${scale - 70}% points above the normal 70% Echo damage.)` : ""}`;
      const box = echo.closest(".stat"); if (box) box.title = echo.title;
    }

    if (player.classId === "slimerouge" && (player.slimeRougeUltimateClass || player.v28BorrowedUltimateClass)) {
      const donor = classes[player.slimeRougeUltimateClass || player.v28BorrowedUltimateClass];
      if (donor) setText("ultimateName", `${donor.icon} ${donor.ultimate.name}`);
    }

    syncEnergyShieldBars();
    const jump = ensureDragoonJumpButton();
    syncDragoonPresentation();
    if (jump) { jump.hidden = vm.jump.hidden; jump.disabled = vm.jump.disabled; jump.textContent = vm.jump.text; }
    return vm;
  }

  const api = Object.freeze({
    owner: "combat/presentation",
    apiVersion: 1,
    configure,
    update,
    renderEnemyParty,
    renderBossSpecialIndicator,
    statusDotsHTML,
    syncEnergyShieldBars,
    syncSummonerSpirits,
    ensureDragoonJumpButton,
    syncDragoonPresentation,
    dragoonLandPresentation,
    clearDragoonPresentation,
    _test: Object.freeze({ buildViewModel })
  });

  window.DiceboundCombatPresentation = api;
})();
