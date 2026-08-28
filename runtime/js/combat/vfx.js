(() => {
  "use strict";

  // #40: authored combat-effect rendering belongs here. The compatibility
  // monolith retains only the narrow hooks into its local combat state and
  // resolution functions, so presentation cannot change RNG, damage or turns.
  const NATURE_EFFECT_KEY = "naturePoisonVines";
  const DONUT_EFFECT_KEY = "donutProcRain";

  function donutFramePosition(frame, frameCount) {
    const count = Math.max(1, Math.floor(Number(frameCount) || 1));
    const index = Math.max(0, Math.min(count - 1, Math.floor(Number(frame) || 0)));
    return `${count === 1 ? 0 : Math.round(index * 100 / (count - 1))}% 0%`;
  }

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
          globalThis.setTimeout?.(() => node.remove(), reduced ? 180 : duration);
          return;
        }
        frame += 1;
        globalThis.setTimeout?.(present, duration);
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
        .db-donut-rain-vfx{position:absolute;z-index:32;left:50%;bottom:-12%;width:clamp(92px,175%,196px);aspect-ratio:1 / 2;pointer-events:none;transform:translateX(-50%);background-repeat:no-repeat;filter:drop-shadow(0 7px 9px rgba(28,8,35,.42));isolation:isolate}
        #combatPlayerIcon,.stage-enemy{position:relative;isolation:isolate}
        @media(max-width:760px){.db-donut-rain-vfx{width:clamp(78px,145%,156px);bottom:-9%}}
        @media(prefers-reduced-motion:reduce){.db-donut-rain-vfx{filter:none}}
      `);
    }

    function donutHostForEnemy(enemy) {
      return natureHostForEnemy(enemy) || documentRoot()?.querySelector?.("#enemyIcon .stage-enemy.selected") || null;
    }

    function mountDonutRain(host, target, origin, effect) {
      const document = documentRoot();
      const frameCount = Math.max(1, Math.floor(Number(effect.frameCount) || 1));
      const frameWidth = Math.max(1, Math.floor(Number(effect.frameWidth) || 1));
      const frameHeight = Math.max(1, Math.floor(Number(effect.frameHeight) || 2));
      const node = document.createElement("span");
      node.className = "db-donut-rain-vfx";
      node.dataset.effect = DONUT_EFFECT_KEY;
      node.dataset.source = effect.image;
      node.dataset.donutTarget = target;
      node.dataset.origin = origin;
      node.dataset.donutFrame = "0";
      Object.assign(node.style, {
        aspectRatio: `${frameWidth} / ${frameHeight}`,
        backgroundImage: `url("${effect.image}")`,
        backgroundPosition: donutFramePosition(0, frameCount),
        backgroundSize: `${frameCount * 100}% 100%`,
      });
      host.append(node);
      return node;
    }

    function setDonutFrame(node, frame, frameCount) {
      if (!node) return;
      node.dataset.donutFrame = String(frame);
      node.style.backgroundPosition = donutFramePosition(frame, frameCount);
    }

    function playDonutRain({ origin = "player", enemy = null } = {}) {
      const document = documentRoot();
      const effect = donutEffect();
      if (!document?.createElement || !effect?.image) return false;
      prepareDonut();
      document.querySelectorAll?.(".db-donut-rain-vfx")?.forEach(node => node.remove());
      const normalizedOrigin = origin === "enemy" ? "enemy" : "player";
      const nodes = [
        [document.getElementById?.("combatPlayerIcon"), "player"],
        [donutHostForEnemy(enemy), "enemy"],
      ].filter(([host]) => !!host).map(([host, target]) => mountDonutRain(host, target, normalizedOrigin, effect));
      if (!nodes.length) return false;
      const reduced = !!rootWindow().matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const frameCount = Math.max(1, Math.floor(Number(effect.frameCount) || 1));
      const duration = Math.max(320, Number(effect.durationMs) || 1450);
      if (!reduced) {
        for (let frame = 1; frame < frameCount; frame += 1) {
          globalThis.setTimeout?.(() => nodes.forEach(node => setDonutFrame(node, frame, frameCount)), Math.round(duration * frame / frameCount));
        }
      }
      globalThis.setTimeout?.(() => nodes.forEach(node => node.remove()), reduced ? 260 : duration);
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
      donutFramePosition,
      playDonutRain,
    });
  }

  window.DiceboundCombatVfx = Object.freeze({ create });
})();
