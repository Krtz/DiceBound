from pathlib import Path

TEST=Path('tools/test_prestige_moon.js')
text=TEST.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global text
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text=text.replace(old,new,1)

replace_once(
    "assert.match(monolith,/DB_PRESTIGE\\.purchase\\(meta\\.prestige,id,random\\)/,'only the injected runtime adapter may supply purchase RNG');",
    "assert.match(progression,/PRESTIGE\\.purchase\\(state\\.prestige,id,\\(\\)=>call\\('random'\\)\\)/,'Progression facade must be the ordinary purchase RNG boundary');\nassert.match(monolith,/const result=dbProgression\\.prestigePurchase\\(id\\);/,'Prestige Moon purchase must route through DiceboundProgression');",
    'Prestige Moon purchase ownership assertion'
)
replace_once(
    "assert.match(monolith,/DB_PRESTIGE\\.refundAll\\(meta\\.prestige\\)/,'Refund All must route through the domain transaction owner');",
    "assert.match(progression,/PRESTIGE\\.refundAll\\(state\\.prestige\\)/,'Progression facade must coordinate the focused Prestige refund domain');\nassert.match(monolith,/const result=dbProgression\\.prestigeRefundAll\\(\\);/,'Prestige Moon Refund All must route through DiceboundProgression');",
    'Prestige Moon refund ownership assertion'
)
replace_once(
    "console.log('Prestige Moon UI owner PASS: destination chrome, data-driven nodes and Progression-owned reset award contract');",
    "console.log('Prestige Moon UI owner PASS: destination chrome, data-driven nodes and Progression-owned reset/purchase/refund facade contract');",
    'Prestige Moon success copy'
)
TEST.write_text(text,encoding='utf-8',newline='\n')
print('Prestige Moon ownership assertions updated for DiceboundProgression facade.')
