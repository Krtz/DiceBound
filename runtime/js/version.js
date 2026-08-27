(() => {
  "use strict";

  // These are the only release-version literals in the browser runtime.
  // tools/set_project_version.py stamps them from its explicit Version/Channel input.
  const VERSION="0.6.4.14";
  const CHANNEL="Beta";
  const NAME="Dicebound";
  const RELEASE_SUMMARY="lunch-playtest polish for packs, loot comparison, footsteps, Camp feedback and recurring Slimes.";

  window.DiceboundVersion=Object.freeze({
    apiVersion:1,
    name:NAME,
    version:VERSION,
    channel:CHANNEL,
    displayTitle:`${NAME}: ${CHANNEL} v${VERSION}`,
    displayVersion:`${CHANNEL} v${VERSION}`,
    subtitle:`${CHANNEL} v${VERSION} · ${RELEASE_SUMMARY}`,
  });
})();
