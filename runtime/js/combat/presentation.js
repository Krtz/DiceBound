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
    barriers = Math.max(0, Number(barriers) || 0);
    poison = Math.max(0, Number(poison) || 0);
    if (barriers >= 5) html += `<span class="status-count barrier-count" title="${barriers} Barrier stacks">🛡️ ${barriers}</span>`;
    else for (let i = 0; i < barriers; i++) html += '<span class="status-dot barrier" title="Barrier"></span>';
    if (poison >= 5) html += `<span class="status-count poison-count" title="${poison} Poison stacks">☠️ ${poison}</span>`;
    else for (let i = 0; i < poison; i++) html += '<span class="status-dot poison" title="Poison"></span>';
    if (affinity && elements[affinity]) html += `<span class="status-affinity" title="${elements[affinity].name} affinity">${elements[affinity].icon}</span>`;
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
        special.hidden = false; hasSpecial = true;
        special.text = `${cfg.spellIcon} ${cfg.spell} (${cfg.cost})`;
        special.tip = identityId === "sorcerer"
          ? `${cfg.desc} Current Echo conversion: +${Math.round(Math.max(0, player.doubleStrike || 0) * 50)}% Arcane Lance damage. Current Lifesteal: ${Math.round(Math.max(0, player.lifeSteal || 0) * 100)}%.`
          : cfg.desc;
        special.disabled = combatBusy || (player.mana || 0) < cfg.cost;
        resource = classResource("mana", "Mana", player.mana || 0, player.maxMana || 0, cfg.desc);
      }
    } else if (rt.isClassActive("bloodmage")) {
      attack.text = "🩸 Bloodletting";
      attack.tip = "A normal basic attack with extra Lifesteal. Bloodletting restores HP so you can spend that HP as fuel on Exsanguinate.";
      guard.text = "💉 Replenish";
      guard.tip = "Replenish heals you and the selected enemy, grants 20 Ultimate, and counts as Guard for the incoming enemy response.";
      special.hidden = false; hasSpecial = true;
      special.text = "🩸 Exsanguinate";
      special.tip = "Spend 12% max HP without killing yourself to deal a brutal blood-fuelled attack.";
      special.disabled = combatBusy || (player.hp || 0) <= 1;
      resource = classResource("blood", "Blood fuel (HP)", player.hp || 0, player.maxHp || 1, "Bloodmage has no Mana. Your HP bar is your spell resource; Bloodletting restores fuel and Exsanguinate spends it.");
    } else if (rt.isClassActive("rogue")) {
      special.hidden = false; hasSpecial = true; special.className += " steal";
      special.text = player.rogueStealUsed ? "🗡️ Steal (used)" : "🗡️ Steal";
      special.tip = "Attempt once per battle. Success scales with Luck and steals gold, can steal a potion, and at high Luck can even steal a random powerup (chance starts above 50 Luck and caps at 35%).";
      special.disabled = combatBusy || !!player.rogueStealUsed;
    } else if (rt.isClassActive("cleric")) {
      special.hidden = false; hasSpecial = true; special.className += " faith";
      special.text = "☀️ Consecration";
      special.tip = "At 100 Faith: heal, raise a Barrier and damage the enemy pack. Healing builds Faith.";
      special.disabled = combatBusy || (player.clericFaith || 0) < 100;
      special.ready = !special.disabled && (player.clericFaith || 0) >= 100;
      resource = classResource("mana", "Faith", player.clericFaith || 0, 100, "Healing builds Faith. Consecration becomes available at 100.");
    } else if (rt.isClassActive("beastmaster")) {
      const stance = player.beastStance || "aggressive";
      special.hidden = false; hasSpecial = true;
      special.text = `🐾 ${stance}`;
      special.tip = "Cycle pet orders without spending a combat turn: Aggressive = +50% pet damage, Defensive = Barrier after pet attack, Support = small heal after pet attack.";
      special.disabled = combatBusy;
      resource = classResource("mana", "Pack order", ["aggressive", "defensive", "support"].indexOf(stance) + 1, 3, "Aggressive → Defensive → Support. The button cycles the active companion order.");
    } else if (rt.isClassActive("monk")) {
      resource = classResource("combo", "Flowing Combo", player.monkCombo || 0, player.monkComboMax || 5, `Consecutive basics build up to ${player.monkComboMax || 5} Combo. Each stack adds damage, Echo and Dodge; Guard or Potion resets it.`);
    } else if (rt.isClassActive("ninja")) {
      resource = classResource("smoke", "Smoke", player.ninjaSmoke || 0, player.ninjaSmokeNeed || 3, `Every critical tier grants 1 Smoke — a double crit grants 2, triple crit 3, including Echoes. At ${player.ninjaSmokeNeed || 3}, the next basic strike becomes Smoke Execution.`);
    } else if (rt.isClassActive("ranger")) {
      const cap = Math.max(3, Number(player.rangerMarkMax) || 3), marks = enemy?.rangerMarks || 0;
      resource = classResource("mark", "Marks on target", marks, cap, `Each landed basic strike or Echo adds 1 Mark. Marks add Crit against that target; Arrow Storm consumes every mark in the pack. Current cap: ${cap}.`);
    } else if (rt.isClassActive("fighter")) {
      resource = classResource("combo", "Counterblows", player.fighterCounterStacks || 0, player.fighterCounterMax || 1, "Guard stores one Counterblow. Each stored stack empowers one future basic attack by +55% damage.");
    } else if (rt.isClassActive("turtle")) {
      resource = classResource("combo", "Shell Momentum", player.turtleGuardChain || 0, player.turtleGuardMax || 5, "Consecutive Guards build Shell Momentum. Later Guards are stronger; stacks 3 and 5 raise a Barrier. Your next basic attack consumes the chain for +18% damage per stack.");
    } else if (rt.isClassActive("clown")) {
      resource = textResource("gag", "Opening Gag", player.clownGimmick || "No gag yet", player.clownGimmick ? (rt.getGagInfo()[player.clownGimmick] || player.clownGimmick) : "A random gag appears when combat begins.");
    } else if (rt.isClassActive("ceo")) {
      const tier = (player.gold || 0) >= 1000 ? 3 : (player.gold || 0) >= 500 ? 2 : (player.gold || 0) >= 250 ? 1 : 0;
      resource = classResource("mana", "Executive tier", tier, 3, `${player.gold || 0} gold. The class's main identity is an absurd +200% gold engine; 1000+ gold also starts battles with a Barrier.`);
    }

    if (rt.isClassActive("summoner")) {
      const cfg = rt.getOccultSpells().summoner, spirits = player.summonerSpirits || [], gain = cfg.gain + (player.summonerManaBonus || 0);
      attack.tip = `Spirit Bolt is your Mana-building attack. It deals about 82% normal basic damage and grants up to ${gain} Mana.`;
      special.hidden = false; hasSpecial = true;
      special.text = `🐾 Conjure (${cfg.cost}) · ${spirits.length}/${player.summonerCap || 3}`;
      special.tip = `Spend ${cfg.cost} Mana to conjure a spirit. Conjure immediately makes your active companion and every spirit attack with a small temporary damage boost.`;
      special.disabled = combatBusy || (player.mana || 0) < cfg.cost;
      resource = classResource("mana", "Mana / Spirit Circle", player.mana || 0, player.maxMana || 0, `${cfg.desc} Active spirits: ${spirits.length ? spirits.map(id => `${pets[id]?.icon || "🐾"} ${pets[id]?.name || id}`).join(", ") : "none"}.`);
    } else if (rt.isClassActive("pokemontrainer")) {
      const roster = player.trainerRoster || [], id = rt.activeTrainerPetId();
      special.hidden = false; hasSpecial = true;
      special.text = `🔄 Switch · ${pets[id]?.icon || "🐾"} ${pets[id]?.name || "Creature"}`;
      special.tip = "Switch to the next creature in your six-member roster without spending a combat turn. The active creature attacks harder and can call a roster assist.";
      special.disabled = combatBusy || !roster.length;
      resource = classResource("mana", "Six-creature roster", (player.trainerActiveIndex || 0) + 1, Math.max(1, roster.length), `Run roster: ${roster.map((x, i) => `${i === player.trainerActiveIndex ? "▶ " : ""}${pets[x]?.icon || "🐾"} ${pets[x]?.name || x}`).join(" · ")}`);
    } else if (rt.isClassActive("paladin")) {
      resource = classResource("faith", "Oath Grace", player.paladinGrace || 0, 100, "Healing stores Grace. Guard consumes it for up to +20% Guard power and 1 Barrier per 25 Grace.");
    }

    if (rt.isClassActive("alchemist")) {
      special.hidden = false; hasSpecial = true;
      special.className = "combat-btn special action-tooltip alchemist-special";
      special.text = `🧪 Volatile Flask (${player.potions || 0})`;
      special.tip = `Consume 1 potion to damage the enemy pack. Damage scales with the same Potion Healing bonuses that increase your ${rt.potionHealValue()} HP drink.`;
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
      ultimate.disabled = combatBusy || !enemy || (player.ultimateCharge || 0) < 70;
      ultimate.tip = `Unstable Ultimate: usable at 70 charge for 75% normal damage. Current charge: ${Math.round(player.ultimateCharge || 0)}.`;
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

    return { attack, guard, potion, ultimate, special, hasSpecial, resource, cls, elements, enemyHpText };
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

  function renderEnemyParty() {
    const rt = requireRuntime(), state = rt.getState(), find = rt.find, doc = rt.document, elements = rt.getElements();
    const strip = find("enemyParty"), stage = find("enemyIcon"); if (!strip || !stage) return;
    const enemies = state.currentEnemies || [], index = state.currentEnemyIndex || 0;
    strip.innerHTML = ""; stage.className = "fighter-icon enemy-stage-icons";
    stage.innerHTML = enemies.map((e, i) => `<span class="stage-enemy${i === index && e.hp > 0 ? " selected" : ""}${e.hp <= 0 ? " defeated" : ""}${e.guardian ? " guardian" : ""}${e.miniBoss ? " miniboss" : ""}${e.finalBoss ? " final-boss" : ""}" data-enemy-index="${i}" title="${e.name} · ${Math.max(0, e.hp)}/${e.maxHp} HP · ${e.attack || 0} ATK · ${e.defense || 0} DEF${e.affinity ? ` · ${elements[e.affinity]?.name || e.affinity} affinity` : ""}"><span class="stage-sprite">${rt.enemyPortraitHTML(e)}</span><span class="stage-affinity">${e.affinity ? elements[e.affinity]?.icon || "" : ""}</span>${e.rangerMarks ? `<span class="stage-mark">🏹 ×${e.rangerMarks}</span>` : ""}<span class="stage-mini-status">${statusDotsHTML(e.enemyBarrier || 0, e.poisonStacks || 0)}</span></span>`).join("");
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

  function syncDragoonPresentation() {
    const rt = requireRuntime(), player = rt.getState().player || {}, icon = rt.find("combatPlayerIcon"), airborne = rt.dragoonActive() && ((player.dragoonAirborneResponses || 0) > 0 || !!player.dragoonLandingReady);
    if (icon) { if (airborne) icon.classList.remove("db-dragoon-landing"); icon.classList.toggle("db-dragoon-airborne", airborne); }
  }

  function dragoonLandPresentation() {
    const rt = requireRuntime(), icon = rt.find("combatPlayerIcon"); if (!icon) return;
    icon.classList.remove("db-dragoon-airborne"); icon.classList.add("db-dragoon-landing"); clearTimeout(dragoonLandingTimer); dragoonLandingTimer = setTimeout(() => icon.classList.remove("db-dragoon-landing"), 240);
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
    const find = rt.find, elements = rt.getElements(), model = buildViewModel(), weak = elements[enemy.weakness], aff = elements[enemy.affinity];
    if (find("enemyName")) find("enemyName").textContent = `Target ${(state.currentEnemyIndex || 0) + 1}: ${enemy.name}`;
    if (find("enemyWeakness")) find("enemyWeakness").textContent = `${weak ? `Weakness: ${weak.icon} ${weak.name}` : "Weakness: Unknown"}${aff ? ` · Affinity: ${aff.icon} ${aff.name}` : " · No elemental affinity"}`;
    if (find("combatPlayerHp")) find("combatPlayerHp").textContent = `${Math.round(player.hp)} / ${Math.round(player.maxHp)}`;
    if (find("combatPlayerFill")) find("combatPlayerFill").style.width = `${rt.clamp(player.hp / Math.max(1, player.maxHp) * 100, 0, 100)}%`;
    if (find("enemyHpText")) find("enemyHpText").textContent = model.enemyHpText;
    if (find("enemyHpFill")) find("enemyHpFill").style.width = `${rt.clamp(enemy.hp / Math.max(1, enemy.maxHp) * 100, 0, 100)}%`;
    if (find("playerStatusDots")) {
      find("playerStatusDots").innerHTML = statusDotsHTML(player.combatShield || 0, 0, null);
      if ((player.devilBurnStacks || 0) > 0) find("playerStatusDots").insertAdjacentHTML("beforeend", `<span class="burn-status" title="${player.devilBurnStacks} Hellfire stacks · uncapped · 1% max HP each">🔥×${player.devilBurnStacks}</span>`);
      if ((player.db0511BurnStacks || 0) > 0) find("playerStatusDots").insertAdjacentHTML("beforeend", `<span class="db0511-player-status" title="Burn: 1% max HP per stack each action">🔥×${player.db0511BurnStacks}</span>`);
      if ((player.db0511PoisonStacks || 0) > 0) find("playerStatusDots").insertAdjacentHTML("beforeend", `<span class="db0511-player-status" title="Enemy Poison">☠️×${player.db0511PoisonStacks}</span>`);
      if (player._db0511SkipAction) find("playerStatusDots").insertAdjacentHTML("beforeend", `<span class="db0511-player-status">${player._db0511SkipAction.startsWith("❄️") ? "❄️ FROZEN" : "⚡ STUNNED"}</span>`);
    }
    if (find("enemyStatusDots")) {
      find("enemyStatusDots").innerHTML = statusDotsHTML(enemy.enemyBarrier || 0, enemy.poisonStacks || 0, enemy.affinity);
      if ((enemy.burnStacks || 0) > 0) find("enemyStatusDots").insertAdjacentHTML("beforeend", `<span class="burn-status" title="Burn ${enemy.burnStacks}/10: takes ${enemy.burnStacks}% max HP damage each turn">🔥×${enemy.burnStacks}</span>`);
    }
    [["attackBtn", model.attack], ["guardBtn", model.guard], ["potionBtn", model.potion], ["ultimateBtn", model.ultimate]].forEach(([id, spec]) => { const b = find(id); if (!b) return; b.disabled = !!spec.disabled; if (spec.text != null) b.textContent = spec.text; b.dataset.tip = spec.tip || ""; });
    const special = find("specialAttackBtn"); if (special) { special.hidden = !!model.special.hidden; special.className = model.special.className; special.textContent = model.special.text; special.dataset.tip = model.special.tip; special.disabled = !!model.special.disabled; special.classList.toggle("ready", !!model.special.ready); }
    const actions = rt.document.querySelector("#combatOverlay .combat-actions"); actions?.classList.toggle("has-special", !!model.hasSpecial);
    const cls = model.cls; rt.applyClassPortrait(find("combatPlayerIcon"), cls.id, true);
    renderResource(model.resource); renderSummonerSpirits(); renderEnemyParty(); syncEnergyShieldBars(); renderBossSpecialIndicator(); syncDragoonPresentation();
    const jump = ensureDragoonJumpButton();
    if (jump) { const landing = rt.dragoonActive() && !!player.dragoonLandingReady; jump.hidden = !rt.dragoonActive(); jump.disabled = !rt.dragoonActive() || state.combatBusy || landing || (player.dragoonAirborneResponses || 0) > 0 || (player.dragoonJumpCooldown || 0) > 0; jump.textContent = (player.dragoonAirborneResponses || 0) > 0 ? "🐉 Airborne" : (player.dragoonJumpCooldown || 0) > 0 ? `🐉 Jump (${player.dragoonJumpCooldown})` : "🐉 Jump"; }
    return model;
  }

  const api = Object.freeze({
    owner: "combat/presentation",
    configure,
    update,
    renderEnemyParty,
    renderBossSpecialIndicator,
    statusDotsHTML,
    syncEnergyShieldBars,
    syncDragoonPresentation,
    dragoonLandPresentation,
    ensureDragoonJumpButton,
    clearDragoonPresentation,
    _test: Object.freeze({ buildViewModel })
  });
  window.DiceboundCombatPresentation = api;
})();
