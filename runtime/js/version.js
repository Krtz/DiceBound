(() => {
  "use strict";

  // These are the only release-version literals in the browser runtime.
  // tools/set_project_version.py stamps them from its explicit Version/Channel input.
  const VERSION="0.6.4.27";
  const CHANNEL="Beta";
  const NAME="Dicebound";
  const RELEASE_SUMMARY="Talent progression now opens in a full-screen constellation atlas.";

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
