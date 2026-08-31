(() => {
  "use strict";

  // #40: authored combat-effect rendering belongs here. The compatibility
  // monolith retains only the narrow hooks into its local combat state and
  // resolution functions, so presentation cannot change RNG, damage or turns.
  const NATURE_EFFECT_KEY = "naturePoisonVines";
  const DONUT_EFFECT_KEY = "donutProcRain";

  function rootWindow() {
    return globalThis.window || globalThis;
  }

  function documentRoot() {
    return globalThis.document || null;
  }

  function assets() {
    return rootWindow().DiceboundAssets || null;
  }

  function ensureStyle(id, text) {
    const document = documentRoot();
    if (!document?.getElementById || !document?.createElement || !document.head) return false;
    if (document.getElementById(id)) return true;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = text;
    document.head.appendChild(style);
    return true;
  }

  function create({ getEnemies = () => [], getPlayer = () => null } = {}) {
    let natureLegacySuppressions = 0;
    let presentationEpoch = 0;
    const transientTimers = new Set();

    function schedule(callback, delay) {
      const epoch = presentationEpoch;
      const timer = globalThis.setTimeout?.(() => {
        transientTimers.delete(timer);
        if (epoch === presentationEpoch) callback();
      }, delay);
      if (timer !== undefined) transientTimers.add(timer);
      return timer;
    }

    function clearTransient() {
      presentationEpoch += 1;
      transientTimers.forEach(timer => globalThis.clearTimeout?.(timer));
      transientTimers.clear();
      documentRoot()?.querySelectorAll?.('.db-nature-vines-vfx,.db-donut-rain-vfx,.db-combat-projectile-vfx').forEach(node => node.remove());
      return presentationEpoch;
    }

    function natureEffect() {
      return assets()?.resolveCombatEffect?.(NATURE_EFFECT_KEY) || null;
    }

    function donutEffect() {
      return assets()?.resolveCombatEffect?.(DONUT_EFFECT_KEY) || null;
    }

    function prepareNature() {
      const installed = ensureStyle("dicebound-nature-vfx-style", `
        .db-nature-vines-vfx{position:absolute;z-index:30;left:50%;bottom:-10%;width:clamp(112px,150%,260px);pointer-events:none;transform:translateX(-50%);overflow:visible;filter:drop-shadow(0 8px 10px rgba(20,0,30,.45))}
        .db-nature-vines-vfx.db-nature-vines-stable{position:fixed;z-index:9999;bottom:auto;pointer-events:none;isolation:isolate}
        .db-nature-vines-vfx img{display:block;width:100%;height:auto;max-width:none!important;max-height:none!important;object-fit:contain}
        #combatPlayerIcon,.stage-enemy{position:relative;isolation:isolate}
        @media(max-width:760px){.db-nature-vines-vfx:not(.db-nature-vines-stable){width:clamp(96px,135%,185px);bottom:-8%}}
        @media(prefers-reduced-motion:reduce){.db-nature-vines-vfx{filter:none}}
      `);
      if (typeof globalThis.setTimeout === "function" && typeof globalThis.Image === "function") {
        globalThis.setTimeout(() => natureEffect()?.frames?.forEach(src => {
          const image = new globalThis.Image();
          image.src = src;
        }), 0);
      }
      return installed;
    }

    function hasNaturePresentation() {
      return !!natureEffect()?.frames?.length;
    }

    function livingNatureTargets(enemies = getEnemies?.()) {
      return (enemies || []).filter(enemy => enemy && enemy.hp > 0);
    }

    function natureEntries() {
      const document = documentRoot();
      if (!document?.querySelectorAll) return [];
      return [...document.querySelectorAll(".db-nature-vines-vfx")].map(node => {
        const host = node.closest?.(".stage-enemy");
        const explicitIndex = node.dataset.enemyIndex;
        return {
          target: node.dataset.natureVfxTarget,
          frame: Number(node.dataset.natureVfxFrame),
          enemyIndex: explicitIndex !== undefined ? Number(explicitIndex) : host ? Number(host.dataset.enemyIndex) : null,
        };
      });
    }

    function natureHostForEnemy(enemy) {
      const index = (getEnemies?.() || []).indexOf(enemy);
      if (index < 0) return null;
      return documentRoot()?.querySelector?.(`#enemyIcon .stage-enemy[data-enemy-index="${index}"]`) || null;
    }

    function mountNatureVfx(node, host, target) {
      const document = documentRoot();
      if (!document?.body || typeof host?.getBoundingClientRect !== "function") {
        host.append(node);
        return;
      }
      const rect = host.getBoundingClientRect();
      if (!rect?.width || !rect?.height) {
        host.append(node);
        return;
      }
      node.classList.add("db-nature-vines-stable");
      node.dataset.natureVfxTarget = target;
      if (target === "enemy" && host.dataset?.enemyIndex !== undefined) node.dataset.enemyIndex = String(host.dataset.enemyIndex);
      const width = Math.round(Math.max(118, Math.min(290, rect.width * 1.55)));
      Object.assign(node.style, {
        left: `${Math.round(rect.left + rect.width / 2)}px`,
        top: `${Math.round(rect.top - rect.height * .08)}px`,
        bottom: "auto",
        width: `${width}px`,
        transform: "translateX(-50%)",
      });
      document.body.append(node);
    }

    function playNatureVfx(host, target) {
      const document = documentRoot();
      const effect = natureEffect();
      if (!document?.createElement || !host || !effect?.frames?.length) return false;
      const reduced = !!rootWindow().matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const enemyIndex = target === "enemy" ? host.dataset?.enemyIndex : undefined;
      const selector = enemyIndex === undefined
        ? `.db-nature-vines-vfx[data-nature-vfx-target="${target}"]`
        : `.db-nature-vines-vfx[data-nature-vfx-target="enemy"][data-enemy-index="${enemyIndex}"]`;
      document.querySelectorAll?.(selector)?.forEach(node => node.remove());
      host.querySelector?.(".db-nature-vines-vfx")?.remove();
      const node = document.createElement("span");
      const image = document.createElement("img");
      node.className = "db-nature-vines-vfx";
      node.dataset.natureVfxTarget = target;
      image.alt = "";
      image.draggable = false;
      node.append(image);
      mountNatureVfx(node, host, target);
      const frames = effect.frames;
      const duration = Math.max(40, Math.floor(Number(effect.frameDurationMs) || 75));
      let frame = 0;
      const present = () => {
        image.src = frames[frame];
        node.dataset.natureVfxFrame = String(frame + 1);
        if (reduced || frame >= frames.length - 1) {
          schedule(() => node.remove(), reduced ? 180 : duration);
          return;
        }
        frame += 1;
        schedule(present, duration);
      };
      present();
      return true;
    }

    function playNatureOnEnemy(enemy) {
      return enemy?.hp > 0 && playNatureVfx(natureHostForEnemy(enemy), "enemy");
    }

    function playNatureOnPlayer() {
      return getPlayer?.()?.hp > 0 && playNatureVfx(documentRoot()?.getElementById?.("combatPlayerIcon"), "player");
    }

    function withNatureLegacyPresentation(key, operation) {
      const replacesLegacy = key === "nature" && hasNaturePresentation();
      if (replacesLegacy) natureLegacySuppressions += 1;
      try {
        return operation();
      } finally {
        if (replacesLegacy) natureLegacySuppressions -= 1;
      }
    }

    function suppressLegacyElementAnimation(key) {
      return key === "nature" && natureLegacySuppressions > 0;
    }

    function donutEntries() {
      const document = documentRoot();
      if (!document?.querySelectorAll) return [];
      return [...document.querySelectorAll(".db-donut-rain-vfx")].map(node => ({
        src: node.dataset.source || "",
        effect: node.dataset.effect || "",
        target: node.dataset.donutTarget || "",
        origin: node.dataset.origin || "",
        frame: Number(node.dataset.donutFrame || 0),
      }));
    }

    function prepareDonut() {
      return ensureStyle("dicebound-donut-vfx-style", `
        .db-donut-rain-vfx{position:absolute;z-index:32;left:50%;bottom:-22%;width:clamp(132px,225%,340px);aspect-ratio:1 / 2;pointer-events:none;transform:translateX(-50%);filter:drop-shadow(0 7px 9px rgba(28,8,35,.42));isolation:isolate}
        .db-donut-rain-vfx img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none}
        #combatPlayerIcon,.stage-enemy{position:relative;isolation:isolate}
        @media(max-width:760px){.db-donut-rain-vfx{width:clamp(96px,190%,220px);bottom:-16%}}
        @media(prefers-reduced-motion:reduce){.db-donut-rain-vfx{filter:none}}
      `);
    }

    function donutHostForEnemy(enemy) {
      return natureHostForEnemy(enemy) || documentRoot()?.querySelector?.("#enemyIcon .stage-enemy.selected") || null;
    }

    function mountDonutRain(host, target, origin, effect) {
      const document = documentRoot();
      const frames = (effect.frames || []).filter(Boolean);
      if (!frames.length) return null;
      const frameWidth = Math.max(1, Math.floor(Number(effect.frameWidth) || 1));
      const frameHeight = Math.max(1, Math.floor(Number(effect.frameHeight) || 2));
      const node = document.createElement("span");
      const image = document.createElement("img");
      node.className = "db-donut-rain-vfx";
      node.dataset.effect = DONUT_EFFECT_KEY;
      node.dataset.source = frames[0];
      node.dataset.donutTarget = target;
      node.dataset.origin = origin;
      node.dataset.donutFrame = "0";
      image.alt = "";
      image.draggable = false;
      image.src = frames[0];
      Object.assign(node.style, {
        aspectRatio: `${frameWidth} / ${frameHeight}`,
      });
      node.append(image);
      host.append(node);
      return node;
    }

    function setDonutFrame(node, frame, frames) {
      if (!node) return;
      const sources = (frames || []).filter(Boolean);
      if (!sources.length) return;
      const index = Math.max(0, Math.min(sources.length - 1, Math.floor(Number(frame) || 0)));
      const image = node.querySelector?.("img") || node.firstElementChild || node.children?.[0] || null;
      node.dataset.donutFrame = String(index);
      node.dataset.source = sources[index];
      if (image) image.src = sources[index];
    }

    function playDonutRain({ origin = "player", enemy = null } = {}) {
      const document = documentRoot();
      const effect = donutEffect();
      const frames = (effect?.frames || []).filter(Boolean);
      if (!document?.createElement || !frames.length) return false;
      prepareDonut();
      document.querySelectorAll?.(".db-donut-rain-vfx")?.forEach(node => node.remove());
      const normalizedOrigin = origin === "enemy" ? "enemy" : "player";
      const nodes = [
        [document.getElementById?.("combatPlayerIcon"), "player"],
        [donutHostForEnemy(enemy), "enemy"],
      ].filter(([host]) => !!host).map(([host, target]) => mountDonutRain(host, target, normalizedOrigin, effect)).filter(Boolean);
      if (!nodes.length) return false;
      const reduced = !!rootWindow().matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const frameCount = frames.length;
      const duration = Math.max(320, Number(effect.durationMs) || 1450);
      const frameDuration = Math.max(40, Math.floor(Number(effect.frameDurationMs) || (duration / frameCount)));
      if (!reduced) {
        for (let frame = 1; frame < frameCount; frame += 1) {
          schedule(() => nodes.forEach(node => setDonutFrame(node, frame, frames)), frameDuration * frame);
        }
      }
      schedule(() => nodes.forEach(node => node.remove()), reduced ? 260 : Math.max(duration, frameDuration * frameCount));
      return true;
    }

    function prepareProjectileEffects() {
      return ensureStyle('dicebound-projectile-vfx-style', `
        .db-combat-projectile-vfx{position:fixed;z-index:10020;pointer-events:none;display:grid;place-items:center;will-change:left,top,transform,opacity;filter:drop-shadow(0 8px 12px rgba(0,0,0,.52));transition:left .30s cubic-bezier(.22,.78,.28,1),top .30s cubic-bezier(.22,.78,.28,1),transform .30s ease,opacity .18s ease}
        .db-combat-projectile-vfx img{display:block;width:100%;height:100%;object-fit:contain}.db-combat-projectile-vfx.db-fire-proc{width:clamp(54px,8vw,120px);height:clamp(54px,8vw,120px)}.db-combat-projectile-vfx.db-gun-proc{width:clamp(72px,10vw,142px);height:clamp(62px,9vw,124px)}
        .db-combat-projectile-vfx.db-impact{transition:transform .14s ease,opacity .20s ease}.db-combat-projectile-vfx.db-impact img{animation:dbCombatImpact .34s ease-out both}@keyframes dbCombatImpact{0%{opacity:0;transform:scale(.35) rotate(-18deg)}35%{opacity:1;transform:scale(1.15)}100%{opacity:0;transform:scale(1.75) rotate(16deg)}}
      `);
    }

    function hostRect(host) {
      const rect = host?.getBoundingClientRect?.();
      return rect?.width && rect?.height ? { left: rect.left + rect.width / 2, top: rect.top + rect.height / 2 } : null;
    }

    function projectileFrames(key, effect) {
      const frames = effect?.frames || [];
      if (key === 'gun') return { launch: frames[1] || frames[0], travel: frames[4] || frames[1] || frames[0], impact: frames[7] || frames[8] || frames[0] };
      return { launch: frames[4] || frames[0], travel: frames[7] || frames[8] || frames[0], impact: frames[1] || frames[2] || frames[0] };
    }

    function playProjectileProc(key, { origin = 'player', enemy = null } = {}) {
      const document = documentRoot();
      const effect = assets()?.resolveCombatEffect?.(key === 'gun' ? 'gunProc' : key === 'fire' ? 'fireProc' : '') || null;
      if (!document?.createElement || !effect?.frames?.length || !prepareProjectileEffects()) return false;
      const enemyHost = donutHostForEnemy(enemy);
      const playerHost = document.getElementById?.('combatPlayerIcon');
      const from = origin === 'enemy' ? hostRect(enemyHost) : hostRect(playerHost);
      const to = origin === 'enemy' ? hostRect(playerHost) : hostRect(enemyHost);
      if (!from || !to) return false;
      const frames = projectileFrames(key, effect);
      const projectile = document.createElement('span');
      const image = document.createElement('img');
      projectile.className = `db-combat-projectile-vfx db-${key}-proc`;
      projectile.dataset.effect = key;
      projectile.dataset.origin = origin === 'enemy' ? 'enemy' : 'player';
      image.alt = ''; image.draggable = false; image.src = frames.launch;
      projectile.append(image);
      Object.assign(projectile.style, { left: `${Math.round(from.left)}px`, top: `${Math.round(from.top)}px`, transform: 'translate(-50%,-50%) scale(.72)' });
      document.body.append(projectile);
      schedule(() => { image.src = frames.travel; Object.assign(projectile.style, { left: `${Math.round(to.left)}px`, top: `${Math.round(to.top)}px`, transform: 'translate(-50%,-50%) scale(1)' }); }, 40);
      schedule(() => { projectile.classList.add('db-impact'); image.src = frames.impact; projectile.style.transform = 'translate(-50%,-50%) scale(1.1)'; }, 355);
      schedule(() => projectile.remove(), 720);
      return true;
    }

    return Object.freeze({
      prepareNature,
      natureEffect,
      donutEffect,
      hasNaturePresentation,
      livingNatureTargets,
      natureEntries,
      playNatureOnEnemy,
      playNatureOnPlayer,
      withNatureLegacyPresentation,
      suppressLegacyElementAnimation,
      donutEntries,
      playDonutRain,
      prepareProjectileEffects,
      playProjectileProc,
      clearTransient,
    });
  }

  window.DiceboundCombatVfx = Object.freeze({ create });
})();
