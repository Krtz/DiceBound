#!/usr/bin/env python3
from pathlib import Path

path=Path(__file__).resolve().parents[1]/"CHANGELOG.md"
text=path.read_text(encoding="utf-8")
old="## Unreleased — Beta 0.6.3.0\n\n### Active-run save and resume (#35)"
new="""## Unreleased — Beta 0.6.3.1

### Class progression, Slime borrowing and ordinary gear (#96, #104, #87)
- Pokémon Trainer now requires every pet at level 10 plus a Board 5 clear with Beastmaster on any difficulty; the two career conditions may be completed in separate runs.
- Rogue now requires holding at least 5,000 Gold at once plus defeating the Board 3 miniboss; Vampire requires exceeding 100% Lifesteal plus defeating the Board 3 final boss; both pairs persist independently across runs.
- Merchant now unlocks after the first Road Merchant secret-boss kill, Slime unlocks at 10 total unlocked classes, and future Invoker/Dragoon progression facts track qualifying Mana-spender casts and the Board 4 miniboss.
- Slime and Slime Rouge can borrow class-owned Powerups only from classes the career has unlocked. Slime Rouge still applies its existing capability/Ultimate compatibility checks, while generic and valid multi-owner Powerups remain available.
- Ordinary generated equipment now uses neutral slot names and uniform slot-eligible prefix/suffix selection with no class or tag weighting; named special gear and higher-tier handcrafted items are unchanged.

### Active-run save and resume (#35)"""
if text.count(old)!=1:
    raise SystemExit("CHANGELOG PATCH FAILED: expected 0.6.3.0 unreleased heading/section anchor once")
path.write_text(text.replace(old,new,1),encoding="utf-8")
print("PATCH 0.6.3.1 changelog READY")
