#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def replace_once(path:Path,old:str,new:str,label:str)->None:
    text=path.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    path.write_text(text.replace(old,new,1),encoding='utf-8')


def prepend_once(path:Path,marker:str,entry:str,label:str)->None:
    text=path.read_text(encoding='utf-8')
    if entry.splitlines()[0] in text:
        return
    count=text.count(marker)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one insertion marker, found {count}')
    path.write_text(text.replace(marker,marker+entry,1),encoding='utf-8')


camp=ROOT/'runtime/js/ui/camp.js'
replace_once(camp,
    "    campHellBtn:Object.freeze({x:.80,y:.28,w:118}),",
    "    campHellBtn:Object.freeze({x:.405,y:.35,w:220,h:150}),",
    'Hell mountain stage anchor')

replace_once(camp,
    "    return `<div class=\"camp-topline\"><span id=\"campLegacyLine\"></span><span id=\"campPetLine\"></span></div>",
    "    return `<img id=\"campHellVolcanoLayer\" class=\"camp-hell-volcano-layer db066-hell-volcano-art\" src=\"${asset('hellOn','assets/camp/mode-toggles/hell/on.png')}\" alt=\"\" aria-hidden=\"true\" draggable=\"false\" hidden><div class=\"camp-topline\"><span id=\"campLegacyLine\"></span><span id=\"campPetLine\"></span></div>",
    'Hell scene layer')

replace_once(camp,
    '<button class="camp-spot hell-spot" id="campHellBtn"><div class="camp-icon">😈🤝🕴️</div><div class="camp-label">Hell</div><div class="camp-sub">Locked</div></button>',
    '<button class="camp-spot hell-spot camp-hell-mountain-hit" id="campHellBtn" aria-label="Toggle Hell mode" title="Toggle Hell mode"><div class="camp-icon camp-hell-mobile-icon">⛰️</div><div class="camp-label">Hell</div><div class="camp-sub">Locked</div></button>',
    'Hell mountain semantic control')

old_style="""    style.textContent += `\\
#startOverlay.camp-fullscreen #campHellBtn.hell-volcano-active{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}#startOverlay.camp-fullscreen #campHellBtn.hell-volcano-active .db058-camp-art-frame{width:100%!important;height:100%!important;margin:0!important}#startOverlay.camp-fullscreen #campHellBtn.hell-volcano-active .db066-hell-volcano-art{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;filter:drop-shadow(0 12px 18px rgba(72,8,10,.48))!important}#startOverlay.camp-fullscreen #campHellBtn.hell-volcano-active .camp-label,#startOverlay.camp-fullscreen #campHellBtn.hell-volcano-active .camp-sub{position:relative!important;z-index:2!important;text-shadow:0 2px 5px #000!important}`;
"""
new_style="""    style.textContent += `\\
.camp-hell-volcano-layer{display:none}#campHellVolcanoLayer[hidden]{display:none!important}@media(min-width:800px){#startOverlay.camp-fullscreen #campHellVolcanoLayer:not([hidden]){display:block!important;position:absolute!important;left:44.7%!important;top:34.6%!important;width:29.5%!important;height:19.6%!important;max-width:none!important;max-height:none!important;transform:translate(-50%,-50%)!important;object-fit:fill!important;pointer-events:none!important;z-index:2!important;opacity:.99!important;filter:saturate(1.08) drop-shadow(0 0 13px rgba(255,82,28,.18))!important;-webkit-mask-image:radial-gradient(ellipse 76% 92% at 36% 50%,#000 0 54%,rgba(0,0,0,.96) 68%,transparent 100%)!important;mask-image:radial-gradient(ellipse 76% 92% at 36% 50%,#000 0 54%,rgba(0,0,0,.96) 68%,transparent 100%)!important}#startOverlay.camp-fullscreen #campHellBtn.camp-hell-mountain-hit{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;overflow:visible!important;z-index:20!important;cursor:pointer!important}#startOverlay.camp-fullscreen #campHellBtn.camp-hell-mountain-hit .camp-icon,#startOverlay.camp-fullscreen #campHellBtn.camp-hell-mountain-hit .camp-label,#startOverlay.camp-fullscreen #campHellBtn.camp-hell-mountain-hit .camp-sub{opacity:0!important;pointer-events:none!important}#startOverlay.camp-fullscreen #campHellBtn.camp-hell-mountain-hit::after{content:\"\";position:absolute;inset:4%;border-radius:48%;border:1px solid transparent;transition:border-color .15s ease,box-shadow .15s ease}#startOverlay.camp-fullscreen #campHellBtn.camp-hell-mountain-hit:hover::after,#startOverlay.camp-fullscreen #campHellBtn.camp-hell-mountain-hit:focus-visible::after{border-color:rgba(255,174,92,.34);box-shadow:0 0 18px rgba(255,84,31,.18)}#startOverlay.camp-fullscreen #campHellBtn.camp-hell-mountain-hit.active::after{border-color:rgba(255,101,54,.28);box-shadow:0 0 24px rgba(255,67,24,.20)}}`;
"""
replace_once(camp,old_style,new_style,'Hell integrated scene styling')

old_render="""  function renderHellModeArt(view){
    const button=find('campHellBtn');if(!button)return;
    const enabled=!!view.hellMode;button.classList.toggle('hell-volcano-active',enabled);
    if(enabled){setObjectArt('campHellBtn','hellOn','db066-hell-volcano-art','Active Hell volcano with a dancing devil','assets/camp/mode-toggles/hell/on.png');return;}
    const frame=button.querySelector('.db058-camp-art-frame');
    if(frame){const icon=doc()?.createElement('div');if(icon){icon.className='camp-icon camp-hell-mountain';icon.textContent='⛰️';frame.replaceWith(icon);}}
    const icon=button.querySelector('.camp-icon');if(icon&&!icon.querySelector('img')){icon.classList.add('camp-hell-mountain');icon.textContent='⛰️';}
  }
"""
new_render="""  function renderHellModeArt(view){
    const button=find('campHellBtn');if(!button)return;
    const enabled=!!view.hellMode;button.classList.toggle('hell-volcano-active',enabled);
    const layer=find('campHellVolcanoLayer');
    if(layer){const src=asset('hellOn','assets/camp/mode-toggles/hell/on.png');if(layer.getAttribute('src')!==src)layer.src=src;layer.hidden=!enabled;}
    const frame=button.querySelector('.db058-camp-art-frame');
    if(frame){const icon=doc()?.createElement('div');if(icon){icon.className='camp-icon camp-hell-mobile-icon';icon.textContent='⛰️';frame.replaceWith(icon);}}
    const icon=button.querySelector('.camp-icon');if(icon&&!icon.querySelector('img')){icon.className='camp-icon camp-hell-mobile-icon';icon.textContent='⛰️';}
  }
"""
replace_once(camp,old_render,new_render,'Hell scene renderer')

replace_once(camp,
    "      if(id==='campGoBtn'&&(root.innerWidth||0)>=800)continue;",
    "      if((id==='campGoBtn'||id==='campHellBtn')&&(root.innerWidth||0)>=800)continue;",
    'Hell authored hit-target exemption')

replace_once(camp,
    "      const hellVolcano=id==='campHellBtn'&&node.classList.contains('hell-volcano-active');\n      if(hellVolcano)spec={...spec,x:.72,y:.33,w:460,h:174};\n",
    "",
    'retire floating Hell button layout')

replace_once(camp,
    "      }else if(hellVolcano){\n        const width=Math.round(clamp(spec.w*frame.scale,spec.w*.68,spec.w*1.08)),height=Math.round(clamp(spec.h*frame.scale,spec.h*.72,spec.h*1.08));\n        for(const [property,value] of Object.entries({width:`${width}px`,height:`${height}px`,'min-width':`${width}px`,'min-height':`${height}px`,'max-width':`${width}px`,'max-height':`${height}px`,padding:'0'}))important(node,property,value);\n      }else if(node.dataset.db064HitTarget!=='painted-object'){",
    "      }else if(node.dataset.db064HitTarget!=='painted-object'){",
    'retire floating Hell resize branch')

# Heirloom selection used the correct rarity span, but the older generic
# .gear-keep-btn span rule had higher specificity and forced it back to muted.
equipment=ROOT/'runtime/js/ui/equipment-heirlooms.js'
replace_once(equipment,
    ".db-rarity-omega{color:#e7d6ff}\n",
    ".db-rarity-omega{color:#e7d6ff}.gear-keep-btn .db-rarity-name{display:inline!important;font-size:inherit!important;line-height:inherit!important;margin:0!important}.gear-keep-btn .db-rarity-poor{color:#c4c8cf!important}.gear-keep-btn .db-rarity-common{color:#fff!important}.gear-keep-btn .db-rarity-uncommon{color:#a9dbff!important}.gear-keep-btn .db-rarity-rare{color:#438bd8!important}.gear-keep-btn .db-rarity-epic{color:#f5e9a8!important}.gear-keep-btn .db-rarity-legendary{color:#ffd45f!important}.gear-keep-btn .db-rarity-artifact{color:#ff9c38!important}.gear-keep-btn .db-rarity-mythical{color:#bd83ff!important}.gear-keep-btn .db-rarity-omega{color:#e7d6ff!important}\n",
    'post-run heirloom rarity specificity')

# Wraith screen blending was isolated inside the tier-art stacking context, so
# its dark baked matte could not blend with the actual combat background.
monolith=ROOT/'runtime/js/dicebound.js'
replace_once(monolith,
    "    style.textContent='.db-enemy-dark-matte .db0636-tiered-enemy-image{mix-blend-mode:screen}';",
    "    style.textContent='.db-enemy-dark-matte{isolation:auto!important;background:transparent!important}.db-enemy-dark-matte .db0636-tiered-enemy-image{mix-blend-mode:screen!important;background:transparent!important}';",
    'Wraith battlefield matte blending')

# Update durable tests to assert the actual fixes rather than the broken first pass.
camp_test=ROOT/'tools/test_camp_ui.js'
replace_once(camp_test,
    "assert.match(source,/setObjectArt\\('campHellBtn','hellOn','db066-hell-volcano-art','Active Hell volcano with a dancing devil','assets\\/camp\\/mode-toggles\\/hell\\/on\\.png'\\)/,'active Hell must resolve the approved canonical volcano asset rather than an inline or compatibility image');\nassert.match(source,/hell-volcano-active/,'Camp must expose one semantic active-Hell state for layout and hit-target synchronization');\nassert.match(source,/spec=\\{\\.\\.\\.spec,x:\\.72,y:\\.33,w:460,h:174\\}/,'active Hell volcano must have a deliberate wide Camp-stage footprint rather than use the small inactive mountain target');\nassert.match(source,/db066-hell-volcano-art/,'active Hell art needs its Camp-owned semantic presentation class');",
    "assert.match(source,/id=\\\"campHellVolcanoLayer\\\" class=\\\"camp-hell-volcano-layer db066-hell-volcano-art\\\"/,'active Hell must use the approved canonical volcano as a dedicated scene layer');\nassert.deepStrictEqual({...camp.stageAnchors.campHellBtn},{x:.405,y:.35,w:220,h:150},'Hell must use the real mountain as its authored semantic hit target');\nassert.match(source,/left:44\\.7%!important;top:34\\.6%!important;width:29\\.5%!important;height:19\\.6%!important/,'the active volcano layer must align over the actual background mountain');\nassert.match(source,/mask-image:radial-gradient/,'the volcano replacement must feather into the Camp background instead of rendering as a rectangular postcard');\nassert.match(source,/id==='campGoBtn'\\|\\|id==='campHellBtn'/,'painted-object synchronization must not shrink the authored mountain hit target');\nassert.doesNotMatch(source,/spec=\\{\\.\\.\\.spec,x:\\.72,y:\\.33,w:460,h:174\\}/,'the retired floating Hell preview position must not return');\nassert.match(source,/db066-hell-volcano-art/,'active Hell art needs its Camp-owned semantic presentation class');",
    'Camp Hell regression contract')

wraith_test=ROOT/'tools/test_enemy_battle_art_registry.js'
replace_once(wraith_test,
    "assert.match(monolith,/\\.db-enemy-dark-matte \\.db0636-tiered-enemy-image\\{mix-blend-mode:screen\\}/,\"Wraith dark matte must visually blend away against the combat scene\");",
    "assert.match(monolith,/\\.db-enemy-dark-matte\\{isolation:auto!important;background:transparent!important\\}/,\"Wraith matte treatment must escape the isolated tier-art stacking context\");\nassert.match(monolith,/\\.db-enemy-dark-matte \\.db0636-tiered-enemy-image\\{mix-blend-mode:screen!important;background:transparent!important\\}/,\"Wraith dark matte must visually blend against the actual combat scene\");",
    'Wraith regression contract')

visual_test=ROOT/'tools/test_0666_visual_followups.js'
visual_test.write_text(r'''#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const camp=fs.readFileSync(path.join(root,"runtime/js/ui/camp.js"),"utf8");
const gear=fs.readFileSync(path.join(root,"runtime/js/ui/equipment-heirlooms.js"),"utf8");
const combat=fs.readFileSync(path.join(root,"runtime/js/dicebound.js"),"utf8");
assert.match(camp,/campHellBtn:Object\.freeze\(\{x:\.405,y:\.35,w:220,h:150\}\)/);
assert.match(camp,/campHellVolcanoLayer/);
assert.match(camp,/-webkit-mask-image:radial-gradient/);
assert.doesNotMatch(camp,/x:\.72,y:\.33,w:460,h:174/);
for(const [id,color] of [["poor","#c4c8cf"],["common","#fff"],["uncommon","#a9dbff"],["rare","#438bd8"],["epic","#f5e9a8"],["legendary","#ffd45f"],["artifact","#ff9c38"],["mythical","#bd83ff"],["omega","#e7d6ff"]])assert.ok(gear.includes(`.gear-keep-btn .db-rarity-${id}{color:${color}!important}`),`missing post-run rarity override for ${id}`);
assert.match(combat,/\.db-enemy-dark-matte\{isolation:auto!important;background:transparent!important\}/);
assert.match(combat,/mix-blend-mode:screen!important/);
console.log("0.6.6.6 visual follow-ups PASS: mountain Hell integration, heirloom rarity colours and Wraith matte escape are pinned");
''',encoding='utf-8')

# Release-facing documentation for the already-implemented Devil Patch.
changelog=ROOT/'CHANGELOG.md'
prepend_once(changelog,
    'This file starts the durable Git-era release history. Earlier Alpha/Beta history exists in recovered project notes; Beta 0.6 is the first release established as the repository baseline.\n\n',
    '''## Beta 0.6.6.6\n\n### Devil Patch critical gameplay/UI/art fixes (#282)\n- Hell Mode is now toggled by the actual Camp mountain. The supplied volcano-with-dancing-devil artwork replaces that mountain in-place with feathered scene blending instead of appearing as a detached preview panel.\n- Gun and Donut elemental procs use their dedicated combat artwork, Wraith battle art blends away its baked dark matte, and post-run Heirloom item names retain their true rarity colours.\n- Enemy packs present one enemy turn at a time while preserving existing damage/RNG semantics; Gold is visible in the board stat box; 200 Luck suppresses Poor/Common item and powerup outcomes; and Double Dice only announces on the first Board 5 unlock transition.\n- Architecture extraction is intentionally paused for this release; #281 remains deferred until after the Devil Patch.\n\n''',
    '0.6.6.6 changelog')

patch=ROOT/'runtime/PATCH_NOTES.md'
text=patch.read_text(encoding='utf-8')
if not text.startswith('# Unreleased — Beta 0.6.6.6'):
    entry='''# Unreleased — Beta 0.6.6.6\n\n## Beta 0.6.6.6 Devil Patch (#282)\n- **HELL HAS A MOUNTAIN NOW.** Click the actual distant Camp mountain to toggle Hell Mode. When Hell is active, the supplied volcano and dancing-devil artwork erupts in-place over the mountain instead of opening a separate preview image.\n- Gun procs show the Deagle beside the actor who fired them; Donut procs use the dedicated Donut rain artwork; Wraith battle art no longer presents as a dark rectangular card.\n- Post-run Heirloom selection keeps item-name rarity colours, Gold moved into the always-visible board stats, and 200 Luck effectively removes Poor/Common powerups and equipment from ordinary rolls.\n- Enemy packs now present each living enemy as its own turn rather than consolidating the whole pack into one message, without changing total incoming damage.\n- Double Dice only announces when Board 5 actually unlocks it for the first time.\n\n'''
    patch.write_text(entry+text,encoding='utf-8')

print('0.6.6.6 follow-up materialization complete')
