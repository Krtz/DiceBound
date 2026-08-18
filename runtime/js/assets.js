(() => {
  "use strict";

  const ROOT = "assets";

  const paths = Object.freeze({
    enemyPortraits: `${ROOT}/enemies/portraits`,
    bossPortraits: `${ROOT}/bosses/portraits`,
    classPortraits: `${ROOT}/classes/portraits`,
    classHeadshots: `${ROOT}/ui/class-art/headshots`,
    classBattleArt: `${ROOT}/ui/class-art/battle`,
    petPortraits: `${ROOT}/pets/portraits`,
    itemIcons: `${ROOT}/items/icons`,
    campBackgrounds: `${ROOT}/camp/backgrounds`,
    campObjects: `${ROOT}/camp/objects`,
    uiIcons: `${ROOT}/ui/icons`,
    uiClassMarkers: `${ROOT}/ui/class-markers`,
    uiBackgrounds: `${ROOT}/ui/backgrounds`,
    effects: `${ROOT}/effects`,
    music: `${ROOT}/music`,
    sounds: `${ROOT}/sounds`
  });

  const SOUND_EXTENSIONS = Object.freeze(["ogg", "mp3", "wav", "webm"]);
  const buildSoundCandidates = (baseName, pack = "custom") => SOUND_EXTENSIONS.map(ext => `${paths.sounds}/${pack}/${baseName}.${ext}`);

  const manifest = Object.freeze({
    version: 7,
    enemies: Object.freeze({
      wolf: Object.freeze({
        portrait: `${paths.enemyPortraits}/wolf.png`,
        alt: "Wolf"
      }),
      bandit: Object.freeze({
        portrait: `${paths.uiIcons}/bandit.png`,
        alt: "Bandit"
      }),
      troll: Object.freeze({
        portrait: `${paths.uiIcons}/troll.png`,
        alt: "Troll"
      })
    }),
    bosses: Object.freeze({}),
    classes: Object.freeze({
      ranger: Object.freeze({ headshot: `${paths.classHeadshots}/ranger.png`, marker: `${paths.uiClassMarkers}/ranger.png`, battle: `${paths.classBattleArt}/ranger.png`, alt: "ranger" }),
      sorcerer: Object.freeze({ headshot: `${paths.classHeadshots}/sorcerer.png`, marker: `${paths.uiClassMarkers}/sorcerer.png`, battle: `${paths.classBattleArt}/sorcerer.png`, alt: "sorcerer" }),
      fighter: Object.freeze({ headshot: `${paths.classHeadshots}/fighter.png`, marker: `${paths.uiClassMarkers}/fighter.png`, battle: `${paths.classBattleArt}/fighter.png`, alt: "fighter" }),
      monk: Object.freeze({ headshot: `${paths.classHeadshots}/monk.png`, marker: `${paths.uiClassMarkers}/monk.png`, battle: `${paths.classBattleArt}/monk.png`, alt: "monk" }),
      clown: Object.freeze({ headshot: `${paths.classHeadshots}/clown.png`, marker: `${paths.uiClassMarkers}/clown.png`, battle: `${paths.classBattleArt}/clown.png`, alt: "clown" }),
      rouge: Object.freeze({ headshot: `${paths.classHeadshots}/rouge.png`, marker: `${paths.uiClassMarkers}/rouge.png`, battle: `${paths.classBattleArt}/rouge.png`, alt: "rouge" }),
      berserker: Object.freeze({ headshot: `${paths.classHeadshots}/berserker.png`, marker: `${paths.uiClassMarkers}/berserker.png`, battle: `${paths.classBattleArt}/berserker.png`, alt: "berserker" }),
      turtle: Object.freeze({ headshot: `${paths.classHeadshots}/turtle.png`, marker: `${paths.uiClassMarkers}/turtle.png`, battle: `${paths.classBattleArt}/turtle.png`, alt: "turtle" }),
      frog: Object.freeze({ headshot: `${paths.classHeadshots}/frog.png`, marker: `${paths.uiClassMarkers}/frog.png`, battle: `${paths.classBattleArt}/frog.png`, alt: "frog" }),
      d20: Object.freeze({ headshot: `${paths.classHeadshots}/d20.png`, marker: `${paths.uiClassMarkers}/d20.png`, battle: `${paths.classBattleArt}/d20.png`, alt: "d20" }),
      slime: Object.freeze({ headshot: `${paths.classHeadshots}/slime.png`, marker: `${paths.uiClassMarkers}/slime.png`, battle: `${paths.classBattleArt}/slime.png`, alt: "slime" }),
      vampire: Object.freeze({ headshot: `${paths.classHeadshots}/vampire.png`, marker: `${paths.uiClassMarkers}/vampire.png`, battle: `${paths.classBattleArt}/vampire.png`, alt: "vampire" }),
      ninja: Object.freeze({ headshot: `${paths.classHeadshots}/ninja.png`, marker: `${paths.uiClassMarkers}/ninja.png`, battle: `${paths.classBattleArt}/ninja.png`, alt: "ninja" }),
      ceo: Object.freeze({ headshot: `${paths.classHeadshots}/ceo.png`, marker: `${paths.uiClassMarkers}/ceo.png`, battle: `${paths.classBattleArt}/ceo.png`, alt: "ceo" }),
      merchant: Object.freeze({ headshot: `${paths.classHeadshots}/merchant.png`, marker: `${paths.uiClassMarkers}/merchant.png`, battle: `${paths.classBattleArt}/merchant.png`, alt: "merchant" }),
      cleric: Object.freeze({ headshot: `${paths.classHeadshots}/cleric.png`, marker: `${paths.uiClassMarkers}/cleric.png`, battle: `${paths.classBattleArt}/cleric.png`, alt: "cleric" }),
      paladin: Object.freeze({ headshot: `${paths.classHeadshots}/paladin.png`, marker: `${paths.uiClassMarkers}/paladin.png`, battle: `${paths.classBattleArt}/paladin.png`, alt: "paladin" }),
      beastmaster: Object.freeze({ headshot: `${paths.classHeadshots}/beastmaster.png`, marker: `${paths.uiClassMarkers}/beastmaster.png`, battle: `${paths.classBattleArt}/beastmaster.png`, alt: "beastmaster" }),
      rogue: Object.freeze({ headshot: `${paths.classHeadshots}/rogue.png`, marker: `${paths.uiClassMarkers}/rogue.png`, battle: `${paths.classBattleArt}/rogue.png`, alt: "rogue" }),
      bloodmage: Object.freeze({ headshot: `${paths.classHeadshots}/bloodmage.png`, marker: `${paths.uiClassMarkers}/bloodmage.png`, battle: `${paths.classBattleArt}/bloodmage.png`, alt: "bloodmage" }),
      summoner: Object.freeze({ headshot: `${paths.classHeadshots}/summoner.png`, marker: `${paths.uiClassMarkers}/summoner.png`, battle: `${paths.classBattleArt}/summoner.png`, alt: "summoner" }),
      pokemontrainer: Object.freeze({ headshot: `${paths.classHeadshots}/pokemontrainer.png`, marker: `${paths.uiClassMarkers}/pokemontrainer.png`, battle: `${paths.classBattleArt}/pokemontrainer.png`, alt: "pokemontrainer" }),
      alchemist: Object.freeze({ headshot: `${paths.classHeadshots}/alchemist.png`, marker: `${paths.uiClassMarkers}/alchemist.png`, battle: `${paths.classBattleArt}/alchemist.png`, alt: "alchemist" }),
      ouroboros: Object.freeze({ headshot: `${paths.classHeadshots}/ouroboros.png`, marker: `${paths.uiClassMarkers}/ouroboros.png`, battle: `${paths.classBattleArt}/ouroboros.png`, alt: "ouroboros" }),
      slimerouge: Object.freeze({ headshot: `${paths.classHeadshots}/slimerouge.png`, marker: `${paths.uiClassMarkers}/slimerouge.png`, battle: `${paths.classBattleArt}/slimerouge.png`, alt: "slimerouge" })
    }),
    pets: Object.freeze({
      neutral: Object.freeze({ portrait: `${paths.petPortraits}/neutral.png`, alt: "neutral" }),
      fire: Object.freeze({ portrait: `${paths.petPortraits}/fire.png`, alt: "fire" }),
      ice: Object.freeze({ portrait: `${paths.petPortraits}/ice.png`, alt: "ice" }),
      electric: Object.freeze({ portrait: `${paths.petPortraits}/electric.png`, alt: "electric" }),
      light: Object.freeze({ portrait: `${paths.petPortraits}/light.png`, alt: "light" }),
      void: Object.freeze({ portrait: `${paths.petPortraits}/void.png`, alt: "void" }),
      nature: Object.freeze({ portrait: `${paths.petPortraits}/nature.png`, alt: "nature" }),
      donut: Object.freeze({ portrait: `${paths.petPortraits}/donut.png`, alt: "donut" }),
      tech: Object.freeze({ portrait: `${paths.petPortraits}/tech.png`, alt: "tech" }),
      metal: Object.freeze({ portrait: `${paths.petPortraits}/metal.png`, alt: "metal" }),
      coffee: Object.freeze({ portrait: `${paths.petPortraits}/coffee.png`, alt: "coffee" }),
      gun: Object.freeze({ portrait: `${paths.petPortraits}/gun.png`, alt: "gun" }),
      radiation: Object.freeze({ portrait: `${paths.petPortraits}/radiation.png`, alt: "radiation" }),
    }),
    items: Object.freeze({}),
    camp: Object.freeze({
      objects: Object.freeze({
        bonfire: Object.freeze({ image: `${paths.campObjects}/bonfire.png`, alt: "Bonfire" }),
        roadCaravan: Object.freeze({ image: `${paths.campObjects}/road-caravan.png`, alt: "Horse pulling a modern caravan" }),
        infoBooks: Object.freeze({ image: `${paths.campObjects}/info-books.png`, alt: "Stack of books and scrolls" }),
        talentStar: Object.freeze({ image: `${paths.campObjects}/talent-star.png`, alt: "Northern star of talents" }),
        prestigeMoon: Object.freeze({ image: `${paths.campObjects}/prestige-moon.png`, alt: "Glowing full moon" }),
        achievementKeg: Object.freeze({ image: `${paths.campObjects}/achievement-keg.png`, alt: "Ale keg and resplendent trophy cup" }),
        optionsCog: Object.freeze({ image: `${paths.campObjects}/options-cog.png`, alt: "Steampunk options cog" }),
        nightmareOff: Object.freeze({ image: `${paths.campObjects}/nightmare-off.png`, alt: "Faceless nightmare creature spying from behind a tree" }),
        nightmareOn: Object.freeze({ image: `${paths.campObjects}/nightmare-on.png`, alt: "Faceless nightmare creature stepping out from behind a tree" })
      }),
      backgrounds: Object.freeze({
        campsite: Object.freeze({ image: `${paths.campBackgrounds}/campsite.png`, alt: "Star-lit campsite clearing", focus: "50% 50%" })
      })
    }),
    ui: Object.freeze({
      icons: Object.freeze({
        chest: Object.freeze({ image: `${paths.uiIcons}/chest.png`, alt: "Treasure chest" }),
        coins: Object.freeze({ image: `${paths.uiIcons}/coins.png`, alt: "Coins" }),
        troll: Object.freeze({ image: `${paths.uiIcons}/troll.png`, alt: "Troll" }),
        helmet: Object.freeze({ image: `${paths.uiIcons}/helmet.png`, alt: "Helmet" }),
        quickdraw: Object.freeze({ image: `${paths.uiIcons}/quickdraw.png`, alt: "Quickdraw" }),
        heavyPurse: Object.freeze({ image: `${paths.uiIcons}/heavy-purse.png`, alt: "Heavy Purse" }),
        bandit: Object.freeze({ image: `${paths.uiIcons}/bandit.png`, alt: "Bandit" }),
        gambler: Object.freeze({ image: `${paths.uiIcons}/gambler.png`, alt: "Gambler" }),
        glassNeedle: Object.freeze({ image: `${paths.uiIcons}/glass-needle.png`, alt: "Glass Needle" })
      }),
      backgrounds: Object.freeze({
        boards: Object.freeze({
          1: Object.freeze({ image: `${paths.uiBackgrounds}/board-1-green-road.png`, alt: "Green Road", focus: "50% 52%" }),
          2: Object.freeze({ image: `${paths.uiBackgrounds}/board-2-astral-road.png`, alt: "Astral Road", focus: "50% 46%" }),
          3: Object.freeze({ image: `${paths.uiBackgrounds}/board-3-fractured-road.png`, alt: "Fractured Road", focus: "50% 46%" }),
          4: Object.freeze({ image: `${paths.uiBackgrounds}/board-4-crown-road.png`, alt: "Crown Road", focus: "50% 50%" }),
          5: Object.freeze({ image: `${paths.uiBackgrounds}/board-5-oblivion-ringroad.png`, alt: "Oblivion Ringroad", focus: "50% 50%" }),
          6: Object.freeze({ image: `${paths.uiBackgrounds}/board-6-end-of-mathematics.png`, alt: "The Sixth Road · End of Mathematics", focus: "50% 48%" })
        })
      })
    }),
    effects: Object.freeze({}),
    audio: Object.freeze({
      music: Object.freeze({}),
      sfx: Object.freeze({
        roll: Object.freeze({ customBase: "roll", alt: "Dice roll" }),
        step: Object.freeze({ customBase: "step", alt: "Board movement step" }),
        hit: Object.freeze({ customBase: "hit", alt: "Attack hit" }),
        crit: Object.freeze({ customBase: "crit", alt: "Critical hit" }),
        coin: Object.freeze({ customBase: "coin", alt: "Coins" }),
        heal: Object.freeze({ customBase: "heal", alt: "Healing" }),
        lose: Object.freeze({ customBase: "lose", alt: "Defeat" }),
        level: Object.freeze({ customBase: "level", alt: "Level up" }),
        win: Object.freeze({ customBase: "win", alt: "Victory" }),
        holy: Object.freeze({ customBase: "holy", alt: "Holy effect" })
      })
    })
  });

  const files = Object.freeze([
    `${paths.enemyPortraits}/wolf.png`,
    `${paths.campObjects}/bonfire.png`,
    `${paths.campObjects}/road-caravan.png`,
    `${paths.campObjects}/info-books.png`,
    `${paths.campObjects}/talent-star.png`,
    `${paths.campObjects}/prestige-moon.png`,
    `${paths.campObjects}/achievement-keg.png`,
    `${paths.campObjects}/options-cog.png`,
    `${paths.campObjects}/nightmare-off.png`,
    `${paths.campObjects}/nightmare-on.png`,
    `${paths.campBackgrounds}/campsite.png`,
    `${paths.uiIcons}/chest.png`,
    `${paths.uiIcons}/coins.png`,
    `${paths.uiIcons}/troll.png`,
    `${paths.uiIcons}/helmet.png`,
    `${paths.uiIcons}/quickdraw.png`,
    `${paths.uiIcons}/heavy-purse.png`,
    `${paths.uiIcons}/bandit.png`,
    `${paths.uiIcons}/gambler.png`,
    `${paths.uiIcons}/glass-needle.png`,
    `${paths.uiClassMarkers}/ranger.png`,
    `${paths.uiClassMarkers}/sorcerer.png`,
    `${paths.uiClassMarkers}/fighter.png`,
    `${paths.uiClassMarkers}/monk.png`,
    `${paths.uiClassMarkers}/clown.png`,
    `${paths.uiClassMarkers}/rouge.png`,
    `${paths.uiClassMarkers}/berserker.png`,
    `${paths.uiClassMarkers}/turtle.png`,
    `${paths.uiClassMarkers}/frog.png`,
    `${paths.uiClassMarkers}/d20.png`,
    `${paths.uiClassMarkers}/slime.png`,
    `${paths.uiClassMarkers}/vampire.png`,
    `${paths.uiClassMarkers}/ninja.png`,
    `${paths.uiClassMarkers}/ceo.png`,
    `${paths.uiClassMarkers}/merchant.png`,
    `${paths.uiClassMarkers}/cleric.png`,
    `${paths.uiClassMarkers}/paladin.png`,
    `${paths.uiClassMarkers}/beastmaster.png`,
    `${paths.uiClassMarkers}/rogue.png`,
    `${paths.uiClassMarkers}/bloodmage.png`,
    `${paths.uiClassMarkers}/summoner.png`,
    `${paths.uiClassMarkers}/pokemontrainer.png`,
    `${paths.uiClassMarkers}/alchemist.png`,
    `${paths.uiClassMarkers}/ouroboros.png`,
    `${paths.uiClassMarkers}/slimerouge.png`,
    `${paths.uiBackgrounds}/board-1-green-road.png`,
    `${paths.uiBackgrounds}/board-2-astral-road.png`,
    `${paths.uiBackgrounds}/board-3-fractured-road.png`,
    `${paths.uiBackgrounds}/board-4-crown-road.png`,
    `${paths.uiBackgrounds}/board-5-oblivion-ringroad.png`,
    `${paths.uiBackgrounds}/board-6-end-of-mathematics.png`,
    `${paths.sounds}/README.txt`,
    `${paths.sounds}/custom/README.txt`
  ]);

  const enemyPortraitMatchers = Object.freeze([
    Object.freeze({ key: "wolf", test: /\bwolf\b/i }),
    Object.freeze({ key: "bandit", test: /\bbandit\b/i }),
    Object.freeze({ key: "troll", test: /\btroll\b/i })
  ]);

  function resolveEnemyPortrait(name = "") {
    const match = enemyPortraitMatchers.find(entry => entry.test.test(String(name)));
    if (!match) return null;
    const entry = manifest.enemies[match.key];
    if (!entry?.portrait) return null;
    return Object.freeze({ key: match.key, src: entry.portrait, alt: entry.alt || String(name) });
  }

  function resolveClassArt(classId = "") {
    return manifest.classes?.[String(classId)] || manifest.classes?.ranger || null;
  }

  function resolvePetArt(petId = "neutral") {
    return manifest.pets?.[String(petId)] || manifest.pets?.neutral || null;
  }

  function resolveCampObject(key = "") {
    return manifest.camp?.objects?.[key] || null;
  }

  function resolveCampBackground(key = "campsite") {
    return manifest.camp?.backgrounds?.[key] || manifest.camp?.backgrounds?.campsite || null;
  }

  function resolveUiIcon(key = "") {
    return manifest.ui?.icons?.[key] || null;
  }

  function resolveBoardBackground(level = 1) {
    const key = String(Number(level) || 1);
    return manifest.ui?.backgrounds?.boards?.[key] || manifest.ui?.backgrounds?.boards?.[1] || null;
  }

  function resolveSoundEffect(name = "", pack = "custom") {
    const entry = manifest.audio?.sfx?.[name];
    if (!entry) return null;
    if (pack !== 'custom' || !entry?.customBase) return null;
    return Object.freeze({ key: name, pack, candidates: buildSoundCandidates(entry.customBase, 'custom'), alt: entry.alt || String(name) });
  }

  window.DiceboundAssets = Object.freeze({
    root: ROOT,
    paths,
    manifest,
    files,
    soundExtensions: SOUND_EXTENSIONS,
    resolveEnemyPortrait,
    resolveClassArt,
    resolvePetArt,
    resolveCampObject,
    resolveCampBackground,
    resolveUiIcon,
    resolveBoardBackground,
    resolveSoundEffect
  });
})();
