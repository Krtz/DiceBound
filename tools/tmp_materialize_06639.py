from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MONO = ROOT / "runtime/js/dicebound.js"
WORKFLOW = ROOT / ".github/workflows/dicebound-release.yml"
WORKFLOW_TEST = ROOT / "tools/test_release_workflow.py"
ANTI_RETURN = ROOT / "tools/test_canonical_powerup_presentation.py"
CHANGELOG = ROOT / "CHANGELOG.md"
PATCH_NOTES = ROOT / "runtime/PATCH_NOTES.md"


def scan_balanced(src: str, open_pos: int, opening: str, closing: str) -> int:
    depth = 0
    state = "code"
    quote = ""
    escaped = False
    i = open_pos
    while i < len(src):
        ch = src[i]
        nxt = src[i + 1] if i + 1 < len(src) else ""
        if state == "line":
            if ch == "\n":
                state = "code"
            i += 1
            continue
        if state == "block":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
                continue
            i += 1
            continue
        if state == "string":
            if escaped:
                escaped = False
                i += 1
                continue
            if ch == "\\":
                escaped = True
                i += 1
                continue
            if ch == quote:
                state = "code"
                quote = ""
            i += 1
            continue
        if ch == "/" and nxt == "/":
            state = "line"
            i += 2
            continue
        if ch == "/" and nxt == "*":
            state = "block"
            i += 2
            continue
        if ch in ('"', "'", "`"):
            state = "string"
            quote = ch
            i += 1
            continue
        if ch == opening:
            depth += 1
        elif ch == closing:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise RuntimeError(f"unclosed {opening}{closing} block at {open_pos}")


def definition_spans(src: str, name: str) -> list[tuple[int, int]]:
    patterns = [
        re.compile(rf"\bfunction\s+{re.escape(name)}\s*\("),
        re.compile(rf"(?<![.\w$]){re.escape(name)}\s*=\s*function\s*\("),
    ]
    found: list[tuple[int, int]] = []
    starts: set[int] = set()
    for pattern in patterns:
        for match in pattern.finditer(src):
            if match.start() in starts:
                continue
            starts.add(match.start())
            paren = src.find("(", match.start(), match.end())
            paren_end = scan_balanced(src, paren, "(", ")")
            brace = src.find("{", paren_end + 1)
            if brace < 0 or brace - paren_end > 80:
                raise RuntimeError(f"could not locate body for {name} at {match.start()}")
            close = scan_balanced(src, brace, "{", "}")
            end = close + 1
            while end < len(src) and src[end] in " \t\r":
                end += 1
            if end < len(src) and src[end] == ";":
                end += 1
            found.append((match.start(), end))
    return sorted(found)


def remove_definitions(src: str, expected: dict[str, int]) -> tuple[str, int]:
    spans: list[tuple[int, int, str]] = []
    for name, count in expected.items():
        matches = definition_spans(src, name)
        if len(matches) != count:
            raise RuntimeError(f"expected {count} {name} generations, found {len(matches)}")
        spans.extend((start, end, name) for start, end in matches)
    first = min(start for start, _, _ in spans)
    for start, end, _ in sorted(spans, reverse=True):
        src = src[:start] + src[end:]
    return src, first


def replace_once(src: str, old: str, new: str, label: str) -> str:
    count = src.count(old)
    if count != 1:
        raise RuntimeError(f"expected exactly one {label}, found {count}")
    return src.replace(old, new, 1)


CANONICAL_POWERUP_UI = r'''function choiceHTML(up){
    inferUpgradeTags(up);
    const signature=up?.id==='perfected_signature';
    return `<span class="rarity-badge">${rarityInfo[up.rarity].label}</span><span class="choice-icon">${up.icon}</span><span class="choice-name">${up.name}</span><span class="choice-desc${signature?' signature-current':''}">${powerupDisplayDesc(up)}</span><span class="choice-tags">${tagChips(up.tags,'power')}</span>`;
  }

  function attachPowerupReroll(grid,reroll){
    if(!grid)return;
    grid.querySelectorAll('.powerup-reroll-btn').forEach(x=>x.remove());
    const total=Math.max(0,Number(player.v26SecondOpinionRank??gameplayTalentRank('fortune_powerup_rerolls'))||0);
    const spent=Math.max(0,Number(player.v26SecondOpinionSpent)||0);
    const remaining=Math.max(0,total-spent);
    player.powerupRerolls=remaining;
    const b=document.createElement('button');
    b.className='powerup-reroll-btn';
    b.disabled=remaining<=0;
    b.textContent=`🔄 Reroll choices · ${remaining} remaining`;
    b.addEventListener('click',()=>{
      if((player.v26SecondOpinionSpent||0)>=total)return;
      player.v26SecondOpinionSpent=(player.v26SecondOpinionSpent||0)+1;
      player.powerupRerolls=Math.max(0,total-player.v26SecondOpinionSpent);
      sfx.roll();
      reroll();
    });
    grid.appendChild(b);
  }

  function renderLevelUpChoices(onComplete=null){
    sfx.level();
    const count=3+(player.levelChoiceBonus?1:0);
    $('levelSubtitle').textContent=pendingLevelUps>1
      ?`Choose 1 of ${count} powerups. ${pendingLevelUps} levels are waiting.`
      :`Choose 1 of ${count} powerups for this run.`;
    const grid=$('choiceGrid');
    grid.innerHTML='';
    dbPowerups.levelChoices().forEach(up=>{
      const btn=document.createElement('button');
      btn.className=`choice-btn ${up.rarity}`;
      btn.innerHTML=choiceHTML(up);
      btn.addEventListener('click',()=>{
        applyUpgrade(up,'Level Up');
        pendingLevelUps--;
        addLog(`Level ${player.level}: gained <b>${up.name}</b> (${rarityInfo[up.rarity].label}).`);
        showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);
        updateHUD();
        if(pendingLevelUps>0)dbPowerups.openLevelUp(onComplete);
        else{
          $('levelOverlay').classList.add('hidden');
          if(onComplete)onComplete();
          else{rollLocked=false;updateHUD();}
        }
      });
      grid.appendChild(btn);
    });
    attachPowerupReroll(grid,()=>dbPowerups.openLevelUp(onComplete));
    $('levelOverlay').classList.remove('hidden');
  }

  function renderPowerupChoiceOverlay(source,onComplete,filter=()=>true,subtitle='Choose one free rarity-based powerup. Your character level does not change.'){
    $('powerupTitle').textContent=source;
    $('powerupSubtitle').textContent=subtitle;
    const grid=$('powerupGrid');
    grid.innerHTML='';
    getUpgradeChoices(filter).forEach(up=>{
      const btn=document.createElement('button');
      btn.className=`choice-btn ${up.rarity}`;
      btn.innerHTML=choiceHTML(up);
      btn.addEventListener('click',()=>{
        applyUpgrade(up,source);
        addLog(`<b>${source}:</b> gained ${up.name} (${rarityInfo[up.rarity].label}).`);
        showToast(`${rarityInfo[up.rarity].label}: ${up.name}`);
        $('powerupOverlay').classList.add('hidden');
        updateHUD();
        onComplete();
      });
      grid.appendChild(btn);
    });
    // Released V16 ordering made the overlay visible before appending its reroll.
    $('powerupOverlay').classList.remove('hidden');
    attachPowerupReroll(grid,()=>dbPowerups.openChoice(source,onComplete,filter,subtitle));
  }

  function renderLegendaryChoice(source,onComplete=()=>{}){
    if(String(source).toLowerCase().includes('miniboss'))return v27ShowMinibossReward(source,onComplete);
    const legends=eligibleUpgrades(u=>u.rarity==='legendary');
    if(!legends.length){
      const epics=eligibleUpgrades(u=>u.rarity==='epic');
      if(epics.length)return dbPowerups.openChoice(source,onComplete,u=>u.rarity==='epic','Every eligible Legendary is exhausted. Choose an Epic power instead.');
      const gold=modifiedGold(250);
      player.gold+=gold;
      player.potions+=2;
      addLog(`<b>${source}:</b> every eligible Legendary power is already owned this run. The guardian converts the exhausted boon into <b>${gold} gold</b> and <b>2 potions</b>.`);
      showToast(`👑 Legendary pool exhausted · +${gold} gold · +2 potions`,3000,true);
      updateHUD();
      setTimeout(()=>onComplete(false),0);
      return;
    }
    return dbPowerups.openChoice(source,onComplete,u=>u.rarity==='legendary','The guardian yields. Choose one guaranteed Legendary powerup.');
  }

  '''


def canonicalize_powerup_ui() -> tuple[int, int, int, int]:
    src = MONO.read_text(encoding="utf-8")
    before_bytes = len(src.encode("utf-8"))
    before_lines = len(src.splitlines())

    expected = {
        "openLevelUp": 5,
        "showPowerupChoice": 3,
        "showLegendaryChoice": 3,
        "choiceHTML": 3,
        "attachPowerupRerollV16": 2,
        "v18LevelChoices": 1,
    }
    src, insert_at = remove_definitions(src, expected)

    for capture in [
        "openLevelUpV16Base",
        "showPowerupChoiceV16Base",
        "openLevelUpV26Base",
        "showLegendaryChoiceV27Base",
        "db0511ChoiceHTMLBase",
    ]:
        pattern = re.compile(rf"\bconst\s+{re.escape(capture)}\s*=\s*[A-Za-z_$][\w$]*\s*;")
        src, count = pattern.subn("", src)
        if count != 1:
            raise RuntimeError(f"expected one predecessor capture {capture}, removed {count}")

    src = src[:insert_at] + CANONICAL_POWERUP_UI + src[insert_at:]

    # Route ordinary calls through the already-released public owner. Internal
    # render callbacks retain explicit presentation names to avoid facade recursion.
    src = re.sub(r"(?<![.\w$])openLevelUp\s*\(", "dbPowerups.openLevelUp(", src)
    src = re.sub(r"(?<![.\w$])showPowerupChoice\s*\(", "dbPowerups.openChoice(", src)
    src = re.sub(r"(?<![.\w$])showLegendaryChoice\s*\(", "dbPowerups.openLegendary(", src)
    src = src.replace("attachPowerupRerollV16", "attachPowerupReroll")

    old_config = '''    renderLevelUp:onComplete=>dbPowerups.openLevelUp(onComplete),
    renderPowerupChoice:(source,onComplete,filter,subtitle)=>dbPowerups.openChoice(source,onComplete,filter,subtitle),
    renderLegendaryChoice:(source,onComplete)=>dbPowerups.openLegendary(source,onComplete),'''
    new_config = '''    renderLevelUp:onComplete=>renderLevelUpChoices(onComplete),
    renderPowerupChoice:(source,onComplete,filter,subtitle)=>renderPowerupChoiceOverlay(source,onComplete,filter,subtitle),
    renderLegendaryChoice:(source,onComplete)=>renderLegendaryChoice(source,onComplete),'''
    src = replace_once(src, old_config, new_config, "Powerups presentation configuration block")

    old_glass_comment = '''  // GLASS NEEDLE — the asset existed, but older code looked for window.upgrades
  // even though upgrades is lexical. Render it at the final card boundary so
  // every level-up/free/miniboss/contract choice uses the real art.'''
    new_glass_comment = '''  // GLASS NEEDLE — normalize the live registry icon once so every canonical
  // powerup-choice renderer receives the real art without wrapping choiceHTML.'''
    src = replace_once(src, old_glass_comment, new_glass_comment, "Glass Needle history comment")

    # Final production structure: no historical UI names or predecessor aliases.
    forbidden = [
        "openLevelUpV16Base", "showPowerupChoiceV16Base", "openLevelUpV26Base",
        "showLegendaryChoiceV27Base", "db0511ChoiceHTMLBase", "attachPowerupRerollV16",
    ]
    for token in forbidden:
        if token in src:
            raise RuntimeError(f"historical Powerup UI token survived: {token}")
    if definition_spans(src, "openLevelUp"):
        raise RuntimeError("monolith openLevelUp implementation survived owner routing")
    if definition_spans(src, "showPowerupChoice"):
        raise RuntimeError("monolith showPowerupChoice implementation survived owner routing")
    if definition_spans(src, "showLegendaryChoice"):
        raise RuntimeError("monolith showLegendaryChoice implementation survived owner routing")
    for name in ["choiceHTML", "attachPowerupReroll", "renderLevelUpChoices", "renderPowerupChoiceOverlay", "renderLegendaryChoice"]:
        if len(definition_spans(src, name)) != 1:
            raise RuntimeError(f"expected one canonical {name} implementation")

    MONO.write_text(src, encoding="utf-8", newline="\n")
    return before_bytes, before_lines, len(src.encode("utf-8")), len(src.splitlines())


def harden_release_workflow() -> None:
    src = WORKFLOW.read_text(encoding="utf-8")
    old = '''            if ($curlExitCode -ne 0 -or $httpStatus -notin @("200", "201")) {
              Write-ManifestPutFailureDiagnostic -CurlExitCode $curlExitCode -HttpStatus $httpStatus -ResponseBody $responseBody -CurlStderr $curlStderr
              throw "Protected launcher-manifest PUT failed: curl exit $curlExitCode; HTTP $httpStatus."
            }'''
    new = '''            if ($curlExitCode -ne 0 -or $httpStatus -notin @("200", "201")) {
              Write-ManifestPutFailureDiagnostic -CurlExitCode $curlExitCode -HttpStatus $httpStatus -ResponseBody $responseBody -CurlStderr $curlStderr
              $localTextAfterPutFailure = Get-Content $manifestPath -Raw
              $remoteAlreadyReconciled = $false
              for ($attempt = 1; $attempt -le 3; $attempt++) {
                if ($attempt -gt 1) { Start-Sleep -Seconds 2 }
                $remoteAfterPutFailureRaw = gh api "repos/Krtz/DiceBound/contents/${manifestPath}?ref=main" 2>$null
                if ($LASTEXITCODE -ne 0) { continue }
                try {
                  $remoteAfterPutFailure = $remoteAfterPutFailureRaw | ConvertFrom-Json
                  $remoteAfterPutFailureText = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($remoteAfterPutFailure.content -replace '\\s', '')))
                  if ($remoteAfterPutFailureText -eq $localTextAfterPutFailure) {
                    Write-Host "Protected launcher-manifest PUT reported failure, but remote manifest already matches the verified local manifest; treating reconciliation as success."
                    $remoteAlreadyReconciled = $true
                    break
                  }
                } catch {
                  Write-Host "Post-failure manifest reconciliation probe $attempt could not decode the remote manifest."
                }
              }
              if (-not $remoteAlreadyReconciled) {
                throw "Protected launcher-manifest PUT failed and remote manifest did not reconcile: curl exit $curlExitCode; HTTP $httpStatus."
              }
            }'''
    src = replace_once(src, old, new, "launcher PUT failure block")
    WORKFLOW.write_text(src, encoding="utf-8", newline="\n")

    test = WORKFLOW_TEST.read_text(encoding="utf-8")
    marker = '    "Published distribution/latest.json differs from the verified local manifest.",\n]'
    replacement = '    "Published distribution/latest.json differs from the verified local manifest.",\n    "Protected launcher-manifest PUT reported failure, but remote manifest already matches the verified local manifest; treating reconciliation as success.",\n    "Protected launcher-manifest PUT failed and remote manifest did not reconcile",\n    "for ($attempt = 1; $attempt -le 3; $attempt++)",\n]'
    test = replace_once(test, marker, replacement, "release workflow marker list")
    WORKFLOW_TEST.write_text(test, encoding="utf-8", newline="\n")


def write_anti_return_test() -> None:
    ANTI_RETURN.write_text(r'''from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "runtime/js/dicebound.js").read_text(encoding="utf-8")
FACADE = (ROOT / "runtime/js/powerups/facade.js").read_text(encoding="utf-8")

for token in [
    "openLevelUpV16Base", "showPowerupChoiceV16Base", "openLevelUpV26Base",
    "showLegendaryChoiceV27Base", "db0511ChoiceHTMLBase", "attachPowerupRerollV16",
    "v18LevelChoices",
]:
    if token in SOURCE:
        raise SystemExit(f"historical Powerup presentation token returned: {token}")

for retired in ["openLevelUp", "showPowerupChoice", "showLegendaryChoice"]:
    declarations = re.findall(rf"\\bfunction\\s+{retired}\\s*\\(", SOURCE)
    replacements = re.findall(rf"(?<![.\\w$]){retired}\\s*=\\s*function\\b", SOURCE)
    if declarations or replacements:
        raise SystemExit(f"monolith {retired} implementation returned")

for canonical in ["choiceHTML", "attachPowerupReroll", "renderLevelUpChoices", "renderPowerupChoiceOverlay", "renderLegendaryChoice"]:
    count = len(re.findall(rf"\\bfunction\\s+{canonical}\\s*\\(", SOURCE))
    if count != 1:
        raise SystemExit(f"expected one canonical {canonical}, found {count}")

required_source = [
    "if(pendingLevelUps>0)dbPowerups.openLevelUp(onComplete);",
    "attachPowerupReroll(grid,()=>dbPowerups.openLevelUp(onComplete));",
    "attachPowerupReroll(grid,()=>dbPowerups.openChoice(source,onComplete,filter,subtitle));",
    "if(String(source).toLowerCase().includes('miniboss'))return v27ShowMinibossReward(source,onComplete);",
    "Every eligible Legendary is exhausted. Choose an Epic power instead.",
    "Legendary pool exhausted",
    "The guardian yields. Choose one guaranteed Legendary powerup.",
    "renderLevelUp:onComplete=>renderLevelUpChoices(onComplete)",
    "renderPowerupChoice:(source,onComplete,filter,subtitle)=>renderPowerupChoiceOverlay(source,onComplete,filter,subtitle)",
    "renderLegendaryChoice:(source,onComplete)=>renderLegendaryChoice(source,onComplete)",
    "return dbPowerups.openLegendary(source,onComplete);",
]
for marker in required_source:
    if marker not in SOURCE:
        raise SystemExit(f"canonical Powerup presentation missing {marker!r}")

if "if(call(\"isGameStarted\")&&p.v26ExpandedHorizons)p.levelChoiceBonus=1;" not in FACADE:
    raise SystemExit("Expanded Horizons policy no longer lives in DiceboundPowerups.openLevelUp")

print("Canonical Powerup presentation PASS: chooser/reroll/Legendary history collapsed behind DiceboundPowerups with one renderer per responsibility")
''', encoding="utf-8", newline="\n")


def update_notes(before_bytes: int, before_lines: int, after_bytes: int, after_lines: int) -> None:
    changelog = CHANGELOG.read_text(encoding="utf-8")
    anchor = "## Beta 0.6.6.38\n"
    section = f'''## Beta 0.6.6.39\n\n### Canonical-function archaeology wave 2 (#361)\n- Collapsed the Powerup choice presentation stack behind the existing `DiceboundPowerups` owner: five `openLevelUp` generations, three free-choice generations, three Legendary-choice generations, three card renderers and two reroll implementations are replaced by one renderer per responsibility. Ordinary callers now route through the public facade; Expanded Horizons remains owner policy instead of being duplicated in the monolith.\n- Preserved released Second Opinion consumption, level-choice counts, overlay/reroll ordering, Miniboss reward routing, Legendary→Epic exhaustion fallback and final gold/potion exhaustion reward. Existing Powerups oracle/facade tests plus a new anti-return guard freeze the composition.\n- Hardened protected-main launcher reconciliation for GitHub's observed HTTP-500-after-success case: after a failed Contents PUT, the workflow re-fetches `distribution/latest.json` up to three times and accepts success only when remote text exactly matches the already-verified local manifest; mismatches still fail closed.\n- `dicebound.js` changes from {before_bytes:,} bytes / {before_lines:,} physical lines to {after_bytes:,} bytes / {after_lines:,} physical lines before runtime-manifest materialization.\n\n'''
    if anchor not in changelog or "## Beta 0.6.6.39\n" in changelog:
        raise RuntimeError("unexpected CHANGELOG state for 0.6.6.39")
    CHANGELOG.write_text(changelog.replace(anchor, section + anchor, 1), encoding="utf-8", newline="\n")

    notes = PATCH_NOTES.read_text(encoding="utf-8")
    if not notes.startswith("# Unreleased — Beta 0.6.6.38\n"):
        raise RuntimeError("unexpected PATCH_NOTES release header")
    notes = notes.replace("# Unreleased — Beta 0.6.6.38", "# Unreleased — Beta 0.6.6.39", 1)
    marker = "\n## Beta 0.6.6.38 Canonical-function archaeology"
    insertion = f'''\n## Beta 0.6.6.39 Canonical-function archaeology wave 2 (#361)\n- Powerup choice presentation now has one canonical card renderer, reroll renderer, level-up renderer, free-choice renderer and Legendary-choice renderer behind `DiceboundPowerups`; historical v16/v18/v26/V27 predecessor captures are removed.\n- Released Second Opinion, Expanded Horizons, Miniboss, Legendary/Epic exhaustion and reward behavior stays frozen by existing Powerups coverage plus a new anti-return guard.\n- Protected-main launcher reconciliation now recovers safely from an API error that occurs after GitHub has already committed the exact verified manifest, while still failing closed on any remote mismatch.\n- `dicebound.js` is {after_bytes:,} bytes / {after_lines:,} physical lines before runtime-manifest materialization.\n'''
    if marker not in notes:
        raise RuntimeError("0.6.6.38 patch-notes anchor missing")
    PATCH_NOTES.write_text(notes.replace(marker, insertion + marker, 1), encoding="utf-8", newline="\n")


def main() -> None:
    before_bytes, before_lines, after_bytes, after_lines = canonicalize_powerup_ui()
    harden_release_workflow()
    write_anti_return_test()
    update_notes(before_bytes, before_lines, after_bytes, after_lines)
    print(
        f"0.6.6.39 materialized source: Powerup UI canonicalized; "
        f"dicebound.js {before_bytes:,}->{after_bytes:,} bytes / {before_lines:,}->{after_lines:,} lines; "
        "release reconciliation hardened"
    )


if __name__ == "__main__":
    main()
