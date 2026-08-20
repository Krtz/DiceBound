(() => {
  "use strict";

  function requireFunction(value, label) {
    if (typeof value !== "function") throw new TypeError(`DiceboundRuntimeServices requires ${label}()`);
    return value;
  }

  function requirePlayer(getPlayer) {
    const player = getPlayer();
    if (!player || typeof player !== "object") throw new TypeError("run.getPlayer() must return the live player object");
    return player;
  }

  function createLivePlayerPort(getPlayer) {
    return new Proxy(Object.create(null), {
      get(_target, property) {
        const player = requirePlayer(getPlayer);
        const value = Reflect.get(player, property, player);
        return typeof value === "function" ? value.bind(player) : value;
      },
      set(_target, property, value) {
        return Reflect.set(requirePlayer(getPlayer), property, value);
      },
      has(_target, property) {
        return Reflect.has(requirePlayer(getPlayer), property);
      },
    });
  }

  function createPowerupServices(ports) {
    if (!ports || typeof ports !== "object") throw new TypeError("powerup service ports are required");
    const getPlayer = requireFunction(ports.run?.getPlayer, "run.getPlayer");
    const goldReward = requireFunction(ports.economy?.goldReward, "economy.goldReward");
    const isNightmare = requireFunction(ports.economy?.isNightmare, "economy.isNightmare");
    const heal = requireFunction(ports.combat?.heal, "combat.heal");
    const clamp = requireFunction(ports.rules?.clamp, "rules.clamp");
    const applyCurrentSignature = requireFunction(ports.signatures?.applyCurrent, "signatures.applyCurrent");
    const describeCurrentSignature = requireFunction(ports.signatures?.describeCurrent, "signatures.describeCurrent");
    const elementIds = Object.freeze([...(ports.content?.elementIds || [])]);
    if (!elementIds.length) throw new TypeError("content.elementIds must contain the runtime element IDs");

    return Object.freeze({
      apiVersion: 1,
      run: Object.freeze({ player: createLivePlayerPort(getPlayer) }),
      economy: Object.freeze({ goldReward, isNightmare }),
      combat: Object.freeze({ heal }),
      rules: Object.freeze({ clamp }),
      content: Object.freeze({ elementIds }),
      signatures: Object.freeze({
        applyCurrent: applyCurrentSignature,
        describeCurrent: describeCurrentSignature,
      }),
    });
  }

  window.DiceboundRuntimeServices = Object.freeze({
    apiVersion: 1,
    createPowerupServices,
  });
})();
