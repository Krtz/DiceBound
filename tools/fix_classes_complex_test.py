from pathlib import Path

path=Path(__file__).resolve().parents[1]/"tools"/"test_class_action_mechanics.js"
text=path.read_text(encoding="utf-8")
old='assert.equal(player.rogueStealUsed,true);assert.equal(player.combatActionCount,1);assert.equal(player.gold,28);assert.equal(player.potions,2);assert.deepEqual(applied,["stolen"]);assert.deepEqual(player._beta021LastStealPower,{chance:.35,roll:.2});assert.equal(randomQueue.length,0,"Rogue RNG draw count drifted");'
new='assert.equal(player.rogueStealUsed,true);assert.equal(player.combatActionCount,1);assert.equal(player.gold,28);assert.equal(player.potions,2);assert.deepEqual(applied,["stolen"]);assert.equal(player._beta021LastStealPower.chance,.35);assert.equal(player._beta021LastStealPower.roll,.2);assert.equal(randomQueue.length,0,"Rogue RNG draw count drifted");'
if text.count(old)!=1:
    raise SystemExit(f"expected one Rogue cross-realm assertion, found {text.count(old)}")
path.write_text(text.replace(old,new,1),encoding="utf-8",newline="\n")
print("Classes complex-action test assertion patched")
