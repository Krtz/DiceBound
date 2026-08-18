from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / "runtime"
ASSETS_JS = RUNTIME / "js" / "assets.js"
DICEBOUND_JS = RUNTIME / "js" / "dicebound.js"
ARCHIVE = ROOT / "tools" / "powerup-art-import" / "powerup-art-48.zip"
DEST = RUNTIME / "assets" / "ui" / "powerups"

FILES = [
    "powerup-barbed-armor.png",
    "powerup-executioner.png",
    "powerup-faint-echo.png",
    "powerup-field-alchemy.png",
    "powerup-field-surgeon.png",
    "powerup-fortune-broker.png",
    "powerup-heavy-purse-worn.png",
    "powerup-lucky-pebble.png",
    "powerup-monster-notes.png",
    "powerup-phoenix-feather.png",
    "powerup-scholars-sigil.png",
    "powerup-second-wind.png",
    "powerup-sharper-blade.png",
    "powerup-spiked-armor.png",
    "powerup-stout-heart.png",
    "powerup-strong-brew.png",
    "powerup-tempered-guard.png",
    "powerup-treasure-sense.png",
    "powerup-walking-fortress.png",
    "powerup-worldheart.png",
]

ICON_ENTRIES = """        powerupSecondWind: Object.freeze({ image: `${paths.uiPowerups}/powerup-second-wind.png`, alt: "Second Wind" }),
        powerupFieldAlchemy: Object.freeze({ image: `${paths.uiPowerups}/powerup-field-alchemy.png`, alt: "Field Alchemy" }),
        powerupSharperBlade: Object.freeze({ image: `${paths.uiPowerups}/powerup-sharper-blade.png`, alt: "Sharper Blade" }),
        powerupTemperedGuard: Object.freeze({ image: `${paths.uiPowerups}/powerup-tempered-guard.png`, alt: "Tempered Guard" }),
        powerupStoutHeart: Object.freeze({ image: `${paths.uiPowerups}/powerup-stout-heart.png`, alt: "Stout Heart" }),
        powerupFaintEcho: Object.freeze({ image: `${paths.uiPowerups}/powerup-faint-echo.png`, alt: "Faint Echo" }),
        powerupSpikedArmor: Object.freeze({ image: `${paths.uiPowerups}/powerup-spiked-armor.png`, alt: "Spiked Armor" }),
        powerupMonsterNotes: Object.freeze({ image: `${paths.uiPowerups}/powerup-monster-notes.png`, alt: "Monster Notes" }),
        powerupLuckyPebble: Object.freeze({ image: `${paths.uiPowerups}/powerup-lucky-pebble.png`, alt: "Lucky Pebble" }),
        powerupHeavyPurseWorn: Object.freeze({ image: `${paths.uiPowerups}/powerup-heavy-purse-worn.png`, alt: "Heavy Purse" }),
        powerupFieldSurgeon: Object.freeze({ image: `${paths.uiPowerups}/powerup-field-surgeon.png`, alt: "Field Surgeon" }),
        powerupStrongBrew: Object.freeze({ image: `${paths.uiPowerups}/powerup-strong-brew.png`, alt: "Strong Brew" }),
        powerupExecutioner: Object.freeze({ image: `${paths.uiPowerups}/powerup-executioner.png`, alt: "Executioner" }),
        powerupWalkingFortress: Object.freeze({ image: `${paths.uiPowerups}/powerup-walking-fortress.png`, alt: "Walking Fortress" }),
        powerupWorldheart: Object.freeze({ image: `${paths.uiPowerups}/powerup-worldheart.png`, alt: "Worldheart" }),
        powerupPhoenixFeather: Object.freeze({ image: `${paths.uiPowerups}/powerup-phoenix-feather.png`, alt: "Phoenix Feather" }),
        powerupFortuneBroker: Object.freeze({ image: `${paths.uiPowerups}/powerup-fortune-broker.png`, alt: "Fortune Broker" }),
        powerupTreasureSense: Object.freeze({ image: `${paths.uiPowerups}/powerup-treasure-sense.png`, alt: "Treasure Sense" }),
        powerupBarbedArmor: Object.freeze({ image: `${paths.uiPowerups}/powerup-barbed-armor.png`, alt: "Barbed Armor" }),
        powerupScholarsSigil: Object.freeze({ image: `${paths.uiPowerups}/powerup-scholars-sigil.png`, alt: "Scholar's Sigil" })"""

MAPPING_PATCH = r'''

  /* ========================================================================
     Post-0.6 art pass — generated powerup icons
     ======================================================================== */
  function db06PowerupArt(key,label='',className='db-art-choice'){
    const entry=window.DiceboundAssets?.resolveUiIcon?.(key);
    if(!entry?.image)return '';
    const alt=String(label||entry.alt||key||'').replace(/"/g,'&quot;');
    return `<img class="db-art-icon ${className}" src="${entry.image}" alt="${alt}">`;
  }
  function db06AssignPowerupArt(name,key){
    const up=upgrades?.find?.(u=>u&&u.name===name);
    if(up)up.icon=db06PowerupArt(key,name)||up.icon;
  }
  function db06ApplyGeneratedPowerupArt(){
    [
      ['Second Wind','powerupSecondWind'],
      ['Field Alchemy','powerupFieldAlchemy'],
      ['Sharper Blade','powerupSharperBlade'],
      ['Sharpened Steel','powerupSharperBlade'],
      ['Strong Brew','powerupStrongBrew'],
      ['Quick Brew','powerupStrongBrew'],
      ['Tempered Guard','powerupTemperedGuard'],
      ['Runic Ward','powerupTemperedGuard'],
      ['Stout Heart','powerupStoutHeart'],
      ['Spiked Armor','powerupSpikedArmor'],
      ['Barbed Armor','powerupBarbedArmor'],
      ['Faint Echo','powerupFaintEcho'],
      ['Monster Notes','powerupMonsterNotes'],
      ['Lucky Pebble','powerupLuckyPebble'],
      ['Heavy Purse','powerupHeavyPurseWorn'],
      ['Field Surgeon','powerupFieldSurgeon'],
      ['Executioner','powerupExecutioner'],
      ['Walking Fortress','powerupWalkingFortress'],
      ['Worldheart','powerupWorldheart'],
      ['Phoenix Feather','powerupPhoenixFeather'],
      ['Fortune Broker','powerupFortuneBroker'],
      ['Treasure Sense+','powerupTreasureSense'],
      ['Treasure Sense++','powerupTreasureSense'],
      ["Scholar's Sigil",'powerupScholarsSigil'],
      ["Scholar's Sigil+",'powerupScholarsSigil'],
      ["Scholar's Sigil++",'powerupScholarsSigil']
    ].forEach(([name,key])=>db06AssignPowerupArt(name,key));
  }
  db06ApplyGeneratedPowerupArt();
  setTimeout(db06ApplyGeneratedPowerupArt,0);
'''


def require_once(text: str, needle: str, label: str) -> None:
    count = text.count(needle)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} marker, found {count}")


def extract_assets() -> None:
    if not ARCHIVE.is_file():
        raise FileNotFoundError(ARCHIVE)
    DEST.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ARCHIVE) as zf:
        names = sorted(name for name in zf.namelist() if not name.endswith('/'))
        if names != sorted(FILES):
            raise RuntimeError(f"Unexpected archive contents: {names}")
        for name in FILES:
            with zf.open(name) as src, (DEST / name).open('wb') as dst:
                shutil.copyfileobj(src, dst)


def patch_assets_js() -> None:
    text = ASSETS_JS.read_text(encoding="utf-8")

    if "uiPowerups:" not in text:
        marker = '    uiIcons: `${ROOT}/ui/icons`,\n'
        require_once(text, marker, "uiIcons path")
        text = text.replace(marker, marker + '    uiPowerups: `${ROOT}/ui/powerups`,\n', 1)

    if "powerupSecondWind:" not in text:
        marker = '        glassNeedle: Object.freeze({ image: `${paths.uiIcons}/glass-needle.png`, alt: "Glass Needle" })\n'
        require_once(text, marker, "Glass Needle manifest entry")
        text = text.replace(marker, marker[:-1] + ',\n' + ICON_ENTRIES + '\n', 1)

    preload_marker = '    `${paths.uiIcons}/glass-needle.png`,\n'
    if "`${paths.uiPowerups}/powerup-second-wind.png`" not in text:
        require_once(text, preload_marker, "Glass Needle preload entry")
        preload = ''.join(f'    `${{paths.uiPowerups}}/{name}`,\n' for name in FILES)
        text = text.replace(preload_marker, preload_marker + preload, 1)

    ASSETS_JS.write_text(text, encoding="utf-8")


def patch_dicebound_js() -> None:
    text = DICEBOUND_JS.read_text(encoding="utf-8")
    if "db06ApplyGeneratedPowerupArt" not in text:
        marker = "  window.DiceboundInfrastructure=Object.freeze({version:'0.6'"
        require_once(text, marker, "final DiceboundInfrastructure")
        text = text.replace(marker, MAPPING_PATCH + "\n" + marker, 1)
    DICEBOUND_JS.write_text(text, encoding="utf-8")


def validate() -> None:
    assets = ASSETS_JS.read_text(encoding="utf-8")
    game = DICEBOUND_JS.read_text(encoding="utf-8")
    for name in FILES:
        path = DEST / name
        if not path.is_file() or path.stat().st_size == 0:
            raise RuntimeError(f"Missing generated asset: {path}")
        if f"{name}`" not in assets:
            raise RuntimeError(f"Asset registry/preload does not reference {name}")
    required_keys = [
        "powerupSecondWind", "powerupFieldAlchemy", "powerupSharperBlade",
        "powerupTemperedGuard", "powerupStoutHeart", "powerupFaintEcho",
        "powerupSpikedArmor", "powerupMonsterNotes", "powerupLuckyPebble",
        "powerupHeavyPurseWorn", "powerupFieldSurgeon", "powerupStrongBrew",
        "powerupExecutioner", "powerupWalkingFortress", "powerupWorldheart",
        "powerupPhoenixFeather", "powerupFortuneBroker", "powerupTreasureSense",
        "powerupBarbedArmor", "powerupScholarsSigil",
    ]
    for key in required_keys:
        if key not in assets or key not in game:
            raise RuntimeError(f"Missing runtime mapping for {key}")


def main() -> None:
    extract_assets()
    patch_assets_js()
    patch_dicebound_js()
    validate()
    print(f"Integrated {len(FILES)} powerup art assets into {DEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

# Touch marker: retrigger the one-shot importer after the workflow landed on main.
