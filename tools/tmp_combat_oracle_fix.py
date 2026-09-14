from pathlib import Path

path=Path('tools/test_combat_oracle.js')
text=path.read_text(encoding='utf-8')
old="const observed=await eventsFor(()=>combat.win());await new Promise(r=>setTimeout(r,20));finish({name:'victory-ordinary'"
new="const clicker=setInterval(()=>document.getElementById('battleVictoryContinue')?.click(),5);let observed;try{observed=await eventsFor(()=>combat.win());}finally{clearInterval(clicker);}await new Promise(r=>setTimeout(r,20));finish({name:'victory-ordinary'"
if old not in text:
    raise SystemExit('victory oracle patch anchor missing')
path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')
print('Combat oracle victory UI auto-advance patched')
